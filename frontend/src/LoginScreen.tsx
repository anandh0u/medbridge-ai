import { ArrowRight, Activity, LogIn, MapPinned, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import type { FormEvent, ReactElement } from "react";

export type UserRole = "Clinician" | "Reviewer" | "Coordinator";

export const DEMO_ACCESS_CODE = "MEDBRIDGE-DEMO";

export interface AuthSession {
  fullName: string;
  email: string;
  role: UserRole;
  organization: string;
  accessCode: string;
}

interface LoginScreenProps {
  onSignIn: (session: AuthSession) => void;
}

const demoSession: AuthSession = {
  fullName: "Anandhu P",
  email: "anandhu@medbridge.ai",
  role: "Reviewer",
  organization: "MedBridge Hackathon Demo",
  accessCode: DEMO_ACCESS_CODE
};

function fieldId(name: string): string {
  return `login-${name}`;
}

export function LoginScreen({ onSignIn }: LoginScreenProps): ReactElement {
  const [fullName, setFullName] = useState(demoSession.fullName);
  const [email, setEmail] = useState(demoSession.email);
  const [role, setRole] = useState<UserRole>(demoSession.role);
  const [organization, setOrganization] = useState(demoSession.organization);
  const [accessCode, setAccessCode] = useState(demoSession.accessCode);
  const [error, setError] = useState<string | null>(null);

  function isAllowedAccessCode(value: string): boolean {
    return value.trim().toUpperCase() === DEMO_ACCESS_CODE;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!isAllowedAccessCode(accessCode)) {
      setError("Access code not recognized. Use the approved demo access code to enter the dashboard.");
      return;
    }

    setError(null);
    onSignIn({
      fullName: fullName.trim(),
      email: email.trim(),
      role,
      organization: organization.trim(),
      accessCode: accessCode.trim()
    });
  }

  function loadDemoProfile(): void {
    setError(null);
    setFullName(demoSession.fullName);
    setEmail(demoSession.email);
    setRole(demoSession.role);
    setOrganization(demoSession.organization);
    setAccessCode(demoSession.accessCode);
  }

  return (
    <main className="auth-shell">
      <section className="auth-layout">
        <div className="auth-hero">
          <div className="auth-copy">
            <p className="eyebrow">MedBridge AI</p>
            <h1>Sign in to the community health dashboard</h1>
            <p className="muted">
              Open the triage workspace, review the parallel IQ signals, and brief the next clinician in one pass.
            </p>
          </div>

          <div className="auth-feature-list" aria-label="Product highlights">
            <div className="auth-feature">
              <ShieldCheck size={18} />
              <div>
                <strong>Parallel IQ triage</strong>
                <span>Foundry, Work, and Fabric context moves together.</span>
              </div>
            </div>
            <div className="auth-feature">
              <Activity size={18} />
              <div>
                <strong>Risk-first briefing</strong>
                <span>Emergency flags and doctor notes stay visible.</span>
              </div>
            </div>
            <div className="auth-feature">
              <MapPinned size={18} />
              <div>
                <strong>Local demo session</strong>
                <span>Your sign-in lives in this browser only.</span>
              </div>
            </div>
          </div>

          <p className="auth-note">This demo keeps the session in your browser only.</p>
        </div>

        <section className="auth-panel">
          <div className="panel-title">
            <LogIn size={20} />
            <h2>Workspace login</h2>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Full name</span>
              <input
                autoComplete="name"
                id={fieldId("full-name")}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Anandhu P"
                required
                value={fullName}
              />
            </label>
            <label className="field">
              <span>Work email</span>
              <input
                autoComplete="email"
                id={fieldId("email")}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="anandhu@medbridge.ai"
                required
                type="email"
                value={email}
              />
            </label>
            <label className="field">
              <span>Role</span>
              <select
                id={fieldId("role")}
                onChange={(event) => setRole(event.target.value as UserRole)}
                value={role}
              >
                <option value="Clinician">Clinician</option>
                <option value="Reviewer">Reviewer</option>
                <option value="Coordinator">Coordinator</option>
              </select>
            </label>
            <label className="field">
              <span>Organization</span>
              <input
                autoComplete="organization"
                id={fieldId("organization")}
                onChange={(event) => setOrganization(event.target.value)}
                placeholder="MedBridge Hackathon Demo"
                required
                value={organization}
              />
            </label>
            <label className="field">
              <span>Demo access code</span>
              <input
                autoComplete="one-time-code"
                id={fieldId("access-code")}
                onChange={(event) => setAccessCode(event.target.value)}
                placeholder="MEDBRIDGE-DEMO"
                required
                value={accessCode}
              />
            </label>
            {error ? (
              <p className="auth-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="auth-actions">
              <button className="primary-button auth-primary" type="submit">
                <ArrowRight size={18} />
                <span>Sign in to dashboard</span>
              </button>
              <button className="secondary-button" type="button" onClick={loadDemoProfile}>
                <UserRound size={18} />
                <span>Load demo profile</span>
              </button>
            </div>
            <p className="muted auth-fineprint">
              No external account is required for the hackathon demo. The dashboard opens only after the approved access code is accepted.
            </p>
          </form>
        </section>
      </section>
    </main>
  );
}
