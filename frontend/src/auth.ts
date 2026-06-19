export type AccountRole = "Clinician" | "Reviewer" | "Coordinator";
export type UserRole = AccountRole | "Judge";
export type AuthMode = "signin" | "signup" | "judge";
export type AuthMethod = "login" | "signup" | "judge";

export interface AuthSession {
  fullName: string;
  email: string;
  role: UserRole;
  organization: string;
  authMethod: AuthMethod;
  issuedAt: string;
}

export interface AuthAccount {
  fullName: string;
  email: string;
  password: string;
  role: AccountRole;
  organization: string;
  createdAt: string;
}

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  role: AccountRole;
  organization: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface JudgeAccessInput {
  displayName: string;
  passcode: string;
}

export const SESSION_KEY = "medbridge-auth-session";
const ACCOUNTS_KEY = "medbridge-auth-accounts";
export const LEGACY_DEMO_ACCESS_CODE = "MEDBRIDGE-DEMO";
export const JUDGE_ENTRY_CODE = normalizeCode(import.meta.env.VITE_MEDBRIDGE_JUDGE_PASS || "MEDBRIDGE-JUDGE");

export const ACCOUNT_ROLES: AccountRole[] = ["Clinician", "Reviewer", "Coordinator"];

export const SAMPLE_PROFILE = {
  fullName: "Anandhu P",
  email: "anandhu@medbridge.ai",
  organization: "MedBridge Hackathon Demo",
  role: "Reviewer" as AccountRole
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeText(value: string): string {
  return value.trim();
}

function isAccountRole(value: unknown): value is AccountRole {
  return value === "Clinician" || value === "Reviewer" || value === "Coordinator";
}

function isAuthMethod(value: unknown): value is AuthMethod {
  return value === "login" || value === "signup" || value === "judge";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson<T>(key: string): T | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function removeValue(key: string): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(key);
}

function sanitizeAccounts(rawAccounts: unknown): AuthAccount[] {
  if (!Array.isArray(rawAccounts)) {
    return [];
  }

  return rawAccounts.filter((item): item is AuthAccount => {
    if (!isRecord(item)) {
      return false;
    }

    return (
      typeof item.fullName === "string" &&
      typeof item.email === "string" &&
      typeof item.password === "string" &&
      isAccountRole(item.role) &&
      typeof item.organization === "string" &&
      typeof item.createdAt === "string"
    );
  });
}

function buildSession(fullName: string, email: string, role: UserRole, organization: string, authMethod: AuthMethod): AuthSession {
  return {
    fullName: normalizeText(fullName),
    email: normalizeEmail(email),
    role,
    organization: normalizeText(organization),
    authMethod,
    issuedAt: nowIso()
  };
}

function persistSession(session: AuthSession): void {
  writeJson(SESSION_KEY, session);
}

function persistAccounts(accounts: AuthAccount[]): void {
  writeJson(ACCOUNTS_KEY, accounts);
}

export function loadAccounts(): AuthAccount[] {
  return sanitizeAccounts(readJson<unknown>(ACCOUNTS_KEY));
}

export function loadAuthSession(): AuthSession | null {
  if (!isBrowser()) {
    return null;
  }

  const storedSession = readJson<unknown>(SESSION_KEY);
  if (!isRecord(storedSession)) {
    return null;
  }

  if (isAuthMethod(storedSession.authMethod)) {
    const fullName = typeof storedSession.fullName === "string" ? storedSession.fullName : "";
    const email = typeof storedSession.email === "string" ? storedSession.email : "";
    const organization = typeof storedSession.organization === "string" ? storedSession.organization : "";
    const role = storedSession.role;
    const issuedAt = typeof storedSession.issuedAt === "string" ? storedSession.issuedAt : nowIso();

    if (!fullName || !email || !organization || !isAccountRole(role) && role !== "Judge") {
      return null;
    }

    if (storedSession.authMethod !== "judge") {
      const account = loadAccounts().find((item) => normalizeEmail(item.email) === normalizeEmail(email));
      if (!account) {
        return null;
      }

      return {
        fullName: account.fullName,
        email: account.email,
        role: account.role,
        organization: account.organization,
        authMethod: storedSession.authMethod,
        issuedAt
      };
    }

    return {
      fullName,
      email: normalizeEmail(email),
      role: "Judge",
      organization,
      authMethod: "judge",
      issuedAt
    };
  }

  if (typeof storedSession.accessCode === "string" && normalizeCode(storedSession.accessCode) === LEGACY_DEMO_ACCESS_CODE) {
    const fullName = typeof storedSession.fullName === "string" && storedSession.fullName.trim() ? storedSession.fullName : "Judge Access";
    const email = typeof storedSession.email === "string" && storedSession.email.trim() ? storedSession.email : "judge@medbridge.ai";
    const organization =
      typeof storedSession.organization === "string" && storedSession.organization.trim()
        ? storedSession.organization
        : "Hackathon Jury";
    return {
      fullName: normalizeText(fullName),
      email: normalizeEmail(email),
      role: "Judge",
      organization: normalizeText(organization),
      authMethod: "judge",
      issuedAt: typeof storedSession.issuedAt === "string" ? storedSession.issuedAt : nowIso()
    };
  }

  return null;
}

export function clearAuthSession(): void {
  removeValue(SESSION_KEY);
}

export function createAccount(input: SignUpInput): AuthSession {
  const fullName = normalizeText(input.fullName);
  const email = normalizeEmail(input.email);
  const password = input.password.trim();
  const organization = normalizeText(input.organization);

  if (!fullName || !email || !password || !organization) {
    throw new Error("Fill in your name, email, password, role, and organization to create an account.");
  }

  if (password.length < 6) {
    throw new Error("Use at least 6 characters for the password.");
  }

  const accounts = loadAccounts();
  if (accounts.some((account) => normalizeEmail(account.email) === email)) {
    throw new Error("An account already exists for that email. Sign in instead.");
  }

  const account: AuthAccount = {
    fullName,
    email,
    password,
    role: input.role,
    organization,
    createdAt: nowIso()
  };

  const session = buildSession(account.fullName, account.email, account.role, account.organization, "signup");
  persistAccounts([...accounts, account]);
  persistSession(session);
  return session;
}

export function signInWithCredentials(input: SignInInput): AuthSession {
  const email = normalizeEmail(input.email);
  const password = input.password.trim();

  if (!email || !password) {
    throw new Error("Enter the email and password for the account you created.");
  }

  const account = loadAccounts().find((item) => normalizeEmail(item.email) === email);
  if (!account || account.password !== password) {
    throw new Error("That email or password did not match. Sign up first or use the judge pass.");
  }

  const session = buildSession(account.fullName, account.email, account.role, account.organization, "login");
  persistSession(session);
  return session;
}

export function signInWithJudgePass(input: JudgeAccessInput): AuthSession {
  if (normalizeCode(input.passcode) !== JUDGE_ENTRY_CODE) {
    throw new Error("That judge pass is not active. Enter the pass shared for the demo review team.");
  }

  const displayName = normalizeText(input.displayName) || "Judge Access";
  const session = buildSession(displayName, "judge@medbridge.ai", "Judge", "Hackathon Jury", "judge");
  persistSession(session);
  return session;
}

export function authMethodLabel(method: AuthMethod): string {
  switch (method) {
    case "login":
      return "Signed in with email";
    case "signup":
      return "Signed up locally";
    case "judge":
      return "Judge pass";
  }
}
