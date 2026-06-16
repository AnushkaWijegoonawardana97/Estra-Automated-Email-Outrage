from __future__ import annotations

import argparse

from db import get_db
from email_discovery import run_email_discovery
from enricher import run_enricher
from filter import get_filtered_leads
from follow_up import run_follow_ups
from log_util import log_pipeline_event
from scraper import run_scraper
from sender import send_initial_emails

PIPELINE_STEPS = ("all", "scrape", "enrich", "find_email", "send", "follow_up", "retry_failed")


def _get_sendable_leads(lead_ids: list | None = None) -> list[dict]:
    db = get_db()
    query: dict = {"email": {"$ne": None}, "status": {"$in": ["enriched", "scraped"]}}
    if lead_ids is not None:
        query["_id"] = {"$in": lead_ids}

    emailed_ids = {
        doc["leadId"]
        for doc in db["emails_sent"].find({}, {"leadId": 1})
        if doc.get("leadId")
    }

    return [lead for lead in db["leads"].find(query) if lead["_id"] not in emailed_ids]


def run_step_scrape() -> None:
    run_scraper()


def run_step_enrich() -> list[dict]:
    leads = get_filtered_leads()
    run_enricher(leads)
    return leads


def run_step_find_email() -> int:
    return run_email_discovery()


def run_step_send(lead_ids: list | None = None) -> int:
    sendable = _get_sendable_leads(lead_ids)
    return send_initial_emails(sendable)


def run_step_retry_failed() -> None:
    db = get_db()

    failed_leads = list(db["leads"].find({"enrichmentStatus": "failed"}))
    if failed_leads:
        log_pipeline_event(
            "pipeline",
            f"Retrying enrichment for {len(failed_leads)} failed leads",
            metadata={"count": len(failed_leads)},
        )
        run_enricher(failed_leads)

    run_email_discovery()

    filtered = get_filtered_leads()
    sendable = _get_sendable_leads([lead["_id"] for lead in filtered])
    if sendable:
        log_pipeline_event(
            "pipeline",
            f"Retrying send for {len(sendable)} unsent leads",
            metadata={"count": len(sendable)},
        )
        send_initial_emails(sendable)
    else:
        log_pipeline_event("pipeline", "No unsent leads to retry", level="info")


def run_pipeline(step: str = "all") -> None:
    log_pipeline_event("pipeline", f"Pipeline step started: {step}", level="info")

    try:
        if step == "scrape":
            run_step_scrape()
        elif step == "enrich":
            run_step_enrich()
        elif step == "find_email":
            found = run_step_find_email()
            log_pipeline_event(
                "pipeline",
                f"Find email step complete — {found} emails discovered",
                level="success",
                metadata={"found": found},
            )
        elif step == "send":
            sent = run_step_send()
            log_pipeline_event(
                "pipeline",
                f"Send step complete — {sent} emails sent",
                level="success",
                metadata={"sent": sent},
            )
        elif step == "follow_up":
            sent = run_follow_ups()
            log_pipeline_event(
                "pipeline",
                f"Follow-up step complete — {sent} emails sent",
                level="success",
                metadata={"sent": sent},
            )
        elif step == "retry_failed":
            run_step_retry_failed()
        elif step == "all":
            run_step_scrape()
            run_step_enrich()
            run_step_find_email()
            sent = run_step_send()
            log_pipeline_event(
                "pipeline",
                f"Full pipeline send complete — {sent} emails sent",
                level="success",
                metadata={"sent": sent},
            )
        else:
            raise ValueError(f"Unknown step: {step}")

        log_pipeline_event(
            "pipeline",
            f"Pipeline step completed: {step}",
            level="success",
            metadata={"step": step},
        )
    except Exception as error:
        log_pipeline_event(
            "pipeline",
            f"Pipeline step failed ({step}): {error}",
            level="error",
            metadata={"step": step},
        )
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description="Estra cold email pipeline")
    parser.add_argument(
        "--step",
        choices=PIPELINE_STEPS,
        default="all",
        help="Pipeline step to run (default: all)",
    )
    args = parser.parse_args()
    run_pipeline(args.step)


if __name__ == "__main__":
    main()
