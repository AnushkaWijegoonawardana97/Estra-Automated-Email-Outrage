from __future__ import annotations

import re
import time
from typing import Any
from urllib.parse import quote_plus, urlparse

from playwright.sync_api import Page

EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
DETAIL_PANEL_SELECTOR = 'div[role="main"]'
GOOGLE_HOSTS = frozenset({"google.com", "goo.gl", "google.co.uk", "maps.google.com"})


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def extract_place_id(href: str | None) -> str | None:
    if not href:
        return None

    chij_match = re.search(r"1s(ChIJ[\w-]+)", href)
    if chij_match:
        return chij_match.group(1)

    hex_match = re.search(r"1s(0x[a-f0-9]+)", href, re.I)
    if hex_match:
        return hex_match.group(1)

    return None


def normalize_phone(value: str | None) -> str:
    if not value:
        return ""
    cleaned = value.strip()
    if cleaned.lower().startswith("tel:"):
        cleaned = cleaned[4:]
    cleaned = re.sub(r"[^\d+()\-.\s]", "", cleaned)
    return normalize_text(cleaned)


def normalize_website(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if cleaned.lower().startswith("mailto:"):
        return None
    if not cleaned.startswith("http"):
        cleaned = f"https://{cleaned}"
    parsed = urlparse(cleaned)
    host = (parsed.netloc or "").lower().replace("www.", "")
    if not host or any(google_host in host for google_host in GOOGLE_HOSTS):
        return None
    return cleaned


def build_place_url(maps_place_id: str | None, maps_url: str | None) -> str | None:
    if maps_url and maps_url.startswith("http"):
        return maps_url
    if maps_url and maps_url.startswith("/"):
        return f"https://www.google.com{maps_url}"
    if maps_place_id:
        return (
            "https://www.google.com/maps/search/?api=1"
            f"&query_place_id={quote_plus(maps_place_id)}"
        )
    return None


def open_place_page(
    page: Page,
    *,
    maps_place_id: str | None = None,
    maps_url: str | None = None,
    business_name: str | None = None,
    city: str | None = None,
) -> bool:
    place_url = build_place_url(maps_place_id, maps_url)
    if place_url:
        page.goto(place_url, wait_until="domcontentloaded", timeout=60000)
        time.sleep(2)
        return _wait_for_detail_panel(page)

    if business_name:
        query = f"{business_name} {city or ''}".strip()
        search_url = f"https://www.google.com/maps/search/{quote_plus(query)}"
        page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
        time.sleep(2)
        try:
            page.locator('div[role="feed"] a.hfpxzc').first.click(timeout=8000)
            time.sleep(2)
            return _wait_for_detail_panel(page)
        except Exception:
            return False

    return False


def merge_contact_fields(existing: dict[str, Any], extracted: dict[str, Any]) -> dict[str, Any]:
    merged: dict[str, Any] = {}
    scalar_fields = (
        "phone",
        "fullAddress",
        "website",
        "email",
        "gmbDescription",
        "category",
    )
    for field in scalar_fields:
        current = existing.get(field)
        new_value = extracted.get(field)
        if new_value and not current:
            merged[field] = new_value

    if extracted.get("gmbServices") and not existing.get("gmbServices"):
        merged["gmbServices"] = extracted["gmbServices"]

    if extracted.get("openingHours") and not existing.get("openingHours"):
        merged["openingHours"] = extracted["openingHours"]

    for field in ("rating", "reviewCount"):
        current = existing.get(field) or 0
        new_value = extracted.get(field) or 0
        if new_value and not current:
            merged[field] = new_value

    return merged


def _wait_for_detail_panel(page: Page, timeout_ms: int = 10000) -> bool:
    try:
        page.wait_for_selector(f"{DETAIL_PANEL_SELECTOR} h1", timeout=timeout_ms)
        return True
    except Exception:
        time.sleep(2)
        return page.locator(f"{DETAIL_PANEL_SELECTOR} h1").count() > 0


def _detail_panel_locator(page: Page):
    panels = page.locator(DETAIL_PANEL_SELECTOR)
    if panels.count() == 0:
        return page.locator("body")

    best_index = 0
    best_score = -1
    for index in range(min(panels.count(), 6)):
        panel = panels.nth(index)
        score = 0
        try:
            if panel.locator('a[href^="tel:"]').count() > 0:
                score += 3
            if panel.locator('a[data-item-id="authority"]').count() > 0:
                score += 3
            if panel.locator('button[data-item-id="address"]').count() > 0:
                score += 2
            headings = panel.locator("h1")
            for h_index in range(min(headings.count(), 3)):
                name = normalize_text(headings.nth(h_index).inner_text(timeout=1000))
                if name and name.lower() not in {"results", "directions", "overview", "saved"}:
                    score += 4
                    break
        except Exception:
            pass
        if score > best_score:
            best_score = score
            best_index = index

    return panels.nth(best_index)


def _extract_emails(text: str) -> list[str]:
    blocked = {"example.com", "sentry.io", "wixpress.com", "google.com"}
    emails: list[str] = []
    for match in EMAIL_PATTERN.finditer(text):
        email = match.group(0).lower()
        domain = email.split("@")[-1]
        if domain in blocked or domain.endswith(".png") or domain.endswith(".jpg"):
            continue
        emails.append(email)
    return emails


def _extract_rating(panel) -> tuple[float, int]:
    rating = 0.0
    review_count = 0
    rating_el = panel.locator('span[role="img"][aria-label*="stars"]')
    if rating_el.count() == 0:
        return rating, review_count

    label = rating_el.first.get_attribute("aria-label") or ""
    rating_match = re.search(r"([\d.]+)", label)
    reviews_match = re.search(r"([\d,]+)\s+review", label, re.I)
    if rating_match:
        rating = float(rating_match.group(1))
    if reviews_match:
        review_count = int(reviews_match.group(1).replace(",", ""))
    return rating, review_count


def _extract_from_overview(panel) -> dict[str, Any]:
    result: dict[str, Any] = {
        "phone": "",
        "fullAddress": "",
        "website": None,
        "category": "",
        "openingHours": {},
        "rating": 0.0,
        "reviewCount": 0,
    }

    try:
        rating, review_count = _extract_rating(panel)
        result["rating"] = rating
        result["reviewCount"] = review_count
    except Exception:
        pass

    try:
        tel_links = panel.locator('a[href^="tel:"]')
        if tel_links.count() > 0:
            result["phone"] = normalize_phone(tel_links.first.get_attribute("href"))
    except Exception:
        pass

    try:
        website_links = panel.locator('a[data-item-id="authority"]')
        if website_links.count() > 0:
            result["website"] = normalize_website(website_links.first.get_attribute("href"))
    except Exception:
        pass

    try:
        buttons = panel.locator("button[data-item-id], button[aria-label], a[aria-label]")
        for index in range(min(buttons.count(), 30)):
            element = buttons.nth(index)
            aria = element.get_attribute("aria-label") or ""
            item_id = element.get_attribute("data-item-id") or ""

            if not result["fullAddress"] and (aria.startswith("Address:") or item_id == "address"):
                result["fullAddress"] = normalize_text(aria.replace("Address:", ""))
            elif not result["phone"] and (
                aria.startswith("Phone:") or "phone" in item_id.lower() or "Call phone number" in aria
            ):
                result["phone"] = normalize_phone(aria.replace("Phone:", ""))
            elif not result["website"] and aria.startswith("Website:"):
                result["website"] = normalize_website(aria.replace("Website:", ""))
    except Exception:
        pass

    try:
        if not result["website"]:
            external_links = panel.locator('a[href^="http"]')
            for index in range(min(external_links.count(), 20)):
                href = external_links.nth(index).get_attribute("href")
                website = normalize_website(href)
                if website:
                    result["website"] = website
                    break
    except Exception:
        pass

    try:
        category_el = panel.locator("button[jsaction*='category']")
        if category_el.count() > 0:
            result["category"] = normalize_text(category_el.first.inner_text())
    except Exception:
        pass

    try:
        hours_buttons = panel.locator('button[aria-label*="hours"], button[data-item-id="oh"]')
        for index in range(min(hours_buttons.count(), 10)):
            aria = hours_buttons.nth(index).get_attribute("aria-label") or ""
            if ":" in aria:
                day, _, hours = aria.partition(":")
                day_key = normalize_text(day)
                hours_value = normalize_text(hours)
                if day_key and hours_value:
                    result["openingHours"][day_key] = hours_value
    except Exception:
        pass

    if not result["phone"]:
        try:
            panel_text = panel.inner_text(timeout=3000)
            phone_match = re.search(r"(?:\+?\d[\d\s().-]{7,}\d)", panel_text)
            if phone_match:
                result["phone"] = normalize_phone(phone_match.group(0))
        except Exception:
            pass

    return result


def _extract_from_about(page: Page, panel) -> dict[str, Any]:
    result: dict[str, Any] = {
        "gmbDescription": None,
        "gmbServices": [],
        "email": None,
    }

    try:
        about_tab = page.get_by_role("tab", name=re.compile(r"about", re.I))
        if about_tab.count() == 0:
            return result

        about_tab.first.click(timeout=5000)
        time.sleep(1.5)
    except Exception:
        return result

    try:
        about_panel = _detail_panel_locator(page)
        about_text = about_panel.inner_text(timeout=5000)
    except Exception:
        return result
    lines = [normalize_text(line) for line in about_text.split("\n") if normalize_text(line)]

    description_lines: list[str] = []
    services: list[str] = []
    in_services = False

    for line in lines:
        lower = line.lower()
        if lower in {"about", "from the business", "service options", "services"}:
            in_services = lower in {"service options", "services"}
            continue
        if in_services and len(line) < 80:
            services.append(line)
            continue
        if not in_services and len(line) > 30 and lower not in {"overview", "reviews"}:
            description_lines.append(line)

    if description_lines:
        result["gmbDescription"] = " ".join(description_lines[:3])[:500]

    if services:
        result["gmbServices"] = services[:15]

    mailto_links = about_panel.locator('a[href^="mailto:"]')
    if mailto_links.count() > 0:
        email = mailto_links.first.get_attribute("href", timeout=2000) or ""
        result["email"] = email.replace("mailto:", "").split("?")[0].strip().lower() or None

    if not result["email"]:
        emails = _extract_emails(about_text)
        if emails:
            result["email"] = emails[0]

    return result


def scrape_business_detail_page(page: Page) -> dict[str, Any]:
    if not _wait_for_detail_panel(page):
        return {}

    try:
        panel = _detail_panel_locator(page)
        overview = _extract_from_overview(panel)
        about = _extract_from_about(page, panel)
    except Exception:
        overview = {}
        about = {}

    extracted: dict[str, Any] = {
        **overview,
        "gmbDescription": about.get("gmbDescription"),
        "gmbServices": about.get("gmbServices", []),
        "email": about.get("email"),
        "sectionsFound": {
            "overview": bool(
                overview.get("phone")
                or overview.get("fullAddress")
                or overview.get("website")
                or overview.get("rating")
            ),
            "about": bool(about.get("gmbDescription") or about.get("gmbServices") or about.get("email")),
        },
    }

    if not extracted.get("email"):
        overview_emails = _extract_emails(panel.inner_text(timeout=3000))
        if overview_emails:
            extracted["email"] = overview_emails[0]

    return extracted
