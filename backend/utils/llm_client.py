"""
Thin wrapper around the Groq API so agents don't repeat boilerplate.
Get a free key at https://console.groq.com/keys and set:
    export GROQ_API_KEY="your_key_here"
"""
import json
from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL

_client = None


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
        raise

    decoder = json.JSONDecoder()

    obj, _ = decoder.raw_decode(candidate[min(starts):])

    return obj


def llm_chat(system_prompt: str, user_prompt: str, temperature: float = 0.4) -> str:
    """Plain text completion."""
    client = _get_client()
    resp = client.chat.completions.create(
        model=GROQ_MODEL,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    return resp.choices[0].message.content.strip()


def llm_json(system_prompt: str, user_prompt: str, temperature: float = 0.2) -> dict | list:
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