from __future__ import annotations

import re
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote_plus

from playwright.sync_api import Page, sync_playwright
from pymongo.errors import DuplicateKeyError

from db import get_db
from gmaps_extract import extract_place_id, scrape_business_detail_page
from log_util import log_pipeline_event, log_separator
from target_markets import build_scrape_jobs

FEED_SELECTOR = 'div[role="feed"]'
LISTING_SELECTOR = f'{FEED_SELECTOR} a.hfpxzc'
DETAIL_PANEL_SELECTOR = 'div[role="main"]'
STAGE = "scraper"

JUNK_BUSINESS_NAMES = frozenset(
    {
        "results",
        "directions",
        "overview",
        "saved",
        "search",
        "google maps",
        "collapse side panel",
        "expand side panel",
    }
)


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def _is_blocklisted_name(name: str) -> bool:
    normalized = name.strip().lower()
    return not normalized or normalized in JUNK_BUSINESS_NAMES or len(normalized) < 3


def _extract_place_id(href: str | None) -> str | None:
    return extract_place_id(href)


def _build_maps_url(href: str | None) -> str | None:
    if not href:
        return None
    if href.startswith("http"):
        return href
    if href.startswith("/"):
        return f"https://www.google.com{href}"
    return None


def _invalid_lead_reason(lead: dict[str, Any]) -> str:
    name = lead.get("businessName", "")
    if _is_blocklisted_name(name):
        return f"junk or missing business name ('{name or 'empty'}')"
    return "unknown validation error"


def _is_valid_lead(lead: dict[str, Any]) -> bool:
    return not _is_blocklisted_name(lead.get("businessName", ""))


def _has_sparse_data(lead: dict[str, Any]) -> bool:
    has_address = bool(lead.get("fullAddress"))
    has_phone = bool(lead.get("phone"))
    has_rating = float(lead.get("rating") or 0) > 0
    return not (has_address or has_phone or has_rating)


def _lead_save_summary(lead: dict[str, Any]) -> str:
    parts = [lead["businessName"]]
    if lead.get("category"):
        parts.append(lead["category"])
    if lead.get("fullAddress"):
        parts.append(lead["fullAddress"])
    elif lead.get("city"):
        parts.append(f"{lead['city']}, {lead.get('country', '')}")
    if float(lead.get("rating") or 0) > 0:
        parts.append(f"⭐ {lead['rating']}")
    if lead.get("phone"):
        parts.append(f"📞 {lead['phone']}")
    if lead.get("website"):
        parts.append(f"🌐 {lead['website']}")
    if lead.get("email"):
        parts.append(f"✉️ {lead['email']}")
    return " · ".join(parts)


def _log_listing_fail(
    *,
    query: str,
    index: int,
    reason: str,
    name: str | None = None,
    term: str = "",
    city: str = "",
) -> None:
    label = name or f"listing #{index + 1}"
    log_pipeline_event(
        STAGE,
        f"FAIL [{index + 1}] {label} — {reason}",
        level="warning",
        metadata={
            "outcome": "fail",
            "reason": reason,
            "listingIndex": index,
            "businessName": name,
            "query": query,
            "term": term,
            "city": city,
        },
    )


def _log_listing_scraped(
    *,
    query: str,
    index: int,
    lead: dict[str, Any],
    term: str = "",
    city: str = "",
) -> None:
    sparse = _has_sparse_data(lead)
    suffix = " (sparse data — will enrich later)" if sparse else ""
    log_pipeline_event(
        STAGE,
        f"SCRAPED [{index + 1}] {_lead_save_summary(lead)}{suffix}",
        level="info",
        metadata={
            "outcome": "scraped",
            "sparseData": sparse,
            "listingIndex": index,
            "businessName": lead["businessName"],
            "fullAddress": lead.get("fullAddress", ""),
            "phone": lead.get("phone", ""),
            "rating": lead.get("rating", 0),
            "website": lead.get("website"),
            "email": lead.get("email"),
            "mapsPlaceId": lead.get("mapsPlaceId"),
            "mapsUrl": lead.get("mapsUrl"),
            "sectionsFound": lead.get("sectionsFound"),
            "query": query,
            "term": term,
            "city": city,
        },
    )


def _extract_name_from_listing(aria_label: str | None, page: Page) -> str:
    if aria_label:
        cleaned = _normalize_text(aria_label)
        if not _is_blocklisted_name(cleaned):
            return cleaned

    detail_name_locator = page.locator(f"{DETAIL_PANEL_SELECTOR} h1")
    if detail_name_locator.count() > 0:
        detail_name = _normalize_text(detail_name_locator.first.inner_text(timeout=3000))
        if not _is_blocklisted_name(detail_name):
            return detail_name

    return ""


def _wait_for_detail_contacts(page: Page) -> None:
    selectors = [
        f'{DETAIL_PANEL_SELECTOR} a[href^="tel:"]',
        f'{DETAIL_PANEL_SELECTOR} a[data-item-id="authority"]',
        f'{DETAIL_PANEL_SELECTOR} button[data-item-id="address"]',
        f"{DETAIL_PANEL_SELECTOR} h1",
    ]
    for selector in selectors:
        try:
            page.wait_for_selector(selector, timeout=5000)
            return
        except Exception:
            continue
    time.sleep(2)


def _scroll_feed(page: Page) -> None:
    feed = page.locator(FEED_SELECTOR)
    if feed.count() == 0:
        return
    try:
        page.evaluate(
            """(selector) => {
                const feed = document.querySelector(selector);
                if (feed) feed.scrollTop = feed.scrollHeight;
            }""",
            FEED_SELECTOR,
        )
        time.sleep(1)
    except Exception:
        pass


def _find_existing_lead(leads_collection, business: dict[str, Any]):
    place_id = business.get("mapsPlaceId")
    if place_id:
        existing = leads_collection.find_one({"mapsPlaceId": place_id})
        if existing:
            return existing

    address = business.get("fullAddress", "")
    if address:
        return leads_collection.find_one(
            {
                "businessName": business["businessName"],
                "fullAddress": address,
            }
        )

    return leads_collection.find_one(
        {
            "businessName": business["businessName"],
            "city": business["city"],
            "country": business["country"],
        }
    )


def _cleanup_junk_leads(leads_collection) -> int:
    junk_names = [name.title() for name in JUNK_BUSINESS_NAMES] + list(JUNK_BUSINESS_NAMES)
    result = leads_collection.delete_many(
        {
            "businessName": {"$in": junk_names},
            "$or": [{"fullAddress": ""}, {"fullAddress": {"$exists": False}}],
        }
    )
    return result.deleted_count


def scrape_google_maps(
    query: str,
    country: str,
    city: str,
    search_term: str = "",
    scrape_query: str = "",
    max_results: int = 15,
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    seen_place_ids: set[str] = set()
    failed_count = 0
    search_url = f"https://www.google.com/maps/search/{quote_plus(query)}"
    active_query = scrape_query or query

    log_separator(STAGE)
    log_pipeline_event(
        STAGE,
        f"QUERY START → {active_query}",
        level="info",
        metadata={"query": active_query, "term": search_term, "city": city, "country": country},
    )

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
        time.sleep(3)

        try:
            page.wait_for_selector(FEED_SELECTOR, timeout=15000)
        except Exception as error:
            log_pipeline_event(
                STAGE,
                f"QUERY FAIL → {active_query} — no results feed ({error})",
                level="error",
                metadata={"query": active_query, "reason": str(error)},
                print_separator_after=True,
            )
            browser.close()
            return results

        _scroll_feed(page)
        total_listings = min(page.locator(LISTING_SELECTOR).count(), max_results)

        if total_listings == 0:
            log_pipeline_event(
                STAGE,
                f"QUERY FAIL → {active_query} — zero listings in feed",
                level="warning",
                metadata={"query": active_query},
                print_separator_after=True,
            )
            browser.close()
            return results

        log_pipeline_event(
            STAGE,
            f"Found {total_listings} listings to process",
            level="info",
            metadata={"query": active_query, "listingCount": total_listings},
        )

        for index in range(total_listings):
            try:
                listings = page.locator(LISTING_SELECTOR)
                if index >= listings.count():
                    _log_listing_fail(
                        query=active_query,
                        index=index,
                        reason="listing index out of range after feed refresh",
                        term=search_term,
                        city=city,
                    )
                    failed_count += 1
                    continue

                listing = listings.nth(index)
                listing.scroll_into_view_if_needed(timeout=5000)
                aria_label = listing.get_attribute("aria-label")
                href = listing.get_attribute("href")
                place_id = _extract_place_id(href)

                if place_id and place_id in seen_place_ids:
                    _log_listing_fail(
                        query=active_query,
                        index=index,
                        reason="duplicate place in same query",
                        name=aria_label,
                        term=search_term,
                        city=city,
                    )
                    failed_count += 1
                    continue

                listing.click(timeout=10000)
                _wait_for_detail_contacts(page)

                name = _extract_name_from_listing(aria_label, page)
                if not name:
                    _log_listing_fail(
                        query=active_query,
                        index=index,
                        reason="could not extract valid business name",
                        name=aria_label,
                        term=search_term,
                        city=city,
                    )
                    failed_count += 1
                    continue

                details = scrape_business_detail_page(page)
                sections_found = details.pop("sectionsFound", {})

                lead = {
                    "businessName": name,
                    "category": details.get("category") or query.split()[0],
                    "city": city,
                    "country": country,
                    "searchTerm": search_term,
                    "scrapeQuery": active_query,
                    "mapsPlaceId": place_id,
                    "mapsUrl": _build_maps_url(href),
                    "rating": details.get("rating", 0),
                    "reviewCount": details.get("reviewCount", 0),
                    "phone": details.get("phone", ""),
                    "fullAddress": details.get("fullAddress", ""),
                    "website": details.get("website"),
                    "email": details.get("email"),
                    "emailSource": "gmb_listing" if details.get("email") else None,
                    "emailDiscoveryStatus": "found" if details.get("email") else "pending",
                    "openingHours": details.get("openingHours", {}),
                    "gmbDescription": details.get("gmbDescription"),
                    "gmbServices": details.get("gmbServices", []),
                    "sectionsFound": sections_found,
                    "status": "scraped",
                    "enrichmentStatus": "pending",
                    "scrapedAt": datetime.now(timezone.utc),
                    "updatedAt": datetime.now(timezone.utc),
                }

                if not _is_valid_lead(lead):
                    _log_listing_fail(
                        query=active_query,
                        index=index,
                        reason=_invalid_lead_reason(lead),
                        name=name,
                        term=search_term,
                        city=city,
                    )
                    failed_count += 1
                    continue

                if place_id:
                    seen_place_ids.add(place_id)

                results.append(lead)
                _log_listing_scraped(
                    query=active_query,
                    index=index,
                    lead=lead,
                    term=search_term,
                    city=city,
                )
            except Exception as error:
                _log_listing_fail(
                    query=active_query,
                    index=index,
                    reason=str(error),
                    term=search_term,
                    city=city,
                )
                failed_count += 1

        browser.close()

    log_pipeline_event(
        STAGE,
        f"QUERY DONE → {active_query} · scraped {len(results)} · failed {failed_count}",
        level="success" if results else "warning",
        metadata={
            "query": active_query,
            "scraped": len(results),
            "failed": failed_count,
            "term": search_term,
            "city": city,
        },
        print_separator_after=True,
    )

    return results


def run_scraper() -> int:
    db = get_db()
    config = db["config"].find_one()
    if not config:
        raise RuntimeError("Config not found")

    inserted = 0
    skipped = 0
    leads = db["leads"]

    removed_junk = _cleanup_junk_leads(leads)
    if removed_junk:
        log_pipeline_event(
            STAGE,
            f"Cleaned {removed_junk} junk leads from database",
            level="info",
            metadata={"removed": removed_junk},
        )

    jobs = build_scrape_jobs(config)
    if not jobs:
        log_pipeline_event(STAGE, "No scrape jobs configured", level="warning")
        return 0

    log_separator(STAGE)
    log_pipeline_event(
        STAGE,
        f"Scraper run started — {len(jobs)} queries",
        level="info",
        metadata={"jobCount": len(jobs)},
    )

    for job in jobs:
        query = job["query"]
        country = job["country"]
        city = job["city"]
        term = job["term"]

        businesses = scrape_google_maps(
            query,
            country,
            city,
            search_term=term,
            scrape_query=query,
        )

        for business in businesses:
            existing = _find_existing_lead(leads, business)
            if existing:
                skipped += 1
                log_pipeline_event(
                    STAGE,
                    f"SKIP SAVE — {business['businessName']} already in database",
                    level="warning",
                    metadata={
                        "outcome": "skip_existing",
                        "businessName": business["businessName"],
                        "city": city,
                        "query": query,
                    },
                )
                continue
            try:
                leads.insert_one(business)
                inserted += 1
                log_pipeline_event(
                    STAGE,
                    f"SAVED → {_lead_save_summary(business)}",
                    level="success",
                    metadata={
                        "outcome": "saved",
                        "businessName": business["businessName"],
                        "fullAddress": business.get("fullAddress", ""),
                        "phone": business.get("phone", ""),
                        "rating": business.get("rating", 0),
                        "website": business.get("website"),
                        "email": business.get("email"),
                        "mapsPlaceId": business.get("mapsPlaceId"),
                        "mapsUrl": business.get("mapsUrl"),
                        "city": city,
                        "query": query,
                        "term": term,
                    },
                )
            except DuplicateKeyError:
                skipped += 1
                log_pipeline_event(
                    STAGE,
                    f"SKIP SAVE — {business['businessName']} duplicate key conflict",
                    level="warning",
                    metadata={
                        "outcome": "skip_duplicate",
                        "businessName": business["businessName"],
                        "query": query,
                    },
                )

        time.sleep(2)

    log_separator(STAGE)
    log_pipeline_event(
        STAGE,
        f"Scraper complete — saved {inserted} · skipped {skipped}",
        level="success",
        metadata={"inserted": inserted, "skipped": skipped},
        print_separator_after=True,
    )
    return inserted
