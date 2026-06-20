from __future__ import annotations

import json
import sys
from typing import Any

from campaign_email_brand import CAMPAIGN_TEMPLATES
from campaign_email_renderer import generate_campaign_email


def _normalize_media_overrides(raw: dict[str, Any] | None) -> dict[str, str]:
    if not raw:
        return {}
    mapping = {
        "seoReportUrl": "seoReportUrl",
        "uiIssuesUrl": "uiIssuesUrl",
        "demoPreviewUrl": "demoPreviewUrl",
        "demoVideoUrl": "demoVideoUrl",
        "heroBandUrl": "heroBandUrl",
    }
    return {
        key: str(raw[src]).strip()
        for src, key in mapping.items()
        if raw.get(src)
    }


def preview_campaign(
    leads: list[dict[str, Any]],
    template_id: str,
    media_overrides_by_lead: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    drafts: dict[str, dict[str, str]] = {}
    errors: dict[str, str] = {}

    for lead in leads:
        lead_id = str(lead["_id"])
        email = lead.get("email")
        if not email:
            errors[lead_id] = "no email"
            continue

        overrides_raw = (media_overrides_by_lead or {}).get(lead_id, {})
        media_overrides = _normalize_media_overrides(overrides_raw)

        try:
            subject, html_body, text_body, _token = generate_campaign_email(
                lead,
                template_id,
                media_overrides=media_overrides or None,
            )
            drafts[lead_id] = {
                "subject": subject,
                "htmlBody": html_body,
                "textBody": text_body,
            }
        except Exception as error:
            errors[lead_id] = str(error)

    return {"drafts": drafts, "errors": errors}


def cmd_preview(payload: dict[str, Any]) -> None:
    template_id = payload.get("templateId", "proposal_v1")
    leads = payload.get("leads", [])
    media_overrides = payload.get("mediaOverrides", {})
    result = preview_campaign(leads, template_id, media_overrides)
    print(json.dumps(result))


def cmd_send(payload: dict[str, Any]) -> None:
    from bson import ObjectId

    from db import get_db
    from sender import send_manual_email

    db = get_db()
    lead_data = payload.get("lead")
    if not lead_data:
        raise ValueError("lead is required")

    lead_id = lead_data.get("_id")
    if isinstance(lead_id, str):
        lead = db["leads"].find_one({"_id": ObjectId(lead_id)})
    else:
        lead = lead_data

    if not lead:
        raise ValueError("lead not found")

    template_id = payload.get("templateId", "proposal_v1")
    subject = payload.get("subject", "")
    html_body = payload.get("htmlBody", "")
    text_body = payload.get("textBody", "")

    if not subject or not html_body or not text_body:
        raise ValueError("subject, htmlBody, and textBody are required")

    message_id = send_manual_email(
        lead,
        subject,
        text_body,
        html_body,
        email_type="campaign",
        campaign_template_id=template_id,
    )
    print(json.dumps({"messageId": message_id}))


def cmd_list_templates(_payload: dict[str, Any]) -> None:
    print(json.dumps({"templates": CAMPAIGN_TEMPLATES}))


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "usage: campaign_service.py <command>"}))
        sys.exit(1)

    command = sys.argv[1]
    raw = sys.stdin.read().strip()
    payload: dict[str, Any] = json.loads(raw) if raw else {}

    handlers = {
        "preview": cmd_preview,
        "send": cmd_send,
        "list-templates": cmd_list_templates,
    }

    handler = handlers.get(command)
    if not handler:
        print(json.dumps({"error": f"unknown command: {command}"}))
        sys.exit(1)

    try:
        handler(payload)
    except Exception as error:
        print(json.dumps({"error": str(error)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
