import { expect, test } from "@playwright/test";

test("runs the default low-risk triage flow", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("http://127.0.0.1:5173");
  await expect(page.getByRole("heading", { name: "Community health navigator" })).toBeVisible();
  await page.getByRole("button", { name: /run triage/i }).click();
  await expect(page.getByText("Low", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Doctor Briefing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Citations" })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("flags high-risk emergency symptoms", async ({ page }) => {
  await page.goto("http://127.0.0.1:5173");
  await page.getByLabel("Symptoms").fill("chest pain and shortness of breath");
  await page.getByRole("button", { name: /run triage/i }).click();
  await expect(page.getByText("High", { exact: true })).toBeVisible();
  await expect(page.locator(".emergency-banner")).toContainText(/call local emergency services now/i);
});
