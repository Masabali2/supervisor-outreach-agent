"""FastAPI integration for the Supervisor Outreach Agent pipeline."""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.agents.faculty_finder import find_faculty_for_all
from backend.agents.ranker import run_ranking
from backend.agents.research_profiler import profile_all
from backend.agents.university_finder import discover_universities
from backend.config import FACULTY_CACHE, PROFILE_CACHE, RANKED_FACULTY_CACHE, UNIVERSITIES_CACHE

LOGGER = logging.getLogger(__name__)
router = APIRouter()


class SearchRequest(BaseModel):
    country: str = Field(min_length=2)
    region: str = ""
    degree: str = Field(pattern="^(Masters|PhD)$")
    field: str = Field(min_length=3)


def _read_list(path: str) -> list[dict[str, Any]]:
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=500, detail=f"Could not read pipeline output: {error}") from error
    if not isinstance(data, list):
        raise HTTPException(status_code=500, detail="Pipeline output is not a JSON list.")
    return data


@router.post("/search")
def search(request: SearchRequest) -> dict[str, Any]:
    """Run the four pipeline stages and store the ranked result."""
    try:
        profile = {"country": request.country, "region": request.region, "degree": request.degree, "field": request.field}
        Path(PROFILE_CACHE).parent.mkdir(parents=True, exist_ok=True)
        Path(PROFILE_CACHE).write_text(json.dumps(profile, indent=2), encoding="utf-8")
        universities = discover_universities(request.country, request.region, request.field)
        faculty = find_faculty_for_all(universities, field=request.field)
        profile_all(FACULTY_CACHE, FACULTY_CACHE)
        ranked = run_ranking(FACULTY_CACHE, PROFILE_CACHE, RANKED_FACULTY_CACHE)
    except Exception as error:
        LOGGER.exception("Pipeline failed")
        raise HTTPException(status_code=502, detail=f"Search pipeline failed: {error}") from error
    return {"status": "success", "universities": len(universities), "faculty": len(faculty), "ranked": len(ranked)}


@router.get("/results")
def results() -> list[dict[str, Any]]:
    """Return ranked faculty from the most recently completed search."""
    return _read_list(RANKED_FACULTY_CACHE)


@router.get("/professor/{professor_id}")
def professor(professor_id: int) -> dict[str, Any]:
    """Return one ranked professor using its stable result-list index."""
    records = _read_list(RANKED_FACULTY_CACHE)
    if professor_id < 0 or professor_id >= len(records):
        raise HTTPException(status_code=404, detail="Professor was not found.")
    return records[professor_id]
