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
  },
  who: {
    title: "WHO ICD-11",
    url: "https://icd.who.int/",
    citation: "WHO ICD-11 symptom classification"
  }
};

const highRiskTerms = [
  "chest pain",
  "shortness of breath",
  "can't breathe",
  "cannot breathe",
  "difficulty breathing",
  "unconscious",
  "stroke",
  "severe bleeding",
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
  const isEmergency = riskLevel === "high";
  const isOutbreak = /fever|body aches|cough|flu|sore throat/i.test(request.symptoms);
  const isRespiratory = /breath|cough|fever|chest|flu|sore throat/i.test(request.symptoms);
  const displayRisk: RiskLevel = isOutbreak && !isEmergency ? "medium" : riskLevel;
  const score = isEmergency ? 0.96 : isOutbreak ? 0.76 : 0.34;
  const communityScore = isEmergency ? 0.88 : isOutbreak ? 0.72 : 0.24;
  const emergency =
    isEmergency
      ? "EMERGENCY FLAG: Call local emergency services now or go to the nearest emergency department. This may indicate a time-sensitive condition [Source: MedlinePlus breathing difficulty first-aid guidance]."
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
    isEmergency
      ? [
          "Call local emergency services now or go to the nearest emergency department.",
          "Do not drive yourself while symptoms are active.",
          "Share the Work IQ history and symptom timeline with emergency responders."
        ]
      : isOutbreak
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
    trend: isEmergency ? "urgent" : isOutbreak ? "elevated" : "stable",
    regional_risk_score: communityScore,
    risk_factors: isEmergency
      ? [
          "Emergency respiratory presentations are above baseline in the demo community signal.",
          "Nearest urgent-care route should be prioritized over routine appointment scheduling."
        ]
      : isOutbreak
      ? [
          "Respiratory symptom reports are above baseline in nearby community clinics.",
          "Limited same-day appointment availability increases follow-up delay risk."
        ]
      : ["No unusual regional signal detected in the demo community dataset."]
  };

  return {
    emergency_banner: emergency,
    risk_level: displayRisk,
    risk_score: score,
    risk_rationale:
      isEmergency
        ? "Emergency keyword detected in the symptoms and cross-checked against cited emergency guidance."
        : isOutbreak
          ? "Foundry IQ symptom confidence and Fabric IQ community signals both point to elevated respiratory risk."
          : "No emergency keyword, outbreak escalation, or matching high-risk history was found.",
    action_plan: actionPlan,
    reasoning_trace: [
      "1. Parse symptoms and identify red-flag keywords.",
      "2. Query Foundry IQ medical guidance for cautious symptom context.",
      "3. Recall Work IQ patient history, medications, allergies, and appointments.",
      "4. Query Fabric IQ regional outbreak and clinic-access signals.",
      "5. Compare Foundry confidence with active community health trends.",
      "6. Assign risk level and preserve the full reasoning trace.",
      "7. Produce a doctor briefing with citations and next steps."
    ],
    iq_summary: [
      {
        label: "Foundry IQ",
        value: isEmergency ? "0.96" : isOutbreak ? "0.78" : "0.49",
        detail: isEmergency
          ? "Emergency medicine guidance matched red-flag symptoms."
          : isOutbreak
            ? "Respiratory guidance matched fever/body-ache pattern."
            : "Primary care guidance matched mild symptom pattern."
      },
      {
        label: "Work IQ",
        value: `${timeline.length} events`,
        detail: "Patient context recalled from simulated M365 health memory."
      },
      {
        label: "Fabric IQ",
        value: `${Math.round(communityScore * 100)}%`,
        detail: isRespiratory
          ? "Community respiratory signal included in synthesis."
          : "No elevated regional signal in demo community dataset."
      }
    ],
    timeline,
    community_context: communityContext,
    doctor_briefing: {
      patient_summary: {
        patient_id: request.userId,
        region: request.region,
        risk_level: displayRisk,
        risk_score: score
      },
      reported_symptoms: request.symptoms,
      medical_context: citations.map((source) => ({
        claim:
          isEmergency
            ? "These symptoms may indicate a time-sensitive condition and require urgent assessment."
            : "These symptoms may be non-emergency when no danger signs are present, but should be monitored.",
        confidence: score,
        source
      })),
      health_history: timeline,
      community_context: communityContext,
      recommended_tests:
        isEmergency
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function dashboardRiskLevel(rawRisk: string): RiskLevel {
  const normalized = rawRisk.toLowerCase();
  if (normalized === "critical" || normalized === "high") return "high";
  if (normalized === "medium") return "medium";
  return "low";
}

function riskScore(rawRisk: string, confidence: number): number {
  const normalized = rawRisk.toLowerCase();
  if (normalized === "critical") return 0.98;
  if (normalized === "high") return Math.max(confidence, 0.86);
  if (normalized === "medium") return Math.max(confidence, 0.58);
  return Math.max(confidence, 0.28);
}

function citationFromName(name: string): Citation {
  if (/cdc/i.test(name)) {
    return {
      title: "CDC respiratory illness guidance",
      url: "https://www.cdc.gov/respiratory-viruses/guidance/",
      citation: name
    };
  }
  if (/who|icd/i.test(name)) {
    return {
      title: "WHO ICD-11",
      url: "https://icd.who.int/",
      citation: name
    };
  }
  return { title: name, citation: name };
}

function normalizeBackendResult(payload: unknown, request: TriageRequest): TriageResult {
  const root = asRecord(payload);
  const input = asRecord(root.input);
  const context = asRecord(root.iq_context);
  const medical = asRecord(context.medical);
  const history = asRecord(context.history);
  const trends = asRecord(context.trends);
  const briefing = asRecord(root.doctor_briefing);

  const rawRisk = asString(root.risk_level, "LOW");
  const riskLevel = dashboardRiskLevel(rawRisk);
  const confidence = typeof medical.confidence === "number" ? medical.confidence : 0;
  const score = riskScore(rawRisk, confidence);
  const symptoms = asString(input.symptoms, request.symptoms);
  const recommendation = asString(root.recommendation, "Consult a licensed medical professional.");
  const reasoningTrace = asStringArray(root.reasoning_trace);
  const foundryCitationNames = asStringArray(medical.citations);
  const activeOutbreaks = asStringArray(trends.active_outbreaks);
  const riskElevation = asString(trends.risk_elevation, activeOutbreaks.length ? "elevated" : "stable");
  const citations = foundryCitationNames.length
    ? foundryCitationNames.map(citationFromName)
    : sourceList(symptoms);

  const medicalResults = Array.isArray(medical.results) ? medical.results.map(asRecord) : [];
  const pastDiagnoses = asStringArray(history.past_diagnoses);
  const appointments = asStringArray(history.appointments);
  const clinic = asString(trends.nearest_clinic, "Nearest public community clinic");
  const clinicDistance = typeof trends.clinic_distance_km === "number" ? trends.clinic_distance_km : null;

  const timeline = [
    asString(history.last_visit)
      ? {
          date: asString(history.last_visit).split(":")[0],
          type: "Last visit",
          summary: asString(history.last_visit)
        }
      : null,
    ...pastDiagnoses.map((diagnosis) => ({
      date: "History",
      type: "Past diagnosis",
      summary: diagnosis
    })),
    ...appointments.map((appointment) => ({
      date: appointment.split(":")[0] || "Upcoming",
      type: "Appointment",
      summary: appointment
    }))
  ].filter((event): event is { date: string; type: string; summary: string } => Boolean(event));

  const emergencyBanner =
    rawRisk.toLowerCase() === "critical" || /emergency flag/i.test(recommendation) ? recommendation : null;

  const communityContext = {
    condition: activeOutbreaks.length ? activeOutbreaks.join(", ") : "general community health",
    trend: riskElevation,
    regional_risk_score:
      riskElevation.toLowerCase() === "high" ? 0.86 : riskElevation.toLowerCase() === "moderate" ? 0.62 : 0.24,
    risk_factors: [
      activeOutbreaks.length
        ? `Active regional signals: ${activeOutbreaks.join(", ")}.`
        : "No active outbreak signal returned by Fabric IQ.",
      `${clinic}${clinicDistance !== null ? ` is about ${clinicDistance} km away` : " is the nearest clinic option"}.`
    ]
  };

  const nextSteps = [
    recommendation,
    "Share the doctor briefing with a licensed clinician.",
    rawRisk.toLowerCase() === "critical"
      ? "Use emergency services immediately if symptoms are active."
      : "Monitor for red-flag symptoms or worsening severity."
  ];

  return {
    emergency_banner: emergencyBanner,
    risk_level: riskLevel,
    risk_score: score,
    risk_rationale:
      reasoningTrace[0] ??
      asString(root.primary_concern, "This may indicate a risk level based on Foundry IQ, Work IQ, and Fabric IQ."),
    action_plan: nextSteps,
    reasoning_trace: reasoningTrace.length
      ? reasoningTrace
      : [
          "1. Symptoms parsed.",
          "2. Foundry IQ medical context retrieved.",
          "3. Work IQ history recalled.",
          "4. Fabric IQ regional signal checked.",
          "5. Risk synthesis completed."
        ],
    iq_summary: [
      {
        label: "Foundry IQ",
        value: confidence.toFixed(2),
        detail: `${medicalResults.length || 1} cited medical finding returned.`
      },
      {
        label: "Work IQ",
        value: `${timeline.length} events`,
        detail: "Patient history converted into timeline context."
      },
      {
        label: "Fabric IQ",
        value: `${Math.round(communityContext.regional_risk_score * 100)}%`,
        detail: `${riskElevation} regional signal.`
      }
    ],
    timeline,
    community_context: communityContext,
    doctor_briefing: {
      patient_summary: {
        patient_id: request.userId,
        region: request.region,
        risk_level: riskLevel,
        risk_score: score
      },
      reported_symptoms: symptoms,
      medical_context: medicalResults.map((item) => ({
        claim: asString(item.claim, "Clinical context returned by Foundry IQ."),
        confidence: score,
        source: citationFromName(asString(item.source, "Foundry IQ"))
      })),
      health_history: timeline,
      community_context: communityContext,
      recommended_tests:
        riskLevel === "high"
          ? ["Urgent clinician assessment", "Vital signs and oxygen saturation", "ECG if clinically appropriate"]
          : ["Primary care assessment if symptoms persist", "Medication and allergy review"],
      recommended_next_steps: nextSteps,
      citations
    },
    citations,
    disclaimer:
      asString(briefing.recommended_next_steps) ||
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
    const payload = (await response.json()) as unknown;
    return asRecord(payload).action_plan ? (payload as TriageResult) : normalizeBackendResult(payload, request);
  }

  await new Promise((resolve) => window.setTimeout(resolve, 650));
  return createMockResult(request);
}
