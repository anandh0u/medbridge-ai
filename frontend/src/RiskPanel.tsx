import { Activity, AlertTriangle, ShieldCheck } from "lucide-react";
import type { ReactElement } from "react";
import type { TriageResult } from "./types";

interface RiskPanelProps {
  result: TriageResult | null;
  isLoading: boolean;
}

const riskLabels = {
  low: "Low",
  medium: "Medium",
  high: "High"
} as const;

export function RiskPanel({ result, isLoading }: RiskPanelProps): ReactElement {
  if (isLoading) {
    return (
      <section className="panel risk-panel" aria-live="polite">
        <div className="panel-title">
          <Activity size={20} />
          <h2>Risk</h2>
        </div>
        <div className="skeleton-line wide" />
        <div className="skeleton-line" />
      </section>
    );
  }

  if (!result) {
    return (
      <section className="panel risk-panel">
        <div className="panel-title">
          <ShieldCheck size={20} />
          <h2>Risk</h2>
        </div>
        <p className="muted">Awaiting symptom input.</p>
      </section>
    );
  }

  const Icon = result.risk_level === "high" ? AlertTriangle : result.risk_level === "medium" ? Activity : ShieldCheck;

  return (
    <section className={`panel risk-panel risk-${result.risk_level}`} aria-live="polite">
      <div className="panel-title">
        <Icon size={20} />
        <h2>Risk</h2>
      </div>
      <div className="risk-score-row">
        <span className="risk-level">{riskLabels[result.risk_level]}</span>
        <span className="risk-score">{Math.round(result.risk_score * 100)}%</span>
      </div>
      <p>{result.risk_rationale}</p>
      {result.emergency_banner ? <div className="emergency-banner">{result.emergency_banner}</div> : null}
      <ul className="compact-list">
        {result.action_plan.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
    </section>
  );
}
