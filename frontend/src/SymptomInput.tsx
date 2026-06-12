import { FlaskConical, Send, UserRound } from "lucide-react";
import type { FormEvent, ReactElement } from "react";

interface Scenario {
  id: string;
  label: string;
}

interface SymptomInputProps {
  symptoms: string;
  userId: string;
  region: string;
  isLoading: boolean;
  activeScenario: string;
  scenarios: readonly Scenario[];
  onScenarioSelect: (scenarioId: string) => void;
  onSymptomsChange: (value: string) => void;
  onUserIdChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onSubmit: () => void;
}

export function SymptomInput({
  symptoms,
  userId,
  region,
  isLoading,
  activeScenario,
  scenarios,
  onScenarioSelect,
  onSymptomsChange,
  onUserIdChange,
  onRegionChange,
  onSubmit
}: SymptomInputProps): ReactElement {
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="panel intake-panel" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">MedBridge AI</p>
          <h1>Community health navigator</h1>
        </div>
        <div className="identity-chip" aria-label="Patient context">
          <UserRound size={18} />
          <span>{userId}</span>
        </div>
      </div>

      <div className="scenario-control" aria-label="Demo scenarios">
        <FlaskConical size={18} />
        {scenarios.map((scenario) => (
          <button
            aria-pressed={activeScenario === scenario.id}
            className={activeScenario === scenario.id ? "scenario-button active" : "scenario-button"}
            key={scenario.id}
            onClick={() => onScenarioSelect(scenario.id)}
            type="button"
          >
            {scenario.label}
          </button>
        ))}
      </div>

      <label className="field">
        <span>Symptoms</span>
        <textarea
          value={symptoms}
          onChange={(event) => {
            onSymptomsChange(event.target.value);
          }}
          placeholder="Example: mild headache and fatigue since this morning"
          rows={7}
          required
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>Patient ID</span>
          <input value={userId} onChange={(event) => onUserIdChange(event.target.value)} required />
        </label>
        <label className="field">
          <span>Region</span>
          <input value={region} onChange={(event) => onRegionChange(event.target.value)} required />
        </label>
      </div>

      <button className="primary-button" type="submit" disabled={isLoading || !symptoms.trim()}>
        <Send size={18} />
        <span>{isLoading ? "Running triage" : "Run triage"}</span>
      </button>
    </form>
  );
}
