import { test, expect } from "@playwright/test";

test.describe("Not Found Behavior", () => {
  test("Unknown route should render the SupabaseSetupError or NotFound safely", async ({ page }) => {
    const errors: Error[] = [];
    page.on("pageerror", (err) => errors.push(err));

    await page.goto("/some-unknown-random-route-12345");

    await expect(page.locator("body")).toBeVisible();

    // Since Supabase env vars are missing in the test environment, the wildcard route (*)
    // will catch this and render SupabaseSetupError. 
    // If Supabase was configured, it would render NotFound.
    // Let's check for either SupabaseSetupError or NotFound text.
    const hasSetupError = await page.getByText("Supabase environment variables are missing").isVisible();
    const hasNotFound = await page.getByText("Page not found", { exact: false }).isVisible() || 
                        await page.getByText("404", { exact: false }).isVisible();
    
    expect(hasSetupError || hasNotFound).toBeTruthy();
    expect(errors).toHaveLength(0);
  });
});
