"""Stage 2 Research Profiler for the Supervisor Outreach Agent.

This module enriches faculty records produced by Stage 1. It is designed to
run independently from the rest of the backend:

    python -m backend.agents.research_profiler --input data/faculty.json

The profiler is intentionally defensive. If one professor page fails, the
pipeline records the error and continues processing the remaining faculty.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any, Literal

try:
    import requests
except ImportError:  # pragma: no cover - handled at runtime for beginners
    requests = None  # type: ignore[assignment]

try:
    import trafilatura
except ImportError:  # pragma: no cover - optional dependency
    trafilatura = None  # type: ignore[assignment]

try:
    from bs4 import BeautifulSoup
except ImportError:  # pragma: no cover - optional dependency
    BeautifulSoup = None  # type: ignore[assignment]

from backend.utils.llm_client import llm_json


AcceptingSignal = Literal[True, False, "Unknown"]

DEFAULT_DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "faculty.json"
DEFAULT_INPUT_PATH = DEFAULT_DATA_PATH
DEFAULT_OUTPUT_PATH = DEFAULT_DATA_PATH
REQUEST_TIMEOUT_SECONDS = 20
MAX_PAGE_TEXT_CHARS = 18_000
USER_AGENT = (
    "Mozilla/5.0 (compatible; SupervisorOutreachAgent/1.0; "
    "+https://example.com/hackathon)"
)

INSTITUTIONAL_EMAIL_SUFFIXES = (
    ".edu",
    ".ac.uk",
    ".ca",
    ".de",
    ".fr",
    ".edu.au",
    ".ac.nz",
    ".edu.pk",
    ".ac.in",
)

# Semantic Scholar's public (unauthenticated) API rate-limits aggressively
# when called back-to-back for many professors in a row. Spacing requests
# out and retrying once on a 429 avoids silently losing publication data.
# An optional free key (https://www.semanticscholar.org/product/api) raises
# the limit further if set as SEMANTIC_SCHOLAR_API_KEY in .env.
SEMANTIC_SCHOLAR_MIN_INTERVAL_SECONDS = 5.0
_last_semantic_scholar_call_time = 0.0

LOGGER = logging.getLogger(__name__)

SUMMARY_SYSTEM_PROMPT = """You create factual research profiles for graduate
supervisors. Use only the supplied webpage and publication evidence. Return a
single JSON object, with no Markdown or extra text."""


def load_faculty(path: str | Path = DEFAULT_INPUT_PATH) -> list[dict[str, Any]]:
    """Load faculty records from a JSON file.

    Returns an empty list when the file is missing, invalid, or not a JSON list.
    """

    input_path = Path(path)
    if not input_path.exists():
        LOGGER.error("Faculty file does not exist: %s", input_path)
        return []

    try:
        data = json.loads(input_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        LOGGER.error("Invalid JSON in %s: %s", input_path, exc)
        return []
    except OSError as exc:
        LOGGER.error("Could not read %s: %s", input_path, exc)
        return []

    if not isinstance(data, list):
        LOGGER.error("Expected %s to contain a JSON list.", input_path)
        return []

    return [item for item in data if isinstance(item, dict)]


def save_faculty(
    faculty: list[dict[str, Any]], path: str | Path = DEFAULT_OUTPUT_PATH
) -> bool:
    """Save enriched faculty records as formatted JSON."""

    output_path = Path(path)
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps(faculty, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except OSError as exc:
        LOGGER.error("Could not save %s: %s", output_path, exc)
        return False

    LOGGER.info("Saved %s enriched faculty records to %s", len(faculty), output_path)
    return True


def profile_all(
    input_path: str | Path = DEFAULT_INPUT_PATH,
    output_path: str | Path = DEFAULT_OUTPUT_PATH,
) -> list[dict[str, Any]]:
    """Load, enrich, and save every professor in faculty.json."""

    faculty = load_faculty(input_path)
    enriched: list[dict[str, Any]] = []

    for index, professor in enumerate(faculty, start=1):
        name = professor.get("name", "Unknown professor")
        LOGGER.info("Profiling %s/%s: %s", index, len(faculty), name)
        try:
            enriched.append(profile_researcher(professor))
        except Exception as exc:  # pragma: no cover - final pipeline safety net
            LOGGER.exception("Unexpected profiling failure for %s: %s", name, exc)
            failed_record = dict(professor)
            failed_record.update(
                {
                    "profiled": False,
                    "profile_error": str(exc),
                }
            )
            enriched.append(failed_record)

    save_faculty(enriched, output_path)
    return enriched


def profile_researcher(professor: dict[str, Any]) -> dict[str, Any]:
    """Enrich one professor object without mutating the original input."""

    enriched = dict(professor)
    profile_url = str(enriched.get("profile_url") or "").strip()
    page_html = fetch_professor_page(profile_url) if profile_url else None
    page_text = extract_clean_text(page_html or "")

    # Only overwrite the email if scraping the page actually found one.
    # Stage 1 (faculty_finder.py) sometimes already found an email via a
    # mailto: link; without this guard, a professor with no profile_url
    # (or an unreachable page) would silently lose that existing email.
    scraped_email = extract_email(page_text) or extract_email(page_html or "")
    email = scraped_email or enriched.get("email")

    publications = find_recent_publications(
        professor_name=str(enriched.get("name") or ""),
        research_field=str(enriched.get("research_snippet") or ""),
        university=str(enriched.get("university") or ""),
    )
    summary = generate_profile_summary(
        webpage_text=page_text,
        recent_publications=publications,
        research_snippet=str(enriched.get("research_snippet") or ""),
    )
    accepting_students = detect_accepting_students(page_text, summary)
    if accepting_students == "Unknown":
        stage_one_signal = enriched.get("accepting_students_signal")
        if stage_one_signal in (True, False):
            accepting_students = stage_one_signal

    enriched.update(
        {
            "email": email,
            "publications": publications,
            "profile_summary": summary.get("profile_summary", ""),
            "research_areas": summary.get("research_areas", []),
            "recent_work": summary.get("recent_work", []),
            "accepting_students": accepting_students,
            "profiled": True,
            "profile_source_url": profile_url or None,
        }
    )

    if not page_text:
        enriched["profile_warning"] = "Could not extract professor page text."

    return enriched


def fetch_professor_page(url: str) -> str | None:
    """Fetch a professor profile page and return raw HTML."""

    if not url:
        return None
    if requests is None:
        LOGGER.error("Missing dependency: requests. Install it with pip.")
        return None

    headers = {"User-Agent": USER_AGENT}
    for attempt in range(1, 3):
        try:
            response = requests.get(
                url,
                headers=headers,
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            return response.text
        except requests.RequestException as exc:
            LOGGER.warning("Fetch attempt %s failed for %s: %s", attempt, url, exc)
            if attempt == 1:
                time.sleep(1)

    return None


def extract_clean_text(html: str) -> str:
    """Extract meaningful plain text from professor page HTML."""

    if not html:
        return ""

    if trafilatura is not None:
        extracted = trafilatura.extract(html)
        if extracted:
            return _normalize_whitespace(extracted)[:MAX_PAGE_TEXT_CHARS]

    if BeautifulSoup is None:
        LOGGER.warning("BeautifulSoup is not installed; returning raw HTML text.")
        return _normalize_whitespace(re.sub(r"<[^>]+>", " ", html))[
            :MAX_PAGE_TEXT_CHARS
        ]

    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    text = soup.get_text(separator=" ")
    return _normalize_whitespace(text)[:MAX_PAGE_TEXT_CHARS]


def extract_email(text: str) -> str | None:
    """Extract the best institutional email address from text."""

    if not text:
        return None

    normalized = _normalize_obfuscated_emails(text)
    matches = re.findall(
        r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
        normalized,
        flags=re.IGNORECASE,
    )
    unique_matches = list(
        dict.fromkeys(email.strip(".,;:()[]{}<>") for email in matches)
    )

    institutional = [
        email
        for email in unique_matches
        if email.lower().endswith(INSTITUTIONAL_EMAIL_SUFFIXES)
    ]
    if institutional:
        return institutional[0]

    return unique_matches[0] if unique_matches else None


def _semantic_scholar_headers() -> dict[str, str]:
    """Build request headers, including an API key when one is configured.

    A free key from https://www.semanticscholar.org/product/api gets a much
    higher rate limit than the shared unauthenticated tier.
    """

    headers = {"User-Agent": USER_AGENT}
    api_key = os.getenv("SEMANTIC_SCHOLAR_API_KEY", "").strip()
    if api_key:
        headers["x-api-key"] = api_key
    return headers


def _fetch_semantic_scholar(
    params: dict[str, Any], professor_name: str
) -> dict[str, Any] | None:
    """Call the Semantic Scholar search API, paced to avoid 429 responses.

    Waits at least SEMANTIC_SCHOLAR_MIN_INTERVAL_SECONDS since the previous
    call before sending a new one, and retries once (respecting a
    Retry-After header if present) if the first attempt is rate-limited.
    """

    global _last_semantic_scholar_call_time

    headers = _semantic_scholar_headers()

    for attempt in range(1, 3):
        elapsed = time.monotonic() - _last_semantic_scholar_call_time
        wait_needed = SEMANTIC_SCHOLAR_MIN_INTERVAL_SECONDS - elapsed
        if wait_needed > 0:
            time.sleep(wait_needed)

        try:
            response = requests.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params=params,
                headers=headers,
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            _last_semantic_scholar_call_time = time.monotonic()

            if response.status_code == 429 and attempt == 1:
                retry_after = response.headers.get("Retry-After")
                delay = float(retry_after) if retry_after else SEMANTIC_SCHOLAR_MIN_INTERVAL_SECONDS * 2
                LOGGER.info(
                    "Semantic Scholar rate-limited %s; retrying in %.1fs.",
                    professor_name,
                    delay,
                )
                time.sleep(delay)
                continue

            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError) as exc:
            _last_semantic_scholar_call_time = time.monotonic()
            LOGGER.warning("Could not fetch publications for %s: %s", professor_name, exc)
            return None

    LOGGER.warning(
        "Semantic Scholar kept rate-limiting %s; skipping publications. "
        "A free API key (SEMANTIC_SCHOLAR_API_KEY in .env) fixes this "
        "reliably: https://www.semanticscholar.org/product/api",
        professor_name,
    )
    return None


def find_recent_publications(
    professor_name: str,
    research_field: str = "",
    university: str = "",
) -> list[dict[str, Any]]:
    """Find up to three recent publications without inventing missing data.

    The function uses the Semantic Scholar public graph API when requests is
    available. On failure, it returns an empty list so the LLM can summarize
    only the page evidence.
    """

    if not professor_name or requests is None:
        return []

    query = " ".join(
        part for part in [professor_name, university, research_field] if part
    )
    params = {
        "query": query,
        "limit": 3,
        "fields": "title,year,url,venue",
    }

    payload = _fetch_semantic_scholar(params, professor_name)
    if payload is None:
        return []

    publications: list[dict[str, Any]] = []
    for item in payload.get("data", []):
        if not isinstance(item, dict) or not item.get("title"):
            continue
        publications.append(
            {
                "title": item.get("title"),
                "year": item.get("year"),
                "source": item.get("venue") or "Semantic Scholar",
                "link": item.get("url"),
            }
        )

    return publications[:3]


def generate_profile_summary(
    webpage_text: str,
    recent_publications: list[dict[str, Any]] | None = None,
    research_snippet: str = "",
) -> dict[str, Any]:
    """Use the shared Groq client to create a structured research profile."""

    fallback = _evidence_fallback(research_snippet, recent_publications or [])
    if not webpage_text and not recent_publications and not research_snippet:
        return fallback

    prompt = build_summary_prompt(webpage_text, recent_publications or [], research_snippet)
    try:
        parsed = llm_json(SUMMARY_SYSTEM_PROMPT, prompt, temperature=0.1)
    except Exception as exc:
        LOGGER.warning("Groq profile summary failed; keeping available evidence: %s", exc)
        return fallback
    if not isinstance(parsed, dict):
        LOGGER.warning("Groq returned a non-object profile summary.")
        return fallback

    return {
        "profile_summary": str(parsed.get("profile_summary") or ""),
        "research_areas": _string_list(parsed.get("research_areas")),
        "recent_work": _string_list(parsed.get("recent_work")),
    }


def _evidence_fallback(
    research_snippet: str, recent_publications: list[dict[str, Any]]
) -> dict[str, Any]:
    """Keep Stage 2 useful if Groq is unavailable without inventing details."""

    clean_snippet = _normalize_whitespace(research_snippet)
    publication_titles = [
        str(publication.get("title")).strip()
        for publication in recent_publications
        if isinstance(publication, dict) and publication.get("title")
    ]
    if clean_snippet:
        summary = clean_snippet[:700]
    elif publication_titles:
        summary = "Recent publication evidence was found, but no profile-page summary was available."
    else:
        summary = "No reliable research-profile evidence was available."

    return {
        "profile_summary": summary,
        "research_areas": [],
        "recent_work": publication_titles[:3],
    }


def detect_accepting_students(
    webpage_text: str,
    research_summary: dict[str, Any] | str | None = None,
) -> AcceptingSignal:
    """Detect whether the professor appears to be accepting students."""

    combined_text = f"{webpage_text} {research_summary or ''}".lower()
    if not combined_text.strip():
        return "Unknown"

    negative_patterns = (
        r"not\s+(currently\s+)?accepting\s+(new\s+)?(students|phd|master)",
        r"no\s+(openings|positions)",
        r"not\s+recruiting",
        r"unable\s+to\s+take\s+(new\s+)?students",
    )
    positive_patterns = (
        r"accepting\s+(new\s+)?(students|phd|master)",
        r"open\s+(positions|openings)",
        r"available\s+(positions|openings)",
        r"recruiting\s+(students|phd|master)",
        r"join\s+(my|our)\s+lab",
        r"looking\s+for\s+(phd|master'?s|masters|graduate)\s+students",
    )

    if any(re.search(pattern, combined_text) for pattern in negative_patterns):
        return False
    if any(re.search(pattern, combined_text) for pattern in positive_patterns):
        return True

    return "Unknown"


def build_summary_prompt(
    webpage_text: str,
    recent_publications: list[dict[str, Any]],
    research_snippet: str,
) -> str:
    """Create the Groq prompt separately so it is easy to test."""

    publications_json = json.dumps(recent_publications, ensure_ascii=False, indent=2)
    clipped_text = webpage_text[:MAX_PAGE_TEXT_CHARS]
    return f"""
You are helping build a graduate supervisor discovery tool.

Analyze the professor webpage evidence and recent publication evidence.
Return only valid JSON with this exact schema:
{{
  "profile_summary": "2-4 sentence factual summary",
  "research_areas": ["area 1", "area 2"],
  "recent_work": ["work item 1", "work item 2"]
}}

Rules:
- Do not use markdown.
- Do not invent publications or claims.
- If evidence is missing, use empty arrays or a short cautious summary.

Research snippet from Stage 1:
{research_snippet}

Recent publications:
{publications_json}

Professor webpage text:
{clipped_text}
""".strip()


def _normalize_obfuscated_emails(text: str) -> str:
    """Convert common email obfuscations into normal @ and dot format."""

    normalized = text
    normalized = re.sub(
        r"(?<=\w)\s*(?:\[at\]|\(at\)|\sat\s| AT )\s*(?=\w)",
        "@",
        normalized,
        flags=re.I,
    )
    normalized = re.sub(
        r"(?<=\w)\s*(?:\[dot\]|\(dot\)|\sdot\s| DOT )\s*(?=\w)",
        ".",
        normalized,
        flags=re.I,
    )
    return normalized


def _normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s:%(name)s:%(message)s",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Stage 2 Research Profiler.")
    parser.add_argument("--input", default=str(DEFAULT_INPUT_PATH), help="Input faculty JSON")
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT_PATH),
        help="Output enriched faculty JSON",
    )
    args = parser.parse_args()

    configure_logging()
    profile_all(args.input, args.output)


if __name__ == "__main__":
    main()