from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _ensure_history_file(history_path: Path) -> None:
    history_path.parent.mkdir(parents=True, exist_ok=True)
    if not history_path.exists():
        history_path.write_text("[]\n", encoding="utf-8")


def _read_all(history_path: Path) -> list[dict[str, Any]]:
    _ensure_history_file(history_path)
    raw = history_path.read_text(encoding="utf-8").strip()
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = []
    if not isinstance(data, list):
        return []
    return [item for item in data if isinstance(item, dict)]


def _write_all(history_path: Path, records: list[dict[str, Any]]) -> None:
    history_path.write_text(json.dumps(records, indent=2), encoding="utf-8")


def add_history_record(history_path: str, transcript: str, source: str) -> dict[str, Any]:
    path = Path(history_path)
    records = _read_all(path)

    record = {
        "id": len(records) + 1,
        "transcript": transcript,
        "source": source,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    records.append(record)
    _write_all(path, records)
    return record


def get_history_paginated(history_path: str, page: int = 1, limit: int = 20) -> dict[str, Any]:
    page = max(page, 1)
    limit = max(min(limit, 100), 1)

    records = _read_all(Path(history_path))
    records = list(reversed(records))
    total = len(records)

    start = (page - 1) * limit
    end = start + limit
    items = records[start:end]

    return {
        "items": items,
        "page": page,
        "limit": limit,
        "total": total,
        "pages": (total + limit - 1) // limit,
    }
