import {
  ArrowRight,
  BadgeCheck,
  LogIn,
  MapPinned,
  ShieldCheck,
  UserRoundPlus
} from "lucide-react";
import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import {
  ACCOUNT_ROLES,
  SAMPLE_PROFILE,
  type AccountRole,
  type AuthMode,
  type AuthSession,
  createAccount,
  JUDGE_ENTRY_CODE,
  signInWithCredentials,
  signInWithJudgePass
} from "./auth";

interface LoginScreenProps {
  onSignIn: (session: AuthSession) => void;
}

function fieldId(mode: AuthMode, name: string): string {
  return `auth-${mode}-${name}`;
}

function isAccountRole(value: string): value is AccountRole {
  return ACCOUNT_ROLES.includes(value as AccountRole);
}

export function LoginScreen({ onSignIn }: LoginScreenProps): ReactElement {
  const [activeMode, setActiveMode] = useState<AuthMode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  const [signUpFullName, setSignUpFullName] = useState(SAMPLE_PROFILE.fullName);
  const [signUpEmail, setSignUpEmail] = useState(SAMPLE_PROFILE.email);
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpRole, setSignUpRole] = useState<AccountRole>(SAMPLE_PROFILE.role);
  const [signUpOrganization, setSignUpOrganization] = useState(SAMPLE_PROFILE.organization);

  const [judgeDisplayName, setJudgeDisplayName] = useState("Judge Access");
  const [judgePasscode, setJudgePasscode] = useState("");

  function activateMode(mode: AuthMode): void {
    setActiveMode(mode);
    setError(null);
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const session = signInWithCredentials({
        email: signInEmail,
        password: signInPassword
      });
      onSignIn(session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!isAccountRole(signUpRole)) {
        throw new Error("Pick a clinician, reviewer, or coordinator role before signing up.");
      }

      const session = createAccount({
        fullName: signUpFullName,
        email: signUpEmail,
        password: signUpPassword,
        role: signUpRole,
        organization: signUpOrganization
      });
      onSignIn(session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create your account right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJudgePass(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const session = signInWithJudgePass({
        displayName: judgeDisplayName,
        passcode: judgePasscode
      });
      onSignIn(session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to validate the judge pass.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-layout">
        <div className="auth-hero">
          <div className="auth-copy">
            <p className="eyebrow">MedBridge AI</p>
            <h1>Sign in, create an account, or use the judge pass</h1>
            <p className="muted">
              Open the triage workspace, review the parallel IQ signals, and brief the next clinician in one pass.
            </p>
          </div>

          <div className="auth-feature-list" aria-label="Product highlights">
            <div className="auth-feature">
              <UserRoundPlus size={18} />
              <div>
                <strong>Create your own account</strong>
                <span>Sign up with email, password, role, and organization.</span>
              </div>
            </div>
            <div className="auth-feature">
              <ShieldCheck size={18} />
              <div>
                <strong>Judge free entry</strong>
                <span>Reviewers can enter with the shared pass and skip password entry.</span>
              </div>
            </div>
            <div className="auth-feature">
              <MapPinned size={18} />
              <div>
                <strong>Browser-local session</strong>
                <span>Your sign-in stays in this browser for the demo.</span>
              </div>
            </div>
          </div>

          <p className="auth-note">This demo keeps accounts and sessions in your browser only.</p>
        </div>

        <section className="auth-panel" aria-labelledby="auth-panel-heading">
          <div className="auth-panel-header">
            <div>
              <p className="eyebrow">Entry gate</p>
              <h2 id="auth-panel-heading">Choose how to enter</h2>
              <p className="muted">
                Create an account, return with email and password, or use the judge pass for free entry.
              </p>
            </div>
            <div className="auth-badge">
              <BadgeCheck size={16} />
              <span>Local demo session</span>
            </div>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Authentication modes">
            <button
              aria-selected={activeMode === "signin"}
              className={`auth-tab${activeMode === "signin" ? " active" : ""}`}
              id={fieldId("signin", "tab")}
              onClick={() => activateMode("signin")}
              role="tab"
              type="button"
            >
              <LogIn size={16} />
              <span>Sign in</span>
            </button>
            <button
              aria-selected={activeMode === "signup"}
              className={`auth-tab${activeMode === "signup" ? " active" : ""}`}
              id={fieldId("signup", "tab")}
              onClick={() => activateMode("signup")}
              role="tab"
              type="button"
            >
              <UserRoundPlus size={16} />
              <span>Create account</span>
            </button>
            <button
              aria-selected={activeMode === "judge"}
              className={`auth-tab${activeMode === "judge" ? " active" : ""}`}
              id={fieldId("judge", "tab")}
              onClick={() => activateMode("judge")}
              role="tab"
              type="button"
            >
              <ShieldCheck size={16} />
              <span>Judge pass</span>
            </button>
          </div>

          <div className="auth-panels">
            {activeMode === "signin" ? (
              <form
                aria-labelledby={fieldId("signin", "tab")}
                className="auth-form auth-form-stack"
                onSubmit={handleSignIn}
                role="tabpanel"
              >
                <label className="field">
                  <span>Email address</span>
                  <input
                    autoComplete="email"
                    id={fieldId("signin", "email")}
                    onChange={(event) => setSignInEmail(event.target.value)}
                    placeholder="anandhu@medbridge.ai"
                    required
                    type="email"
                    value={signInEmail}
                  />
                </label>
                <label className="field">
                  <span>Password</span>
                  <input
                    autoComplete="current-password"
                    id={fieldId("signin", "password")}
                    onChange={(event) => setSignInPassword(event.target.value)}
                    placeholder="Enter your password"
                    required
                    type="password"
                    value={signInPassword}
                  />
                </label>
                {error ? (
                  <p className="auth-error" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="auth-actions">
                  <button className="primary-button auth-primary" disabled={isSubmitting} type="submit">
                    <ArrowRight size={18} />
                    <span>Enter dashboard</span>
                  </button>
                </div>
                <p className="muted auth-fineprint">
                  Returning users can sign in with the account they created here. Judges should switch to the judge pass tab.
                </p>
              </form>
            ) : null}

            {activeMode === "signup" ? (
              <form
                aria-labelledby={fieldId("signup", "tab")}
                className="auth-form auth-form-stack"
                onSubmit={handleSignUp}
                role="tabpanel"
              >
                <div className="field-grid">
                  <label className="field">
                    <span>Full name</span>
                    <input
                      autoComplete="name"
                      id={fieldId("signup", "full-name")}
                      onChange={(event) => setSignUpFullName(event.target.value)}
                      placeholder="Anandhu P"
                      required
                      value={signUpFullName}
                    />
                  </label>
                  <label className="field">
                    <span>Organization</span>
                    <input
                      autoComplete="organization"
                      id={fieldId("signup", "organization")}
                      onChange={(event) => setSignUpOrganization(event.target.value)}
                      placeholder="MedBridge Hackathon Demo"
                      required
                      value={signUpOrganization}
                    />
                  </label>
                </div>
                <div className="field-grid">
                  <label className="field">
                    <span>Email address</span>
                    <input
                      autoComplete="email"
                      id={fieldId("signup", "email")}
                      onChange={(event) => setSignUpEmail(event.target.value)}
                      placeholder="anandhu@medbridge.ai"
                      required
                      type="email"
                      value={signUpEmail}
                    />
                  </label>
                  <label className="field">
                    <span>Password</span>
                    <input
                      autoComplete="new-password"
                      id={fieldId("signup", "password")}
                      onChange={(event) => setSignUpPassword(event.target.value)}
                      placeholder="Create a password"
                      required
                      type="password"
                      value={signUpPassword}
                    />
                  </label>
                </div>
                <label className="field">
                  <span>Role</span>
                  <select
                    id={fieldId("signup", "role")}
                    onChange={(event) => setSignUpRole(event.target.value as AccountRole)}
                    value={signUpRole}
                  >
                    <option value="Clinician">Clinician</option>
                    <option value="Reviewer">Reviewer</option>
                    <option value="Coordinator">Coordinator</option>
                  </select>
                </label>
                {error ? (
                  <p className="auth-error" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="auth-actions">
                  <button className="primary-button auth-primary" disabled={isSubmitting} type="submit">
                    <ArrowRight size={18} />
                    <span>Create and enter</span>
                  </button>
                </div>
                <p className="muted auth-fineprint">
                  The first sign-up is enough. After that, the same email and password will bring you back here.
                </p>
              </form>
            ) : null}

            {activeMode === "judge" ? (
              <form
                aria-labelledby={fieldId("judge", "tab")}
                className="auth-form auth-form-stack"
                onSubmit={handleJudgePass}
                role="tabpanel"
              >
                <label className="field">
                  <span>Display name</span>
                  <input
                    autoComplete="name"
                    id={fieldId("judge", "display-name")}
                    onChange={(event) => setJudgeDisplayName(event.target.value)}
                    placeholder="Judge Access"
                    value={judgeDisplayName}
                  />
                </label>
                <label className="field">
                  <span>Judge pass</span>
                  <input
                    autoComplete="one-time-code"
                    id={fieldId("judge", "passcode")}
                    onChange={(event) => setJudgePasscode(event.target.value)}
                    placeholder={JUDGE_ENTRY_CODE}
                    required
                    value={judgePasscode}
                  />
                </label>
                {error ? (
                  <p className="auth-error" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="auth-actions">
                  <button className="primary-button auth-primary" disabled={isSubmitting} type="submit">
                    <ArrowRight size={18} />
                    <span>Enter as judge</span>
                  </button>
                </div>
                <p className="muted auth-fineprint">
                  Judges can enter without a password, as long as the shared pass matches the demo code.
                </p>
              </form>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
