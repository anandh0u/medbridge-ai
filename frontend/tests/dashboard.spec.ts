import { expect, test, type Page } from "@playwright/test";

const DEMO_USER = {
  fullName: "Anandhu P",
  email: "anandhu.e2e@medbridge.ai",
  password: "MedBridge!123",
  role: "Reviewer" as const,
  organization: "MedBridge Hackathon Demo"
};

const JUDGE_PASS = "MEDBRIDGE-JUDGE";

async function openApp(page: Page): Promise<void> {
  await page.goto("http://127.0.0.1:5173");
  await expect(page.getByRole("heading", { name: /sign in, create an account, or use the judge pass/i })).toBeVisible();
}

async function signUp(page: Page): Promise<void> {
  await page.getByRole("tab", { name: /create account/i }).click();
  await page.getByLabel("Full name").fill(DEMO_USER.fullName);
  await page.getByLabel("Organization").fill(DEMO_USER.organization);
  await page.getByLabel("Email address").fill(DEMO_USER.email);
  await page.getByLabel("Password").fill(DEMO_USER.password);
  await page.getByLabel("Role").selectOption(DEMO_USER.role);
  await page.getByRole("button", { name: /create and enter/i }).click();
  await expect(page.getByRole("heading", { name: "Community health navigator" })).toBeVisible();
}

async function signInWithSavedAccount(page: Page): Promise<void> {
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page.getByRole("heading", { name: /sign in, create an account, or use the judge pass/i })).toBeVisible();
  await page.getByRole("tab", { name: /sign in/i }).click();
  await page.getByLabel("Email address").fill(DEMO_USER.email);
  await page.getByLabel("Password").fill(DEMO_USER.password);
  await page.getByRole("button", { name: /enter dashboard/i }).click();
  await expect(page.getByRole("heading", { name: "Community health navigator" })).toBeVisible();
}

async function enterAsJudge(page: Page): Promise<void> {
  await page.getByRole("tab", { name: /judge pass/i }).click();
  await page.getByLabel("Display name").fill("Judge Access");
  await page.getByRole("textbox", { name: "Judge pass" }).fill(JUDGE_PASS);
  await page.getByRole("button", { name: /enter as judge/i }).click();
  await expect(page.getByRole("heading", { name: "Community health navigator" })).toBeVisible();
}

test("lets a new user sign up and return with the saved login", async ({ page }) => {
  await openApp(page);
  await signUp(page);
  await expect(page.getByText(/signed up locally/i)).toBeVisible();
  await signInWithSavedAccount(page);
  await expect(page.getByText(/signed in with email/i)).toBeVisible();
});

test("blocks dashboard access when login credentials are wrong", async ({ page }) => {
  await openApp(page);
  await page.getByRole("tab", { name: /sign in/i }).click();
  await page.getByLabel("Email address").fill("wrong@example.com");
  await page.getByLabel("Password").fill("bad-password");
  await page.getByRole("button", { name: /enter dashboard/i }).click();
  await expect(page.getByRole("alert")).toContainText(/did not match/i);
  await expect(page.getByRole("heading", { name: "Community health navigator" })).toHaveCount(0);
});

test("grants judges entry through the free pass", async ({ page }) => {
  await openApp(page);
  await enterAsJudge(page);
  await expect(page.getByText(/judge pass/i)).toBeVisible();
});

test("runs the default low-risk triage flow", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await openApp(page);
  await enterAsJudge(page);
  await page.getByRole("button", { name: /run triage/i }).click();
  await expect(page.getByText("Low", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Doctor Briefing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Citations" })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("flags high-risk emergency symptoms", async ({ page }) => {
  await openApp(page);
  await enterAsJudge(page);
  await page.getByLabel("Symptoms").fill("chest pain and shortness of breath");
  await page.getByRole("button", { name: /run triage/i }).click();
  await expect(page.getByText("High", { exact: true })).toBeVisible();
  await expect(page.locator(".emergency-banner")).toContainText(/call local emergency services now/i);
});

test("keeps negated chest pain from escalating", async ({ page }) => {
  await openApp(page);
  await enterAsJudge(page);
  await page.getByLabel("Symptoms").fill("no chest pain, mild headache and fatigue");
  await page.getByRole("button", { name: /run triage/i }).click();
  await expect(page.getByText("Low", { exact: true })).toBeVisible();
  await expect(page.locator(".emergency-banner")).toHaveCount(0);
});

test("treats viral symptom clusters as medium risk", async ({ page }) => {
  await openApp(page);
  await enterAsJudge(page);
  await page.getByLabel("Symptoms").fill("headache, fever, and body aches for 3 days");
  await page.getByRole("button", { name: /run triage/i }).click();
  await expect(page.getByText("Medium", { exact: true })).toBeVisible();
  await expect(page.locator(".risk-panel")).toContainText(/contact a licensed clinician, urgent care, or community clinic today/i);
});
