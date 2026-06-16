from __future__ import annotations

import html

from email_brand import (
    BRAND,
    CTA_COPY,
    IMAGE_DIMENSIONS,
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


def body_text(text: str, *, margin_bottom: str = "16px") -> str:
    return (
        f'<p style="margin:0 0 {margin_bottom};font-size:15px;line-height:1.7;'
        f'color:{BRAND["muted"]};">{text}</p>'
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


def cta_primary(href: str, label: str | None = None) -> str:
    text = _escape(label or CTA_COPY["primary"])
    url = _escape(href)
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" '
        f'style="margin:0 auto 16px;">'
        f"<tr><td style=\"border-radius:9999px;background-color:{BRAND['cta_bg']};\">"
        f'<a href="{url}" style="display:inline-block;padding:14px 28px;'
        f"font-size:14px;font-weight:700;color:{BRAND['cta_text']};"
        f'text-decoration:none;">{text}</a>'
        f"</td></tr></table>"
    )


def cta_secondary(href: str, label: str) -> str:
    url = _escape(href)
    return (
        f'<a href="{url}" style="color:{BRAND["accent"]};font-size:14px;'
        f'font-weight:600;text-decoration:none;">{_escape(label)}</a>'
    )


def reply_prompt() -> str:
    return body_text(
        f'<span style="color:{BRAND["text"]};">{_escape(CTA_COPY["reply"])}</span>',
        margin_bottom="0",
    )


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
    for i in range(0, len(PILLARS), 2):
        pair = PILLARS[i : i + 2]
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
    return (
        f'<p style="margin:12px 0 0;line-height:1.8;">{"".join(chips)}</p>'
    )


def nav_links_html() -> str:
    parts: list[str] = []
    for label, url in NAV_LINKS.items():
        parts.append(
            f'<a href="{_escape(url)}" style="color:{BRAND["accent"]};'
            f'font-size:13px;font-weight:600;text-decoration:none;">'
            f"{_escape(label)} →</a>"
        )
    return " &nbsp;&nbsp; ".join(parts)


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


def hero_image_band(
    image_url: str,
    link_href: str,
    alt: str,
    *,
    width: int | None = None,
    height: int | None = None,
) -> str:
    w, h = width or IMAGE_DIMENSIONS["hero_band"][0], height or IMAGE_DIMENSIONS["hero_band"][1]
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="margin-bottom:16px;">'
        f"<tr><td>"
        f'<a href="{_escape(link_href)}" style="text-decoration:none;">'
        f'<img src="{_escape(image_url)}" alt="{_escape(alt)}" width="{w}" height="{h}" '
        f'style="display:block;width:100%;max-width:{w}px;height:auto;border-radius:16px;'
        f'border:0;" />'
        f"</a></td></tr></table>"
    )


def work_card_with_image(
    image_url: str,
    title: str,
    description: str,
    cta_label: str,
    cta_href: str,
    *,
    category: str = "",
    image_link_href: str | None = None,
    width: int | None = None,
    height: int | None = None,
) -> str:
    w, h = width or IMAGE_DIMENSIONS["work_thumb"][0], height or IMAGE_DIMENSIONS["work_thumb"][1]
    img_link = image_link_href or cta_href
    category_html = ""
    if category:
        category_html = (
            f'<p style="margin:0 0 6px;font-size:11px;font-weight:600;'
            f'letter-spacing:0.1em;text-transform:uppercase;color:{BRAND["accent"]};">'
            f"{_escape(category)}</p>"
        )
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background-color:{BRAND["elevated"]};border:1px solid {BRAND["border"]};'
        f'border-radius:16px;overflow:hidden;margin-bottom:16px;">'
        f"<tr><td>"
        f'<a href="{_escape(img_link)}" style="text-decoration:none;">'
        f'<img src="{_escape(image_url)}" alt="{_escape(title)}" width="{w}" height="{h}" '
        f'style="display:block;width:100%;max-width:{w}px;height:auto;border:0;" />'
        f"</a></td></tr>"
        f'<tr><td style="padding:20px;">'
        f"{category_html}"
        f'<p style="margin:0 0 8px;font-size:18px;font-weight:700;color:{BRAND["text"]};">'
        f"{_escape(title)}</p>"
        f'<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:{BRAND["muted"]};">'
        f"{_escape(description)}</p>"
        f"{cta_secondary(cta_href, cta_label)}"
        f"</td></tr></table>"
    )


def contact_block_html() -> str:
    return (
        f'<p style="margin:16px 0 0;font-size:13px;color:{BRAND["muted"]};text-align:center;">'
        f'<a href="mailto:hello@estradigital.co.uk" style="color:{BRAND["text"]};'
        f'text-decoration:none;">hello@estradigital.co.uk</a>'
        f"</p>"
    )
