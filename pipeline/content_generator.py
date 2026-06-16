"""
Email content is now template-driven via email_personalization.py.

This module is kept for backwards compatibility. Claude is no longer used
on the outbound email send path.
"""

from __future__ import annotations

from typing import Any

from email_personalization import build_email_content


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


def generate_content(
    lead: dict[str, Any],
    email_type: str = "initial",
    *,
    original_subject: str | None = None,
    service: str | None = None,
) -> dict[str, Any]:
    return build_email_content(
        lead,
        email_type,
        original_subject=original_subject,
        service=service,
    )
