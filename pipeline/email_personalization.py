from __future__ import annotations

import html
import re
from typing import Any

from email_brand import (
    ABOUT_COPY,
    CAPABILITY_TAGS,
    CONTACT_COPY,
    CTA_COPY,
    HERO_COPY,
    BRAND_NAME,
    COMPANY_INTRO,
    IMAGE_ASSETS,
    NAV_LINKS,
    SERVICE_LABELS,
    SERVICE_PILLAR_COPY,
    WEBSITE_URL,
    WORK_HIGHLIGHTS,
)
from email_components import (
    body_text,
    card_close,
    card_open,
    contact_block_html,
    cta_primary,
    cta_secondary,
    eyebrow,
    nav_links_html,
    pillar_grid,
    reply_prompt,
    section_heading,
    stats_row,
    tag_chips,
    work_card_with_image,
)

SUBJECT_BY_GAP = {
    "no_website": "{businessName}: you're getting reviews but missing a website",
    "social_only": "Quick win for {businessName}'s online presence",
    "weak_site": "Your {city} customers deserve a site that matches your reviews",
}

DEFAULT_SUBJECT = "{businessName}: idea to turn more searches into bookings"

EM_DASH = "\u2014"


def _escape(value: str) -> str:
    return html.escape(value, quote=True)


def _str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _truncate(text: str, max_len: int) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 1].rstrip() + "…"


def _parse_services(lead: dict[str, Any]) -> list[str]:
    raw = lead.get("gmbServices")
    if not raw:
        return []
    if isinstance(raw, list):
        return [str(s).strip() for s in raw if str(s).strip()][:3]
    return [s.strip() for s in str(raw).split(",") if s.strip()][:3]


def _sanitize_copy(text: str) -> str:
    if EM_DASH not in text:
        return text
    return text.replace(f" {EM_DASH} ", ", ").replace(EM_DASH, ", ")


def _rating_line(lead: dict[str, Any]) -> str:
    rating = lead.get("rating")
    review_count = lead.get("reviewCount")
    city = _str(lead.get("city"))
    if rating and float(rating) > 0:
        stars = f"{rating} stars"
        if review_count:
            stars = f"{rating} stars from {review_count} reviews"
        if city:
            return _sanitize_copy(
                f"You've built something people clearly rate highly in {city}, and {stars} speaks for itself."
            )
        return _sanitize_copy(
            f"You've built something people clearly rate highly, and {stars} speaks for itself."
        )
    if city:
        return _sanitize_copy(
            f"I came across {city} businesses doing great work, and yours stood out."
        )
    category = _str(lead.get("category"))
    if category:
        return f"Your {category.lower()} clearly resonates with local customers."
    return "You've built something worth talking about."


def _build_greeting_text(lead: dict[str, Any]) -> str:
    name = _str(lead.get("businessName")) or "there"
    hook = _rating_line(lead)
    return f"Hi team at {name},\n\n{hook}"


def _build_greeting_html(lead: dict[str, Any]) -> str:
    name = _escape(_str(lead.get("businessName")) or "there")
    hook = _escape(_rating_line(lead))
    return (
        f'<p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:#ffffff;">'
        f"Hi team at {name},</p>"
        f'<p style="margin:0;font-size:15px;line-height:1.7;color:#8e8e93;">{hook}</p>'
    )


def _text_to_html_paragraphs(text: str, *, margin_bottom: str = "16px") -> str:
    parts = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not parts:
        return ""
    html_parts = [body_text(_escape(p), margin_bottom=margin_bottom) for p in parts[:-1]]
    html_parts.append(body_text(_escape(parts[-1]), margin_bottom="0"))
    return "".join(html_parts)


def _build_pitch(lead: dict[str, Any]) -> tuple[str, str]:
    gap = _str(lead.get("digitalGap")).lower()
    city = _str(lead.get("city")) or "your area"
    services = _parse_services(lead)
    service1 = services[0] if services else "your services"
    name = _str(lead.get("businessName")) or "your business"

    if gap == "no_website":
        text = (
            f"You're getting found on Google Maps, but there's no website to showcase {service1} "
            f"or take bookings. We build fast, modern sites that turn searches into enquiries."
        )
    elif gap == "social_only":
        text = _sanitize_copy(
            "Your social channels are working, but a proper website would help you rank on Google "
            "and capture enquiries around the clock."
        )
    elif gap == "weak_site":
        text = (
            f"Your site doesn't quite match the quality you deliver in {city}. "
            f"A sharper website + local SEO could bring more of the right customers."
        )
    else:
        text = (
            f"There's a clear opportunity to turn more online searches into bookings for {name}. "
            f"We help local businesses grow with websites, SEO, and smart automation."
        )

    pitch_html = body_text(_escape(text), margin_bottom="20px")
    return text, pitch_html


def build_simple_initial_content(
    lead: dict[str, Any],
    *,
    service_links_html: str = "",
    service_links_text: str = "",
) -> dict[str, str]:
    greeting_html = _build_greeting_html(lead)
    greeting_text = _build_greeting_text(lead)
    pitch_text, pitch_html = _build_pitch(lead)

    secondary_links_html = (
        f'{cta_secondary(NAV_LINKS["Work"], CTA_COPY["secondary_work"])}'
        f' &nbsp;&nbsp; {cta_secondary(NAV_LINKS["Services"], CTA_COPY["secondary_services"])}'
    )
    secondary_links_text = (
        f"{CTA_COPY['secondary_work']}: {NAV_LINKS['Work']}\n"
        f"{CTA_COPY['secondary_services']}: {NAV_LINKS['Services']}"
    )

    return {
        "greeting_html": greeting_html,
        "greeting_text": greeting_text,
        "pitch_html": pitch_html,
        "pitch_text": pitch_text,
        "personalized_pitch_html": pitch_html,
        "personalized_pitch_text": pitch_text,
        "primary_cta_html": cta_primary(NAV_LINKS["Contact"]),
        "primary_cta_text": f"{CTA_COPY['primary']}: {NAV_LINKS['Contact']}",
        "secondary_links_html": secondary_links_html,
        "secondary_links_text": secondary_links_text,
        "service_links_html": service_links_html,
        "service_links_text": service_links_text,
        "reply_html": reply_prompt(),
        "reply_text": CTA_COPY["reply"],
    }


def _subject_for_lead(lead: dict[str, Any], email_type: str, *, original_subject: str | None = None, service: str | None = None) -> str:
    name = _str(lead.get("businessName")) or "your business"
    city = _str(lead.get("city")) or "your area"

    if email_type == "followup_generic":
        return f"Re: {original_subject}" if original_subject else f"Following up on {name}"

    if email_type == "followup_targeted":
        label = SERVICE_LABELS.get(service or "", "our services")
        return f"{name}: thoughts on {label.lower()}?"

    gap = _str(lead.get("digitalGap")).lower()
    template = SUBJECT_BY_GAP.get(gap, DEFAULT_SUBJECT)
    return template.format(businessName=name, city=city)


def _select_work_highlight(
    lead: dict[str, Any],
    *,
    service: str | None = None,
) -> str:
    gap = _str(lead.get("digitalGap")).lower()
    if service == "automation":
        return "eventbook"
    if gap == "social_only":
        return "ordexia"
    if gap in ("no_website", "weak_site"):
        return "thesistechhub"
    return "thesistechhub"


def _work_highlight_for_service(service: str | None) -> str:
    if service == "automation":
        return "eventbook"
    if service == "seo":
        return "thesistechhub"
    if service == "web-design":
        return "thesistechhub"
    return "thesistechhub"


def build_intro_section(*, include_hero: bool = False) -> tuple[str, str]:
    intro_html = (
        card_open()
        + eyebrow(f"About {BRAND_NAME}")
        + section_heading(HERO_COPY["headline"])
        + body_text(_escape(HERO_COPY["subhead"]))
        + body_text(_escape(HERO_COPY["home"]), margin_bottom="8px")
        + stats_row()
        + f'<p style="margin:8px 0 0;">{nav_links_html()}</p>'
        + card_close()
    )
    intro_text = (
        f"ABOUT ESTRA\n{HERO_COPY['headline']}\n{HERO_COPY['subhead']}\n"
        f"{HERO_COPY['home']}\n"
        f"Services: {NAV_LINKS['Services']}\n"
        f"Work: {NAV_LINKS['Work']}\n"
    )
    return intro_html, intro_text


def build_pillars_section() -> tuple[str, str]:
    html_block = (
        card_open()
        + eyebrow("What we do")
        + section_heading("Four pillars. One team.")
        + pillar_grid()
        + f'<p style="margin:16px 0 0;">{cta_secondary(NAV_LINKS["Services"], CTA_COPY["secondary_services"])}</p>'
        + card_close()
    )
    text_block = f"WHAT WE DO\nExplore our services: {NAV_LINKS['Services']}\n"
    return html_block, text_block


def build_proof_section(
    lead: dict[str, Any],
    *,
    service: str | None = None,
    service_links_html: str = "",
    service_links_text: str = "",
) -> tuple[str, str]:
    key = _select_work_highlight(lead, service=service)
    work = WORK_HIGHLIGHTS[key]
    image_url = IMAGE_ASSETS[work["image_key"]]

    work_html = work_card_with_image(
        image_url,
        work["title"],
        work["description"],
        CTA_COPY["secondary_work"],
        NAV_LINKS["Work"],
        category=work["category"],
        image_link_href=work["url"],
    )

    caps_html = (
        card_open(margin_bottom="0")
        + eyebrow("Proof & capabilities")
        + work_html
        + body_text("Here's how we can help businesses like yours:", margin_bottom="8px")
        + f'<p style="margin:0;font-size:14px;line-height:1.8;color:#ffffff;">{service_links_html}</p>'
        + tag_chips(CAPABILITY_TAGS)
        + card_close()
    )
    caps_text = (
        f"PROOF: {work['title']}: {work['url']}\n"
        f"How we can help:\n{service_links_text}\n"
    )
    return caps_html, caps_text


def build_cta_section() -> tuple[str, str]:
    html_block = (
        card_open(margin_bottom="0")
        + eyebrow("Next step")
        + section_heading(CONTACT_COPY["headline"])
        + body_text(_escape(CONTACT_COPY["subhead"]), margin_bottom="20px")
        + cta_primary(NAV_LINKS["Contact"])
        + reply_prompt()
        + contact_block_html()
        + card_close()
    )
    text_block = (
        f"{CONTACT_COPY['headline']}\n"
        f"{CTA_COPY['primary']}: {NAV_LINKS['Contact']}\n"
        f"{CTA_COPY['reply']}\n"
        f"hello@estradigital.co.uk\n"
    )
    return html_block, text_block


def build_followup_generic(lead: dict[str, Any]) -> dict[str, str]:
    name = _str(lead.get("businessName")) or "there"
    greeting_text = f"Hi team at {name},"
    greeting_html = (
        f'<p style="margin:0 0 12px;font-size:16px;color:#ffffff;">'
        f"Hi team at {_escape(name)},</p>"
    )
    reminder = _sanitize_copy(
        "Just wanted to bump this in case it got buried. I had a genuine idea for your online presence."
    )
    proof = f"We've shipped 150+ projects with a 99.9% client satisfaction rate. {ABOUT_COPY['headline']}"

    body_html = (
        card_open()
        + eyebrow("Following up")
        + greeting_html
        + body_text(_escape(reminder))
        + body_text(_escape(proof), margin_bottom="20px")
        + cta_primary(NAV_LINKS["Contact"], CTA_COPY["followup"])
        + reply_prompt()
        + card_close()
    )
    body_text_plain = (
        f"{greeting_text}\n\n{reminder}\n\n{proof}\n\n"
        f"{CTA_COPY['followup']}: {NAV_LINKS['Contact']}\n"
        f"{CTA_COPY['reply']}\n"
    )
    return {
        "greeting_html": greeting_html,
        "greeting_text": greeting_text,
        "body_html": body_html,
        "body_text": body_text_plain,
    }


def build_followup_targeted(
    lead: dict[str, Any],
    service: str | None,
) -> dict[str, str]:
    name = _str(lead.get("businessName")) or "there"
    service_key = service or "web-design"
    service_label = SERVICE_LABELS.get(service_key, service_key.replace("-", " ").title())
    benefit = SERVICE_PILLAR_COPY.get(
        service_key,
        "We help businesses like yours grow with a sharper digital presence.",
    )

    key = _work_highlight_for_service(service_key)
    work = WORK_HIGHLIGHTS[key]
    image_url = IMAGE_ASSETS[work["image_key"]]

    greeting_text = f"Hi team at {name},"
    greeting_html = (
        f'<p style="margin:0 0 12px;font-size:16px;color:#ffffff;">'
        f"Hi team at {_escape(name)},</p>"
    )
    reference = _sanitize_copy(
        f"I noticed you checked out our {service_label.lower()} page. Thanks for taking a look."
    )

    work_html = work_card_with_image(
        image_url,
        work["title"],
        work["description"],
        CTA_COPY["secondary_work"],
        work["url"],
        category=work["category"],
        image_link_href=work["url"],
    )

    cta_label = f"Let's talk about {service_label.lower()} for {name} →"
    body_html = (
        card_open()
        + eyebrow(service_label)
        + greeting_html
        + body_text(_escape(reference))
        + body_text(_escape(benefit), margin_bottom="16px")
        + work_html
        + cta_primary(NAV_LINKS["Contact"], cta_label)
        + reply_prompt()
        + card_close()
    )
    body_text_plain = (
        f"{greeting_text}\n\n{reference}\n\n{benefit}\n\n"
        f"{work['title']}: {work['url']}\n\n"
        f"{cta_label}: {NAV_LINKS['Contact']}\n"
        f"{CTA_COPY['reply']}\n"
    )
    return {
        "greeting_html": greeting_html,
        "greeting_text": greeting_text,
        "service_reference_html": body_text(_escape(reference)),
        "service_reference_text": reference,
        "body_html": body_html,
        "body_text": body_text_plain,
        "service": service_key,
    }


def _sanitize_content(content: dict[str, Any]) -> dict[str, Any]:
    sanitized: dict[str, Any] = {}
    for key, value in content.items():
        if isinstance(value, str):
            sanitized[key] = _sanitize_copy(value)
        else:
            sanitized[key] = value
    return sanitized


def build_email_content(
    lead: dict[str, Any],
    email_type: str = "initial",
    *,
    service: str | None = None,
    original_subject: str | None = None,
    service_links_html: str = "",
    service_links_text: str = "",
) -> dict[str, Any]:
    subject = _subject_for_lead(
        lead,
        email_type,
        original_subject=original_subject,
        service=service,
    )

    if email_type == "followup_generic":
        followup = build_followup_generic(lead)
        return _sanitize_content({
            "subject": subject,
            "email_type": email_type,
            **followup,
        })

    if email_type == "followup_targeted":
        followup = build_followup_targeted(lead, service)
        return _sanitize_content({
            "subject": subject,
            "email_type": email_type,
            **followup,
        })

    greeting_html = _build_greeting_html(lead)
    greeting_text = _build_greeting_text(lead)
    initial_slots = build_simple_initial_content(
        lead,
        service_links_html=service_links_html,
        service_links_text=service_links_text,
    )

    body_text_plain = (
        f"{greeting_text}\n\n"
        f"{initial_slots['pitch_text']}\n\n"
        f"{COMPANY_INTRO}\n\n"
        f"{initial_slots['primary_cta_text']}\n\n"
        f"{initial_slots['secondary_links_text']}\n\n"
        f"How we can help:\n{service_links_text}\n\n"
        f"{initial_slots['reply_text']}\n"
    )

    return _sanitize_content({
        "subject": subject,
        "email_type": email_type,
        "body_text": body_text_plain,
        "greeting_html": greeting_html,
        "greeting_text": greeting_text,
        **initial_slots,
    })
