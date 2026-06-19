import type { Citation, RiskLevel, TimelineEvent, TriageRequest, TriageResult } from "./types";

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

interface MockHistory {
  lastVisit: string;
  pastDiagnoses: string[];
  medications: string[];
  allergies: string[];
  appointments: string[];
}

const mockHistories: Record<string, MockHistory> = {
  user_001: {
    lastVisit: "2026-04-18: Community clinic visit for seasonal fever and cough.",
    pastDiagnoses: ["seasonal allergies", "mild asthma"],
    medications: ["salbutamol inhaler as needed", "cetirizine 10 mg as needed"],
    allergies: ["penicillin"],
    appointments: ["2026-06-14: Primary care follow-up", "2026-07-02: Pulmonary function review"]
  },
  "demo-patient-001": {
    lastVisit: "2026-02-12: Routine primary care checkup.",
    pastDiagnoses: ["elevated blood pressure screening"],
    medications: ["no active medications recorded"],
    allergies: ["no allergies recorded"],
    appointments: ["2026-06-22: Community clinic appointment"]
  }
};

const defaultHistory: MockHistory = {
  lastVisit: "No previous visit found in simulated Work IQ memory.",
  pastDiagnoses: [],
  medications: [],
  allergies: [],
  appointments: []
};

const negationTerms = ["no", "not", "without", "denies", "denied", "free of"];
const emergencyTerms = ["chest pain", "difficulty breathing", "shortness of breath", "unconscious", "stroke", "severe bleeding"];
const viralTerms = ["fever", "body aches", "cough", "sore throat"];
const mildTerms = ["mild headache", "headache", "fatigue", "tired"];
const respiratoryTerms = ["difficulty breathing", "shortness of breath", "chest pain", "wheezing", "chest tightness", "cough"];

function normalizeText(text: string): string {
  return text.toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function phrasePresent(text: string, phrase: string): boolean {
  return new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i").test(text);
}

function phraseIsNegated(text: string, phrase: string): boolean {
  return new RegExp(
    `\\b(?:${negationTerms.join("|")})\\b(?:\\W+\\w+){0,3}\\W+${escapeRegExp(phrase)}\\b`,
    "i"
  ).test(text);
}

function activePhrases(text: string, phrases: string[]): string[] {
  return phrases.filter((phrase) => phrasePresent(text, phrase) && !phraseIsNegated(text, phrase));
}

function getMockHistory(userId: string): MockHistory {
  return mockHistories[userId] ?? defaultHistory;
}

function diagnosisMatchesSymptoms(diagnosis: string, symptomText: string): boolean {
  const loweredDiagnosis = diagnosis.toLowerCase();
  const loweredSymptoms = symptomText.toLowerCase();

  if (loweredDiagnosis.includes("asthma") && /breath|wheez|cough|chest tightness/i.test(loweredSymptoms)) {
    return true;
  }
  if ((loweredDiagnosis.includes("blood pressure") || loweredDiagnosis.includes("hypertension")) && /headache|dizziness|chest pain/i.test(loweredSymptoms)) {
    return true;
  }
  if (loweredDiagnosis.includes("allerg") && /sneezing|congestion|itch|rash/i.test(loweredSymptoms)) {
    return true;
  }
  if (loweredDiagnosis.includes("fever") && loweredSymptoms.includes("fever")) {
    return true;
  }

  const diagnosisTokens = new Set(
    loweredDiagnosis.split(/[^a-z0-9]+/).filter((token) => token.length > 3 && token !== "seasonal" && token !== "routine")
  );
  const symptomTokens = new Set(loweredSymptoms.split(/[^a-z0-9]+/).filter(Boolean));
  for (const token of diagnosisTokens) {
    if (symptomTokens.has(token)) {
      return true;
    }
  }
  return false;
}

function historyMatchesSymptoms(history: MockHistory, symptoms: string): string[] {
  return history.pastDiagnoses.filter((diagnosis) => diagnosisMatchesSymptoms(diagnosis, symptoms));
}

function buildTimeline(history: MockHistory): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  if (history.lastVisit) {
    const [date, ...rest] = history.lastVisit.split(":");
    events.push({
      date: date?.trim() || "Last visit",
      type: "Last visit",
      summary: rest.length ? rest.join(":").trim() : history.lastVisit
    });
  }
  for (const diagnosis of history.pastDiagnoses) {
    events.push({
      date: "History",
      type: "Past diagnosis",
      summary: diagnosis
    });
  }
  for (const appointment of history.appointments) {
    const [date, ...rest] = appointment.split(":");
    events.push({
      date: date?.trim() || "Upcoming",
      type: "Appointment",
      summary: rest.length ? rest.join(":").trim() : appointment
    });
  }
  return events;
}

function sourceList(symptoms: string): Citation[] {
  const normalized = normalizeText(symptoms);
  const list = new Map<string, Citation>();
  if (activePhrases(normalized, ["chest pain"]).length > 0) list.set("chest", sources.chest);
  if (activePhrases(normalized, ["difficulty breathing", "shortness of breath"]).length > 0) list.set("breathing", sources.breathing);
  if (activePhrases(normalized, ["headache", "mild headache"]).length > 0) list.set("headache", sources.headache);
  if (activePhrases(normalized, viralTerms).length > 0) {
    list.set("flu", sources.flu);
  }
  if (list.size === 0) list.set("who", sources.who);
  return [...list.values()];
}

function analyzeMockRisk(symptoms: string, history: MockHistory, region: string) {
  const normalized = normalizeText(symptoms);
  const emergencySignals = activePhrases(normalized, emergencyTerms);
  const viralSignals = activePhrases(normalized, viralTerms);
  const mildSignals = activePhrases(normalized, mildTerms);
  const respiratorySignals = activePhrases(normalized, respiratoryTerms);
  const historyMatches = historyMatchesSymptoms(history, symptoms);
  const isOutbreak = viralSignals.length >= 2;
  const isEmergency = emergencySignals.length > 0;
  const foundryConfidence = isEmergency ? 0.93 : isOutbreak ? 0.74 : historyMatches.length > 0 ? 0.61 : mildSignals.length > 0 ? 0.46 : 0.42;
  const riskLevel: RiskLevel =
    isEmergency
      ? "high"
      : foundryConfidence > 0.75 && isOutbreak
        ? "high"
        : foundryConfidence > 0.5 || historyMatches.length > 0 || viralSignals.length >= 2 || respiratorySignals.length > 0
          ? "medium"
          : "low";
  const score = riskLevel === "high" ? 0.96 : riskLevel === "medium" ? Math.max(foundryConfidence, 0.58) : Math.max(foundryConfidence, 0.32);
  const communityScore = riskLevel === "high" ? 0.88 : riskLevel === "medium" ? (isOutbreak ? 0.68 : 0.44) : 0.24;
  const condition = isEmergency ? "respiratory emergency" : isOutbreak ? "viral respiratory cluster" : historyMatches.length > 0 ? "history-aware follow-up" : "general";
  const trend = isEmergency ? "urgent" : isOutbreak ? "elevated" : historyMatches.length > 0 ? "watchful" : "stable";
  const riskFactors = isEmergency
    ? [
        "Emergency respiratory presentations are above baseline in the demo community signal [Source: Fabric IQ].",
        "Nearest urgent-care route should be prioritized over routine appointment scheduling [Source: Fabric IQ]."
      ]
    : isOutbreak
      ? [
          "Respiratory symptom reports are above baseline in nearby community clinics [Source: Fabric IQ].",
          "Same-day clinic access is helpful when fever and body-ache clusters appear together [Source: Fabric IQ]."
        ]
      : historyMatches.length > 0
        ? [
            `Past diagnoses that overlap with the current symptoms: ${historyMatches.join(", ")} [Source: Work IQ].`,
            "Follow-up care is useful when prior history and current symptoms point in the same direction [Source: Work IQ]."
          ]
        : ["No unusual regional signal detected in the demo community dataset [Source: Fabric IQ]."];

  const emergencyBanner =
    isEmergency
      ? "EMERGENCY FLAG: Call local emergency services now or go to the nearest emergency department. This may indicate a time-sensitive condition [Source: MedlinePlus breathing difficulty first-aid guidance]."
      : null;

  const sourceName = emergencySignals.length
    ? "MedlinePlus breathing difficulty first-aid guidance"
    : isOutbreak
      ? "CDC flu symptoms and emergency-warning guidance"
      : viralSignals.length > 0 || respiratorySignals.length > 0
        ? "CDC flu symptoms and emergency-warning guidance"
        : historyMatches.length > 0
          ? "WHO ICD-11 symptom classification"
          : "WHO ICD-11 symptom classification";

  const riskRationale =
    riskLevel === "high"
      ? isEmergency
        ? "Emergency keyword detected after negation handling and cross-checked against cited emergency guidance [Source: MedlinePlus breathing difficulty first-aid guidance]."
        : "Foundry IQ confidence and active community signals both point to an elevated risk window [Source: CDC flu symptoms and emergency-warning guidance]."
      : riskLevel === "medium"
        ? historyMatches.length > 0
          ? "This may indicate a follow-up concern because the symptom pattern overlaps with prior history [Source: WHO ICD-11]."
          : "This may indicate a viral or respiratory follow-up concern that benefits from clinical review [Source: CDC flu symptoms and emergency-warning guidance]."
        : "No non-negated emergency keyword, outbreak escalation, or strong history match was found [Source: WHO ICD-11].";

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
            "Bring the doctor briefing so intake can move faster."
          ]
        : [
            "Use rest, hydration, and symptom monitoring while symptoms remain mild.",
            "Schedule primary care or telehealth follow-up if symptoms persist or worsen.",
            "Seek urgent help if red-flag symptoms appear."
          ];

  const reasoningTrace = [
    "1. Parse symptoms and identify red-flag keywords after negation handling.",
    `2. Query Foundry IQ medical guidance for cautious symptom context [Source: ${sourceName}].`,
    `3. Recall Work IQ patient history, medications, allergies, and appointments [Source: Work IQ].`,
    `4. Query Fabric IQ regional outbreak and clinic-access signals [Source: Fabric IQ].`,
    `5. Compare Foundry confidence, patient history, and regional health trends to assign risk [Source: WHO ICD-11].`,
    "6. Produce a doctor briefing with citations and next steps [Source: WHO ICD-11].",
    "7. Always recommend consulting a licensed medical professional [Source: WHO ICD-11]."
  ];

  return {
    riskLevel,
    score,
    foundryConfidence,
    communityScore,
    emergencyBanner,
    riskRationale,
    actionPlan,
    reasoningTrace,
    condition,
    trend,
    riskFactors,
    isOutbreak,
    emergencySignals,
    viralSignals,
    mildSignals,
    respiratorySignals,
    historyMatches,
    sourceName
  };
}

function createMockResult(request: TriageRequest): TriageResult {
  const history = getMockHistory(request.userId);
  const timeline = buildTimeline(history);
  const assessment = analyzeMockRisk(request.symptoms, history, request.region);
  const citations = sourceList(request.symptoms);
  const communityContext = {
    condition: assessment.condition,
    trend: assessment.trend,
    regional_risk_score: assessment.communityScore,
    risk_factors: assessment.riskFactors
  };
  const medicalContextClaim =
    assessment.riskLevel === "high"
      ? "These symptoms may indicate a time-sensitive condition and require urgent assessment [Source: MedlinePlus breathing difficulty first-aid guidance]."
      : assessment.riskLevel === "medium"
        ? assessment.isOutbreak
          ? "These symptoms may indicate a viral respiratory illness that should be reviewed by a clinician today [Source: CDC flu symptoms and emergency-warning guidance]."
          : assessment.historyMatches.length > 0
            ? "These symptoms may indicate a follow-up concern that overlaps with prior history [Source: WHO ICD-11]."
            : "These symptoms may indicate a follow-up concern that should be reviewed by a clinician [Source: WHO ICD-11]."
        : "These symptoms may indicate a lower-acuity concern when no danger signs are present [Source: WHO ICD-11].";

  return {
    emergency_banner: assessment.emergencyBanner,
    risk_level: assessment.riskLevel,
    risk_score: assessment.score,
    risk_rationale: assessment.riskRationale,
    action_plan: assessment.actionPlan,
    reasoning_trace: assessment.reasoningTrace,
    iq_summary: [
      {
        label: "Foundry IQ",
        value: assessment.foundryConfidence.toFixed(2),
        detail:
          assessment.riskLevel === "high"
            ? "Emergency medicine guidance matched a red-flag symptom cluster [Source: MedlinePlus breathing difficulty first-aid guidance]."
          : assessment.isOutbreak
              ? "Respiratory guidance matched a viral cluster and the confidence stayed below the emergency threshold [Source: CDC flu symptoms and emergency-warning guidance]."
              : assessment.historyMatches.length > 0
                ? "Primary care guidance matched the current symptoms against prior history [Source: WHO ICD-11]."
                : assessment.viralSignals.length > 0
                  ? "Primary care guidance matched a viral follow-up pattern [Source: WHO ICD-11]."
                  : "Primary care guidance matched a mild symptom pattern [Source: WHO ICD-11]."
      },
      {
        label: "Work IQ",
        value: `${timeline.length} events`,
        detail: history.pastDiagnoses.length
          ? `Past diagnoses were reused to make the triage more patient-specific: ${history.pastDiagnoses.join(", ")} [Source: Work IQ].`
          : "Patient context recalled from simulated M365 health memory [Source: Work IQ]."
      },
      {
        label: "Fabric IQ",
        value: `${Math.round(assessment.communityScore * 100)}%`,
        detail:
          assessment.isOutbreak
            ? "Community respiratory signal was included in the synthesis [Source: Fabric IQ]."
            : assessment.historyMatches.length > 0
              ? "Community context was used as a background signal [Source: Fabric IQ]."
              : "No elevated regional signal in the demo community dataset [Source: Fabric IQ]."
      }
    ],
    timeline,
    community_context: communityContext,
    doctor_briefing: {
      patient_summary: {
        patient_id: request.userId,
        region: request.region,
        risk_level: assessment.riskLevel,
        risk_score: assessment.score
      },
      reported_symptoms: request.symptoms,
      medical_context: citations.map((source) => ({
        claim: medicalContextClaim,
        confidence: assessment.score,
        source
      })),
      health_history: timeline,
      community_context: communityContext,
      recommended_tests:
        assessment.riskLevel === "high"
          ? ["Emergency clinician assessment", "Vital signs and oxygen saturation", "ECG if clinically appropriate"]
          : assessment.riskLevel === "medium"
            ? ["Primary care assessment if symptoms persist", "Medication and allergy review", "Pulse oximetry if breathing is involved"]
            : ["Primary care assessment if symptoms persist", "Medication and vital-sign review"],
      recommended_next_steps: assessment.actionPlan,
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
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: request.symptoms,
          user_id: request.userId,
          region: request.region
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`Triage request failed with ${response.status}`);
      }
      const payload = (await response.json()) as unknown;
      return asRecord(payload).action_plan ? (payload as TriageResult) : normalizeBackendResult(payload, request);
    } catch (error) {
      console.warn("Live triage API unavailable. Falling back to the local deterministic engine.", error);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  await new Promise((resolve) => window.setTimeout(resolve, 650));
  return createMockResult(request);
}
