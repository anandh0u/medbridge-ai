"""HTTP gateway for local demos and hosted-container smoke tests."""

from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .agent import run_triage


class TriageRequest(BaseModel):
    symptoms: str = Field(min_length=3)
    user_id: str = "demo-patient-001"
    region: str = "South India"


app = FastAPI(title="MedBridge AI", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/triage")
async def triage(request: TriageRequest) -> dict[str, Any]:
    return await run_triage(
        symptoms=request.symptoms,
        user_id=request.user_id,
        region=request.region,
    )


def _extract_response_input(payload: dict[str, Any]) -> str:
    raw_input = payload.get("input", "")
    if isinstance(raw_input, str):
        return raw_input
    if isinstance(raw_input, list):
        chunks: list[str] = []
        for item in raw_input:
            if isinstance(item, dict):
                content = item.get("content")
                if isinstance(content, str):
                    chunks.append(content)
                elif isinstance(content, list):
                    for part in content:
                        if isinstance(part, dict):
                            text = part.get("text") or part.get("content")
                            if isinstance(text, str):
                                chunks.append(text)
            elif isinstance(item, str):
                chunks.append(item)
        return " ".join(chunks)
    return str(raw_input)


@app.post("/responses")
async def responses(payload: dict[str, Any]) -> dict[str, Any]:
    symptoms = _extract_response_input(payload)
    result = await run_triage(
        symptoms=symptoms or "No symptoms provided",
        user_id=str(payload.get("user_id", "demo-patient-001")),
        region=str(payload.get("region", "South India")),
    )
    return {
        "id": f"resp_{uuid4().hex}",
        "object": "response",
        "status": "completed",
        "output": [
            {
                "type": "message",
                "role": "assistant",
                "content": [
                    {
                        "type": "output_text",
                        "text": json.dumps(result),
                    }
                ],
            }
        ],
    }
