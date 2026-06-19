import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: "Sign in to the community health dashboard" })).toBeVisible();
  await page.getByRole("button", { name: /load demo profile/i }).click();
  await page.getByRole("button", { name: /sign in to dashboard/i }).click();
  await expect(page.getByRole("heading", { name: "Community health navigator" })).toBeVisible();
}

test("runs the default low-risk triage flow", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("http://127.0.0.1:5173");
  await signIn(page);
  await page.getByRole("button", { name: /run triage/i }).click();
  await expect(page.getByText("Low", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Doctor Briefing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Citations" })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("flags high-risk emergency symptoms", async ({ page }) => {
  await page.goto("http://127.0.0.1:5173");
  await signIn(page);
  await page.getByLabel("Symptoms").fill("chest pain and shortness of breath");
  await page.getByRole("button", { name: /run triage/i }).click();
  await expect(page.getByText("High", { exact: true })).toBeVisible();
  await expect(page.locator(".emergency-banner")).toContainText(/call local emergency services now/i);
});

test("keeps negated chest pain from escalating", async ({ page }) => {
  await page.goto("http://127.0.0.1:5173");
  await signIn(page);
  await page.getByLabel("Symptoms").fill("no chest pain, mild headache and fatigue");
  await page.getByRole("button", { name: /run triage/i }).click();
  await expect(page.getByText("Low", { exact: true })).toBeVisible();
  await expect(page.locator(".emergency-banner")).toHaveCount(0);
});

test("treats viral symptom clusters as medium risk", async ({ page }) => {
  await page.goto("http://127.0.0.1:5173");
  await signIn(page);
  await page.getByLabel("Symptoms").fill("headache, fever, and body aches for 3 days");
  await page.getByRole("button", { name: /run triage/i }).click();
  await expect(page.getByText("Medium", { exact: true })).toBeVisible();
  await expect(page.locator(".risk-panel")).toContainText(/contact a licensed clinician, urgent care, or community clinic today/i);
});
