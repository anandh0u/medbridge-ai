import type { Citation, RiskLevel, TriageRequest, TriageResult } from "./types";

const sources: Record<string, Citation> = {
  chest: {
    title: "MedlinePlus - Chest pain",
    url: "https://medlineplus.gov/ency/article/003079.htm",
    citation: "MedlinePlus chest pain guidance"
  },
  breathing: {
    title: "MedlinePlus - Breathing difficulties first aid",
    url: "https://medlineplus.gov/ency/article/000007.htm",
    citation: "MedlinePlus breathing difficulty first-aid guidance"
  },
  headache: {
    title: "MedlinePlus - Headaches danger signs",
    url: "https://medlineplus.gov/ency/patientinstructions/000424.htm",
    citation: "MedlinePlus headache danger-sign guidance"
  },
  flu: {
    title: "CDC - Signs and Symptoms of Flu",
    url: "https://www.cdc.gov/flu/signs-symptoms/index.html",
    citation: "CDC flu symptoms and emergency-warning guidance"
  }
};

const highRiskTerms = [
  "chest pain",
  "shortness of breath",
  "can't breathe",
  "cannot breathe",
  "stroke",
  "fainting",
  "seizure",
  "worst headache"
];

const mediumRiskTerms = ["fever", "persistent", "worsening", "vomiting", "dizziness", "asthma"];

function containsAny(text: string, terms: string[]): boolean {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function inferRisk(symptoms: string): RiskLevel {
  if (containsAny(symptoms, highRiskTerms)) {
    return "high";
  }
  if (containsAny(symptoms, mediumRiskTerms)) {
    return "medium";
  }
  return "low";
}

function sourceList(symptoms: string): Citation[] {
  const normalized = symptoms.toLowerCase();
  const list = new Map<string, Citation>();
  if (normalized.includes("chest")) list.set("chest", sources.chest);
  if (normalized.includes("breath")) list.set("breathing", sources.breathing);
  if (normalized.includes("headache")) list.set("headache", sources.headache);
  if (["fever", "cough", "fatigue", "sore throat"].some((term) => normalized.includes(term))) {
    list.set("flu", sources.flu);
  }
  if (list.size === 0) list.set("headache", sources.headache);
  return [...list.values()];
}

function createMockResult(request: TriageRequest): TriageResult {
  const riskLevel = inferRisk(request.symptoms);
  const citations = sourceList(request.symptoms);
  const isRespiratory = /breath|cough|fever|chest|flu|sore throat/i.test(request.symptoms);
  const score = riskLevel === "high" ? 0.92 : riskLevel === "medium" ? 0.68 : 0.34;
  const communityScore = isRespiratory ? 0.66 : 0.31;
  const emergency =
    riskLevel === "high"
      ? "High-risk symptoms reported. This may indicate a time-sensitive emergency. Call local emergency services now or go to the nearest emergency department."
      : null;
  const timeline = [
    {
      date: "2026-02-12",
      type: "Primary care",
      summary: "Routine checkup; blood pressure mildly elevated."
    },
    {
      date: "2026-04-03",
      type: "Community clinic",
      summary: "Reported seasonal allergies and intermittent fatigue."
    },
    {
      date: "2025-11-20",
      type: "Follow-up",
      summary: "Missed cardiology follow-up after elevated blood pressure screening."
    }
  ];
  const actionPlan =
    riskLevel === "high"
      ? [
          "Call local emergency services now or go to the nearest emergency department.",
          "Do not drive yourself while symptoms are active.",
          "Share the Work IQ history and symptom timeline with emergency responders."
        ]
      : riskLevel === "medium"
        ? [
            "Contact a licensed clinician, urgent care, or community clinic today.",
            "Monitor symptom severity, breathing, fever, hydration, and new red flags.",
            "Use the doctor briefing to reduce repeated intake burden at the visit."
          ]
        : [
            "Use rest, hydration, and symptom monitoring while symptoms remain mild.",
            "Schedule primary care or telehealth follow-up if symptoms persist or worsen.",
            "Seek urgent help if red-flag symptoms appear."
          ];

  const communityContext = {
    condition: isRespiratory ? "respiratory" : "general",
    trend: isRespiratory ? "elevated" : "stable",
    regional_risk_score: communityScore,
    risk_factors: isRespiratory
      ? [
          "Respiratory symptom reports are above baseline in nearby community clinics.",
          "Limited same-day appointment availability increases follow-up delay risk."
        ]
      : ["No unusual regional signal detected in the demo community dataset."]
  };

  return {
    emergency_banner: emergency,
    risk_level: riskLevel,
    risk_score: score,
    risk_rationale:
      "This may indicate " +
      riskLevel +
      " risk based on symptoms, Work IQ history, Fabric IQ context, and cited Foundry IQ medical guidance.",
    action_plan: actionPlan,
    timeline,
    community_context: communityContext,
    doctor_briefing: {
      patient_summary: {
        patient_id: request.userId,
        region: request.region,
        risk_level: riskLevel,
        risk_score: score
      },
      reported_symptoms: request.symptoms,
      medical_context: citations.map((source) => ({
        claim:
          riskLevel === "high"
            ? "These symptoms may indicate a time-sensitive condition and require urgent assessment."
            : "These symptoms may be non-emergency when no danger signs are present, but should be monitored.",
        confidence: score,
        source
      })),
      health_history: timeline,
      community_context: communityContext,
      recommended_tests:
        riskLevel === "high"
          ? ["Emergency clinician assessment", "Vital signs and oxygen saturation", "ECG if clinically appropriate"]
          : ["Primary care assessment if symptoms persist", "Medication and vital-sign review"],
      recommended_next_steps: actionPlan,
      citations
    },
    citations,
    disclaimer:
      "MedBridge AI does not diagnose. Consult a licensed medical professional for medical advice, diagnosis, or treatment."
  };
}

export async function requestTriage(request: TriageRequest): Promise<TriageResult> {
  const baseUrl = import.meta.env.VITE_MEDBRIDGE_API_URL;
  if (baseUrl) {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/triage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symptoms: request.symptoms,
        user_id: request.userId,
        region: request.region
      })
    });
    if (!response.ok) {
      throw new Error(`Triage request failed with ${response.status}`);
    }
    return response.json() as Promise<TriageResult>;
  }

  await new Promise((resolve) => window.setTimeout(resolve, 650));
  return createMockResult(request);
}

