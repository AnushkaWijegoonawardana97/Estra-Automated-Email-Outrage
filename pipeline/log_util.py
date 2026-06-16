from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from db import get_db

LEVEL_ICONS: dict[str, str] = {
    "success": "✅",
    "error": "❌",
    "warning": "⚠️",
    "info": "ℹ️",
}

LOG_SEPARATOR = "─" * 56


def log_separator(stage: str = "scraper") -> None:
    print(f"[{stage.upper()}] {LOG_SEPARATOR}")
    get_db()["pipeline_logs"].insert_one(
        {
            "stage": stage,
            "level": "info",
            "message": LOG_SEPARATOR,
            "metadata": {"type": "separator"},
            "createdAt": datetime.now(timezone.utc),
        }
    )


def log_pipeline_event(
    stage: str,
    message: str,
    *,
    level: str = "info",
    metadata: dict[str, Any] | None = None,
    print_separator_after: bool = False,
) -> None:
    icon = LEVEL_ICONS.get(level, "•")
    display_message = f"{icon} {message}"
    entry = {
        "stage": stage,
        "level": level,
        "message": display_message,
        "metadata": metadata or {},
        "createdAt": datetime.now(timezone.utc),
    }
    get_db()["pipeline_logs"].insert_one(entry)
    prefix = stage.upper()
    print(f"[{prefix}] {display_message}")
    if print_separator_after:
        print(f"[{prefix}] {LOG_SEPARATOR}")
