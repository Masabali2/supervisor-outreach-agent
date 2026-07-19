"""FastAPI integration for the Supervisor Outreach Agent pipeline with Real-time Streaming."""
from __future__ import annotations

import json
import logging
import asyncio
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# 🛠️ FIX: Fixed the missing import for discover_universities and removed unused UNIVERSITIES_CACHE
from backend.agents.faculty_finder import find_faculty_for_all
from backend.agents.ranker import run_ranking
from backend.agents.research_profiler import profile_all
from backend.agents.university_finder import discover_universities
from backend.config import FACULTY_CACHE, PROFILE_CACHE, RANKED_FACULTY_CACHE

LOGGER = logging.getLogger(__name__)
router = APIRouter()

# Global search lock to prevent concurrent execution on shared JSON caches
_search_lock = asyncio.Lock()


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
async def search(request: SearchRequest):
    """Run the four pipeline stages and stream progress in real-time."""

    # Non-blocking check to ensure single execution instance
    if _search_lock.locked():
        raise HTTPException(
            status_code=409,
            detail="A search is already in progress. Please wait for it to finish before starting another.",
        )

    async def pipeline_generator():
        # Acquire lock to safeguard JSON output operations
        await _search_lock.acquire()
        try:
            # Stage 0: Initialize Profile Configuration
            profile = {"country": request.country, "region": request.region, "degree": request.degree,
                       "field": request.field}
            Path(PROFILE_CACHE).parent.mkdir(parents=True, exist_ok=True)
            Path(PROFILE_CACHE).write_text(json.dumps(profile, indent=2), encoding="utf-8")

            # 🛠️ FIX: Removed typos from technical comments and fully standardized them
            # Stage 0 Message: University Finder initialization payload
            yield f"data: {json.dumps({'stage_index': 0, 'progress': 15, 'status': f'Discovering universities in {request.country}...'})}\n\n"
            await asyncio.sleep(0.1)  # Yield gap to flush the streaming buffer stream channel

            # Run University Finder Agent synchronously inside default executor thread to prevent event loop blocking
            universities = await asyncio.to_thread(
                discover_universities, request.country, request.region, request.field
            )

            # Stage 1 Message: Faculty Finder initialization payload
            yield f"data: {json.dumps({'stage_index': 1, 'progress': 45, 'status': f'Scanning faculty members across {len(universities)} discovered universities...'})}\n\n"
            await asyncio.sleep(0.1)

            faculty = await asyncio.to_thread(
                find_faculty_for_all, universities, field=request.field
            )

            # Stage 2 Message: Research Profiler initialization payload
            yield f"data: {json.dumps({'stage_index': 2, 'progress': 75, 'status': f'Analyzing research profiles and publications for {len(faculty)} faculty matches...'})}\n\n"
            await asyncio.sleep(0.1)

            await asyncio.to_thread(profile_all, FACULTY_CACHE, FACULTY_CACHE)

            # Stage 3 Message: Ranker initialization payload
            yield f"data: {json.dumps({'stage_index': 3, 'progress': 92, 'status': 'Evaluating compatibility matrix and final candidate ranking...'})}\n\n"
            await asyncio.sleep(0.1)

            ranked = await asyncio.to_thread(
                run_ranking, FACULTY_CACHE, PROFILE_CACHE, RANKED_FACULTY_CACHE
            )

            # Final operational payload dispatched upon pipeline success completion
            final_payload = {
                "complete": True,
                "stage_index": 3,
                "progress": 100,
                "status": "Pipeline completed successfully!",
                "universities": len(universities),
                "faculty": len(faculty),
                "ranked": len(ranked)
            }
            yield f"data: {json.dumps(final_payload)}\n\n"

        except Exception as error:
            LOGGER.exception("Pipeline failed inside stream generator")
            yield f"data: {json.dumps({'error': f'Search pipeline failed: {str(error)}'})}\n\n"
        finally:
            # Always ensure the thread safe execution lock is freed up
            _search_lock.release()

    return StreamingResponse(pipeline_generator(), media_type="text/event-stream")


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