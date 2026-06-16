from __future__ import annotations

import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote_plus, urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from playwright.sync_api import Page, sync_playwright

from db import get_config, get_db
from email_finder import (
    extract_emails_from_html,
    extract_emails_from_text,
    get_lead_domains,
    rank_email_candidates,
)
from log_util import log_pipeline_event, log_separator

STAGE = "email_discovery"

CONTACT_PATHS = [
    "",
    "/contact",
    "/contact-us",
    "/get-in-touch",
    "/about",
    "/about-us",
    "/team",
    "/our-team",
    "/book",
    "/booking",
    "/enquiries",
    "/privacy-policy",
]

SITEMAP_KEYWORDS = ("contact", "about", "team", "enquir")


def _lead_context(lead: dict[str, Any]) -> dict[str, Any]:
    return {
        "businessName": lead.get("businessName"),
        "city": lead.get("city"),
        "website": lead.get("website"),
        "domainName": lead.get("domainName"),
    }


def _log(
    message: str,
    *,
    level: str = "info",
    lead: dict[str, Any] | None = None,
    **metadata: Any,
) -> None:
    payload = dict(metadata)
    if lead:
        payload.update(_lead_context(lead))
    log_pipeline_event(STAGE, message, level=level, metadata=payload)


def _website_base(lead: dict[str, Any]) -> str | None:
    website = lead.get("website")
    if not website:
        return None
    return website if website.startswith("http") else f"https://{website}"


def _same_domain(url: str, base_netloc: str) -> bool:
    parsed = urlparse(url)
    host = (parsed.netloc or "").lower().replace("www.", "")
    base = base_netloc.lower().replace("www.", "")
    return bool(host) and host == base


def _fetch_page_html(page: Page, url: str) -> str | None:
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=20000)
        time.sleep(1)
        return page.content()
    except Exception:
        return None


def _pick_from_html(
    html: str,
    lead: dict[str, Any],
    *,
    require_domain: bool = False,
) -> tuple[str | None, list[str]]:
    allowed = get_lead_domains(lead) or None
    emails = extract_emails_from_html(html, allowed_domains=allowed)
    soup = BeautifulSoup(html, "lxml")
    mailto = [
        anchor.get("href", "").replace("mailto:", "").split("?")[0].lower()
        for anchor in soup.select('a[href^="mailto:"]')
    ]
    ranked = rank_email_candidates(
        emails,
        lead,
        mailto_first=mailto,
        require_domain_match=require_domain,
    )
    return ranked, emails


def _sitemap_urls(base: str, max_urls: int = 5) -> list[str]:
    urls: list[str] = []
    try:
        response = requests.get(
            urljoin(base, "/sitemap.xml"),
            timeout=15,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        if response.status_code != 200:
            return urls
        root = ET.fromstring(response.content)
        for element in root.iter():
            if not element.tag.endswith("loc") or not element.text:
                continue
            loc = element.text.strip()
            if any(keyword in loc.lower() for keyword in SITEMAP_KEYWORDS):
                urls.append(loc)
            if len(urls) >= max_urls:
                break
    except Exception:
        return urls
    return urls


def find_email_on_website(
    page: Page,
    lead: dict[str, Any],
    config: dict[str, Any],
) -> tuple[str | None, str | None, int, str, list[str], list[str]]:
    base = _website_base(lead)
    if not base:
        return None, None, 0, "no_website_on_lead", [], []

    max_pages = int(config.get("maxWebsitePagesPerLead", 8))
    pages_checked = 0
    pages_visited: list[str] = []
    all_candidates: list[str] = []
    parsed_base = urlparse(base)
    base_netloc = parsed_base.netloc

    _log(f"WEBSITE → scanning {base}", lead=lead, strategy="website", url=base)

    homepage_html = _fetch_page_html(page, base)
    pages_checked += 1
    pages_visited.append(base)
    if homepage_html:
        email, candidates = _pick_from_html(homepage_html, lead)
        all_candidates.extend(candidates)
        if email:
            return email, "website_home", pages_checked, "found_on_homepage", pages_visited, []

    for path in CONTACT_PATHS:
        if path == "":
            continue
        if pages_checked >= max_pages:
            break
        url = urljoin(base, path)
        html = _fetch_page_html(page, url)
        pages_checked += 1
        pages_visited.append(url)
        if not html:
            continue
        email, candidates = _pick_from_html(html, lead)
        all_candidates.extend(candidates)
        if email:
            source = "website_contact" if "contact" in path else "website_home"
            return email, source, pages_checked, f"found_on{path}", pages_visited, []

    sitemap_urls = _sitemap_urls(base)
    for url in sitemap_urls:
        if pages_checked >= max_pages:
            break
        if not _same_domain(url, base_netloc):
            continue
        html = _fetch_page_html(page, url)
        pages_checked += 1
        pages_visited.append(url)
        if not html:
            continue
        email, candidates = _pick_from_html(html, lead)
        all_candidates.extend(candidates)
        if email:
            return email, "website_sitemap", pages_checked, "found_via_sitemap", pages_visited, []

    unique_candidates = list(dict.fromkeys(all_candidates))
    reason = "no_email_after_pages" if pages_checked else "no_pages_loaded"
    if unique_candidates:
        reason = "candidates_rejected_or_unranked"
    return None, None, pages_checked, reason, pages_visited, unique_candidates


def find_email_domain_search(
    page: Page,
    lead: dict[str, Any],
) -> tuple[str | None, str | None, str, list[str]]:
    domains = get_lead_domains(lead)
    if not domains:
        return None, None, "no_domain_on_lead", []

    domain = next(iter(domains))
    query = f'site:{domain} (email OR contact OR "@{domain}")'
    search_urls = [
        ("bing", f"https://www.bing.com/search?q={quote_plus(query)}"),
        ("google", f"https://www.google.com/search?q={quote_plus(query)}"),
    ]

    _log(
        f"DOMAIN SEARCH → site:{domain}",
        lead=lead,
        strategy="domain_search",
        query=query,
    )

    all_candidates: list[str] = []
    last_error = "no_matching_domain_email"

    for engine, url in search_urls:
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            time.sleep(2)
            emails = extract_emails_from_text(page.inner_text("body"))
            all_candidates.extend(emails)
            email = rank_email_candidates(emails, lead, require_domain_match=True)
            if email:
                return email, "domain_search", f"found_via_{engine}", all_candidates
            if emails:
                last_error = "candidates_failed_domain_filter"
        except Exception as error:
            last_error = f"{engine}_search_error: {error}"

    return None, None, last_error, list(dict.fromkeys(all_candidates))


def find_email_on_social(
    page: Page,
    lead: dict[str, Any],
) -> tuple[str | None, str | None, str, list[str]]:
    profiles = lead.get("socialProfiles") or {}
    if hasattr(profiles, "items") and not isinstance(profiles, dict):
        profiles = dict(profiles)

    if not profiles.get("facebook") and not profiles.get("instagram"):
        return None, None, "no_social_profiles_on_lead", []

    all_candidates: list[str] = []

    facebook_url = profiles.get("facebook")
    if facebook_url:
        _log(
            "SOCIAL → checking Facebook",
            lead=lead,
            strategy="social_profile",
            platform="facebook",
            url=facebook_url,
        )
        try:
            page.goto(facebook_url, wait_until="domcontentloaded", timeout=60000)
            time.sleep(2)
            emails = extract_emails_from_text(page.inner_text("body"))
            all_candidates.extend(emails)
            email = rank_email_candidates(emails, lead)
            if email:
                return email, "social_profile", "found_on_facebook", all_candidates
        except Exception as error:
            return None, None, f"facebook_error: {error}", all_candidates

    instagram_url = profiles.get("instagram")
    if instagram_url:
        _log(
            "SOCIAL → checking Instagram",
            lead=lead,
            strategy="social_profile",
            platform="instagram",
            url=instagram_url,
        )
        try:
            page.goto(instagram_url, wait_until="domcontentloaded", timeout=60000)
            time.sleep(2)
            emails = extract_emails_from_text(page.inner_text("body"))
            all_candidates.extend(emails)
            email = rank_email_candidates(emails, lead)
            if email:
                return email, "social_profile", "found_on_instagram", all_candidates
        except Exception as error:
            return None, None, f"instagram_error: {error}", all_candidates

    reason = "no_email_on_social_pages"
    if all_candidates:
        reason = "social_candidates_rejected"
    return None, None, reason, list(dict.fromkeys(all_candidates))


def find_email_generic_google(
    page: Page,
    lead: dict[str, Any],
) -> tuple[str | None, str | None, str, list[str]]:
    query = f'"{lead.get("businessName")}" "{lead.get("city")}" email contact'
    url = f"https://www.google.com/search?q={quote_plus(query)}"

    _log(
        f'GOOGLE SEARCH → "{lead.get("businessName")}" {lead.get("city")}',
        lead=lead,
        strategy="google_scrape",
        query=query,
    )

    try:
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        time.sleep(2)
        emails = extract_emails_from_text(page.inner_text("body"))
        email = rank_email_candidates(emails, lead)
        if email:
            return email, "google_scrape", "found_via_google", emails
        reason = "no_candidates_in_google_results"
        if emails:
            reason = "google_candidates_rejected"
        return None, None, reason, emails
    except Exception as error:
        return None, None, f"google_search_error: {error}", []


def discover_email_for_lead(lead: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
    if lead.get("email"):
        return {
            "emailDiscoveryStatus": "found",
            "emailSource": lead.get("emailSource"),
        }

    business_name = lead.get("businessName", "Unknown")
    _log(
        f"START → {business_name}",
        lead=lead,
        outcome="start",
    )

    pages_checked = 0
    strategies_tried = 0
    attempt_log: list[dict[str, Any]] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()

        strategies_tried += 1
        email, source, pages_checked, reason, visited, website_candidates = find_email_on_website(
            page, lead, config
        )
        attempt_log.append(
            {
                "strategy": "website",
                "success": bool(email),
                "reason": reason if not email else source,
                "email": email,
                "pagesChecked": pages_checked,
                "pagesVisited": visited[:8],
                "candidatesSeen": website_candidates[:5],
            }
        )
        if email:
            browser.close()
            _log(
                f"FOUND → {email} via {source} ({pages_checked} pages)",
                lead=lead,
                level="success",
                outcome="found",
                email=email,
                emailSource=source,
                pagesChecked=pages_checked,
                attempts=attempt_log,
            )
            return {
                "email": email,
                "emailSource": source,
                "emailDiscoveryStatus": "found",
                "pagesChecked": pages_checked,
                "emailCandidatesTried": strategies_tried,
                "emailDiscoveryLog": attempt_log,
            }

        _log(
            f"WEBSITE FAIL → {reason} ({pages_checked} pages checked)",
            lead=lead,
            level="warning",
            strategy="website",
            reason=reason,
            pagesChecked=pages_checked,
            candidatesSeen=website_candidates[:5],
        )

        if config.get("enableDomainEmailSearch", True):
            strategies_tried += 1
            email, source, reason, candidates = find_email_domain_search(page, lead)
            attempt_log.append(
                {
                    "strategy": "domain_search",
                    "success": bool(email),
                    "reason": reason,
                    "email": email,
                    "candidatesSeen": candidates[:5],
                }
            )
            if email:
                browser.close()
                _log(
                    f"FOUND → {email} via domain search",
                    lead=lead,
                    level="success",
                    outcome="found",
                    email=email,
                    emailSource=source,
                    attempts=attempt_log,
                )
                return {
                    "email": email,
                    "emailSource": source,
                    "emailDiscoveryStatus": "found",
                    "pagesChecked": pages_checked,
                    "emailCandidatesTried": strategies_tried,
                    "emailDiscoveryLog": attempt_log,
                }
            _log(
                f"DOMAIN SEARCH FAIL → {reason}",
                lead=lead,
                level="warning",
                strategy="domain_search",
                reason=reason,
                candidatesSeen=candidates[:5],
            )
        else:
            attempt_log.append({"strategy": "domain_search", "success": False, "reason": "disabled_in_config"})

        if config.get("enableSocialEmailScrape", True):
            strategies_tried += 1
            email, source, reason, candidates = find_email_on_social(page, lead)
            attempt_log.append(
                {
                    "strategy": "social_profile",
                    "success": bool(email),
                    "reason": reason,
                    "email": email,
                    "candidatesSeen": candidates[:5],
                }
            )
            if email:
                browser.close()
                _log(
                    f"FOUND → {email} via social profile",
                    lead=lead,
                    level="success",
                    outcome="found",
                    email=email,
                    emailSource=source,
                    attempts=attempt_log,
                )
                return {
                    "email": email,
                    "emailSource": source,
                    "emailDiscoveryStatus": "found",
                    "pagesChecked": pages_checked,
                    "emailCandidatesTried": strategies_tried,
                    "emailDiscoveryLog": attempt_log,
                }
            _log(
                f"SOCIAL FAIL → {reason}",
                lead=lead,
                level="warning",
                strategy="social_profile",
                reason=reason,
                candidatesSeen=candidates[:5],
            )
        else:
            attempt_log.append({"strategy": "social_profile", "success": False, "reason": "disabled_in_config"})

        if config.get("enableGenericGoogleEmailSearch", True):
            strategies_tried += 1
            email, source, reason, candidates = find_email_generic_google(page, lead)
            attempt_log.append(
                {
                    "strategy": "google_scrape",
                    "success": bool(email),
                    "reason": reason,
                    "email": email,
                    "candidatesSeen": candidates[:5],
                }
            )
            if email:
                browser.close()
                _log(
                    f"FOUND → {email} via Google search",
                    lead=lead,
                    level="success",
                    outcome="found",
                    email=email,
                    emailSource=source,
                    attempts=attempt_log,
                )
                return {
                    "email": email,
                    "emailSource": source,
                    "emailDiscoveryStatus": "found",
                    "pagesChecked": pages_checked,
                    "emailCandidatesTried": strategies_tried,
                    "emailDiscoveryLog": attempt_log,
                }
            _log(
                f"GOOGLE FAIL → {reason}",
                lead=lead,
                level="warning",
                strategy="google_scrape",
                reason=reason,
                candidatesSeen=candidates[:5],
            )
        else:
            attempt_log.append({"strategy": "google_scrape", "success": False, "reason": "disabled_in_config"})

        browser.close()

    fail_reasons = [f"{a['strategy']}: {a['reason']}" for a in attempt_log if not a.get("success")]
    _log(
        f"NOT FOUND → {business_name} — tried {strategies_tried} strategies",
        lead=lead,
        level="warning",
        outcome="not_found",
        strategiesTried=strategies_tried,
        pagesChecked=pages_checked,
        failReasons=fail_reasons,
        attempts=attempt_log,
    )

    return {
        "emailDiscoveryStatus": "not_found",
        "pagesChecked": pages_checked,
        "emailCandidatesTried": strategies_tried,
        "emailDiscoveryLog": attempt_log,
    }


def get_leads_pending_email_discovery(db=None) -> list[dict[str, Any]]:
    database = get_db() if db is None else db
    return list(
        database["leads"].find(
            {
                "$or": [{"email": None}, {"email": ""}],
                "emailDiscoveryStatus": {"$in": [None, "pending"]},
            }
        )
    )


def run_email_discovery(leads: list[dict[str, Any]] | None = None) -> int:
    db = get_db()
    config = get_config()
    targets = leads if leads is not None else get_leads_pending_email_discovery(db)
    discovered = 0
    not_found = 0
    failed = 0

    log_separator(STAGE)

    if not targets:
        _log("No leads pending email discovery", level="info", outcome="empty")
        log_separator(STAGE)
        return 0

    _log(
        f"RUN START → {len(targets)} leads to process",
        level="info",
        count=len(targets),
    )

    for index, lead in enumerate(targets, start=1):
        if lead.get("email"):
            _log(
                f"SKIP [{index}] — already has email",
                lead=lead,
                level="info",
                outcome="skip",
                email=lead.get("email"),
            )
            continue

        business_name = lead.get("businessName", "Unknown")
        print(f"[{index}/{len(targets)}] Finding email: {business_name}")

        try:
            updates = discover_email_for_lead(lead, config)
            updates["updatedAt"] = datetime.now(timezone.utc)
            db["leads"].update_one({"_id": lead["_id"]}, {"$set": updates})

            if updates.get("email"):
                discovered += 1
                _log(
                    f"SAVED [{index}] {business_name} → {updates['email']} ({updates.get('emailSource')})",
                    lead=lead,
                    level="success",
                    outcome="saved",
                    email=updates.get("email"),
                    emailSource=updates.get("emailSource"),
                    pagesChecked=updates.get("pagesChecked", 0),
                    strategiesTried=updates.get("emailCandidatesTried", 0),
                    attempts=updates.get("emailDiscoveryLog", []),
                )
            else:
                not_found += 1
                fail_reasons = [
                    f"{a.get('strategy')}: {a.get('reason')}"
                    for a in updates.get("emailDiscoveryLog", [])
                    if not a.get("success")
                ]
                _log(
                    f"SAVED [{index}] {business_name} — no email ({'; '.join(fail_reasons)})",
                    lead=lead,
                    level="warning",
                    outcome="not_found",
                    pagesChecked=updates.get("pagesChecked", 0),
                    strategiesTried=updates.get("emailCandidatesTried", 0),
                    failReasons=fail_reasons,
                    attempts=updates.get("emailDiscoveryLog", []),
                )
        except Exception as error:
            failed += 1
            print(f"  Email discovery failed: {error}")
            _log(
                f"ERROR [{index}] {business_name} — {error}",
                lead=lead,
                level="error",
                outcome="error",
                error=str(error),
            )

    _log(
        f"RUN DONE → found {discovered} · not found {not_found} · errors {failed}",
        level="success" if discovered else "warning",
        discovered=discovered,
        notFound=not_found,
        errors=failed,
        processed=len(targets),
        print_separator_after=True,
    )
    return discovered
