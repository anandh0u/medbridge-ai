"""Parallel IQ orchestration and risk synthesis for MedBridge AI."""

from __future__ import annotations

import asyncio
import re
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

NEGATION_WORDS = ("no", "not", "without", "denies", "denied", "free of")
VIRAL_SYMPTOMS = ["fever", "body aches", "cough", "sore throat"]
RESPIRATORY_SYMPTOMS = ["difficulty breathing", "shortness of breath", "chest pain", "wheezing", "chest tightness", "cough"]
MILD_SYMPTOMS = ["mild headache", "headache", "fatigue", "tired"]
STOPWORDS = {
    "and",
    "for",
    "from",
    "history",
    "mild",
    "patient",
    "primary",
    "routine",
    "seasonal",
    "up",
    "visit",
    "with",
}


def _contains_any(text: str, keywords: list[str]) -> bool:
    lowered = text.lower()
    return any(keyword in lowered for keyword in keywords)


def _phrase_present(text: str, phrase: str) -> bool:
    pattern = rf"\b{re.escape(phrase)}\b"
    return bool(re.search(pattern, text, flags=re.IGNORECASE))


def _phrase_is_negated(text: str, phrase: str) -> bool:
    pattern = rf"\b(?:{'|'.join(NEGATION_WORDS)})\b(?:\W+\w+){{0,3}}\W+{re.escape(phrase)}\b"
    return bool(re.search(pattern, text, flags=re.IGNORECASE))


def _active_phrases(text: str, keywords: list[str]) -> list[str]:
    return [keyword for keyword in keywords if _phrase_present(text, keyword) and not _phrase_is_negated(text, keyword)]


def _diagnosis_matches_symptoms(diagnosis: str, symptom_text: str) -> bool:
    lowered_diagnosis = diagnosis.lower()
    lowered_symptoms = symptom_text.lower()

    if "asthma" in lowered_diagnosis and _contains_any(lowered_symptoms, ["breath", "wheez", "cough", "chest tightness"]):
        return True
    if ("blood pressure" in lowered_diagnosis or "hypertension" in lowered_diagnosis) and _contains_any(
        lowered_symptoms, ["headache", "dizziness", "chest pain"]
    ):
        return True
    if "allerg" in lowered_diagnosis and _contains_any(lowered_symptoms, ["sneezing", "congestion", "itch", "rash"]):
        return True
    if "fever" in lowered_diagnosis and "fever" in lowered_symptoms:
        return True

    diagnosis_tokens = {
        token
        for token in re.findall(r"[a-z0-9]+", lowered_diagnosis)
        if len(token) > 3 and token not in STOPWORDS
    }
    symptom_tokens = set(re.findall(r"[a-z0-9]+", lowered_symptoms))
    return bool(diagnosis_tokens & symptom_tokens)


def _finalize_recommendation(message: str) -> str:
    body = message.rstrip()
    if not body.endswith("."):
        body = f"{body}."
    return f"{body} Always recommend consulting a licensed medical professional."


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
    active_outbreaks = [str(item) for item in trends.get("active_outbreaks", []) if str(item)]
    past_diagnoses = [str(item) for item in history.get("past_diagnoses", []) if str(item)]
    result_text = " ".join(str(item.get("claim", "")) for item in medical.get("results", []) if isinstance(item, dict))
    combined_text = f"{symptoms} {result_text}"
    lowered_text = combined_text.lower()
    first_source = str((medical.get("citations") or ["Foundry IQ Knowledge Base"])[0])
    source = _source_bracket(first_source)
    reasoning_trace: list[str] = []

    emergency_signals = _active_phrases(lowered_text, EMERGENCY_KEYWORDS)
    viral_signals = _active_phrases(lowered_text, VIRAL_SYMPTOMS)
    respiratory_signals = _active_phrases(lowered_text, RESPIRATORY_SYMPTOMS)
    mild_signals = _active_phrases(lowered_text, MILD_SYMPTOMS)
    past_diagnosis_matches = [diagnosis for diagnosis in past_diagnoses if _diagnosis_matches_symptoms(diagnosis, symptoms)]
    outbreak_active = bool(active_outbreaks)

    if emergency_signals:
        risk_level = "CRITICAL"
        primary_concern = "Emergency red-flag symptoms"
        recommendation = _finalize_recommendation(
            "EMERGENCY FLAG: Call local emergency services now or go to the nearest emergency department. "
            f"This may indicate a time-sensitive condition {source}."
        )
        reasoning_trace.append(
            f"Emergency keyword(s) detected after negation handling: {', '.join(emergency_signals)} {source}."
        )
    elif confidence > 0.75 and outbreak_active:
        risk_level = "HIGH"
        primary_concern = "Symptoms align with elevated community outbreak risk"
        recommendation = _finalize_recommendation(
            "Seek same-day care at a clinic or urgent care. "
            f"This may indicate higher risk because Foundry confidence is elevated and Fabric IQ reports active outbreaks {source}."
        )
        reasoning_trace.append(
            f"Foundry confidence is above 0.75 and Fabric IQ reports active outbreaks: {', '.join(active_outbreaks)} {source}."
        )
    elif confidence > 0.5 or past_diagnosis_matches or viral_signals or respiratory_signals:
        risk_level = "MEDIUM"
        primary_concern = (
            "Symptoms overlap with prior history and need clinical follow-up"
            if past_diagnosis_matches
            else "Symptoms need clinical follow-up"
        )
        recommendation = _finalize_recommendation(
            "Contact a licensed medical professional soon, especially if symptoms persist or worsen. "
            f"This may indicate a moderate-risk concern {source}."
        )
        if past_diagnosis_matches:
            reasoning_trace.append(
                f"Work IQ history matched the symptom context: {', '.join(past_diagnosis_matches)} [Source: Work IQ]."
            )
        elif viral_signals or respiratory_signals:
            reasoning_trace.append(
                f"Foundry IQ and the symptom cluster point to a monitored follow-up concern: {', '.join(sorted(set(viral_signals + respiratory_signals)))} {source}."
            )
        else:
            reasoning_trace.append("Foundry confidence is above 0.5, so the case stays in the follow-up range.")
    else:
        risk_level = "LOW"
        primary_concern = "No emergency signal found"
        recommendation = _finalize_recommendation(
            "Monitor symptoms, rest, hydrate, and consult a licensed medical professional if symptoms persist or worsen. "
            f"This may indicate a lower-risk concern {source}."
        )
        if mild_signals:
            reasoning_trace.append(f"Symptoms look mild after negation handling: {', '.join(mild_signals)} {source}.")
        else:
            reasoning_trace.append("No emergency keyword, outbreak escalation, or matching past diagnosis was found.")

    reasoning_trace.extend(
        [
            f"Foundry IQ confidence: {confidence:.2f} {source}.",
            f"Active outbreaks: {active_outbreaks or ['none']} [Source: Fabric IQ].",
            f"Past diagnosis matches: {past_diagnosis_matches or ['none']} [Source: Work IQ].",
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
