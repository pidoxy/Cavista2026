import json
import os
import re
from typing import Any

_PARSED_CACHE: list[dict[str, Any]] | None = None
_SOURCE_COUNTS: dict[str, int] = {}


def _safe_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _compact_excerpt(text: str, limit: int = 240) -> str:
    cleaned = " ".join(text.split())
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 3] + "..."


def _extract_actions(item: dict[str, Any]) -> list[str]:
    action_keys = [
        "immediate_actions",
        "recommended_actions_for_chw",
        "actions",
        "management",
        "plan",
    ]
    actions: list[str] = []
    for key in action_keys:
        value = item.get(key)
        if isinstance(value, list):
            actions.extend([_safe_text(v) for v in value if _safe_text(v)])
        elif isinstance(value, str) and value.strip():
            actions.append(value.strip())
    return actions[:6]


def _normalize_item(item: dict[str, Any], source_name: str) -> dict[str, Any]:
    raw_text = _safe_text(item.get("raw_text") or item.get("content") or item.get("text"))
    section_id = _safe_text(item.get("section_id") or item.get("section") or item.get("id")) or "Unknown"
    cadre = _safe_text(item.get("cadre")) or "Unknown"
    condition = _safe_text(item.get("condition")) or "Unknown"
    actions = _extract_actions(item)
    referral_required = bool(item.get("referral_required")) or ("refer" in raw_text.lower())

    return {
        "section_id": section_id,
        "cadre": cadre,
        "condition": condition,
        "actions": actions,
        "referral_required": referral_required,
        "source_excerpt": _compact_excerpt(raw_text or "No structured excerpt available."),
        "source": source_name,
    }


def _iter_json_items(data: Any, source_name: str) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                normalized.append(_normalize_item(item, source_name))
    elif isinstance(data, dict):
        normalized.append(_normalize_item(data, source_name))
    return normalized


def _parse_markdown(content: str, source_name: str) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    chunks = re.split(r"\n\s*PAGE\s+", content)
    for idx, chunk in enumerate(chunks):
        text = _safe_text(chunk)
        if not text:
            continue
        entries.append(
            {
                "section_id": f"MD-{idx + 1}",
                "cadre": "JCHEW",
                "condition": "Standing Orders",
                "actions": ["Follow standing orders and escalate danger signs promptly."],
                "referral_required": "refer" in text.lower(),
                "source_excerpt": _compact_excerpt(text),
                "source": source_name,
            }
        )
    return entries


def _parsed_dir() -> str:
    backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(os.path.dirname(backend_root), "parsed")


def load_parsed_guidelines(force_reload: bool = False) -> list[dict[str, Any]]:
    global _PARSED_CACHE, _SOURCE_COUNTS
    if _PARSED_CACHE is not None and not force_reload:
        return _PARSED_CACHE

    parsed_path = _parsed_dir()
    records: list[dict[str, Any]] = []
    source_counts: dict[str, int] = {}

    if not os.path.isdir(parsed_path):
        _PARSED_CACHE = []
        _SOURCE_COUNTS = {}
        return _PARSED_CACHE

    for filename in sorted(os.listdir(parsed_path)):
        path = os.path.join(parsed_path, filename)
        if not os.path.isfile(path):
            continue

        source_name = filename
        items: list[dict[str, Any]] = []

        try:
            if filename.endswith(".json"):
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                items = _iter_json_items(data, source_name)
            elif filename.endswith(".md"):
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                items = _parse_markdown(content, source_name)
        except Exception:
            items = []

        if items:
            records.extend(items)
            source_counts[source_name] = len(items)

    _PARSED_CACHE = records
    _SOURCE_COUNTS = source_counts
    return records


def get_parsed_source_counts() -> dict[str, int]:
    if _PARSED_CACHE is None:
        load_parsed_guidelines()
    return dict(_SOURCE_COUNTS)


def find_parsed_evidence(query_text: str, top_k: int = 2) -> list[dict[str, Any]]:
    records = load_parsed_guidelines()
    if not records:
        return []

    tokens = set(re.findall(r"[a-zA-Z]{3,}", query_text.lower()))
    if not tokens:
        return records[:top_k]

    scored: list[tuple[int, dict[str, Any]]] = []
    for rec in records:
        haystack = " ".join(
            [
                rec.get("condition", ""),
                rec.get("source_excerpt", ""),
                " ".join(rec.get("actions", [])),
                rec.get("cadre", ""),
            ]
        ).lower()
        score = sum(1 for token in tokens if token in haystack)
        if score > 0:
            scored.append((score, rec))

    scored.sort(key=lambda x: x[0], reverse=True)
    if not scored:
        return records[:top_k]

    return [rec for _, rec in scored[:top_k]]
