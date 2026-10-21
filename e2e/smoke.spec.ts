import { expect, test } from "@playwright/test";

const routes: { path: string; heading: string }[] = [
  { path: "/", heading: "Good hunting" },
  { path: "/events", heading: "Event explorer" },
  { path: "/alerts", heading: "Alert queue" },
  { path: "/network", heading: "Entity relationship graph" },
  { path: "/incidents", heading: "Incident queue" },
  { path: "/assets", heading: "Asset inventory" },
  { path: "/intelligence", heading: "Intelligence" },
  { path: "/rules", heading: "Detection rules" },
  { path: "/playbooks", heading: "Playbooks" },
  { path: "/scenarios", heading: "Scenario simulator" },
  { path: "/reports", heading: "Reports" },
  { path: "/settings", heading: "Settings" },
  { path: "/audit", heading: "Audit trail" },
];

test.describe("route smoke", () => {
  test("every route renders seeded data without page errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    for (const route of routes) {
      await page.goto(route.path, { waitUntil: "networkidle" });
      await expect(
        page.getByRole("heading", { level: 1 }).first()
      ).toContainText(route.heading);
    }

    expect(errors).toEqual([]);
  });

  test("incident workspace deep links to a tab", async ({ page }) => {
    await page.goto("/incidents/INC-2026-014?tab=findings", {
      waitUntil: "networkidle",
    });
    await expect(
      page.getByRole("heading", { level: 1 }).first()
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /findings/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});
