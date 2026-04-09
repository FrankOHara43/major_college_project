import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
HISTORY_FILE = DATA_DIR / "history.json"


def _ensure_history_file() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not HISTORY_FILE.exists():
        HISTORY_FILE.write_text("[]", encoding="utf-8")


def get_history() -> list[dict[str, Any]]:
    _ensure_history_file()
    try:
        return json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def get_history_by_user(user_id: str) -> list[dict[str, Any]]:
    items = get_history()
    return [item for item in items if item.get("user_id") == user_id]


def delete_history_entry(entry_id: int, user_id: str | None = None) -> bool:
    history = get_history()
    next_history: list[dict[str, Any]] = []
    deleted = False

    for item in history:
        is_target = item.get("id") == entry_id
        if not is_target:
            next_history.append(item)
            continue

        if user_id and item.get("user_id") not in {None, user_id}:
            next_history.append(item)
            continue

        deleted = True

    if deleted:
        HISTORY_FILE.write_text(json.dumps(next_history, indent=2), encoding="utf-8")

    return deleted


def clear_history(user_id: str | None = None) -> int:
    history = get_history()

    if user_id is None:
        deleted_count = len(history)
        HISTORY_FILE.write_text("[]", encoding="utf-8")
        return deleted_count

    next_history = [item for item in history if item.get("user_id") != user_id]
    deleted_count = len(history) - len(next_history)
    HISTORY_FILE.write_text(json.dumps(next_history, indent=2), encoding="utf-8")
    return deleted_count


def add_history_entry(
    text: str,
    language: str,
    source_filename: str,
    summary: str | None = None,
    keywords: list[str] | None = None,
    entities: list[dict[str, str]] | None = None,
    confidence_score: float | None = None,
    translated_text: str | None = None,
    intent: str | None = None,
    detected_language: str | None = None,
    user_id: str | None = None,
) -> dict[str, Any]:
    _ensure_history_file()
    history = get_history()

    entry = {
        "id": len(history) + 1,
        "transcript": text,
        "text": text,
        "language": language,
        "source_filename": source_filename,
        "summary": summary or "",
        "keywords": keywords or [],
        "entities": entities or [],
        "confidence_score": confidence_score if confidence_score is not None else 0.0,
        "translated_text": translated_text or "",
        "intent": intent or "unknown",
        "detected_language": detected_language or language,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    history.insert(0, entry)
    HISTORY_FILE.write_text(json.dumps(history, indent=2), encoding="utf-8")
    return entry
