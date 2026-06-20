from __future__ import annotations

import os

BRAND = {
    "bg": "#050505",
    "card": "#0c0c0e",
    "elevated": "#141418",
    "border": "#1a1a1e",
    "text": "#ffffff",
    "muted": "#8e8e93",
    "accent": "#8b5cf6",
    "violet": "#a855f7",
    "cta_bg": "#ffffff",
    "cta_text": "#000000",
    "font": "Arial, Helvetica, sans-serif",
}

LOGO_ACCENT = "Es"
LOGO_REST = "tra"
BRAND_NAME = "Estra Digital"
TAGLINE_EYEBROW = "DESIGN · DEVELOPMENT · SECURITY · AI."

WEBSITE_URL = "https://www.estradigital.co.uk"
CONTACT_URL = f"{WEBSITE_URL}/contact"
WORK_URL = f"{WEBSITE_URL}/work"
SERVICES_URL = f"{WEBSITE_URL}/services"
CONTACT_EMAIL = "hello@estradigital.co.uk"

NAV_LINKS = {
    "Services": f"{WEBSITE_URL}/services",
    "Work": WORK_URL,
    "About": f"{WEBSITE_URL}/about",
    "Contact": CONTACT_URL,
}

SOCIAL_LINKS = {
    "LinkedIn": "https://www.linkedin.com/company/estra-digital",
    "Twitter": "https://twitter.com/estradigital",
    "GitHub": "https://github.com/estradigital",
}

STATS = [
    ("7+", "Years"),
    ("150+", "Projects"),
    ("50+", "Clients"),
    ("99.9%", "Satisfaction"),
]

PILLARS = [
    {
        "name": "Design",
        "headline": "Experiences that captivate",
        "description": "UI/UX, brand identity, and interfaces people remember.",
    },
    {
        "name": "Development",
        "headline": "Systems that scale",
        "description": "Web apps, mobile, and platforms built to perform.",
    },
    {
        "name": "SEO",
        "headline": "Visibility that converts",
        "description": "Local search, technical SEO, and content that ranks.",
    },
    {
        "name": "AI",
        "headline": "Intelligence that delivers",
        "description": "Automation, agents, and workflows that save time.",
    },
]

CAPABILITY_TAGS = ["UI/UX", "React", "SEO", "AI Automation", "Mobile", "Security"]

CTA_COPY = {
    "primary": "Book a free 15-min call →",
    "secondary_work": "See our work →",
    "secondary_services": "Explore our services →",
    "demo_video": "Watch 60s demo →",
    "reply": "Or reply to this email. Happy to chat, no pressure.",
}

CAMPAIGN_TEMPLATES = {
    "proposal_v1": {
        "label": "Visual Proposal",
        "description": "Greeting, intro, SEO/UI audit, demo preview, capabilities, CTA",
    },
}

CAMPAIGN_MEDIA_DEFAULTS = {
    "seo_report": "estra-campaigns/defaults/seo-audit-sample",
    "ui_issues": "estra-campaigns/defaults/ui-issues-sample",
    "demo_preview_restaurant": "estra-campaigns/defaults/demo-preview-restaurant",
    "demo_preview_generic": "estra-campaigns/defaults/demo-preview-generic",
    "hero_band": "estra-campaigns/defaults/hero-gradient",
}

FALLBACK_IMAGES = {
    "seo_report": f"{WEBSITE_URL}/images/hero-gradient.png",
    "ui_issues": f"{WEBSITE_URL}/images/work-eventbook.png",
    "demo_preview_restaurant": f"{WEBSITE_URL}/images/work-ordexia.png",
    "demo_preview_generic": f"{WEBSITE_URL}/images/work-thesistechhub.png",
    "hero_band": f"{WEBSITE_URL}/images/hero-gradient.png",
}

EMAIL_IMAGE_WIDTH = 520


def cloudinary_url(
    public_id: str,
    *,
    width: int = EMAIL_IMAGE_WIDTH,
    resource_type: str = "image",
    secure: bool = True,
) -> str:
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME", "").strip()
    if not cloud_name:
        key = public_id.split("/")[-1].replace("-", "_")
        for asset_key, pid in CAMPAIGN_MEDIA_DEFAULTS.items():
            if pid == public_id:
                return FALLBACK_IMAGES.get(asset_key, FALLBACK_IMAGES["demo_preview_generic"])
        return FALLBACK_IMAGES.get("demo_preview_generic", FALLBACK_IMAGES["hero_band"])

    host = "res.cloudinary.com"
    scheme = "https" if secure else "http"
    transforms = f"w_{width},c_limit,f_auto,q_auto,dpr_1.0"
    return f"{scheme}://{host}/{cloud_name}/{resource_type}/upload/{transforms}/{public_id}"


def resolve_media_url(
    override_url: str | None,
    default_key: str,
    *,
    width: int = EMAIL_IMAGE_WIDTH,
) -> str:
    if override_url and override_url.strip():
        return override_url.strip()
    public_id = CAMPAIGN_MEDIA_DEFAULTS.get(default_key, "")
    if public_id:
        return cloudinary_url(public_id, width=width)
    return FALLBACK_IMAGES.get(default_key, FALLBACK_IMAGES["demo_preview_generic"])


def demo_preview_key_for_category(category: str) -> str:
    lowered = (category or "").lower()
    hospitality_keywords = (
        "restaurant",
        "steak",
        "cafe",
        "coffee",
        "bar",
        "hotel",
        "food",
        "dining",
    )
    if any(keyword in lowered for keyword in hospitality_keywords):
        return "demo_preview_restaurant"
    return "demo_preview_generic"
