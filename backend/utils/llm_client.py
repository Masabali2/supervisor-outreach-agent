"""
Thin wrapper around the Groq API so agents don't repeat boilerplate.
Get a free key at https://console.groq.com/keys and set:
    export GROQ_API_KEY="your_key_here"
"""
import json
import re
import time

from groq import Groq
from backend.config import GROQ_API_KEY, GROQ_MODEL

_client = None

# How many times to retry a rate-limited (429) Groq call before giving up.
_MAX_RETRIES = 3
# Fallback wait if Groq's error message doesn't include a specific delay.
_DEFAULT_BACKOFF_SECONDS = 5.0


def _get_client() -> Groq:
    global _client
    if _client is None:
        if not GROQ_API_KEY:
            raise RuntimeError(
                "GROQ_API_KEY not set. Run: export GROQ_API_KEY='your_key_here'"
            )
        _client = Groq(
            api_key=GROQ_API_KEY,
            timeout=45.0,
        )
    return _client


def _is_rate_limit_error(exc: Exception) -> bool:
    """True for Groq 429 (tokens/requests-per-minute) errors."""
    status_code = getattr(exc, "status_code", None)
    if status_code == 429:
        return True
    return "429" in str(exc) or "rate_limit_exceeded" in str(exc)


def _extract_retry_delay_seconds(exc: Exception) -> float:
    """
    Groq's 429 message usually includes e.g. "Please try again in 11.72s".
    Parse that out so we wait just long enough instead of guessing.
    """
    match = re.search(r"try again in (\d+(?:\.\d+)?)s", str(exc))
    if match:
        return float(match.group(1)) + 0.5  # small safety margin
    return _DEFAULT_BACKOFF_SECONDS


def _parse_json(text: str) -> dict | list:
    """
    Robust JSON parser.
    Accepts fenced JSON and ignores extra text before JSON.
    """
    candidate = text.strip()

    # Remove markdown fences
    if candidate.startswith("```"):
        candidate = candidate.split("\n", 1)[1] if "\n" in candidate else ""
        if candidate.rstrip().endswith("```"):
            candidate = candidate.rstrip()[:-3].strip()

    try:
        return json.loads(candidate)

    except json.JSONDecodeError:
        pass

    # Find first JSON object or array
    starts = [
        i for i in (
            candidate.find("{"),
            candidate.find("["),
        )
        if i >= 0
    ]

    if not starts:
        raise json.JSONDecodeError(
            "No JSON object/array found in LLM response", candidate, 0
        )

    decoder = json.JSONDecoder()

    try:
        obj, _ = decoder.raw_decode(candidate[min(starts):])
    except json.JSONDecodeError as e:
        raise json.JSONDecodeError(
            f"Failed to decode JSON: {e}", candidate, 0
        )

    return obj


def llm_chat(system_prompt: str, user_prompt: str, temperature: float = 0.4) -> str:
    """Plain text completion. Retries automatically on Groq 429 rate limits."""
    client = _get_client()
    last_error: Exception | None = None

    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            resp = client.chat.completions.create(
                model=GROQ_MODEL,
                temperature=temperature,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            return resp.choices[0].message.content.strip()
        except Exception as exc:
            last_error = exc
            if not _is_rate_limit_error(exc) or attempt == _MAX_RETRIES:
                raise
            delay = _extract_retry_delay_seconds(exc)
            print(f"[llm_client] Groq rate limit hit (attempt {attempt}/{_MAX_RETRIES}); retrying in {delay:.1f}s")
            time.sleep(delay)

    # Unreachable in practice (loop always returns or raises), but keeps
    # type-checkers happy and guards against future edits to the loop.
    raise last_error  # type: ignore[misc]


def llm_json(system_prompt: str, user_prompt: str, temperature: float = 0.1) -> dict | list:
    """
    Structured completion — forces the model to return ONLY valid JSON.
    Raises json.JSONDecodeError if the model still misbehaves (rare with this prompt style).
    """
    strict_system = (
        system_prompt
        + "\n\nCRITICAL: Respond with ONLY valid JSON. No markdown fences, "
        "no preamble, no explanation — just the raw JSON."
    )

    raw = llm_chat(strict_system, user_prompt, temperature=temperature)

    cleaned = (
        raw.strip()
        .removeprefix("```json")
        .removeprefix("```")
        .removesuffix("```")
        .strip()
    )

    print("\n========== RAW LLM RESPONSE ==========")
    print(cleaned)
    print("======================================\n")

    return _parse_json(cleaned)