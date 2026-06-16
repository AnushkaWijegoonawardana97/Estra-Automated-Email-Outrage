from __future__ import annotations

import argparse
import signal
import sys
import time
from typing import Callable

from email_discovery import get_leads_pending_email_discovery, run_email_discovery
from enricher import run_enricher
from filter import get_filtered_leads
from follow_up import run_follow_ups
from job_runner import process_next_job
from log_util import log_pipeline_event
from main import run_step_scrape, run_step_send

WORKER_STEPS = ("scrape", "enrich", "find_email", "send", "follow_up", "jobs")

DEFAULT_INTERVALS: dict[str, int] = {
    "scrape": 3600,
    "enrich": 45,
    "find_email": 45,
    "send": 90,
    "follow_up": 600,
    "jobs": 15,
}

_running = True


def _handle_stop(_signum: int, _frame: object) -> None:
    global _running
    _running = False
    print("\n[worker] Stopping after current cycle…")


def get_leads_pending_enrichment() -> list[dict]:
    return [
        lead
        for lead in get_filtered_leads()
        if lead.get("enrichmentStatus") not in ("complete",)
    ]


def _run_enrich_step() -> int:
    leads = get_leads_pending_enrichment()
    if not leads:
        print("[enrich] No leads pending enrichment.")
        return 0
    return run_enricher(leads)


def _run_find_email_step() -> int:
    leads = get_leads_pending_email_discovery()
    if not leads:
        print("[find_email] No leads pending email discovery.")
        return 0
    return run_email_discovery(leads)


def _run_jobs_step() -> int:
    processed = 0
    while _running and process_next_job():
        processed += 1
    if processed == 0:
        print("[jobs] No pending dashboard jobs.")
    return processed


STEP_RUNNERS: dict[str, Callable[[], int]] = {
    "scrape": lambda: (run_step_scrape() or 0),
    "enrich": _run_enrich_step,
    "find_email": _run_find_email_step,
    "send": run_step_send,
    "follow_up": run_follow_ups,
    "jobs": _run_jobs_step,
}


def run_worker_step(step: str) -> int:
    runner = STEP_RUNNERS.get(step)
    if not runner:
        raise ValueError(f"Unknown worker step: {step}")

    log_pipeline_event("dev_worker", f"Cycle started: {step}", metadata={"step": step})
    print(f"\n{'=' * 60}\n[worker:{step}] Cycle started\n{'=' * 60}")

    try:
        if step == "scrape":
            runner()
            result = 0
        else:
            result = int(runner() or 0)
        log_pipeline_event(
            "dev_worker",
            f"Cycle completed: {step}",
            level="success",
            metadata={"step": step, "result": result},
        )
        print(f"[worker:{step}] Cycle complete (result={result})")
        return result
    except Exception as error:
        log_pipeline_event(
            "dev_worker",
            f"Cycle failed ({step}): {error}",
            level="error",
            metadata={"step": step},
        )
        print(f"[worker:{step}] Cycle failed: {error}")
        raise


def run_worker_loop(step: str, interval: int) -> None:
    signal.signal(signal.SIGINT, _handle_stop)
    signal.signal(signal.SIGTERM, _handle_stop)

    print(f"[worker:{step}] Watching every {interval}s (Ctrl+C to stop)")
    while _running:
        try:
            run_worker_step(step)
        except Exception:
            pass
        if not _running:
            break
        print(f"[worker:{step}] Sleeping {interval}s…")
        for _ in range(interval):
            if not _running:
                break
            time.sleep(1)

    print(f"[worker:{step}] Stopped.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run a single pipeline step once or on a loop (local dev workers)",
    )
    parser.add_argument(
        "--step",
        choices=WORKER_STEPS,
        required=True,
        help="Pipeline step this worker handles",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=None,
        help="Seconds between cycles (default varies by step). Omit with --once.",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run one cycle and exit",
    )
    args = parser.parse_args()

    interval = args.interval
    if args.once:
        try:
            run_worker_step(args.step)
        except Exception:
            sys.exit(1)
        return

    if interval is None:
        interval = DEFAULT_INTERVALS[args.step]

    run_worker_loop(args.step, interval)


if __name__ == "__main__":
    main()
