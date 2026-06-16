from __future__ import annotations

import argparse
from datetime import datetime, timezone

from db import get_config, get_db
from email_writer import generate_email
from sender import send_via_brevo

DEFAULT_TEST_NAMES = [
    "Estra Test Salon — Gmail",
    "Estra Test Cafe — YOPmail",
]

ALL_EMAIL_TYPES = ("initial", "followup_generic", "followup_targeted")
DEFAULT_EMAIL_TYPES = list(ALL_EMAIL_TYPES)

# Service used when exercising the targeted follow-up template in test sends.
TEST_TARGETED_SERVICE = "automation"


def reset_test_leads(names: list[str]) -> list[dict]:
    db = get_db()
    leads: list[dict] = []

    for name in names:
        lead = db["leads"].find_one({"businessName": name})
        if not lead:
            print(f"Skip — lead not found: {name}")
            continue

        deleted = db["emails_sent"].delete_many({"leadId": lead["_id"]}).deleted_count
        db["leads"].update_one(
            {"_id": lead["_id"]},
            {
                "$set": {
                    "status": "enriched",
                    "updatedAt": datetime.now(timezone.utc),
                }
            },
        )
        print(f"Reset {name} — removed {deleted} sent record(s)")
        leads.append(lead)

    return leads


def _test_subject(email_type: str, subject: str) -> str:
    label = email_type.replace("_", " ").upper()
    return f"[TEST {label}] {subject}"


def _record_sent(
    db,
    *,
    lead: dict,
    email_type: str,
    subject: str,
    text_body: str,
    html_body: str,
    message_id: str,
    token: str,
    service: str | None = None,
) -> None:
    db["emails_sent"].insert_one(
        {
            "leadId": lead["_id"],
            "emailType": email_type,
            "subject": subject,
            "body": text_body,
            "htmlBody": html_body,
            "serviceClicked": service,
            "sentAt": datetime.now(timezone.utc),
            "brevoMessageId": message_id,
            "followUpCount": 0 if email_type == "initial" else 1,
            "isTestSend": True,
        }
    )
    db["leads"].update_one(
        {"_id": lead["_id"]},
        {
            "$set": {
                "status": "emailed",
                "unsubscribeToken": token,
                "updatedAt": datetime.now(timezone.utc),
            }
        },
    )


def send_template_for_lead(
    lead: dict,
    email_type: str,
    *,
    original_subject: str | None = None,
    service: str | None = None,
) -> str | None:
    """Send one template. Returns the underlying subject (without test prefix) on success."""
    db = get_db()
    config = get_config()
    email = lead.get("email")
    name = lead.get("businessName", "unknown")

    if not email:
        print(f"  Skip {email_type} — {name} has no email")
        return None

    try:
        subject, html_body, text_body, token = generate_email(
            lead,
            email_type,
            original_subject=original_subject,
            service=service,
        )
        display_subject = _test_subject(email_type, subject)
        message_id = send_via_brevo(
            email,
            display_subject,
            text_body,
            config,
            html_body=html_body,
        )
        _record_sent(
            db,
            lead=lead,
            email_type=email_type,
            subject=display_subject,
            text_body=text_body,
            html_body=html_body,
            message_id=message_id,
            token=token,
            service=service,
        )
        print(f"  Sent {email_type} → {email}")
        return subject
    except Exception as error:
        print(f"  Failed {email_type} for {name}: {error}")
        return None


def send_all_templates_for_lead(
    lead: dict,
    email_types: list[str],
) -> int:
    name = lead.get("businessName", "unknown")
    print(f"Sending templates for {name}:")
    sent = 0
    initial_subject: str | None = None

    if "initial" in email_types:
        initial_subject = send_template_for_lead(lead, "initial")
        if initial_subject:
            sent += 1

    if "followup_generic" in email_types:
        if send_template_for_lead(
            lead,
            "followup_generic",
            original_subject=initial_subject,
        ):
            sent += 1

    if "followup_targeted" in email_types:
        if send_template_for_lead(
            lead,
            "followup_targeted",
            original_subject=initial_subject,
            service=TEST_TARGETED_SERVICE,
        ):
            sent += 1

    return sent


def send_test_leads(
    names: list[str] | None = None,
    *,
    email_types: list[str] | None = None,
) -> int:
    targets = names or DEFAULT_TEST_NAMES
    types = email_types or DEFAULT_EMAIL_TYPES
    leads = reset_test_leads(targets)
    if not leads:
        print("No test leads to send.")
        return 0

    db = get_db()
    total = 0
    for lead in leads:
        refreshed = db["leads"].find_one({"_id": lead["_id"]})
        if refreshed:
            total += send_all_templates_for_lead(refreshed, types)

    return total


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Reset test leads and send all email templates for visual QA",
    )
    parser.add_argument(
        "--name",
        action="append",
        dest="names",
        help="Business name of test lead (repeatable). Defaults to both seed test leads.",
    )
    parser.add_argument(
        "--types",
        nargs="+",
        choices=ALL_EMAIL_TYPES,
        default=list(ALL_EMAIL_TYPES),
        help="Email templates to send (default: all three).",
    )
    args = parser.parse_args()
    sent = send_test_leads(args.names, email_types=args.types)
    print(f"Test send complete — {sent} email(s) sent.")


if __name__ == "__main__":
    main()
