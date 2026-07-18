"""Stage 3: rank supervisors against a student's academic profile.

This module consumes the Stage 2 ``faculty.json`` output and a student
``my_profile.json`` file, then writes the exact ``ranked_faculty.json``
contract defined by the Supervisor Outreach Agent project brief.

It works without external services using transparent keyword scoring.  When
``GROQ_API_KEY`` is configured, the deterministic result is refined by Groq's
``llama-3.3-70b-versatile`` model.  The local score remains a safe fallback if
the service is unavailable or returns malformed data.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import tempfile
from collections.abc import Iterable, Mapping
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

try:
    from dotenv import load_dotenv
except ImportError:  # The offline scorer deliberately has no required packages.
    load_dotenv = None


LOGGER = logging.getLogger(__name__)
DEFAULT_MODEL = "llama-3.3-70b-versatile"
GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
STOP_WORDS = frozenset(
    {
        "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
        "in", "is", "of", "on", "or", "the", "to", "with", "using",
    }
)


def _as_text(value: Any) -> str:
    """Return a clean string for scalar or list-based JSON values."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, Iterable) and not isinstance(value, (bytes, Mapping)):
        return " ".join(_as_text(item) for item in value if _as_text(item))
    return str(value).strip()


def _tokens(value: Any) -> set[str]:
    """Tokenize text conservatively for a dependency-free similarity score."""
    return {
        token
        for token in re.findall(r"[a-z0-9][a-z0-9+#.-]*", _as_text(value).lower())
        if len(token) > 1 and token not in STOP_WORDS
    }


def _profile_text(profile: Mapping[str, Any]) -> str:
    """Build a useful profile representation without requiring one schema."""
    preferred_keys = (
        "field", "research_field", "research_interests", "interests",
        "skills", "experience", "research_background", "background",
        "degree", "education", "projects", "keywords",
    )
    parts = [_as_text(profile.get(key)) for key in preferred_keys]
    # Retain custom profile fields as well; teams often extend this file.
    parts.extend(_as_text(value) for key, value in profile.items() if key not in preferred_keys)
    return " ".join(part for part in parts if part)


def _faculty_text(faculty: Mapping[str, Any]) -> str:
    """Collect the Stage 2 research evidence used for comparison."""
    parts = (
        faculty.get("research_snippet"),
        faculty.get("profile_summary"),
        faculty.get("recent_work"),
        faculty.get("research_areas"),
        faculty.get("keywords"),
    )
    return " ".join(_as_text(part) for part in parts if _as_text(part))


def _clamp_score(value: Any, default: float) -> float:
    """Convert a model or local value to a one-decimal score in [0, 10]."""
    try:
        return round(max(0.0, min(10.0, float(value))), 1)
    except (TypeError, ValueError):
        return default


def _local_score(profile: Mapping[str, Any], faculty: Mapping[str, Any]) -> tuple[float, list[str]]:
    """Return an explainable research-fit score and shared terms.

    Research overlap accounts for up to 9.5 points.  A current recruitment
    signal is used only as a small tie-breaker, not as a proxy for research fit.
    """
    profile_terms = _tokens(_profile_text(profile))
    faculty_terms = _tokens(_faculty_text(faculty))
    overlap = sorted(profile_terms & faculty_terms)

    if not profile_terms or not faculty_terms:
        base_score = 0.0
    else:
        coverage = len(overlap) / len(profile_terms)
        precision = len(overlap) / len(faculty_terms)
        # Coverage favours a supervisor matching the student's stated focus.
        base_score = (coverage * 8.0) + (precision * 1.5)

    accepting_students = faculty.get("accepting_students") is True
    score = base_score + (0.5 if accepting_students and overlap else 0.0)
    return _clamp_score(score, 0.0), overlap


def _local_reasoning(
    profile: Mapping[str, Any], faculty: Mapping[str, Any], overlap: list[str]
) -> str:
    """Generate an honest explanation suitable for the output contract."""
    field = _as_text(profile.get("field") or profile.get("research_field"))
    if overlap:
        wording = ", ".join(overlap[:6])
        reason = f"Research overlap with the student's profile: {wording}."
    elif field:
        reason = f"Limited explicit research overlap was found for {field}."
    else:
        reason = "Limited explicit research overlap was found in the available profile."

    if faculty.get("accepting_students") is True:
        reason += " The profile indicates the supervisor may be accepting students."
    elif faculty.get("accepting_students") is False:
        reason += " The profile does not indicate that the supervisor is accepting students."
    return reason


def _output_record(
    faculty: Mapping[str, Any], score: float, reasoning: str
) -> dict[str, Any]:
    """Return only the fields mandated by the Stage 3 JSON data contract."""
    recent_work = faculty.get("recent_work", [])
    if not isinstance(recent_work, list):
        recent_work = [recent_work] if recent_work else []
    return {
        "name": _as_text(faculty.get("name")),
        "university": _as_text(faculty.get("university")),
        "email": _as_text(faculty.get("email")),
        "fit_score": _clamp_score(score, 0.0),
        "fit_reasoning": _as_text(reasoning),
        "profile_summary": _as_text(faculty.get("profile_summary")),
        "recent_work": recent_work,
        "accepting_students": faculty.get("accepting_students") is True,
    }


def rank_with_rules(
    faculty_members: Iterable[Mapping[str, Any]], profile: Mapping[str, Any]
) -> list[dict[str, Any]]:
    """Rank Stage 2 faculty records with an offline, deterministic scorer."""
    ranked = []
    for faculty in faculty_members:
        if not isinstance(faculty, Mapping):
            LOGGER.warning("Skipping invalid faculty record: expected an object.")
            continue
        score, overlap = _local_score(profile, faculty)
        ranked.append(_output_record(faculty, score, _local_reasoning(profile, faculty, overlap)))
    return sorted(ranked, key=lambda item: item["fit_score"], reverse=True)


def _extract_json_object(content: str) -> dict[str, Any] | None:
    """Extract a JSON object from an LLM reply that may include Markdown."""
    match = re.search(r"\{.*\}", content, flags=re.DOTALL)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def _refine_with_groq(
    results: list[dict[str, Any]], profile: Mapping[str, Any], api_key: str, model: str
) -> list[dict[str, Any]]:
    """Ask Groq to refine scores and reasoning while preserving the contract."""
    candidates = [
        {
            "id": index,
            "name": item["name"],
            "university": item["university"],
            "profile_summary": item["profile_summary"],
            "recent_work": item["recent_work"],
            "accepting_students": item["accepting_students"],
            "rule_score": item["fit_score"],
        }
        for index, item in enumerate(results)
    ]
    prompt = (
        "You rank graduate supervisors. Compare every candidate to the student "
        "profile using only the supplied information. Return JSON only, exactly "
        '{"rankings":[{"id":0,"fit_score":0.0,"fit_reasoning":"..."}]}. '
        "fit_score must be 0-10 with one decimal. Do not invent facts; explain "
        "research alignment and mention recruitment only if supplied.\n\n"
        f"Student profile: {json.dumps(profile, ensure_ascii=False)}\n"
        f"Candidates: {json.dumps(candidates, ensure_ascii=False)}"
    )
    payload = json.dumps(
        {
            "model": model,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": [{"role": "user", "content": prompt}],
        }
    ).encode("utf-8")
    request = Request(
        GROQ_CHAT_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            # Groq rejects urllib's default User-Agent (Python-urllib/x.y).
            "User-Agent": "Supervisor-Outreach-Agent/1.0",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=30) as response:
            response_data = json.loads(response.read().decode("utf-8"))
        content = response_data["choices"][0]["message"]["content"]
        response_json = _extract_json_object(content)
        if not response_json or not isinstance(response_json.get("rankings"), list):
            raise ValueError("Groq did not return the expected rankings JSON.")
    except HTTPError as error:
        try:
            error_body = json.loads(error.read().decode("utf-8"))
            detail = _as_text(error_body.get("error", {}).get("message"))
        except (UnicodeDecodeError, json.JSONDecodeError, AttributeError):
            detail = ""
        LOGGER.warning(
            "Groq refinement failed; keeping local ranking: HTTP %s%s",
            error.code,
            f" — {detail}" if detail else "",
        )
        return results
    except (URLError, TimeoutError, ValueError, KeyError, IndexError, json.JSONDecodeError) as error:
        LOGGER.warning("Groq refinement failed; keeping local ranking: %s", error)
        return results

    refinements = {
        item.get("id"): item
        for item in response_json["rankings"]
        if isinstance(item, Mapping) and isinstance(item.get("id"), int)
    }
    for index, result in enumerate(results):
        refinement = refinements.get(index)
        if not refinement:
            continue
        result["fit_score"] = _clamp_score(refinement.get("fit_score"), result["fit_score"])
        reason = _as_text(refinement.get("fit_reasoning"))
        if reason:
            result["fit_reasoning"] = reason
    return sorted(results, key=lambda item: item["fit_score"], reverse=True)


def rank_faculty(
    faculty_members: Iterable[Mapping[str, Any]],
    profile: Mapping[str, Any],
    *,
    use_llm: bool = True,
    api_key: str | None = None,
    model: str = DEFAULT_MODEL,
) -> list[dict[str, Any]]:
    """Return ranked supervisors, using Groq where configured and available."""
    if load_dotenv is not None:
        project_root = Path(__file__).resolve().parents[2]
        load_dotenv(project_root / ".env")
    results = rank_with_rules(faculty_members, profile)
    resolved_key = api_key or os.getenv("GROQ_API_KEY")
    if use_llm and resolved_key and results:
        LOGGER.info("Refining %d rankings with Groq model %s", len(results), model)
        return _refine_with_groq(results, profile, resolved_key, model)
    if use_llm and not resolved_key:
        LOGGER.info("GROQ_API_KEY was not found; using offline rule-based ranking.")
    return results


def _read_json(path: Path) -> Any:
    """Read JSON with clear errors for command-line and backend callers."""
    try:
        with path.open("r", encoding="utf-8") as source:
            return json.load(source)
    except FileNotFoundError as error:
        raise ValueError(f"Required input file was not found: {path}") from error
    except json.JSONDecodeError as error:
        raise ValueError(f"Invalid JSON in {path}: {error.msg}") from error


def _write_json_atomically(path: Path, data: list[dict[str, Any]]) -> None:
    """Write output safely so incomplete pipeline output is never exposed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=path.parent, delete=False, suffix=".tmp"
    ) as temporary_file:
        json.dump(data, temporary_file, ensure_ascii=False, indent=2)
        temporary_name = temporary_file.name
    Path(temporary_name).replace(path)


def run_ranking(
    faculty_path: str | Path,
    profile_path: str | Path,
    output_path: str | Path,
    *,
    use_llm: bool = True,
) -> list[dict[str, Any]]:
    """Run Stage 3 from JSON files and save ``ranked_faculty.json``."""
    faculty_data = _read_json(Path(faculty_path))
    profile_data = _read_json(Path(profile_path))
    if not isinstance(faculty_data, list):
        raise ValueError("faculty.json must contain a JSON array.")
    if not isinstance(profile_data, Mapping):
        raise ValueError("my_profile.json must contain a JSON object.")
    ranked = rank_faculty(faculty_data, profile_data, use_llm=use_llm)
    _write_json_atomically(Path(output_path), ranked)
    LOGGER.info("Ranked %d faculty members into %s", len(ranked), output_path)
    return ranked


def main() -> None:
    """Run the ranking engine independently from the project root."""
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Rank supervisors against a student profile.")
    parser.add_argument("--faculty", type=Path, default=root / "data" / "faculty.json")
    parser.add_argument("--profile", type=Path, default=root / "data" / "my_profile.json")
    parser.add_argument("--output", type=Path, default=root / "data" / "ranked_faculty.json")
    parser.add_argument("--offline", action="store_true", help="Skip optional Groq refinement.")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    try:
        run_ranking(args.faculty, args.profile, args.output, use_llm=not args.offline)
    except ValueError as error:
        LOGGER.error("Ranking failed: %s", error)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()