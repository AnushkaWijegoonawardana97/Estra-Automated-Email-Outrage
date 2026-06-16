from __future__ import annotations

import argparse
from datetime import datetime, timezone

from db import get_db
from sender import send_initial_emails

DEFAULT_TEST_NAMES = [
    "Estra Test Salon — Gmail",
    "Estra Test Cafe — YOPmail",
]


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


def send_test_leads(names: list[str] | None = None) -> int:
    targets = names or DEFAULT_TEST_NAMES
    leads = reset_test_leads(targets)
    if not leads:
        print("No test leads to send.")
        return 0

    refreshed = [get_db()["leads"].find_one({"_id": lead["_id"]}) for lead in leads]
    return send_initial_emails([lead for lead in refreshed if lead])


def main() -> None:
    parser = argparse.ArgumentParser(description="Reset and send test lead emails")
    parser.add_argument(
        "--name",
        action="append",
        dest="names",
        help="Business name of test lead (repeatable). Defaults to both seed test leads.",
    )
    args = parser.parse_args()
    sent = send_test_leads(args.names)
    print(f"Test send complete — {sent} email(s) sent.")


if __name__ == "__main__":
    main()
