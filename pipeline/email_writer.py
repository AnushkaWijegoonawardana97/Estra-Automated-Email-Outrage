from __future__ import annotations

import os
import re
import uuid
from pathlib import Path
from typing import Any

from anthropic import Anthropic

from db import get_config

PROMPTS_DIR = Path(__file__).parent / "prompts"
CLAUDE_MODEL = "claude-3-5-haiku-latest"
SERVICE_URLS = {
    "web-design": "https://estradigital.co.uk/services/web-design",
    "seo": "https://estradigital.co.uk/services/seo",
    "automation": "https://estradigital.co.uk/services/automation",
}


def _load_prompt(name: str, config: dict[str, Any]) -> str:
    prompts = config.get("emailPrompts", {})
    key_map = {
        "initial_email": "initialEmail",
        "followup_generic": "followupGeneric",
        "followup_targeted": "followupTargeted",
    }
    config_key = key_map.get(name, name)
    if prompts.get(config_key):
        return prompts[config_key]
    return (PROMPTS_DIR / f"{name}.txt").read_text()


def _business_context(lead: dict[str, Any]) -> str:
    fields = [
        "businessName",
        "category",
        "city",
        "country",
        "rating",
        "reviewCount",
        "gmbServices",
        "digitalGap",
        "domainAgeYears",
        "topReviewSnippet",
        "businessSummary",
        "website",
    ]
    lines = []
    for field in fields:
        value = lead.get(field)
        if value:
            lines.append(f"{field}: {value}")
    return "\n".join(lines)


def _parse_subject_body(text: str) -> tuple[str, str]:
    subject_match = re.match(r"^Subject:\s*(.+?)(?:\n|$)", text.strip(), re.I)
    if subject_match:
        subject = subject_match.group(1).strip()
        body = re.sub(r"^Subject:\s*.+?\n?", "", text.strip(), count=1, flags=re.I)
        return subject, body.strip()
    return "Quick question about your online presence", text.strip()


def _inject_tracked_links(body: str, lead_id: str, app_url: str) -> str:
    def replace_link(match: re.Match[str]) -> str:
        service = match.group(1)
        track_url = f"{app_url}/api/track?lead={lead_id}&service={service}"
        label = service.replace("-", " ").title()
        return f"{label}: {track_url}"

    body = re.sub(r"\[LINK:([\w-]+)\]", replace_link, body)
    for service, url in SERVICE_URLS.items():
        body = body.replace(url, f"{app_url}/api/track?lead={lead_id}&service={service}")
    return body


def _append_footer(body: str, token: str, app_url: str) -> str:
    unsubscribe_url = f"{app_url}/api/unsubscribe?token={token}"
    footer = (
        "\n\n---\n"
        f"Estra Digital | estradigital.co.uk\n"
        f"Don't want to hear from us? Unsubscribe: {unsubscribe_url}"
    )
    return body + footer


def generate_email(
    lead: dict[str, Any],
    email_type: str = "initial",
    *,
    original_subject: str | None = None,
    service: str | None = None,
) -> tuple[str, str, str]:
    config = get_config()
    app_url = os.environ.get("APP_URL", "http://localhost:3000").rstrip("/")
    token = lead.get("unsubscribeToken") or str(uuid.uuid4())

    if email_type == "initial":
        prompt = _load_prompt("initial_email", config).replace(
            "{business_context}", _business_context(lead)
        )
    elif email_type == "followup_targeted":
        prompt = (
            _load_prompt("followup_targeted", config)
            .replace("{business_context}", _business_context(lead))
            .replace("{service}", service or "web-design")
        )
    else:
        prompt = (
            _load_prompt("followup_generic", config)
            .replace("{business_name}", lead.get("businessName", ""))
            .replace("{original_subject}", original_subject or "")
        )

    client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=700,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text if message.content else ""
    subject, body = _parse_subject_body(raw)
    body = _inject_tracked_links(body, str(lead["_id"]), app_url)
    body = _append_footer(body, token, app_url)
    return subject, body, token
