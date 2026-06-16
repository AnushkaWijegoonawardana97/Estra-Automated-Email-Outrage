from __future__ import annotations

import uuid
from typing import Any

from content_generator import generate_content
from email_renderer import render_email


def generate_email(
    lead: dict[str, Any],
    email_type: str = "initial",
    *,
    original_subject: str | None = None,
    service: str | None = None,
) -> tuple[str, str, str, str]:
    token = lead.get("unsubscribeToken") or str(uuid.uuid4())
    content = generate_content(
        lead,
        email_type,
        original_subject=original_subject,
        service=service,
    )
    subject, html_body, text_body = render_email(lead, email_type, content, token)
    return subject, html_body, text_body, token
