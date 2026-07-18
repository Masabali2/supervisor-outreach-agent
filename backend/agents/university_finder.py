"""
Stage 0 — University Discovery Agent
Given just a country (and optional priority region), autonomously finds
universities worth targeting for a given research field.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
from utils.search import search_web
from utils.llm_client import llm_json
from config import COUNTRY, PRIORITY_REGION, FIELD, MAX_UNIVERSITIES, UNIVERSITIES_CACHE
from utils.scraper import fetch_page_text


def _search_queries(country: str, region: str, field: str) -> list[str]:
    """Multiple angled queries = better coverage than one generic search."""
    return [
        f"best universities in {region}, {country} for {field} graduate program",
        f"top {field} research universities {country}",
        f"{region} {country} universities computer science graduate ranking",
        f"universities in {country} strong {field} research groups",
    ]

def _verify_universities(universities: list[dict]) -> list[dict]:
    """
    Verify that each discovered homepage is reachable and appears
    to belong to a university.
    """

    verified = []

    for uni in universities:

        homepage = uni.get("homepage", "").strip()

        if not homepage:
            continue

        page_text = fetch_page_text(homepage)

        if not page_text:
            print(
                f"[university_finder] skipping unreachable site: {homepage}"
            )
            continue

        if "university" not in page_text.lower():
            print(
                f"[university_finder] skipping non-university site: {homepage}"
            )
            continue

        verified.append(uni)

    return verified


def discover_universities(country: str = COUNTRY,
                           region: str = PRIORITY_REGION,
                           field: str = FIELD,
                           limit: int = MAX_UNIVERSITIES) -> list[dict]:
    """
    Returns a list of {"name": str, "homepage_guess": str, "reason": str}
    Uses multiple search queries + an LLM pass to dedupe/clean/rank results,
    since raw search results are messy (mix of ranking-site blurbs, forums, etc).
    """
    all_snippets = []
    for q in _search_queries(country, region, field):
        results = search_web(q, max_results=4)
        for r in results:
            title = r.get("title", "")[:120]
            url = r.get("url", "")
            snippet = r.get("snippet", "")[:180]

            all_snippets.append(
                f"Title: {title}\n"
                f"URL: {url}\n"
                f"Snippet: {snippet}"
            )

    if not all_snippets:
        print("[university_finder] No search results — check network/search backend.")
        return []

    combined_text = "\n\n---\n\n".join(all_snippets)
    print(f"Total snippets: {len(all_snippets)}")
    print(f"Prompt characters: {len(combined_text)}")

    system_prompt = (
        "You are a research assistant helping a prospective Master's student find "
        "universities to target. You will be given raw web search snippets. Extract "
        "a clean, deduplicated list of actual universities (not ranking-list articles, "
        "not forums) that are relevant to the requested field and location."
    )
    user_prompt = f"""
    Country: {country}
    Region: {region}
    Field: {field}

    Raw search snippets:
    {combined_text}

    Return a JSON array of up to {limit} objects, each with:
    - {{
      "name": "University of Toronto",
      "homepage": "https://www.utoronto.ca",
      "reason": "Strong artificial-intelligence research and graduate programs."
    }}
    """
    universities = llm_json(system_prompt, user_prompt)
    universities = _verify_universities(universities)

    os.makedirs(os.path.dirname(UNIVERSITIES_CACHE), exist_ok=True)
    with open(UNIVERSITIES_CACHE, "w") as f:
        json.dump(universities, f, indent=2)

    return universities


if __name__ == "__main__":
    unis = discover_universities()
    print(json.dumps(unis, indent=2))