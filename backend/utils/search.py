"""Search providers used by the discovery pipeline.

The module intentionally normalizes every provider into the same small result
schema, so agents do not need to know which provider returned a result.
"""

from __future__ import annotations

import logging
import os
from typing import Any

try:
    import requests
except ImportError:  # Lets agents run safely before project setup is complete.
    requests = None

logger = logging.getLogger(__name__)

BLOCKED_DOMAINS = (
    "facebook.com", "twitter.com", "x.com", "instagram.com",
    "tiktok.com", "reddit.com", "pinterest.com", "youtube.com",
    "groups.google.com", "quora.com","linkedin.com","github.com",
)


def _clean_result(item: dict[str, Any]) -> dict[str, str] | None:
    """Convert a provider result to the shared search-result schema."""
    url = str(item.get("href") or item.get("url") or "").strip()
    if not url.startswith(("http://", "https://")):
        return None

    # NEW: Drop social media / forum junk domains before scraping
    if any(blocked in url.lower() for blocked in BLOCKED_DOMAINS):
        return None

    return {
        "title": str(item.get("title") or "").strip(),
        "url": url,
        "snippet": str(item.get("body") or item.get("content") or "").strip(),
    }


def duckduckgo_search(query: str, max_results: int = 10) -> list[dict[str, str]]:
    """Search DuckDuckGo and return normalized web results.

    ``ddgs`` is optional so the rest of the project can still import and run
    when dependencies have not been installed yet.
    """
    try:
        from ddgs import DDGS
    except ImportError:
        logger.warning("DuckDuckGo search unavailable: install 'ddgs'.")
        return []

    try:
        raw_results = DDGS().text(query, max_results=max_results)
        return [result for item in raw_results if (result := _clean_result(item))]
    except Exception as exc:  # Provider/network errors must not stop a stage.
        logger.warning("DuckDuckGo search failed for %r: %s", query, exc)
        return []


def tavily_search(query: str, max_results: int = 10) -> list[dict[str, str]]:
    """Search Tavily when ``TAVILY_API_KEY`` is configured."""
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key or requests is None:
        return []

    try:
        response = requests.post(
            "https://api.tavily.com/search",
            json={
                "api_key": api_key,
                "query": query,
                "search_depth": "basic",
                "max_results": max_results,
            },
            timeout=20,
        )
        response.raise_for_status()
        items = response.json().get("results", [])
        return [result for item in items if (result := _clean_result(item))]
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Tavily search failed for %r: %s", query, exc)
        return []


def search_web(query: str, max_results: int = 10) -> list[dict[str, str]]:
    """Search Tavily first, falling back to DuckDuckGo only when needed.

    This avoids duplicate searches, unnecessary Tavily API usage, and the
    extra latency of querying both providers for the same request.
    """
    tavily_results = tavily_search(query, max_results)
    combined = tavily_results or duckduckgo_search(query, max_results)
    seen_urls: set[str] = set()
    unique_results: list[dict[str, str]] = []
    for result in combined:
        canonical_url = result["url"].rstrip("/").lower()
        if canonical_url not in seen_urls:
            seen_urls.add(canonical_url)
            unique_results.append(result)
    return unique_results[:max_results]
