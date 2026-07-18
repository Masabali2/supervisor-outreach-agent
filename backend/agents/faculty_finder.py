"""Stage 1: discover faculty profiles from Stage 0 university results.

This module deliberately uses search results as candidates only.  Stage 2 is
responsible for visiting a candidate profile and enriching its information.
"""

from __future__ import annotations

import argparse
import json
import logging
import re
from pathlib import Path
from typing import Any, Callable, Iterable
from urllib.parse import urlparse

LOGGER = logging.getLogger(__name__)

SearchClient = Callable[[str, int], Iterable[dict[str, Any]]]


def load_universities(input_path: str | Path) -> list[dict[str, str]]:
    """Load and minimally validate Stage 0's universities JSON output."""
    path = Path(input_path)
    with path.open(encoding="utf-8") as file:
        universities = json.load(file)

    if not isinstance(universities, list):
        raise ValueError("universities.json must contain a JSON array.")

    valid_universities = []
    for university in universities:
        if not isinstance(university, dict):
            LOGGER.warning("Skipping malformed university entry: %r", university)
            continue
        if university.get("name") and university.get("homepage"):
            valid_universities.append(university)
        else:
            LOGGER.warning("Skipping university without name or homepage: %r", university)
    return valid_universities


def university_domain(homepage: str) -> str:
    """Return the hostname used to constrain searches to an institution."""
    parsed = urlparse(homepage if "://" in homepage else f"https://{homepage}")
    return parsed.netloc.lower().removeprefix("www.")


def build_search_query(university: dict[str, str], research_field: str) -> str:
    """Build a domain-restricted query for professor profile pages."""
    domain = university_domain(university["homepage"])
    # Search engines handle a focused term more reliably than ``professor OR
    # faculty`` and return individual profile pages instead of broad faculty
    # directories.
    terms = [f"site:{domain}", "professor"]
    if research_field.strip():
        terms.append(f'"{research_field.strip()}"')
    return " ".join(terms)


def ddg_search(query: str, max_results: int) -> Iterable[dict[str, Any]]:
    """Search one provider at a time and fall back when one times out."""
    try:
        from ddgs import DDGS
    except ImportError as error:
        raise RuntimeError(
            "DuckDuckGo search requires the 'ddgs' package. "
            "Install it or provide a search_client to discover_faculty()."
        ) from error

    errors: list[str] = []
    for backend in ("google", "yahoo", "bing", "mojeek"):
        try:
            results = DDGS().text(
                query,
                max_results=max_results,
                backend=backend,
            )
            if results:
                return results
        except Exception as error:
            errors.append(f"{backend}: {error}")
            LOGGER.info("Search provider %s failed: %s", backend, error)

    raise RuntimeError("All faculty search providers failed. " + "; ".join(errors))


def is_on_university_domain(url: str, domain: str) -> bool:
    """Allow the university host and its subdomains, but not lookalike hosts."""
    host = urlparse(url).netloc.lower().split(":")[0].removeprefix("www.")
    return host == domain or host.endswith(f".{domain}")


def extract_name(title: str) -> str:
    """Extract the likely faculty name from a conventional search-result title."""
    candidate = re.split(r"\s*(?:\||[-–—]|:|,\s*(?:PhD|Professor))\s*", title, maxsplit=1)[0]
    candidate = re.sub(r"^(?:dr\.?|prof\.?|professor)\s+", "", candidate, flags=re.I)
    candidate = re.sub(r"\s+", " ", candidate).strip()
    words = candidate.split()
    non_person_terms = {
        "about", "college", "department", "faculty", "graduate", "lab",
        "research", "school", "science", "staff", "university",
    }
    if any(word.casefold().strip(".,") in non_person_terms for word in words):
        return ""
    if 2 <= len(words) <= 6 and all(re.search(r"[A-Za-z]", word) for word in words):
        return candidate
    return ""


def looks_like_person_profile(title: str, profile_url: str) -> bool:
    """Reject research-area and institute pages returned by broad web searches."""
    if re.match(r"\s*(?:dr\.?|prof\.?|professor)\b", title, flags=re.I):
        return True

    path = urlparse(profile_url).path.casefold()
    person_path_terms = ("people", "person", "faculty", "profile", "staff", "member", "bio")
    return any(term in path for term in person_path_terms)


def faculty_from_result(
    result: dict[str, Any], university_name: str, domain: str
) -> dict[str, str] | None:
    """Turn one domain-valid search result into the Stage 1 data contract."""
    profile_url = str(result.get("href") or result.get("url") or "").strip()
    title = str(result.get("title") or "").strip()
    snippet = str(result.get("body") or result.get("snippet") or "").strip()
    if not profile_url or not is_on_university_domain(profile_url, domain):
        return None
    if not looks_like_person_profile(title, profile_url):
        return None

    name = extract_name(title)
    if not name:
        return None

    return {
        "name": name,
        "university": university_name,
        "profile_url": profile_url,
        "research_snippet": snippet,
    }


def discover_faculty(
    input_path: str | Path,
    output_path: str | Path,
    research_field: str = "",
    max_results_per_university: int = 10,
    search_client: SearchClient | None = None,
) -> list[dict[str, str]]:
    """Run Stage 1 and save its deduplicated faculty results to ``output_path``.

    Individual university search failures are logged and do not stop the stage.
    ``search_client`` makes the function independently testable and lets the
    backend provide another search service in the future.
    """
    if max_results_per_university < 1:
        raise ValueError("max_results_per_university must be at least 1.")

    search = search_client or ddg_search
    faculty: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()

    for university in load_universities(input_path):
        domain = university_domain(university["homepage"])
        if not domain:
            LOGGER.warning("Skipping university with invalid homepage: %s", university["name"])
            continue
        try:
            results = search(build_search_query(university, research_field), max_results_per_university)
            for result in results:
                entry = faculty_from_result(result, university["name"], domain)
                if entry is None:
                    continue
                key = (entry["university"].casefold(), entry["profile_url"].rstrip("/").casefold())
                if key not in seen:
                    seen.add(key)
                    faculty.append(entry)
        except Exception as error:  # A failed university must not stop the pipeline.
            LOGGER.warning("Faculty discovery failed for %s: %s", university["name"], error)

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as file:
        json.dump(faculty, file, ensure_ascii=False, indent=2)
    return faculty


def main() -> None:
    """Provide an independently runnable Stage 1 command."""
    parser = argparse.ArgumentParser(description="Discover university faculty profiles.")
    parser.add_argument("--input", default="backend/data/universities.json")
    parser.add_argument("--output", default="backend/data/faculty.json")
    parser.add_argument("--field", default="", help="Optional research field to target.")
    parser.add_argument("--max-results", type=int, default=10)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    faculty = discover_faculty(args.input, args.output, args.field, args.max_results)
    LOGGER.info("Saved %d faculty candidates to %s", len(faculty), args.output)


if __name__ == "__main__":
    main()