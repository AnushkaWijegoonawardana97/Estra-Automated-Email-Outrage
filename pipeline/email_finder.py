from __future__ import annotations

import json
import re
from typing import Any
from urllib.parse import urlparse

from bs4 import BeautifulSoup

EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

JUNK_EMAIL_DOMAINS = frozenset(
    {
        "example.com",
        "sentry.io",
        "wixpress.com",
        "google.com",
        "facebook.com",
        "instagram.com",
        "schema.org",
        "w3.org",
        "domain.com",
        "email.com",
        "yoursite.com",
    }
)

JUNK_LOCAL_PARTS = frozenset(
    {
        "noreply",
        "no-reply",
        "donotreply",
        "do-not-reply",
        "mailer-daemon",
        "postmaster",
        "webmaster",
    }
)

PREFERRED_LOCAL_PARTS = (
    "info",
    "hello",
    "contact",
    "enquiries",
    "enquiry",
    "booking",
    "bookings",
    "office",
    "sales",
    "admin",
)


def normalize_email(email: str) -> str:
    return email.strip().lower().split("?")[0]


def is_junk_email(email: str) -> bool:
    normalized = normalize_email(email)
    if not normalized or "@" not in normalized:
        return True

    local, domain = normalized.split("@", 1)
    if domain in JUNK_EMAIL_DOMAINS:
        return True
    if any(domain.endswith(f".{junk}") for junk in JUNK_EMAIL_DOMAINS):
        return True
    if local in JUNK_LOCAL_PARTS:
        return True
    if domain.endswith((".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg")):
        return True
    if "wix.com" in domain or "squarespace.com" in domain:
        return True
    return False


def get_lead_domains(lead: dict[str, Any]) -> set[str]:
    domains: set[str] = set()
    domain_name = lead.get("domainName")
    if domain_name:
        domains.add(domain_name.lower().replace("www.", ""))

    website = lead.get("website")
    if website:
        parsed = urlparse(website if website.startswith("http") else f"https://{website}")
        host = (parsed.netloc or "").lower().replace("www.", "")
        if host:
            domains.add(host)
    return domains


def extract_emails_from_text(text: str) -> list[str]:
    emails: list[str] = []
    for match in EMAIL_PATTERN.finditer(text or ""):
        email = normalize_email(match.group(0))
        if not is_junk_email(email):
            emails.append(email)
    return list(dict.fromkeys(emails))


def _extract_json_ld_emails(html: str) -> list[str]:
    emails: list[str] = []
    soup = BeautifulSoup(html, "lxml")
    for script in soup.select('script[type="application/ld+json"]'):
        raw = script.string or script.get_text()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        stack = data if isinstance(data, list) else [data]
        for item in stack:
            if not isinstance(item, dict):
                continue
            email_value = item.get("email")
            if isinstance(email_value, str):
                emails.extend(extract_emails_from_text(email_value))
            for node in item.get("@graph", []):
                if isinstance(node, dict) and isinstance(node.get("email"), str):
                    emails.extend(extract_emails_from_text(node["email"]))
    return list(dict.fromkeys(emails))


def extract_emails_from_html(
    html: str,
    allowed_domains: set[str] | None = None,
) -> list[str]:
    soup = BeautifulSoup(html, "lxml")
    mailto_emails: list[str] = []
    body_emails: list[str] = []

    for anchor in soup.select('a[href^="mailto:"]'):
        href = anchor.get("href", "")
        email = normalize_email(href.replace("mailto:", ""))
        if email and not is_junk_email(email):
            mailto_emails.append(email)

    footer = soup.find("footer")
    if footer:
        body_emails.extend(extract_emails_from_text(footer.get_text(" ")))

    body_emails.extend(_extract_json_ld_emails(html))
    body_emails.extend(extract_emails_from_text(soup.get_text(" ")))

    ordered = list(dict.fromkeys(mailto_emails + body_emails))
    if not allowed_domains:
        return ordered

    on_domain = [email for email in ordered if email.split("@")[-1] in allowed_domains]
    return on_domain or ordered


def _email_score(email: str, lead: dict[str, Any], from_mailto: bool = False) -> int:
    local, domain = email.split("@", 1)
    score = 0
    if from_mailto:
        score += 50

    lead_domains = get_lead_domains(lead)
    if domain in lead_domains:
        score += 100

    for index, prefix in enumerate(PREFERRED_LOCAL_PARTS):
        if local == prefix or local.startswith(f"{prefix}."):
            score += 30 - index

    if lead.get("businessName"):
        name_token = re.sub(r"[^a-z0-9]", "", lead["businessName"].lower())[:12]
        if name_token and name_token in local:
            score += 15

    return score


def rank_email_candidates(
    emails: list[str],
    lead: dict[str, Any],
    *,
    mailto_first: list[str] | None = None,
    require_domain_match: bool = False,
) -> str | None:
    if not emails:
        return None

    mailto_set = set(mailto_first or [])
    lead_domains = get_lead_domains(lead)
    unique = list(dict.fromkeys(emails))

    if require_domain_match and lead_domains:
        unique = [email for email in unique if email.split("@")[-1] in lead_domains]
        if not unique:
            return None

    ranked = sorted(
        unique,
        key=lambda email: _email_score(email, lead, from_mailto=email in mailto_set),
        reverse=True,
    )
    return ranked[0] if ranked else None
