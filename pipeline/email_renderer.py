from __future__ import annotations

import html
import os
from pathlib import Path
from typing import Any

from email_brand import BRAND, BRAND_NAME, CONTACT_EMAIL, SERVICE_LABELS, SOCIAL_LINKS, WEBSITE_URL
from email_components import footer_nav_html, logo_html, tagline_eyebrow_html
from email_personalization import build_email_content

TEMPLATES_DIR = Path(__file__).parent / "templates"

EMAIL_TYPE_TEMPLATE_MAP = {
    "initial": "initial",
    "followup_generic": "followup_generic",
    "followup_targeted": "followup_targeted",
}


def _escape(value: str) -> str:
    return html.escape(value, quote=True)


def _load_template(name: str) -> str:
    return (TEMPLATES_DIR / name).read_text()


def _replace_placeholders(template: str, values: dict[str, str]) -> str:
    result = template
    for key, value in values.items():
        result = result.replace(f"{{{{{key}}}}}", value)
    return result


def _tracked_url(lead_id: str, service: str, app_url: str) -> str:
    return f"{app_url}/api/track?lead={lead_id}&service={service}"


def build_service_links_html(lead_id: str, app_url: str) -> str:
    parts: list[str] = []
    for service, label in SERVICE_LABELS.items():
        url = _escape(_tracked_url(lead_id, service, app_url))
        parts.append(
            f'<a href="{url}" style="color:{BRAND["accent"]};text-decoration:none;font-weight:600;">{label}</a>'
        )
    return " &nbsp;·&nbsp; ".join(parts)


def build_service_links_text(lead_id: str, app_url: str) -> str:
    lines: list[str] = []
    for service, label in SERVICE_LABELS.items():
        url = _tracked_url(lead_id, service, app_url)
        lines.append(f"{label}: {url}")
    return "\n".join(lines)


def build_social_links_html() -> str:
    parts: list[str] = []
    for label, url in SOCIAL_LINKS.items():
        parts.append(
            f'<a href="{_escape(url)}" style="color:{BRAND["muted"]};text-decoration:none;">{label}</a>'
        )
    return " &nbsp;·&nbsp; ".join(parts)


def _brand_values(
    *,
    unsubscribe_url: str,
    service_label: str = "",
) -> dict[str, str]:
    return {
        "bg": BRAND["bg"],
        "card": BRAND["card"],
        "elevated": BRAND["elevated"],
        "border": BRAND["border"],
        "text": BRAND["text"],
        "muted": BRAND["muted"],
        "accent": BRAND["accent"],
        "violet": BRAND["violet"],
        "cta_bg": BRAND["cta_bg"],
        "cta_text": BRAND["cta_text"],
        "font": BRAND["font"],
        "website_url": WEBSITE_URL,
        "contact_email": CONTACT_EMAIL,
        "unsubscribe_url": _escape(unsubscribe_url),
        "social_links_html": build_social_links_html(),
        "footer_nav_html": footer_nav_html(),
        "logo_html": logo_html(),
        "tagline_eyebrow_html": tagline_eyebrow_html(),
        "brand_name": BRAND_NAME,
        "service_label": _escape(service_label),
    }


def _content_values(content: dict[str, Any]) -> dict[str, str]:
    skip_keys = {"email_type", "service"}
    return {
        key: str(value)
        for key, value in content.items()
        if key not in skip_keys and value is not None
    }


def _append_text_footer(body: str, unsubscribe_url: str) -> str:
    return (
        f"{body.rstrip()}\n\n"
        "---\n"
        f"Estra Digital | estradigital.co.uk\n"
        f"Don't want to hear from us? Unsubscribe: {unsubscribe_url}"
    )


def render_email(
    lead: dict[str, Any],
    email_type: str,
    token: str,
    *,
    original_subject: str | None = None,
    service: str | None = None,
) -> tuple[str, str, str]:
    app_url = os.environ.get("APP_URL", "http://localhost:3000").rstrip("/")
    lead_id = str(lead["_id"])
    unsubscribe_url = f"{app_url}/api/unsubscribe?token={token}"
    template_key = EMAIL_TYPE_TEMPLATE_MAP.get(email_type, "initial")

    service_links_html = build_service_links_html(lead_id, app_url)
    service_links_text = build_service_links_text(lead_id, app_url)

    content = build_email_content(
        lead,
        email_type,
        service=service,
        original_subject=original_subject,
        service_links_html=service_links_html,
        service_links_text=service_links_text,
    )

    service_key = str(content.get("service") or service or "web-design")
    service_label = SERVICE_LABELS.get(service_key, service_key.replace("-", " ").title())

    brand = _brand_values(
        unsubscribe_url=unsubscribe_url,
        service_label=service_label,
    )
    slots = {**brand, **_content_values(content)}

    body_html = _replace_placeholders(_load_template(f"{template_key}.html"), slots)
    base_html = _replace_placeholders(
        _load_template("base.html"),
        {**brand, "body_content": body_html},
    )

    text_template = _load_template(f"{template_key}.txt")
    plain_body = _replace_placeholders(text_template, slots)
    plain_text = _append_text_footer(plain_body, unsubscribe_url)

    subject = str(content.get("subject") or "Quick thought about your online presence").strip()
    return subject, base_html, plain_text
