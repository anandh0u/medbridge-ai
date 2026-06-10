"""Async Microsoft IQ tool connectors for MedBridge AI."""

from __future__ import annotations

import asyncio
import os
from typing import Any

from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential


JsonDict = dict[str, Any]

FOUNDATION_SOURCES = {
    "WHO ICD-11": "WHO ICD-11 symptom and disease classification knowledge",
    "CDC Respiratory Guidance": "CDC respiratory illness and warning-sign guidance",
    "Foundry IQ Emergency Medicine Guidance": "Emergency symptom triage knowledge indexed in Foundry IQ",
    "Foundry IQ Primary Care Guidance": "Primary care symptom assessment knowledge indexed in Foundry IQ",
}


def _contains_any(text: str, keywords: list[str]) -> bool:
    lowered = text.lower()
    return any(keyword in lowered for keyword in keywords)


def _offline_foundry_results(query: str) -> JsonDict:
    results: list[JsonDict] = []
    citations: list[str] = []
    confidence = 0.48

    if _contains_any(query, ["chest pain", "shortness of breath", "difficulty breathing"]):
        results.append(
            {
                "claim": (
                    "Chest pain with breathing difficulty may indicate urgent "
                    "cardiac, pulmonary, or vascular risk. "
                    "[Source: Foundry IQ Emergency Medicine Guidance]"
                ),
                "source": "Foundry IQ Emergency Medicine Guidance",
            }
        )
        citations.append("Foundry IQ Emergency Medicine Guidance")
        confidence = max(confidence, 0.91)

    if _contains_any(query, ["fever", "body aches", "cough", "sore throat"]):
        results.append(
            {
                "claim": (
                    "Fever, fatigue, and body aches may indicate an influenza-like "
                    "or other respiratory viral illness. "
                    "[Source: CDC Respiratory Guidance]"
                ),
                "source": "CDC Respiratory Guidance",
            }
        )
        citations.append("CDC Respiratory Guidance")
        confidence = max(confidence, 0.78)

    if _contains_any(query, ["headache", "mild headache"]):
        results.append(
            {
                "claim": (
                    "Mild headache with fatigue may indicate a lower-acuity concern "
                    "when no emergency symptoms are present. "
                    "[Source: Foundry IQ Primary Care Guidance]"
                ),
                "source": "Foundry IQ Primary Care Guidance",
            }
        )
        citations.append("Foundry IQ Primary Care Guidance")
        confidence = max(confidence, 0.49)

    if not results:
        results.append(
            {
                "claim": (
                    "Symptoms should be assessed using onset, duration, severity, "
                    "medical history, and red-flag symptoms. [Source: WHO ICD-11]"
                ),
                "source": "WHO ICD-11",
            }
        )
        citations.append("WHO ICD-11")

    return {
        "query": query,
        "results": results,
        "citations": sorted(set(citations)),
        "confidence": round(confidence, 2),
        "connection_status": "offline_fallback",
    }


async def foundry_iq_search(query: str) -> JsonDict:
    """Search the Foundry IQ knowledge base for medical context."""
    endpoint = os.getenv("AZURE_AI_PROJECT_ENDPOINT")
    model_deployment = os.getenv("MODEL_DEPLOYMENT_NAME", "gpt-4.1-mini")
    use_live_foundry = os.getenv("MEDBRIDGE_USE_LIVE_FOUNDRY", "").lower() in {"1", "true", "yes"}

    try:
        if not use_live_foundry:
            raise RuntimeError("MEDBRIDGE_USE_LIVE_FOUNDRY is not enabled")
        if not endpoint:
            raise RuntimeError("AZURE_AI_PROJECT_ENDPOINT is not configured")

        credential = DefaultAzureCredential(exclude_interactive_browser_credential=False)
        project_client = AIProjectClient(endpoint=endpoint, credential=credential)
        openai_client = project_client.get_openai_client()
        response = await asyncio.to_thread(
            openai_client.responses.create,
            model=model_deployment,
            input=(
                "Return concise medical triage context with citations for these "
                f"symptoms. Use only cautious language: {query}"
            ),
        )
        text = getattr(response, "output_text", "") or str(response)
        source = "Foundry IQ Knowledge Base"
        return {
            "query": query,
            "results": [{"claim": f"{text[:1200]} [Source: {source}]", "source": source}],
            "citations": [source],
            "confidence": 0.82,
            "connection_status": "connected",
        }
    except Exception as exc:
        fallback = _offline_foundry_results(query)
        fallback["connection_error"] = str(exc)
        return fallback


async def work_iq_recall(user_id: str) -> JsonDict:
    """Simulate Work IQ recall of patient Microsoft 365 history."""
    await asyncio.sleep(0)
    histories: dict[str, JsonDict] = {
        "user_001": {
            "last_visit": "2026-04-18: Community clinic visit for seasonal fever and cough.",
            "past_diagnoses": ["seasonal allergies", "mild asthma"],
            "medications": ["salbutamol inhaler as needed", "cetirizine 10 mg as needed"],
            "allergies": ["penicillin"],
            "appointments": [
                "2026-06-14: Primary care follow-up",
                "2026-07-02: Pulmonary function review",
            ],
        },
        "demo-patient-001": {
            "last_visit": "2026-02-12: Routine primary care checkup.",
            "past_diagnoses": ["elevated blood pressure screening"],
            "medications": ["no active medications recorded"],
            "allergies": ["no allergies recorded"],
            "appointments": ["2026-06-22: Community clinic appointment"],
        },
    }
    # A real Work IQ implementation would call Microsoft Graph or the approved
    # M365 Work IQ memory API for the signed-in user here.
    return histories.get(
        user_id,
        {
            "last_visit": "No previous visit found in simulated Work IQ memory.",
            "past_diagnoses": [],
            "medications": [],
            "allergies": [],
            "appointments": [],
        },
    )


async def fabric_iq_trends(region: str, symptoms: str) -> JsonDict:
    """Simulate Fabric IQ community health trend lookup."""
    await asyncio.sleep(0)
    symptom_text = symptoms.lower()
    outbreaks: list[str] = []
    risk_elevation = "none"

    if _contains_any(symptom_text, ["fever", "body aches", "cough", "sore throat"]):
        outbreaks.append("influenza-like illness")
        risk_elevation = "moderate"

    if _contains_any(symptom_text, ["difficulty breathing", "shortness of breath", "chest pain"]):
        outbreaks.append("respiratory emergency presentations above baseline")
        risk_elevation = "high"

    nearest_clinic = "Thrissur District Community Health Centre"
    clinic_distance_km = 3.8
    if "kerala" not in region.lower() and "thrissur" not in region.lower():
        nearest_clinic = "Nearest public community clinic"
        clinic_distance_km = 6.5

    # A real Fabric IQ implementation would query a Fabric semantic model,
    # healthcare ontology, or OneLake-backed community health dataset here.
    return {
        "region": region,
        "active_outbreaks": outbreaks,
        "risk_elevation": risk_elevation,
        "nearest_clinic": nearest_clinic,
        "clinic_distance_km": clinic_distance_km,
    }
