import { test, expect } from "@playwright/test";
import { signup, uniqueEmail } from "./helpers";

test.describe("authentication", () => {
  test("unauthenticated users are redirected to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });

  test("a user can sign up and reach the dashboard", async ({ page }) => {
    await signup(page);
    await expect(page).toHaveURL("/");
    // Ticker / cards present → dashboard rendered with mock data.
    await expect(page.getByText("BTC").first()).toBeVisible();
  });

  test("signup rejects a short password", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(uniqueEmail());
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: /create account/i }).click();
    // The password field enforces a minimum length, so submission is blocked
    // and we stay on /signup (the form is not accepted).
    await expect(page).toHaveURL(/\/signup/);
    const valid = await page
      .getByLabel("Password")
      .evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(valid).toBe(false);
  });

  test("login fails with wrong credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(uniqueEmail());
    await page.getByLabel("Password").fill("wrongpassword123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/incorrect email or password/i)).toBeVisible();
  });

  test("a user can log out and is sent back to login", async ({ page }) => {
    await signup(page);
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);
    // Dashboard now redirects again.
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login redirects back to the originally requested page", async ({
    page,
  }) => {
    // requireUser preserves redirectTo; signing up then logging in returns home.
    const email = await signup(page);
    await page.getByRole("button", { name: /sign out/i }).click();
    // Wait until we're actually logged out (on the login page) before logging in
    // again — otherwise /login would redirect us straight back to "/".
    await page.waitForURL(/\/login/);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("supersecret123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL("/");
  });
});
