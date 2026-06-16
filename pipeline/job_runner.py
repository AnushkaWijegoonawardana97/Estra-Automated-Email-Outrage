from __future__ import annotations

from datetime import datetime, timezone

from db import get_db
from log_util import log_pipeline_event
from main import run_pipeline

VALID_ACTIONS = ("all", "scrape", "enrich", "find_email", "send", "follow_up", "retry_failed")


def process_next_job() -> bool:
    db = get_db()
    job = db["pipeline_jobs"].find_one_and_update(
        {"status": "pending"},
        {
            "$set": {
                "status": "running",
                "startedAt": datetime.now(timezone.utc),
            }
        },
        sort=[("requestedAt", 1)],
    )

    if not job:
        return False

    job_id = job["_id"]
    action = job.get("action", "all")

    if action not in VALID_ACTIONS:
        db["pipeline_jobs"].update_one(
            {"_id": job_id},
            {
                "$set": {
                    "status": "failed",
                    "error": f"Invalid action: {action}",
                    "completedAt": datetime.now(timezone.utc),
                }
            },
        )
        return True

    log_pipeline_event(
        "pipeline",
        f"Job runner started: {action}",
        metadata={"jobId": str(job_id), "action": action},
    )

    try:
        run_pipeline(action)
        db["pipeline_jobs"].update_one(
            {"_id": job_id},
            {
                "$set": {
                    "status": "completed",
                    "completedAt": datetime.now(timezone.utc),
                }
            },
        )
        log_pipeline_event(
            "pipeline",
            f"Job runner completed: {action}",
            level="success",
            metadata={"jobId": str(job_id), "action": action},
        )
    except Exception as error:
        db["pipeline_jobs"].update_one(
            {"_id": job_id},
            {
                "$set": {
                    "status": "failed",
                    "error": str(error),
                    "completedAt": datetime.now(timezone.utc),
                }
            },
        )
        log_pipeline_event(
            "pipeline",
            f"Job runner failed ({action}): {error}",
            level="error",
            metadata={"jobId": str(job_id), "action": action},
        )

    return True


def main() -> None:
    processed = process_next_job()
    if not processed:
        print("No pending pipeline jobs.")


if __name__ == "__main__":
    main()
