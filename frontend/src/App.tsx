import { useState } from "react";
import type { ReactElement } from "react";
import { Briefing } from "./Briefing";
import { RiskPanel } from "./RiskPanel";
import { SymptomInput } from "./SymptomInput";
import { Timeline } from "./Timeline";
import { requestTriage } from "./api";
import type { TriageResult } from "./types";

export function App(): ReactElement {
  const [symptoms, setSymptoms] = useState("Mild headache and fatigue since this morning");
  const [userId, setUserId] = useState("demo-patient-001");
  const [region, setRegion] = useState("South India");
  const [result, setResult] = useState<TriageResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(): Promise<void> {
    setIsLoading(true);
    setError(null);
    try {
      const triage = await requestTriage({ symptoms, userId, region });
      setResult(triage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to complete triage.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="dashboard-grid">
        <SymptomInput
          symptoms={symptoms}
          userId={userId}
          region={region}
          isLoading={isLoading}
          onSymptomsChange={setSymptoms}
          onUserIdChange={setUserId}
          onRegionChange={setRegion}
          onSubmit={handleSubmit}
        />

        <div className="status-column">
          <RiskPanel result={result} isLoading={isLoading} />
          <Timeline events={result?.timeline ?? []} />
        </div>

        <div className="briefing-column">
          {error ? (
            <section className="panel error-panel" role="alert">
              {error}
            </section>
          ) : null}
          <Briefing result={result} />
        </div>
      </section>
    </main>
  );
}
