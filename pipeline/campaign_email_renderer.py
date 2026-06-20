from __future__ import annotations

import html
import os
import uuid
from pathlib import Path
from typing import Any

from campaign_email_brand import BRAND, BRAND_NAME, CAMPAIGN_TEMPLATES, CONTACT_EMAIL, WEBSITE_URL
from campaign_email_components import (
    build_social_links_html,
    footer_nav_html,
    logo_html,
    tagline_eyebrow_html,
)
from campaign_email_personalization import build_campaign_content

TEMPLATES_DIR = Path(__file__).parent / "campaign_templates"


def _escape(value: str) -> str:
    return html.escape(value, quote=True)


def _load_template(name: str) -> str:
    return (TEMPLATES_DIR / name).read_text()


def _replace_placeholders(template: str, values: dict[str, str]) -> str:
    result = template
    for key, value in values.items():
        result = result.replace(f"{{{{{key}}}}}", value)
    return result


def _brand_values(*, unsubscribe_url: str) -> dict[str, str]:
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
    }


def _content_values(content: dict[str, Any]) -> dict[str, str]:
    return {key: str(value) for key, value in content.items() if value is not None}


def _append_text_footer(body: str, unsubscribe_url: str) -> str:
    return (
        f"{body.rstrip()}\n\n"
        "---\n"
        f"Estra Digital | estradigital.co.uk\n"
        f"Don't want to hear from us? Unsubscribe: {unsubscribe_url}"
    )


def render_campaign_email(
    lead: dict[str, Any],
    template_id: str,
    token: str,
    *,
    media_overrides: dict[str, str] | None = None,
) -> tuple[str, str, str]:
    if template_id not in CAMPAIGN_TEMPLATES:
        raise ValueError(f"Unknown campaign template: {template_id}")

    app_url = os.environ.get("APP_URL", "http://localhost:3000").rstrip("/")
    unsubscribe_url = f"{app_url}/api/unsubscribe?token={token}"

    content = build_campaign_content(
        lead,
        template_id,
        media_overrides=media_overrides,
    )

    brand = _brand_values(unsubscribe_url=unsubscribe_url)
    slots = {**brand, **_content_values(content)}

    body_html = _replace_placeholders(_load_template(f"{template_id}.html"), slots)
    base_html = _replace_placeholders(
        _load_template("base.html"),
        {**brand, "body_content": body_html},
    )

    text_template = _load_template(f"{template_id}.txt")
    plain_body = _replace_placeholders(text_template, slots)
    plain_text = _append_text_footer(plain_body, unsubscribe_url)

    subject = str(content.get("subject") or "A visual proposal for your business").strip()
    return subject, base_html, plain_text


def generate_campaign_email(
    lead: dict[str, Any],
    template_id: str = "proposal_v1",
    *,
    media_overrides: dict[str, str] | None = None,
) -> tuple[str, str, str, str]:
    token = lead.get("unsubscribeToken") or str(uuid.uuid4())
    subject, html_body, text_body = render_campaign_email(
        lead,
        template_id,
        token,
        media_overrides=media_overrides,
    )
    return subject, html_body, text_body, token
