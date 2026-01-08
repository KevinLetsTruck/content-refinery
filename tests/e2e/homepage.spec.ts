/**
 * E2E tests for the homepage
 */

import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads successfully", async ({ page }) => {
    await page.goto("/");

    // Page should load without errors
    await expect(page).toHaveTitle(/Content Refinery/);
  });

  test("displays main navigation", async ({ page }) => {
    await page.goto("/");

    // Should have main navigation elements
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();
  });
});

test.describe("API Health", () => {
  test("ingest endpoint returns 401 without auth", async ({ request }) => {
    const response = await request.post("/api/ingest", {
      data: {
        source: "test",
        contentType: "episode",
        title: "Test",
      },
    });

    expect(response.status()).toBe(401);
  });

  test("ingest status returns 400 without sourceId", async ({ request }) => {
    const response = await request.get("/api/ingest");

    expect(response.status()).toBe(400);
  });
});
