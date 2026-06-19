import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Briefing } from "./Briefing";
import { DEMO_ACCESS_CODE, LoginScreen, type AuthSession } from "./LoginScreen";
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

const SESSION_KEY = "medbridge-auth-session";

function loadSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (
      !parsed.fullName ||
      !parsed.email ||
      !parsed.role ||
      !parsed.organization ||
      !parsed.accessCode ||
      parsed.accessCode.toUpperCase() !== DEMO_ACCESS_CODE
    ) {
      return null;
    }

    return {
      fullName: parsed.fullName,
      email: parsed.email,
      role: parsed.role,
      organization: parsed.organization,
      accessCode: parsed.accessCode
    };
  } catch {
    return null;
  }
}

export function App(): ReactElement {
  const [session, setSession] = useState<AuthSession | null>(() => loadSession());
  const [symptoms, setSymptoms] = useState("Mild headache and fatigue since this morning");
  const [userId, setUserId] = useState("demo-patient-001");
  const [region, setRegion] = useState("South India");
  const [activeScenario, setActiveScenario] = useState("low");
  const [result, setResult] = useState<TriageResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (session) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, [session]);

  function resetDashboardState(): void {
    setSymptoms("Mild headache and fatigue since this morning");
    setUserId("demo-patient-001");
    setRegion("South India");
    setActiveScenario("low");
    setResult(null);
    setError(null);
  }

  function handleSignIn(nextSession: AuthSession): void {
    setSession(nextSession);
    resetDashboardState();
  }

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

  function handleSignOut(): void {
    setSession(null);
    resetDashboardState();
  }

  if (!session) {
    return <LoginScreen onSignIn={handleSignIn} />;
  }

  return (
    <main className="app-shell">
      <section className="session-bar" aria-label="Signed in session">
        <div>
          <p className="eyebrow">Signed in</p>
          <h2>{session.fullName}</h2>
          <p className="muted">
            {session.role} &middot; {session.organization}
          </p>
        </div>
        <button className="secondary-button" onClick={handleSignOut} type="button">
          Sign out
        </button>
      </section>
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
