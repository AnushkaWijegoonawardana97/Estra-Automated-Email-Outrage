from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from anthropic import Anthropic

from ai_config import CLAUDE_MODEL
from db import get_config
from log_util import log_pipeline_event

PROMPTS_DIR = Path(__file__).parent / "prompts"

PROMPT_FILE_MAP = {
    "initial": "content_initial",
    "followup_generic": "content_followup_generic",
    "followup_targeted": "content_followup_targeted",
}

CONFIG_KEY_MAP = {
    "initial": "initialEmail",
    "followup_generic": "followupGeneric",
    "followup_targeted": "followupTargeted",
}

REQUIRED_KEYS = {
    "initial": ["subject", "greeting", "opening_hook", "gap_insight", "service_pitch", "cta_line"],
    "followup_generic": ["subject", "greeting", "body"],
    "followup_targeted": ["subject", "greeting", "service_reference", "body"],
}


def business_context(lead: dict[str, Any]) -> str:
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


def _load_prompt(email_type: str, config: dict[str, Any]) -> str:
    prompts = config.get("emailPrompts", {})
    config_key = CONFIG_KEY_MAP.get(email_type, "")
    file_name = PROMPT_FILE_MAP.get(email_type, "content_initial")
    file_prompt = (PROMPTS_DIR / f"{file_name}.txt").read_text()

    db_prompt = prompts.get(config_key, "") if config_key else ""
    if db_prompt and "valid JSON" in db_prompt:
        return db_prompt

    return file_prompt


def _extract_json(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.S)
    if fence_match:
        cleaned = fence_match.group(1)
    else:
        brace_match = re.search(r"\{.*\}", cleaned, re.S)
        if brace_match:
            cleaned = brace_match.group(0)
    return json.loads(cleaned)


def _validate_content(email_type: str, content: dict[str, Any]) -> dict[str, Any]:
    required = REQUIRED_KEYS.get(email_type, REQUIRED_KEYS["initial"])
    missing = [key for key in required if not str(content.get(key, "")).strip()]
    if missing:
        raise ValueError(f"Missing content keys: {', '.join(missing)}")
    return {key: str(content[key]).strip() for key in required if key in content}


def generate_content(
    lead: dict[str, Any],
    email_type: str = "initial",
    *,
    original_subject: str | None = None,
    service: str | None = None,
) -> dict[str, Any]:
    config = get_config()
    prompt_template = _load_prompt(email_type, config)
    prompt = (
        prompt_template.replace("{business_context}", business_context(lead))
        .replace("{business_name}", lead.get("businessName", ""))
        .replace("{original_subject}", original_subject or "")
        .replace("{service}", service or "web-design")
    )

    client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text if message.content else ""

    try:
        parsed = _extract_json(raw)
        content = _validate_content(email_type, parsed)
    except (json.JSONDecodeError, ValueError) as error:
        log_pipeline_event(
            "email_writer",
            f"Content parse failed for {lead.get('businessName')}: {error}",
            level="error",
            metadata={"emailType": email_type, "raw": raw[:500]},
        )
        raise

    if email_type == "followup_targeted" and service:
        content["service"] = service

    return content
