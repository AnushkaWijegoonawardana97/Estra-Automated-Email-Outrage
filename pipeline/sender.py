from __future__ import annotations

import os
from datetime import datetime, timezone

import requests

from db import get_config, get_db
from email_writer import generate_email
from log_util import log_pipeline_event

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def _emails_sent_today(db) -> int:
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return db["emails_sent"].count_documents({"sentAt": {"$gte": start}})


def _remaining_daily_quota(db, config: dict) -> int:
    max_per_day = config.get("maxEmailsPerDay", 50)
    already_sent = _emails_sent_today(db)
    return max(0, max_per_day - already_sent)


def _is_suppressed(db, email: str | None) -> bool:
    if not email:
        return True
    return db["unsubscribed"].find_one({"email": email.lower()}) is not None


def send_via_brevo(to_email: str, subject: str, body: str, config: dict) -> str:
    api_key = os.environ.get("BREVO_API_KEY")
    if not api_key:
        raise RuntimeError("BREVO_API_KEY is required")

    payload = {
        "sender": {
            "name": config.get("fromName", "Estra"),
            "email": config.get("fromEmail", "hello@estradigital.co.uk"),
        },
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": body,
    }
    response = requests.post(
        BREVO_API_URL,
        json=payload,
        headers={"api-key": api_key, "Content-Type": "application/json"},
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    return str(data.get("messageId", ""))


def send_initial_emails(leads: list[dict]) -> int:
    db = get_db()
    config = get_config()

    remaining = _remaining_daily_quota(db, config)
    if remaining == 0:
        message = "Daily email cap reached."
        print(message)
        log_pipeline_event("sender", message, level="warning")
        return 0

    sent_count = 0

    for lead in leads:
        if sent_count >= remaining:
            break

        email = lead.get("email")
        if not email:
            log_pipeline_event(
                "sender",
                f"SKIP SEND — {lead.get('businessName')} has no email yet",
                level="info",
                metadata={"businessName": lead.get("businessName"), "outcome": "no_email"},
            )
            continue
        if _is_suppressed(db, email):
            continue

        if db["emails_sent"].find_one({"leadId": lead["_id"]}):
            continue

        try:
            subject, body, token = generate_email(lead, "initial")
            message_id = send_via_brevo(email, subject, body, config)

            db["emails_sent"].insert_one(
                {
                    "leadId": lead["_id"],
                    "emailType": "initial",
                    "subject": subject,
                    "body": body,
                    "serviceClicked": None,
                    "sentAt": datetime.now(timezone.utc),
                    "brevoMessageId": message_id,
                    "followUpCount": 0,
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
            sent_count += 1
            print(f"Sent to {email}")
            log_pipeline_event(
                "sender",
                f"Email sent to {email} ({lead.get('businessName')})",
                level="success",
                metadata={
                    "email": email,
                    "businessName": lead.get("businessName"),
                    "subject": subject,
                    "brevoMessageId": message_id,
                },
            )
        except Exception as error:
            print(f"  Send failed for {lead.get('businessName')}: {error}")
            log_pipeline_event(
                "sender",
                f"Send failed for {lead.get('businessName')}: {error}",
                level="error",
                metadata={"businessName": lead.get("businessName")},
            )

    print(f"Sender complete. Sent {sent_count} emails.")
    log_pipeline_event(
        "sender",
        f"Sender complete — {sent_count} emails sent",
        level="success",
        metadata={"sent": sent_count},
    )
    return sent_count


def send_follow_up_email(
    lead: dict,
    email_type: str,
    *,
    original_subject: str | None = None,
    service: str | None = None,
    prior_email_id=None,
) -> bool:
    db = get_db()
    config = get_config()
    email = lead.get("email")

    if not email or _is_suppressed(db, email):
        return False

    if _remaining_daily_quota(db, config) == 0:
        return False

    subject, body, token = generate_email(
        lead,
        email_type,
        original_subject=original_subject,
        service=service,
    )
    message_id = send_via_brevo(email, subject, body, config)

    db["emails_sent"].insert_one(
        {
            "leadId": lead["_id"],
            "emailType": email_type,
            "subject": subject,
            "body": body,
            "serviceClicked": service,
            "sentAt": datetime.now(timezone.utc),
            "brevoMessageId": message_id,
            "followUpCount": 1,
        }
    )
    if prior_email_id:
        db["emails_sent"].update_one(
            {"_id": prior_email_id},
            {"$inc": {"followUpCount": 1}},
        )
    db["leads"].update_one(
        {"_id": lead["_id"]},
        {"$set": {"unsubscribeToken": token, "updatedAt": datetime.now(timezone.utc)}},
    )
    return True
