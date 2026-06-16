from __future__ import annotations

from datetime import datetime, timedelta, timezone

from db import get_config, get_db
from sender import send_follow_up_email


def _days_ago(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


def _has_event(db, email_id, event_type: str) -> bool:
    return (
        db["email_events"].find_one({"emailId": email_id, "eventType": event_type})
        is not None
    )


def _latest_click_service(db, email_id):
    event = db["email_events"].find_one(
        {"emailId": email_id, "eventType": "clicked"},
        sort=[("occurredAt", -1)],
    )
    return event.get("serviceTag") if event else None


def _lead_replied(db, lead_id) -> bool:
    lead = db["leads"].find_one({"_id": lead_id})
    return lead is not None and lead.get("status") == "replied"


def run_follow_ups() -> int:
    db = get_db()
    config = get_config()
    sent = 0

    generic_delay = config.get("followUpDelayDays", 4)
    opened_delay = config.get("openedFollowUpDelayDays", 5)
    targeted_delay = config.get("targetedFollowUpDelayDays", 3)
    max_follow_ups = config.get("maxFollowUps", 2)

    for email in db["emails_sent"].find({"emailType": "initial"}):
        lead_id = email["leadId"]
        email_id = email["_id"]

        if _lead_replied(db, lead_id):
            continue
        if email.get("followUpCount", 0) >= max_follow_ups:
            continue

        lead = db["leads"].find_one({"_id": lead_id})
        if not lead or lead.get("status") == "unsubscribed":
            continue

        sent_at = email.get("sentAt", datetime.now(timezone.utc))
        opened = _has_event(db, email_id, "opened")
        clicked_service = _latest_click_service(db, email_id)

        should_send = False
        email_type = "followup_generic"
        service = None

        if clicked_service and sent_at <= _days_ago(targeted_delay) and not _has_event(
            db, email_id, "replied"
        ):
            followups = db["emails_sent"].count_documents(
                {"leadId": lead_id, "emailType": "followup_targeted"}
            )
            if followups == 0:
                should_send = True
                email_type = "followup_targeted"
                service = clicked_service
        elif opened and not clicked_service and sent_at <= _days_ago(opened_delay):
            followups = db["emails_sent"].count_documents(
                {"leadId": lead_id, "emailType": "followup_generic"}
            )
            if followups == 0:
                should_send = True
        elif not opened and sent_at <= _days_ago(generic_delay):
            followups = db["emails_sent"].count_documents(
                {"leadId": lead_id, "emailType": "followup_generic"}
            )
            if followups == 0:
                should_send = True

        if should_send:
            success = send_follow_up_email(
                lead,
                email_type,
                original_subject=email.get("subject"),
                service=service,
                prior_email_id=email_id,
            )
            if success:
                sent += 1
                print(f"Follow-up sent to {lead.get('businessName')}")

    print(f"Follow-up engine complete. Sent {sent} follow-ups.")
    return sent


if __name__ == "__main__":
    run_follow_ups()
