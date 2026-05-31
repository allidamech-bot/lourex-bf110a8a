import { test, expect } from "@playwright/test";

test.describe("Supabase Gate & Fallback Behavior", () => {
  const protectedRoutes = [
    "/auth",
    "/dashboard",
    "/customer-portal",
    "/profile",
    "/request",
    "/track",
  ];

  test.beforeEach(async ({ page }) => {
    // We are simulating a missing Supabase environment.
    // The test environment by default does not have VITE_SUPABASE_URL unless passed.
    // The app should naturally fall back to SupabaseSetupError for routes that require it.
  });

  for (const route of protectedRoutes) {
    test(`Route ${route} should show SupabaseSetupError or safe fallback when env vars are missing`, async ({ page }) => {
      const errors: Error[] = [];
      page.on("pageerror", (err) => errors.push(err));

      await page.goto(route);

      await expect(page.locator("body")).toBeVisible();

      // App.tsx uses a specific heading or text for the setup error
      const setupErrorHeading = page.getByText("Supabase environment variables are missing");
      
      // We expect the fallback page to be visible
      await expect(setupErrorHeading).toBeVisible();

      expect(errors).toHaveLength(0);
    });
  }
});
