from __future__ import annotations

import os
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus, urlparse

import requests
import whois
from anthropic import Anthropic
from playwright.sync_api import sync_playwright

from db import get_config, get_db
from gmaps_extract import merge_contact_fields, open_place_page, scrape_business_detail_page
from log_util import log_pipeline_event

PROMPTS_DIR = Path(__file__).parent / "prompts"
CLAUDE_MODEL = "claude-3-5-haiku-latest"


def _load_prompt(name: str, config: dict[str, Any]) -> str:
    prompts = config.get("emailPrompts", {})
    if prompts.get(name):
        return prompts[name]
    path = PROMPTS_DIR / f"{name}.txt"
    if path.exists():
        return path.read_text()
    raise FileNotFoundError(f"Prompt not found: {name}")


def _scrape_gmb_details(lead: dict[str, Any]) -> dict[str, Any]:
    details: dict[str, Any] = {
        "openingHours": {},
        "gmbDescription": None,
        "gmbServices": [],
        "topReviewSnippet": None,
        "phone": None,
        "fullAddress": None,
        "website": None,
        "email": None,
        "emailSource": None,
    }

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()

        opened = open_place_page(
            page,
            maps_place_id=lead.get("mapsPlaceId"),
            maps_url=lead.get("mapsUrl"),
            business_name=lead.get("businessName"),
            city=lead.get("city"),
        )

        if opened:
            extracted = scrape_business_detail_page(page)
            extracted.pop("sectionsFound", None)
            backfill = merge_contact_fields(lead, extracted)
            details.update(backfill)

            if details.get("email"):
                details["emailSource"] = "gmb_listing"

            try:
                reviews_tab = page.get_by_role("tab", name=re.compile("review", re.I))
                if reviews_tab.count() > 0:
                    reviews_tab.first.click()
                    time.sleep(1)
                    review_text = page.inner_text("body")
                    lines = [
                        line.strip() for line in review_text.split("\n") if len(line.strip()) > 40
                    ]
                    if lines:
                        details["topReviewSnippet"] = lines[0][:300]
            except Exception:
                pass

        browser.close()

    return details


def _domain_age_years(domain: str | None) -> float | None:
    if not domain:
        return None
    try:
        record = whois.whois(domain)
        created = record.creation_date
        if isinstance(created, list):
            created = created[0]
        if not created:
            return None
        age_days = (datetime.now(timezone.utc) - created.replace(tzinfo=timezone.utc)).days
        return round(age_days / 365.25, 1)
    except Exception:
        return None


def _detect_tech_stack(website: str | None) -> list[str]:
    if not website:
        return []
    url = website if website.startswith("http") else f"https://{website}"
    stack: list[str] = []
    try:
        response = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        html = response.text.lower()
        checks = {
            "WordPress": "wp-content",
            "WooCommerce": "woocommerce",
            "Shopify": "cdn.shopify.com",
            "Squarespace": "squarespace",
            "Wix": "wix.com",
        }
        for name, marker in checks.items():
            if marker in html:
                stack.append(name)
    except Exception:
        pass
    return stack


def _social_profiles(lead: dict[str, Any]) -> dict[str, str]:
    query = f'"{lead.get("businessName")}" site:facebook.com OR site:instagram.com'
    url = f"https://www.google.com/search?q={quote_plus(query)}"
    profiles: dict[str, str] = {}

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        time.sleep(2)
        for link in page.locator("a[href]").all()[:30]:
            href = link.get_attribute("href") or ""
            if "facebook.com" in href and "facebook" not in profiles:
                profiles["facebook"] = href
            if "instagram.com" in href and "instagram" not in profiles:
                profiles["instagram"] = href
        browser.close()

    return profiles


def _claude_summary(lead: dict[str, Any], config: dict[str, Any]) -> tuple[str | None, str | None]:
    client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    prompt_template = _load_prompt("enrichment_summary", config)
    business_data = "\n".join(f"{key}: {value}" for key, value in lead.items() if key != "_id")
    prompt = prompt_template.replace("{business_data}", business_data)

    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )
    text = message.content[0].text if message.content else ""
    gap_match = re.search(r"digital_gap:\s*(no_website|social_only|weak_site)", text, re.I)
    digital_gap = gap_match.group(1).lower() if gap_match else None
    summary = re.sub(r"digital_gap:.*", "", text, flags=re.I).strip()
    return summary or None, digital_gap


def enrich_lead(lead: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
    updates: dict[str, Any] = {"updatedAt": datetime.now(timezone.utc)}

    gmb = _scrape_gmb_details(lead)
    for key, value in gmb.items():
        if value is None:
            continue
        if key in {"phone", "fullAddress", "website", "email", "gmbDescription"}:
            if value and not lead.get(key):
                updates[key] = value
        elif key == "gmbServices" and value and not lead.get("gmbServices"):
            updates[key] = value
        elif key == "openingHours" and value and not lead.get("openingHours"):
            updates[key] = value
        elif key == "topReviewSnippet" and value:
            updates[key] = value
        elif key == "emailSource" and value and not lead.get("email"):
            updates[key] = value

    merged_so_far = {**lead, **updates}
    website = merged_so_far.get("website") or lead.get("website")

    domain = None
    if website:
        domain = urlparse(website if website.startswith("http") else f"https://{website}").netloc
        domain = domain.replace("www.", "") if domain else None

    updates["domainName"] = domain
    updates["domainAgeYears"] = _domain_age_years(domain)
    updates["websiteTechStack"] = _detect_tech_stack(website)
    updates["socialProfiles"] = _social_profiles(lead)

    if merged_so_far.get("email"):
        updates["emailDiscoveryStatus"] = "found"
    else:
        updates["emailDiscoveryStatus"] = "pending"

    merged = {**lead, **updates}
    summary, digital_gap = _claude_summary(merged, config)
    updates["businessSummary"] = summary
    updates["digitalGap"] = digital_gap
    updates["enrichmentStatus"] = "complete"
    updates["status"] = "enriched"
    updates["enrichedAt"] = datetime.now(timezone.utc)
    updates["unsubscribeToken"] = lead.get("unsubscribeToken") or str(uuid.uuid4())

    return updates


def run_enricher(leads: list[dict[str, Any]]) -> int:
    db = get_db()
    config = get_config()
    enriched = 0

    for lead in leads:
        print(f"Enriching: {lead.get('businessName')}")
        try:
            updates = enrich_lead(lead, config)
            db["leads"].update_one({"_id": lead["_id"]}, {"$set": updates})
            enriched += 1
            log_pipeline_event(
                "enricher",
                f"Enriched {lead.get('businessName')}",
                level="success",
                metadata={
                    "businessName": lead.get("businessName"),
                    "phoneFound": bool(updates.get("phone") or lead.get("phone")),
                    "websiteFound": bool(updates.get("website") or lead.get("website")),
                    "emailFound": bool(updates.get("email") or lead.get("email")),
                    "emailDiscoveryStatus": updates.get("emailDiscoveryStatus"),
                },
            )
        except Exception as error:
            print(f"  Enrichment failed: {error}")
            log_pipeline_event(
                "enricher",
                f"Enrichment failed for {lead.get('businessName')}: {error}",
                level="error",
            )
            db["leads"].update_one(
                {"_id": lead["_id"]},
                {"$set": {"enrichmentStatus": "failed", "updatedAt": datetime.now(timezone.utc)}},
            )

    print(f"Enricher complete. Enriched {enriched} leads.")
    log_pipeline_event(
        "enricher",
        f"Enricher complete — {enriched} leads enriched",
        level="success",
        metadata={"enriched": enriched},
    )
    return enriched
