from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse

from db import get_db
from log_util import log_pipeline_event

SOCIAL_DOMAINS = {"facebook.com", "instagram.com", "tiktok.com", "twitter.com", "x.com"}


def _domain_from_url(url: str | None) -> str | None:
    if not url:
        return None
    try:
        host = urlparse(url if url.startswith("http") else f"https://{url}").netloc
        return host.lower().replace("www.", "") or None
    except Exception:
        return None


def _is_social_only(website: str | None) -> bool:
    domain = _domain_from_url(website)
    return bool(domain and any(social in domain for social in SOCIAL_DOMAINS))


def _is_weak_website(website: str | None, weak_domains: list[str]) -> bool:
    domain = _domain_from_url(website)
    if not domain:
        return False
    return any(weak in domain for weak in weak_domains)


def _is_franchise(name: str, keywords: list[str]) -> bool:
    lowered = name.lower()
    return any(keyword in lowered for keyword in keywords)


def passes_website_filter(lead: dict[str, Any], config: dict[str, Any]) -> bool:
    website = lead.get("website")
    weak_domains = config.get("weakWebsiteDomains", [])

    if not website:
        return True
    if _is_social_only(website):
        return True
    if _is_weak_website(website, weak_domains):
        return True
    if config.get("requireNoWebsite"):
        return False
    return False


def get_filtered_leads() -> list[dict[str, Any]]:
    db = get_db()
    config = db["config"].find_one()
    if not config:
        raise RuntimeError("Config not found")

    min_rating = config.get("minRating", 3.5)
    franchise_keywords = config.get("franchiseKeywords", [])

    unsubscribed_emails = {
        doc["email"].lower()
        for doc in db["unsubscribed"].find({}, {"email": 1})
        if doc.get("email")
    }

    emailed_lead_ids = {
        doc["leadId"]
        for doc in db["emails_sent"].find({}, {"leadId": 1})
        if doc.get("leadId")
    }

    query = {
        "$or": [
            {"rating": {"$gte": min_rating}},
            {"rating": 0},
        ],
        "status": {"$in": ["scraped", "enriched"]},
    }

    filtered: list[dict[str, Any]] = []

    for lead in db["leads"].find(query):
        if lead["_id"] in emailed_lead_ids:
            continue
        if _is_franchise(lead.get("businessName", ""), franchise_keywords):
            continue
        if not passes_website_filter(lead, config):
            continue
        email = (lead.get("email") or "").lower()
        if email and email in unsubscribed_emails:
            continue
        filtered.append(lead)

    print(f"Filter: {len(filtered)} leads passed.")
    log_pipeline_event(
        "filter",
        f"{len(filtered)} leads passed filters",
        metadata={"count": len(filtered)},
    )
    return filtered
