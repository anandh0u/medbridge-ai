"""Parallel IQ orchestration and risk synthesis for MedBridge AI."""

from __future__ import annotations

import asyncio
from typing import Any

from .tools import fabric_iq_trends, foundry_iq_search, work_iq_recall


JsonDict = dict[str, Any]

EMERGENCY_KEYWORDS = [
    "chest pain",
    "difficulty breathing",
    "shortness of breath",
    "unconscious",
    "stroke",
    "severe bleeding",
]


def _contains_any(text: str, keywords: list[str]) -> bool:
    lowered = text.lower()
    return any(keyword in lowered for keyword in keywords)


def _source_bracket(source: str) -> str:
    return f"[Source: {source}]"


async def run_parallel_iq(symptoms: str, user_id: str, region: str) -> JsonDict:
    """Call Foundry IQ, Work IQ, and Fabric IQ simultaneously."""
    medical, history, trends = await asyncio.gather(
        foundry_iq_search(symptoms),
        work_iq_recall(user_id),
        fabric_iq_trends(region, symptoms),
    )
    return {
        "symptoms": symptoms,
        "user_id": user_id,
        "region": region,
        "medical": medical,
        "history": history,
        "trends": trends,
    }


def synthesize_risk(medical: JsonDict, history: JsonDict, trends: JsonDict) -> JsonDict:
    """Synthesize risk from Foundry IQ, Work IQ, and Fabric IQ context."""
    symptoms = str(medical.get("query", ""))
    confidence = float(medical.get("confidence", 0.0))
    active_outbreaks = trends.get("active_outbreaks", [])
    past_diagnoses = [str(item).lower() for item in history.get("past_diagnoses", [])]
    result_text = " ".join(
        str(item.get("claim", "")) for item in medical.get("results", []) if isinstance(item, dict)
    )
    combined_text = f"{symptoms} {result_text}".lower()
    first_source = str((medical.get("citations") or ["Foundry IQ Knowledge Base"])[0])
    source = _source_bracket(first_source)
    reasoning_trace: list[str] = []

    emergency_match = _contains_any(combined_text, EMERGENCY_KEYWORDS)
    past_diagnosis_matches = [
        diagnosis
        for diagnosis in past_diagnoses
        if diagnosis and any(token in combined_text for token in diagnosis.split())
    ]

    if emergency_match:
        risk_level = "CRITICAL"
        primary_concern = "Emergency red-flag symptoms"
        recommendation = (
            "EMERGENCY FLAG: Call local emergency services now or go to the "
            "nearest emergency department. This may indicate a time-sensitive "
            f"condition {source}."
        )
        reasoning_trace.append("Emergency keyword detected in symptoms or Foundry IQ result.")
    elif confidence > 0.75 and active_outbreaks:
        risk_level = "HIGH"
        primary_concern = "Symptoms align with elevated community outbreak risk"
        recommendation = (
            "Seek same-day care at a clinic or urgent care. This may indicate "
            f"higher risk because Foundry confidence is elevated and Fabric IQ "
            f"reports active outbreaks {source}."
        )
        reasoning_trace.append("Foundry confidence is above 0.75 and Fabric IQ reports active outbreaks.")
    elif confidence > 0.5 or past_diagnosis_matches:
        risk_level = "MEDIUM"
        primary_concern = "Symptoms need clinical follow-up"
        recommendation = (
            "Contact a licensed medical professional soon, especially if symptoms "
            f"persist or worsen. This may indicate a moderate-risk concern {source}."
        )
        reasoning_trace.append("Foundry confidence is above 0.5 or Work IQ history matched symptom context.")
    else:
        risk_level = "LOW"
        primary_concern = "No emergency signal found"
        recommendation = (
            "Monitor symptoms, rest, hydrate, and consult a licensed medical "
            f"professional if symptoms persist or worsen {source}."
        )
        reasoning_trace.append("No emergency keyword, outbreak escalation, or matching past diagnosis was found.")

    reasoning_trace.extend(
        [
            f"Foundry IQ confidence: {confidence:.2f}.",
            f"Active outbreaks: {active_outbreaks or 'none'}.",
            f"Past diagnosis matches: {past_diagnosis_matches or 'none'}.",
            "All medical claims use cautious language and should be reviewed by a licensed professional.",
        ]
    )

    emergency_flag = risk_level == "CRITICAL"
    doctor_briefing = {
        "patient_context": {
            "last_visit": history.get("last_visit", "unknown"),
            "past_diagnoses": history.get("past_diagnoses", []),
            "medications": history.get("medications", []),
            "allergies": history.get("allergies", []),
            "appointments": history.get("appointments", []),
        },
        "reported_symptoms": symptoms,
        "risk_level": risk_level,
        "emergency_flag": emergency_flag,
        "primary_concern": primary_concern,
        "medical_findings": medical.get("results", []),
        "foundry_citations": medical.get("citations", []),
        "community_context": {
            "region": trends.get("region"),
            "active_outbreaks": active_outbreaks,
            "risk_elevation": trends.get("risk_elevation"),
            "nearest_clinic": trends.get("nearest_clinic"),
            "clinic_distance_km": trends.get("clinic_distance_km"),
        },
        "recommended_next_steps": recommendation,
    }

    return {
        "risk_level": risk_level,
        "primary_concern": primary_concern,
        "reasoning_trace": reasoning_trace,
        "recommendation": recommendation,
        "doctor_briefing": doctor_briefing,
    }

