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
  const citations = foundryCitationNames.length
    ? foundryCitationNames.map(citationFromName)
    : sourceList(symptoms);

  const medicalResults = Array.isArray(medical.results) ? medical.results.map(asRecord) : [];
  const pastDiagnoses = asStringArray(history.past_diagnoses);
  const appointments = asStringArray(history.appointments);
  const activeOutbreaks = asStringArray(trends.active_outbreaks);
  const riskElevation = asString(trends.risk_elevation, activeOutbreaks.length ? "elevated" : "stable");
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
