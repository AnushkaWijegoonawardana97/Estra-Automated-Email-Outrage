from __future__ import annotations

import html
import re

from campaign_email_brand import (
    BRAND,
    CTA_COPY,
    LOGO_ACCENT,
    LOGO_REST,
    NAV_LINKS,
    PILLARS,
    STATS,
    TAGLINE_EYEBROW,
    WEBSITE_URL,
)


def _escape(value: str) -> str:
    return html.escape(value, quote=True)


def eyebrow(label: str) -> str:
    return (
        f'<p style="margin:0 0 12px;font-size:11px;font-weight:600;'
        f'letter-spacing:0.15em;text-transform:uppercase;color:{BRAND["accent"]};">'
        f"{_escape(label)}</p>"
    )


def section_heading(text: str) -> str:
    return (
        f'<p style="margin:0 0 12px;font-size:20px;font-weight:700;'
        f'line-height:1.3;color:{BRAND["text"]};">{_escape(text)}</p>'
    )


def body_text(text: str, *, margin_bottom: str = "16px", color: str | None = None) -> str:
    text_color = color or BRAND["muted"]
    return (
        f'<p style="margin:0 0 {margin_bottom};font-size:15px;line-height:1.7;'
        f'color:{text_color};">{text}</p>'
    )


def card_open(*, padding: str = "24px", margin_bottom: str = "16px") -> str:
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="margin-bottom:{margin_bottom};background-color:{BRAND["card"]};'
        f'border:1px solid {BRAND["border"]};border-radius:20px;">'
        f'<tr><td style="padding:{padding};">'
    )


def card_close() -> str:
    return "</td></tr></table>"


def logo_html() -> str:
    return (
        f'<p style="margin:0;font-size:28px;font-weight:700;line-height:1.2;">'
        f'<span style="color:{BRAND["accent"]};">{LOGO_ACCENT}</span>'
        f'<span style="color:{BRAND["text"]};">{LOGO_REST}</span>'
        f"</p>"
    )


def tagline_eyebrow_html() -> str:
    return (
        f'<p style="margin:8px 0 0;font-size:11px;letter-spacing:0.15em;'
        f'text-transform:uppercase;color:{BRAND["muted"]};">{TAGLINE_EYEBROW}</p>'
    )


def footer_nav_html() -> str:
    parts: list[str] = []
    for label, url in NAV_LINKS.items():
        if label == "Contact":
            continue
        parts.append(
            f'<a href="{_escape(url)}" style="color:{BRAND["muted"]};'
            f'text-decoration:none;font-size:12px;">{_escape(label)}</a>'
        )
    return " &nbsp;·&nbsp; ".join(parts)


def build_social_links_html() -> str:
    from campaign_email_brand import SOCIAL_LINKS

    parts: list[str] = []
    for label, url in SOCIAL_LINKS.items():
        parts.append(
            f'<a href="{_escape(url)}" style="color:{BRAND["muted"]};text-decoration:none;">{label}</a>'
        )
    return " &nbsp;·&nbsp; ".join(parts)


def stats_row() -> str:
    cells: list[str] = []
    for value, label in STATS:
        cells.append(
            f'<td align="center" style="padding:8px 4px;">'
            f'<p style="margin:0;font-size:24px;font-weight:700;color:{BRAND["violet"]};">'
            f"{_escape(value)}</p>"
            f'<p style="margin:4px 0 0;font-size:11px;letter-spacing:0.08em;'
            f'text-transform:uppercase;color:{BRAND["muted"]};">{_escape(label)}</p>'
            f"</td>"
        )
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="margin:16px 0;">'
        f"<tr>{''.join(cells)}</tr></table>"
    )


def pillar_grid() -> str:
    rows: list[str] = []
    for index in range(0, len(PILLARS), 2):
        pair = PILLARS[index : index + 2]
        cells: list[str] = []
        for pillar in pair:
            cells.append(
                f'<td width="50%" valign="top" style="padding:6px;">'
                f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
                f'style="background-color:{BRAND["elevated"]};border:1px solid {BRAND["border"]};'
                f'border-radius:12px;">'
                f'<tr><td style="padding:16px;">'
                f'<p style="margin:0 0 4px;font-size:11px;font-weight:600;'
                f'letter-spacing:0.1em;text-transform:uppercase;color:{BRAND["accent"]};">'
                f"{_escape(pillar['name'])}</p>"
                f'<p style="margin:0 0 6px;font-size:14px;font-weight:700;color:{BRAND["text"]};">'
                f"{_escape(pillar['headline'])}</p>"
                f'<p style="margin:0;font-size:13px;line-height:1.5;color:{BRAND["muted"]};">'
                f"{_escape(pillar['description'])}</p>"
                f"</td></tr></table></td>"
            )
        if len(pair) == 1:
            cells.append('<td width="50%"></td>')
        rows.append(f"<tr>{''.join(cells)}</tr>")
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
        f"{''.join(rows)}</table>"
    )


def tag_chips(tags: list[str]) -> str:
    chips: list[str] = []
    for tag in tags:
        chips.append(
            f'<span style="display:inline-block;margin:0 6px 6px 0;padding:4px 10px;'
            f'font-size:11px;font-weight:600;color:{BRAND["text"]};'
            f'background-color:{BRAND["elevated"]};border:1px solid {BRAND["border"]};'
            f'border-radius:9999px;">{_escape(tag)}</span>'
        )
    return f'<p style="margin:12px 0 0;line-height:1.8;">{"".join(chips)}</p>'


def cta_primary(href: str, label: str | None = None) -> str:
    text = _escape(label or CTA_COPY["primary"])
    url = _escape(href)
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">'
        f"<tr><td style=\"border-radius:9999px;background-color:{BRAND['cta_bg']};\">"
        f'<a href="{url}" style="display:inline-block;padding:14px 28px;'
        f"font-size:14px;font-weight:700;color:{BRAND['cta_text']};"
        f'text-decoration:none;">{text}</a>'
        f"</td></tr></table>"
    )


def cta_secondary(href: str, label: str) -> str:
    return (
        f'<a href="{_escape(href)}" style="color:{BRAND["accent"]};font-size:14px;'
        f'font-weight:600;text-decoration:none;">{_escape(label)}</a>'
    )


def hero_image_band(image_url: str, alt: str, *, width: int = 520, height: int = 200) -> str:
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="margin-bottom:16px;">'
        f"<tr><td>"
        f'<img src="{_escape(image_url)}" alt="{_escape(alt)}" width="{width}" height="{height}" '
        f'style="display:block;width:100%;max-width:{width}px;height:auto;border-radius:16px;'
        f'border:0;" />'
        f"</td></tr></table>"
    )


def issue_card_with_image(
    *,
    title: str,
    caption: str,
    image_url: str,
    alt: str,
    width: int = 248,
) -> str:
    return (
        f'<td width="50%" valign="top" style="padding:6px;">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background-color:{BRAND["elevated"]};border:1px solid {BRAND["border"]};'
        f'border-radius:16px;overflow:hidden;">'
        f"<tr><td>"
        f'<img src="{_escape(image_url)}" alt="{_escape(alt)}" width="{width}" '
        f'style="display:block;width:100%;max-width:100%;height:auto;border:0;" />'
        f"</td></tr>"
        f'<tr><td style="padding:16px;">'
        f'<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:{BRAND["text"]};">'
        f"{_escape(title)}</p>"
        f'<p style="margin:0;font-size:12px;line-height:1.5;color:{BRAND["muted"]};">'
        f"{_escape(caption)}</p>"
        f"</td></tr></table></td>"
    )


def issues_row_html(seo_card: str, ui_card: str) -> str:
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="margin:16px 0;">'
        f"<tr>{seo_card}{ui_card}</tr></table>"
    )


def demo_browser_frame(
    *,
    business_name: str,
    preview_image_url: str,
    demo_video_url: str | None = None,
    width: int = 520,
) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", business_name.lower()).strip("-") or "your-business"
    nav_items = ["Home", "Menu", "Book", "Contact"]
    nav_html = " &nbsp; ".join(
        f'<span style="display:inline-block;padding:4px 10px;font-size:11px;font-weight:600;'
        f'color:{BRAND["text"]};background-color:{BRAND["elevated"]};'
        f'border-radius:9999px;">{_escape(item)}</span>'
        for item in nav_items
    )
    video_cta = ""
    if demo_video_url:
        video_cta = (
            f'<p style="margin:12px 0 0;text-align:center;">'
            f"{cta_secondary(demo_video_url, CTA_COPY['demo_video'])}"
            f"</p>"
        )
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background-color:{BRAND["elevated"]};border:1px solid {BRAND["border"]};'
        f'border-radius:16px;overflow:hidden;margin:16px 0;">'
        f'<tr><td style="padding:12px 16px;background-color:{BRAND["card"]};'
        f'border-bottom:1px solid {BRAND["border"]};">'
        f'<p style="margin:0;font-size:11px;color:{BRAND["muted"]};">'
        f"🔒 https://{_escape(slug)}.co.uk</p>"
        f"</td></tr>"
        f'<tr><td style="padding:16px;text-align:center;">{nav_html}</td></tr>'
        f"<tr><td>"
        f'<img src="{_escape(preview_image_url)}" alt="{_escape(business_name)} concept preview" '
        f'width="{width}" style="display:block;width:100%;max-width:100%;height:auto;border:0;" />'
        f"</td></tr>"
        f'<tr><td style="padding:16px;">{video_cta}</td></tr>'
        f"</table>"
    )


def bullet_list_html(items: list[str]) -> str:
    rows = "".join(
        f'<tr><td valign="top" style="padding:0 8px 8px 0;color:{BRAND["accent"]};">•</td>'
        f'<td style="padding:0 0 8px;font-size:14px;line-height:1.6;color:{BRAND["muted"]};">'
        f"{_escape(item)}</td></tr>"
        for item in items
    )
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0;">'
        f"{rows}</table>"
    )


def reply_prompt() -> str:
    return body_text(
        f'<span style="color:{BRAND["text"]};">{_escape(CTA_COPY["reply"])}</span>',
        margin_bottom="0",
    )
