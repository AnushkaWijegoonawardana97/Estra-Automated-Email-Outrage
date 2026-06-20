from __future__ import annotations

import html
import re
from typing import Any

from campaign_email_brand import (
    BRAND,
    CAPABILITY_TAGS,
    CONTACT_URL,
    SERVICES_URL,
    WORK_URL,
    demo_preview_key_for_category,
    resolve_media_url,
)
from campaign_email_components import (
    body_text,
    bullet_list_html,
    card_close,
    card_open,
    cta_primary,
    cta_secondary,
    demo_browser_frame,
    eyebrow,
    hero_image_band,
    issue_card_with_image,
    issues_row_html,
    pillar_grid,
    reply_prompt,
    section_heading,
    stats_row,
    tag_chips,
)


def _escape(value: str) -> str:
    return html.escape(value, quote=True)


def _str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _subject_for_lead(lead: dict[str, Any]) -> str:
    name = _str(lead.get("businessName")) or "your business"
    return f"{name}: a visual proposal to improve your online presence"


def _greeting_opener(lead: dict[str, Any]) -> str:
    city = _str(lead.get("city"))
    category = _str(lead.get("category")) or "business"
    name = _str(lead.get("businessName")) or "there"
    if city:
        return (
            f"We've been looking at how {category.lower()} businesses in {city} "
            f"show up online, and wanted to share a few ideas for {name}."
        )
    return (
        f"We've been looking at how {category.lower()} businesses show up online, "
        f"and wanted to share a few ideas for {name}."
    )


def _issues_copy(lead: dict[str, Any]) -> tuple[str, str, str]:
    gap = _str(lead.get("digitalGap"))
    rating = lead.get("rating") or 0
    reviews = lead.get("reviewCount") or 0
    summary = _str(lead.get("businessSummary"))
    website = _str(lead.get("website"))

    if gap == "no_website":
        headline = "Strong reviews, but no owned website to capture demand"
        seo = "Local searches may not surface you consistently without a dedicated site and structured data."
        ui = "Customers often bounce to competitors when they can't browse menus, book, or contact you directly."
    elif gap == "social_only":
        headline = "Social presence without a site that converts search traffic"
        seo = "Google tends to favour businesses with fast, indexable websites over link-in-bio profiles alone."
        ui = "Social feeds rarely offer the booking flow and trust signals diners expect when comparing options."
    elif gap == "weak_site":
        headline = "Your site may not match the quality of your in-person experience"
        seo = "Page speed, mobile usability, and local SEO signals look like missed opportunities."
        ui = "Outdated layout, weak calls-to-action, and friction on mobile can cost bookings."
    else:
        headline = "A few digital gaps that could be costing you bookings"
        seo = "Local visibility and technical SEO are worth a closer look for businesses in your category."
        ui = "First impressions online should feel as polished as the experience inside your venue."

    if rating and float(rating) >= 4.0 and int(reviews) >= 0:
        headline = f"{headline} (you're rated {rating}★ — worth showcasing better online)"

    if summary:
        seo = f"{seo} {summary[:120].rstrip()}…" if len(summary) > 120 else f"{seo} {summary}"

    if website:
        ui = f"{ui} We reviewed {website.split('?')[0]}."

    return headline, seo, ui


def _capability_bullets(lead: dict[str, Any]) -> list[str]:
    gap = _str(lead.get("digitalGap"))
    city = _str(lead.get("city")) or "your area"
    if gap == "no_website":
        return [
            f"A fast, modern website built for {city} searches and mobile bookings",
            "Local SEO setup so Google Maps and search send ready-to-book customers",
            "Simple enquiry and reservation flows that reduce back-and-forth",
        ]
    if gap == "social_only":
        return [
            "An owned website that turns Instagram interest into direct bookings",
            f"Local SEO to rank when people search in {city}",
            "Automation for enquiries, follow-ups, and repetitive admin",
        ]
    if gap == "weak_site":
        return [
            "A redesign that matches your reviews and brand quality",
            "Speed, mobile UX, and conversion improvements",
            "SEO and analytics so you know what's working",
        ]
    return [
        "Sharper web design that turns browsers into bookings",
        f"Local SEO for {city} and surrounding searches",
        "AI automation for enquiries and follow-ups",
    ]


def build_proposal_content(
    lead: dict[str, Any],
    *,
    media_overrides: dict[str, str] | None = None,
) -> dict[str, Any]:
    overrides = media_overrides or {}
    name = _str(lead.get("businessName")) or "there"
    category = _str(lead.get("category")) or "business"

    seo_url = resolve_media_url(overrides.get("seoReportUrl"), "seo_report")
    ui_url = resolve_media_url(overrides.get("uiIssuesUrl"), "ui_issues")
    demo_key = demo_preview_key_for_category(category)
    demo_url = resolve_media_url(overrides.get("demoPreviewUrl"), demo_key)
    hero_url = resolve_media_url(overrides.get("heroBandUrl"), "hero_band")
    demo_video_url = overrides.get("demoVideoUrl") or None

    headline, seo_copy, ui_copy = _issues_copy(lead)
    bullets = _capability_bullets(lead)

    greeting_line = (
        f'Hi <strong style="color:{BRAND["text"]};">{_escape(name)}</strong> team,'
    )
    greeting_html = (
        f"{eyebrow('Personalised proposal')}"
        f"{body_text(greeting_line, margin_bottom='12px')}"
        f"{body_text(_escape(_greeting_opener(lead)), margin_bottom='0')}"
    )

    intro_html = (
        f"{card_open()}"
        f"{section_heading('Meet Estra Digital')}"
        f"{body_text('We combine design, development, security, and AI so your digital presence works as hard as you do.')}"
        f"{stats_row()}"
        f"{hero_image_band(hero_url, 'Estra Digital')}"
        f"{card_close()}"
    )

    seo_card = issue_card_with_image(
        title="SEO & visibility",
        caption=seo_copy,
        image_url=seo_url,
        alt=f"SEO audit insights for {name}",
    )
    ui_card = issue_card_with_image(
        title="Website & UX",
        caption=ui_copy,
        image_url=ui_url,
        alt=f"UI issues for {name}",
    )

    issues_html = (
        f"{card_open()}"
        f"{section_heading(f'What we noticed about {name}')}"
        f"{body_text(_escape(headline))}"
        f"{issues_row_html(seo_card, ui_card)}"
        f"{card_close()}"
    )

    demo_html = (
        f"{card_open()}"
        f"{section_heading('A quick look at what we would build for you')}"
        f"{demo_browser_frame(business_name=name, preview_image_url=demo_url, demo_video_url=demo_video_url)}"
        f"{body_text('This is a concept direction — we would refine it with your brand before build.', margin_bottom='12px')}"
        f'<p style="margin:0;text-align:center;">{cta_secondary(WORK_URL, "See our work →")}</p>'
        f"{card_close()}"
    )

    capabilities_html = (
        f"{card_open()}"
        f"{section_heading('What we can do')}"
        f"{pillar_grid()}"
        f"{bullet_list_html(bullets)}"
        f"{tag_chips(CAPABILITY_TAGS)}"
        f"{card_close()}"
    )

    cta_html = (
        f'{card_open(padding="28px 24px")}'
        f"{section_heading('Ready to turn more searches into bookings?')}"
        f"{body_text('Book a free 15-minute call — no pitch deck, just an honest conversation about what would move the needle for you.')}"
        f"{cta_primary(CONTACT_URL)}"
        f'<p style="margin:0;text-align:center;line-height:2;">'
        f'{cta_secondary(SERVICES_URL, "Explore our services →")}'
        f"</p>"
        f"{reply_prompt()}"
        f"{card_close()}"
    )

    plain_greeting = f"Hi {name} team,\n\n{_greeting_opener(lead)}"
    plain_issues = f"What we noticed:\n{headline}\n\nSEO: {seo_copy}\n\nUX: {ui_copy}"
    plain_demo = "We put together a concept direction for your new site — reply to see more."
    plain_capabilities = "What we can do:\n" + "\n".join(f"- {item}" for item in bullets)
    plain_cta = (
        f"Book a free 15-min call: {CONTACT_URL}\n"
        f"See our work: {WORK_URL}\n\n"
        "Or reply to this email. Happy to chat, no pressure."
    )
    body_text_plain = "\n\n".join(
        [plain_greeting, plain_demo, plain_issues, plain_capabilities, plain_cta]
    )

    return {
        "subject": _subject_for_lead(lead),
        "greeting_html": greeting_html,
        "intro_html": intro_html,
        "issues_html": issues_html,
        "demo_html": demo_html,
        "capabilities_html": capabilities_html,
        "cta_html": cta_html,
        "body_text": body_text_plain,
    }


def build_campaign_content(
    lead: dict[str, Any],
    template_id: str = "proposal_v1",
    *,
    media_overrides: dict[str, str] | None = None,
) -> dict[str, Any]:
    if template_id == "proposal_v1":
        return build_proposal_content(lead, media_overrides=media_overrides)
    raise ValueError(f"Unknown campaign template: {template_id}")
