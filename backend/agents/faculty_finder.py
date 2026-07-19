"""
Stage 1 â€” Faculty Discovery Agent
Given a university, finds professors working in the target field, and tries
to detect signals that they are actively accepting graduate students.
"""
import json
import os
import time
import re
from urllib.parse import urljoin, urlparse
from backend.utils.search import search_web
from backend.utils.scraper import fetch_page_text
from backend.utils.llm_client import llm_json
from backend.config import FIELD, MAX_FACULTY_PER_UNIVERSITY, FACULTY_CACHE, SEARCH_DELAY_SECONDS


def _normalize_profile_url(profile_url: str, university_homepage: str) -> tuple[str, str]:
    """
    Cleans up the LLM-extracted profile_url. Returns (clean_url, extracted_email).

    Handles two common issues seen in raw output:
    1. Relative URLs like "/people/Salimur/Choudhury" (missing the domain) â€”
       these get resolved against the university's homepage into a full URL.
    2. "mailto:someone@school.edu" links that the LLM mistakenly put in
       profile_url instead of an email field â€” these get extracted out as an
       email and profile_url is cleared (since it isn't actually a profile page).
    """
    if not profile_url or not isinstance(profile_url, str):
        return "", ""

    profile_url = profile_url.strip()

    if profile_url.lower().startswith("mailto:"):
        return "", profile_url[len("mailto:"):].strip()

    if profile_url.startswith("/") and university_homepage:
        return urljoin(university_homepage, profile_url), ""

    parsed = urlparse(profile_url)
    if not parsed.scheme or not parsed.netloc:
        # Doesn't look like a usable URL at all (e.g. leftover junk text) â€” drop it
        return "", ""

    return profile_url, ""


def _is_clean_text(text: str, min_printable_ratio: float = 0.85) -> bool:
    """
    Detects garbled/binary content that slipped through as 'text' (e.g. a PDF,
    a compressed file, or a corrupted download that got decoded as if it were
    plain text). Returns False if too much of the content is non-printable
    junk â€” this is what prevents corrupted scraped pages from poisoning the
    LLM prompt and causing the whole university's extraction to fail.
    """
    if not text:
        return False
    sample = text[:2000]  # checking a sample is enough and keeps this fast
    printable = sum(1 for ch in sample if ch.isprintable() or ch in "\n\t\r")
    ratio = printable / len(sample)
    return ratio >= min_printable_ratio


def _clean_professor_name(name: object) -> str:
    """Remove common academic titles and credentials from an LLM candidate."""
    if not isinstance(name, str):
        return ""
    cleaned = re.sub(r"^\s*(?:dr\.?|prof\.?|professor)\s+", "", name, flags=re.I)
    cleaned = re.sub(r",?\s*(?:ph\.?d\.?|phd|m\.?sc\.?|msc|m\.?eng\.?|meng|d\.?phil\.?)\s*$", "", cleaned, flags=re.I)
    return re.sub(r"\s+", " ", cleaned).strip(" ,.;")


def _is_plausible_person_name(name: str) -> bool:
    """Reject directory labels, roles, research areas, and malformed names."""
    words = name.split()
    rejected_terms = {"administration", "admissions", "ai", "artificial", "centre", "center", "college", "computer", "department", "directory", "faculty", "graduate", "group", "intelligence", "lab", "laboratory", "member", "members", "people", "person", "profile", "program", "research", "role", "school", "science", "staff", "team", "university"}
    if not 2 <= len(words) <= 5:
        return False
    if any(word.casefold().strip(".,") in rejected_terms for word in words):
        return False
    if any(not re.fullmatch(r"[A-Za-z?-??-??-?'.-]+", word) for word in words):
        return False
    return all(word[0].isupper() for word in words if word[0].isalpha())


def _is_individual_profile_url(profile_url: str, university_homepage: str) -> bool:
    """Require an individual-looking university profile URL, not a directory."""
    normalized_url, _ = _normalize_profile_url(profile_url, university_homepage)
    if not normalized_url:
        return False
    university_host = urlparse(university_homepage).netloc.casefold().removeprefix("www.")
    profile_host = urlparse(normalized_url).netloc.casefold().removeprefix("www.")
    if university_host and profile_host != university_host and not profile_host.endswith(f".{university_host}"):
        return False
    parts = [part.casefold() for part in urlparse(normalized_url).path.split("/") if part]
    if not parts:
        return False
    path = "/".join(parts)
    if any(marker in path for marker in ("directory", "faculty-profiles", "faculty-profile-list", "research-area", "research-areas", "audience/faculty", "our-faculty")):
        return False
    if parts[-1] in {"faculty", "people", "person", "profiles", "profile", "staff", "members", "member", "bio"}:
        return False
    return any(marker in part for part in parts for marker in ("people", "person", "faculty", "profile", "staff", "member", "bio")) or parts[-1].startswith("~")


def _snippet_looks_like_collection(snippet: object) -> bool:
    """Identify snippets describing aggregate pages rather than one person."""
    if not isinstance(snippet, str):
        return False
    normalized = re.sub(r"\s+", " ", snippet).casefold()
    phrases = ("faculty profiles", "faculty directory", "meet our faculty", "our faculty", "research area", "research areas", "browse faculty", "list of faculty", "administrative staff", "staff directory")
    return any(phrase in normalized for phrase in phrases)


def _filter_faculty_candidates(faculty: list[dict], university: dict) -> list[dict]:
    """Normalize LLM output and keep only credible individual faculty profiles."""
    university_name = str(university.get("name", "")).strip()
    homepage = str(university.get("homepage", "") or university.get("homepage_guess", "")).strip()
    valid_faculty: list[dict] = []
    seen_urls: set[str] = set()
    for candidate in faculty:
        if not isinstance(candidate, dict):
            continue
        name = _clean_professor_name(candidate.get("name"))
        profile_url = str(candidate.get("profile_url") or "").strip()
        snippet = str(candidate.get("research_snippet") or "").strip()
        clean_url, extracted_email = _normalize_profile_url(profile_url, homepage)
        if not _is_plausible_person_name(name) or not _is_individual_profile_url(clean_url, homepage):
            continue
        if _snippet_looks_like_collection(snippet):
            continue
        canonical_url = clean_url.rstrip("/").casefold()
        if canonical_url in seen_urls:
            continue
        seen_urls.add(canonical_url)
        normalized = dict(candidate)
        normalized.update({"name": name, "profile_url": clean_url, "research_snippet": snippet, "university": university_name, "accepting_students_signal": candidate.get("accepting_students_signal", "unclear")})
        if extracted_email:
            normalized["email"] = extracted_email
        valid_faculty.append(normalized)
    return valid_faculty


def _find_faculty_directory(university_name: str, field: str) -> list[dict]:
    """Search for the department's faculty listing / directory page."""
    queries = [
        f"{university_name} {field} faculty directory",
        f"{university_name} department faculty list {field}",
        f"{university_name} {field} lab professors graduate students",
    ]
    results = []
    for q in queries:
        try:
            results.extend(search_web(q, max_results=6))
        except Exception as e:
            print(f"[faculty_finder] Search failed for query '{q}': {e}")
    return results


def find_faculty(university: dict, field: str = FIELD,
                  limit: int = MAX_FACULTY_PER_UNIVERSITY) -> list[dict]:
    """
    Returns a list of candidate professors:
    {"name", "profile_url", "university", "research_snippet", "accepting_students_signal"}
    """
    university_name = university.get("name", "")
    search_results = _find_faculty_directory(university_name, field)

    if not search_results:
        print(f"[faculty_finder] no search results for {university_name}")
        return []

    scraped_context = []
    for r in search_results[:6]:
        # Try both 'href' and 'url' keys (different search providers use different names)
        url = (r.get("href") or r.get("url") or "").strip()
        if not url:
            continue

        # Keep snippet as a backup fallback
        snippet = r.get("body") or r.get("snippet") or ""

        try:
            print(f"[faculty_finder] Attempting to scrape: {url}")
            text = fetch_page_text(url)

            # Guard 1: enough content? Guard 2: is it actually clean text
            # (not garbled/binary junk from a PDF or corrupted download)?
            if text and len(text.strip()) > 300 and _is_clean_text(text):
                scraped_context.append(f"SOURCE URL: {url}\n{text[:3000]}")
                print(f"[faculty_finder] Successfully scraped text from {url}")
            elif text and not _is_clean_text(text):
                print(f"[faculty_finder] skipping garbled/binary content from {url}")
                if snippet:
                    scraped_context.append(f"SOURCE URL (Search Snippet Fallback): {url}\n{snippet}")
            elif snippet:
                scraped_context.append(f"SOURCE URL (Search Snippet Fallback): {url}\n{snippet}")
                print(f"[faculty_finder] Page content empty/blocked. Used search snippet fallback for {url}")
        except Exception as e:
            if snippet:
                scraped_context.append(f"SOURCE URL (Search Snippet Fallback): {url}\n{snippet}")
            print(f"[faculty_finder] Error scraping {url}: {e}. Used snippet fallback.")

        time.sleep(SEARCH_DELAY_SECONDS)

    if not scraped_context:
        print(f"[faculty_finder] could not extract any page content or snippets for {university_name}")
        return []

    combined_text = "\n\n---\n\n".join(scraped_context)

    system_prompt = (
        "You are a research assistant extracting a structured list of professors "
        "from raw scraped university web pages. Only include real individual "
        "faculty members (not generic staff/admin), and only those whose research "
        "clearly relates to the given field."
    )

    user_prompt = f"""
University: {university_name}
Target field: {field}

Scraped page content (may be messy/partial):
{combined_text}

Return a JSON array of up to {limit} objects.
CRITICAL: You must extract the professors even if you cannot find a clear signal about them accepting students. If the text doesn't explicitly mention recruitment, just set "accepting_students_signal" to "unclear".

Each object must contain EXACTLY these keys (no other keys, no different names):
- "name": professor's full name
- "profile_url": their personal/lab page URL if found in the text, else ""
- "research_snippet": 1-2 sentences on what they research, based on the text
- "accepting_students_signal": true/false/"unclear" â€” true ONLY if the text explicitly suggests they are looking for students, have open positions, or are actively recruiting
"""
    try:
        faculty = llm_json(system_prompt, user_prompt)

        if not isinstance(faculty, list):
            print(f"[faculty_finder] LLM did not return a valid list for {university_name}")
            return []

        valid_faculty = _filter_faculty_candidates(faculty, university)
        dropped = len(faculty) - len(valid_faculty)
        if dropped > 0:
            print(f"[faculty_finder] dropped {dropped} invalid, non-profile, or directory candidate(s) for {university_name}")
        return valid_faculty

    except Exception as e:
        print(f"[faculty_finder] LLM extraction failed for {university_name}: {e}")
        return []


def find_faculty_for_all(universities: list[dict], field: str = FIELD) -> list[dict]:
    """Runs find_faculty across a list of universities and caches the combined result."""
    all_faculty = []
    for uni in universities:
        print(f"\n[faculty_finder] searching {uni.get('name')}...")
        faculty = find_faculty(uni, field=field)
        if faculty:
            all_faculty.extend(faculty)
            print(f"[faculty_finder] Found {len(faculty)} candidate(s) for {uni.get('name')}")

    os.makedirs(os.path.dirname(FACULTY_CACHE), exist_ok=True)
    with open(FACULTY_CACHE, "w", encoding="utf-8") as f:
        json.dump(all_faculty, f, indent=2, ensure_ascii=False)

    return all_faculty


if __name__ == "__main__":
    input_file_path = "backend/data/universities.json"
    print(f"[faculty_finder] Reading universities from {input_file_path}...")

    try:
        with open(input_file_path, "r", encoding="utf-8") as file:
            universities_list = json.load(file)

        all_discovered_faculty = find_faculty_for_all(universities_list)
        print(f"\n[Success] Completed! Saved {len(all_discovered_faculty)} professors to cache at: {FACULTY_CACHE}")

    except FileNotFoundError:
        print(f"[Error] '{input_file_path}' file nahi mili! Pehle check karein ke path sahi hai ya nahi.")
    except json.JSONDecodeError:
        print(f"[Error] '{input_file_path}' sahi JSON format mein nahi hai.")

