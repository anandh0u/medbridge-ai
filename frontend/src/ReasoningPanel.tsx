import { ListChecks } from "lucide-react";
import type { ReactElement } from "react";
import type { TriageResult } from "./types";

interface ReasoningPanelProps {
  result: TriageResult | null;
}

export function ReasoningPanel({ result }: ReasoningPanelProps): ReactElement {
  return (
    <section className="panel reasoning-panel">
      <div className="panel-title">
        <ListChecks size={20} />
        <h2>Reasoning Trace</h2>
      </div>
      {result ? (
        <ol className="reasoning-list">
          {result.reasoning_trace.map((step) => (
            <li key={step}>{step.replace(/^\d+\.\s*/, "")}</li>
          ))}
        </ol>
      ) : (
        <p className="muted">Run triage to populate the reasoning trace.</p>
      )}
    </section>
  );
}
