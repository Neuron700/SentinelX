import { expect, test } from "@playwright/test";

test("event explorer filters telemetry and opens a detail drawer", async ({
  page,
}) => {
  await page.goto("/events", { waitUntil: "networkidle" });
  await expect(page.locator("tbody tr").first()).toBeVisible();

  await page.getByLabel("Search events").fill("powershell");
  await expect(page.locator("tbody tr").first()).toBeVisible();
  const rows = await page.locator("tbody tr").allInnerTexts();
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.join(" ").toLowerCase()).toContain("powershell");

  await page.locator("tbody tr").first().click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Detection fields")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
});

test("alert lifecycle acknowledges, escalates, resolves, and audits", async ({
  page,
}) => {
  await page.goto("/alerts", { waitUntil: "networkidle" });
  await expect(page.locator("tbody tr").first()).toBeVisible();

  const newAlert = page.locator("tbody tr").filter({ hasText: "New" }).first();
  await newAlert.click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();

  await drawer.getByRole("button", { name: "Acknowledge" }).click();
  await expect(page.getByText("Alert acknowledged")).toBeVisible();

  await drawer.getByRole("button", { name: "Escalate" }).click();
  await expect(page.getByText("Alert escalated")).toBeVisible();

  await drawer.getByRole("button", { name: "Resolve", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Resolve alert" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Resolve alert" }).click();
  await expect(page.getByText("Alert resolved")).toBeVisible();

  await page.goto("/audit", { waitUntil: "networkidle" });
  await expect(page.getByText("alert.acknowledged").first()).toBeVisible();
  await expect(page.getByText("alert.resolved").first()).toBeVisible();
});

test("command palette navigates to a page", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.keyboard.down("Control");
  await page.keyboard.press("KeyK");
  await page.keyboard.up("Control");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Global search")).toBeVisible();

  await page.keyboard.type("assets");
  await dialog
    .getByRole("button")
    .filter({ hasText: "Assets" })
    .first()
    .click();
  await expect(page).toHaveURL(/\/assets/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Asset inventory" })
  ).toBeVisible();
});

test("scenario simulator completes and generates alerts", async ({ page }) => {
  await page.goto("/scenarios", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Run", exact: true }).first().click();
  await expect(page.getByText("Start simulation")).toBeVisible();

  await page.selectOption("#simulation-speed", "8");
  await page.getByRole("button", { name: /Start simulation/i }).click();

  await expect(page.getByText("Scenario completed").first()).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByText(/events and \d+ alerts generated/)).toBeVisible();
});

test("reports export a JSON file", async ({ page }) => {
  await page.goto("/reports", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Reports" })
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export JSON/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/sentinelx-report.*\.json$/);
});
