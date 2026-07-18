"""
Fetches and cleans web page / PDF content so it's ready to feed into the LLM.

Improvements:
- Better logging
- BeautifulSoup fallback
- Content-Type validation
- Same API as before
"""

import io
import logging

import requests
import trafilatura

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}


def fetch_page_text(url: str, timeout: int = 15) -> str:
    """
    Fetches a URL and returns clean, readable text.
    Returns "" on failure.
    """

    try:

        if url.lower().endswith(".pdf"):
            return fetch_pdf_text(url, timeout=timeout)

        downloaded = trafilatura.fetch_url(url)

        if not downloaded:

            logger.debug(
                "Trafilatura fetch failed, falling back to requests: %s",
                url,
            )

            resp = requests.get(
                url,
                headers=HEADERS,
                timeout=timeout,
            )

            resp.raise_for_status()

            content_type = resp.headers.get(
                "Content-Type",
                "",
            ).lower()

            if "html" not in content_type:
                logger.warning(
                    "Skipping non-HTML page: %s (%s)",
                    url,
                    content_type,
                )
                return ""

            downloaded = resp.text

        text = trafilatura.extract(
            downloaded,
            include_links=True,
            include_tables=True,
        )

        if text:
            return text

        logger.debug(
            "Trafilatura extraction failed. Using BeautifulSoup fallback: %s",
            url,
        )

        try:
            from bs4 import BeautifulSoup

            soup = BeautifulSoup(
                downloaded,
                "html.parser",
            )

            for tag in soup(
                [
                    "script",
                    "style",
                    "noscript",
                    "svg",
                ]
            ):
                tag.decompose()

            return " ".join(soup.stripped_strings)

        except ImportError:
            logger.warning(
                "BeautifulSoup not installed. "
                "Install beautifulsoup4 for fallback extraction."
            )
            return ""

        except Exception as exc:
            logger.warning(
                "BeautifulSoup extraction failed for %s: %s",
                url,
                exc,
            )
            return ""

    except Exception as exc:
        logger.warning(
            "Failed to fetch page %s: %s",
            url,
            exc,
        )
        return ""


def fetch_pdf_text(url: str, timeout: int = 20) -> str:
    """Extracts text from a PDF at a given URL."""

    try:

        import pdfplumber

        resp = requests.get(
            url,
            headers=HEADERS,
            timeout=timeout,
        )

        resp.raise_for_status()

        text_chunks = []

        with pdfplumber.open(io.BytesIO(resp.content)) as pdf:

            for page in pdf.pages[:15]:

                page_text = page.extract_text()

                if page_text:
                    text_chunks.append(page_text)

        return "\n".join(text_chunks)

    except Exception as exc:

        logger.warning(
            "Failed to fetch PDF %s: %s",
            url,
            exc,
        )

        return ""


def fetch_raw_html(url: str, timeout: int = 15) -> str:
    """
    Returns raw HTML.
    Used when parsing faculty directories and extracting links.
    """

    try:

        resp = requests.get(
            url,
            headers=HEADERS,
            timeout=timeout,
        )

        resp.raise_for_status()

        content_type = resp.headers.get(
            "Content-Type",
            "",
        ).lower()

        if "html" not in content_type:
            logger.warning(
                "Skipping non-HTML page: %s (%s)",
                url,
                content_type,
            )
            return ""

        return resp.text

    except Exception as exc:

        logger.warning(
            "Failed to fetch raw HTML %s: %s",
            url,
            exc,
        )

        return ""