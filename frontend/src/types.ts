export type RiskLevel = "low" | "medium" | "high";

export interface Citation {
  title?: string;
  url?: string;
  citation?: string;
  type?: string;
}

export interface TimelineEvent {
  date: string;
  type?: string;
  summary: string;
}

export interface CommunityContext {
  condition: string;
  trend: string;
  regional_risk_score: number;
  risk_factors: string[];
}

export interface DoctorBriefing {
  patient_summary: {
    patient_id: string;
    region: string;
    risk_level: RiskLevel;
    risk_score: number;
  };
  reported_symptoms: string;
  medical_context: Array<{
    claim: string;
    confidence: number;
    source: Citation;
  }>;
  health_history: TimelineEvent[];
  community_context: CommunityContext;
  recommended_tests: string[];
  recommended_next_steps: string[];
  citations: Citation[];
}

export interface TriageResult {
  emergency_banner: string | null;
  risk_level: RiskLevel;
  risk_score: number;
  risk_rationale: string;
  action_plan: string[];
  reasoning_trace: string[];
  iq_summary: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  timeline: TimelineEvent[];
  community_context: CommunityContext;
  doctor_briefing: DoctorBriefing;
  citations: Citation[];
  disclaimer: string;
}

export interface TriageRequest {
  symptoms: string;
  userId: string;
  region: string;
}
