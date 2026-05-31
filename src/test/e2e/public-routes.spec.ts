import { test, expect } from "@playwright/test";

test.describe("Public Routes Smoke Test", () => {
  const publicRoutes = [
    "/",
    "/about",
    "/why-lourex",
    "/products",
    "/contact",
    "/privacy",
    "/terms",
    "/guidelines",
  ];

  for (const route of publicRoutes) {
    test(`Route ${route} should load without crashing`, async ({ page }) => {
      // Catch any unhandled page errors
      const errors: Error[] = [];
      page.on("pageerror", (err) => errors.push(err));

      const response = await page.goto(route);
      
      // Ensure the page returns a successful status
      expect(response?.ok()).toBeTruthy();

      // Ensure the body is visible, indicating the app rendered something
      await expect(page.locator("body")).toBeVisible();

      // Ensure no React/Vite crash overlay is present
      const viteErrorOverlay = page.locator("vite-error-overlay");
      await expect(viteErrorOverlay).toHaveCount(0);

      // Verify no unhandled runtime exceptions were thrown
      expect(errors).toHaveLength(0);
    });
  }
});
