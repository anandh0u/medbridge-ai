import { useState } from "react";
import type { ReactElement } from "react";
import { Briefing } from "./Briefing";
import { ReasoningPanel } from "./ReasoningPanel";
import { RiskPanel } from "./RiskPanel";
import { SignalPanel } from "./SignalPanel";
import { SymptomInput } from "./SymptomInput";
import { Timeline } from "./Timeline";
import { requestTriage } from "./api";
import type { TriageResult } from "./types";

const scenarios = [
  {
    id: "low",
    label: "Low",
    symptoms: "Mild headache and fatigue since this morning",
    userId: "demo-patient-001",
    region: "South India"
  },
  {
    id: "outbreak",
    label: "Outbreak",
    symptoms: "Headache, fever, and body aches for 3 days",
    userId: "user_001",
    region: "Thrissur, Kerala, India"
  },
  {
    id: "emergency",
    label: "Emergency",
    symptoms: "Chest pain and difficulty breathing",
    userId: "user_001",
    region: "Thrissur, Kerala, India"
  }
] as const;

export function App(): ReactElement {
  const [symptoms, setSymptoms] = useState("Mild headache and fatigue since this morning");
  const [userId, setUserId] = useState("demo-patient-001");
  const [region, setRegion] = useState("South India");
  const [activeScenario, setActiveScenario] = useState("low");
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

  function applyScenario(scenarioId: string): void {
    const scenario = scenarios.find((item) => item.id === scenarioId);
    if (!scenario) return;
    setActiveScenario(scenario.id);
    setSymptoms(scenario.symptoms);
    setUserId(scenario.userId);
    setRegion(scenario.region);
    setResult(null);
    setError(null);
  }

  return (
    <main className="app-shell">
      <section className="dashboard-grid">
        <SymptomInput
          symptoms={symptoms}
          userId={userId}
          region={region}
          isLoading={isLoading}
          activeScenario={activeScenario}
          scenarios={scenarios}
          onScenarioSelect={applyScenario}
          onSymptomsChange={setSymptoms}
          onUserIdChange={setUserId}
          onRegionChange={setRegion}
          onSubmit={handleSubmit}
        />

        <div className="status-column">
          <RiskPanel result={result} isLoading={isLoading} />
          <SignalPanel result={result} />
          <Timeline events={result?.timeline ?? []} />
        </div>

        <div className="briefing-column">
          {error ? (
            <section className="panel error-panel" role="alert">
              {error}
            </section>
          ) : null}
          <Briefing result={result} />
          <ReasoningPanel result={result} />
        </div>
      </section>
    </main>
  );
}
