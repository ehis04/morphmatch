import { expect, test, type APIRequestContext, type Page, type Route } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function localAuth() {
  const config = JSON.parse(
    execFileSync("supabase", ["status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
  ) as Record<string, string>;
  expect(["localhost", "127.0.0.1"]).toContain(new URL(config.API_URL).hostname);
  const admin = createClient(config.API_URL, config.SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { config, admin };
}

async function completeEmailLink(
  page: Page,
  request: APIRequestContext,
  config: Record<string, string>,
  email: string,
  next: string
) {
  const mailpit = config.MAILPIT_URL || config.INBUCKET_URL;
  const emailUrl = `${mailpit}/view/latest.html?query=${encodeURIComponent(`to:${email}`)}`;
  await expect
    .poll(async () => (await request.get(emailUrl)).status(), { timeout: 15_000 })
    .toBe(200);
  const html = await (await request.get(emailUrl)).text();
  const href = html.match(/href="([^"]+)"/)?.[1].replace(/&amp;/g, "&");
  expect(Boolean(href)).toBe(true);
  expect(["localhost", "127.0.0.1"]).toContain(new URL(href!).hostname);
  const verified = await request.get(href!, { maxRedirects: 0 });
  expect([302, 303]).toContain(verified.status());
  const destination = new URL(verified.headers().location);
  expect(Boolean(destination.searchParams.get("code"))).toBe(true);
  // Preserve the browser's PKCE cookies when an existing local stack allows
  // port 3000 only. This avoids restarting services or resetting user data.
  const callback = new URL("/auth/callback", new URL(page.url()).origin);
  callback.searchParams.set("code", destination.searchParams.get("code")!);
  callback.searchParams.set("next", next);
  const flowId = destination.searchParams.get("sb_flow_id");
  if (flowId) callback.searchParams.set("sb_flow_id", flowId);
  await page.goto(callback.toString());
}

test.describe("Connected accounts", () => {
  test.skip(
    process.env.MORPHMATCH_ACCOUNTS_E2E !== "1",
    "Requires the existing local Supabase stack and a build with accounts enabled."
  );

  test("returns to the selected comparison, saves Numbers, isolates accounts and retries deletion", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    const { config, admin } = localAuth();
    const password = `Browser-${randomUUID()}`;
    const accounts: { id: string; email: string }[] = [];

    try {
      for (let i = 0; i < 2; i++) {
        const email = `morphmatch-browser-${randomUUID()}@example.com`;
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        expect(error).toBeNull();
        expect(data.user).toBeTruthy();
        accounts.push({ id: data.user!.id, email });
      }

      const signIn = async (index: number) => {
        await page.getByLabel("Email", { exact: true }).fill(accounts[index].email);
        await page.getByLabel("Password", { exact: true }).fill(password);
        await page.locator("form").getByRole("button", { name: "Sign in", exact: true }).click();
      };
      const signOut = async () => {
        await page.goto("/login");
        await page.locator("main").getByRole("button", { name: "Sign out", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
      };

      await page.goto("/versus?a=lebron-james&b=marcus-rashford&mode=table");
      await page.getByRole("link", { name: "Sign in to save" }).click();
      await signIn(0);
      await expect(page).toHaveURL(/\/versus\?a=lebron-james&b=marcus-rashford&mode=table$/);
      await page.getByRole("button", { name: "Save comparison", exact: true }).click();
      await expect(page.getByRole("button", { name: "Saved ✓" })).toBeDisabled();
      await page.goto("/saved");
      const row = page.locator("article").filter({
        has: page.getByRole("heading", { name: "LeBron James vs Marcus Rashford", exact: true }),
      });
      await expect(row).toBeVisible();
      await row.getByRole("button", { name: "View", exact: true }).click();
      await expect(row.getByRole("table")).toBeVisible();
      await expect(row.getByRole("link", { name: "Open head-to-head" })).toHaveAttribute(
        "href",
        "/versus?a=lebron-james&b=marcus-rashford&mode=table"
      );
      await page.goto("/login");
      await page.getByRole("link", { name: "Change password", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();

      await signOut();
      await signIn(1);
      await expect(page).toHaveURL(/\/saved$/);
      await expect(page.getByRole("heading", { name: "Nothing saved yet" })).toBeVisible();
      await expect(page.locator("article")).toHaveCount(0);

      await signOut();
      await signIn(0);
      await expect(row).toBeVisible();
      const failedDelete = async (route: Route) => {
        if (route.request().method() === "DELETE") {
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ message: "Temporary test outage" }),
          });
        } else await route.continue();
      };
      await page.route("**/rest/v1/saved_comps**", failedDelete);
      await row.getByRole("button", { name: "Delete LeBron James vs Marcus Rashford" }).click();
      await expect(page.locator("main").getByRole("alert")).toContainText("could not be deleted");
      await expect(row).toBeVisible();
      await page.unroute("**/rest/v1/saved_comps**", failedDelete);
      await row.getByRole("button", { name: "Delete LeBron James vs Marcus Rashford" }).click();
      await expect(row).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Nothing saved yet" })).toBeVisible();

      await signOut();
      await page.goto("/auth/callback?code=invalid&next=https%3A%2F%2Fevil.example");
      await expect(page).toHaveURL(/\/login\?error=auth_callback_failed&next=%2Fsaved$/);
      await expect(page.locator("main").getByRole("alert")).toContainText("could not be completed");
      await page.getByRole("button", { name: "Forgot your password?" }).click();
      await page.getByLabel("Email", { exact: true }).fill(accounts[0].email);
      await page.getByRole("button", { name: "Send reset link" }).click();
      await expect(page.getByRole("status")).toContainText("receive a password reset link");

      await completeEmailLink(page, request, config, accounts[0].email, "/login?reset=1");
      await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
      const newPassword = `Recovered-${randomUUID()}`;
      await page.getByLabel("New password", { exact: true }).fill(newPassword);
      await page.getByLabel("Confirm new password", { exact: true }).fill(newPassword);
      await page.getByRole("button", { name: "Update password", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("Your password has been updated");
      await signOut();
      await page.getByLabel("Email", { exact: true }).fill(accounts[0].email);
      await page.getByLabel("Password", { exact: true }).fill(newPassword);
      await page.locator("form").getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(/\/saved$/);
    } finally {
      for (const account of accounts) {
        const { error } = await admin.auth.admin.deleteUser(account.id);
        expect(error).toBeNull();
      }
    }
  });

  test("restores private custom saves with blocked storage and deletes unavailable legacy saves", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const { config, admin } = localAuth();
    const email = `morphmatch-browser-${randomUUID()}@example.com`;
    const password = `Browser-${randomUUID()}`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(error).toBeNull();
    const userId = data.user!.id;
    try {
      await page.addInitScript(() => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === "mm.profile")
            throw new DOMException("Storage disabled for this test", "QuotaExceededError");
          original.call(this, key, value);
        };
      });
      await page.goto("/login");
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.locator("form").getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(/\/saved$/);
      await page.goto("/match?athlete=marcus-rashford&mode=table");
      await page.getByRole("button", { name: "cm/kg", exact: true }).click();
      await page.getByLabel("Height in centimetres", { exact: true }).fill("183");
      await page.getByLabel("Weight in kilograms", { exact: true }).fill("85");
      await page.getByLabel("Wingspan in centimetres", { exact: true }).fill("");
      await page.getByRole("button", { name: "Female", exact: true }).click();
      await page.getByRole("button", { name: "Save comparison", exact: true }).click();
      await expect(page.getByRole("button", { name: "Saved ✓" })).toBeDisabled();
      await page.getByLabel("Height in centimetres", { exact: true }).fill("170");
      await page.getByLabel("Weight in kilograms", { exact: true }).fill("65");
      await page.getByLabel("Wingspan in centimetres", { exact: true }).fill("170");
      await page.goto("/saved");
      const row = page
        .locator("article")
        .filter({ has: page.getByRole("heading", { name: "Me vs Marcus Rashford", exact: true }) });
      await row.getByRole("button", { name: "View", exact: true }).click();
      await expect(row.getByRole("table")).toBeVisible();
      await expect(row.getByText("Restores these measurements on this device.")).toBeVisible();
      await row.getByRole("button", { name: "Open in matching", exact: true }).click();
      await expect(page).toHaveURL(/\/match\?athlete=marcus-rashford&mode=table$/);
      await expect(page.getByLabel("Height in centimetres", { exact: true })).toHaveValue("183");
      await expect(page.getByLabel("Weight in kilograms", { exact: true })).toHaveValue("85");
      await expect(page.getByLabel("Wingspan in centimetres", { exact: true })).toHaveValue("");
      await expect(page.getByRole("button", { name: "Female", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      await expect(page.getByRole("table")).toBeVisible();
      expect([...new URL(page.url()).searchParams.keys()]).toEqual(["athlete", "mode"]);
      // An unreadable legacy payload retains a real, owned database row. Alter
      // only its read response so current validation constraints stay intact.
      const owner = createClient(config.API_URL, config.ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const signedIn = await owner.auth.signInWithPassword({ email, password });
      expect(signedIn.error).toBeNull();
      const { data: legacy, error: legacyError } = await owner
        .from("saved_comps")
        .insert({
          user_id: userId,
          title: "Older measurements",
          subject: { kind: "athlete", athleteId: "lebron-james" },
          target_athlete_id: "marcus-rashford",
          mode: "overlay",
        })
        .select("id")
        .single();
      expect(legacyError).toBeNull();
      const malformedRead = async (route: Route) => {
        if (route.request().method() !== "GET") return route.continue();
        const response = await route.fetch();
        const rows = (await response.json()) as Record<string, unknown>[];
        await route.fulfill({
          response,
          json: rows.map((saved) => (saved.id === legacy!.id ? { ...saved, subject: {} } : saved)),
        });
      };
      await page.route("**/rest/v1/saved_comps**", malformedRead);
      await page.goto("/saved");
      const oldRow = page
        .locator("article")
        .filter({ has: page.getByRole("heading", { name: "Older measurements", exact: true }) });
      await expect(
        oldRow.getByText("This saved comparison is unavailable", { exact: false })
      ).toBeVisible();
      await expect(oldRow.getByRole("button", { name: "View", exact: true })).toHaveCount(0);
      await oldRow.getByRole("button", { name: "Delete Older measurements", exact: true }).click();
      await expect(oldRow).toHaveCount(0);
      const remaining = await owner
        .from("saved_comps")
        .select("id")
        .eq("user_id", userId)
        .eq("id", legacy!.id);
      expect(remaining.error).toBeNull();
      expect(remaining.data).toEqual([]);
      await page.unroute("**/rest/v1/saved_comps**", malformedRead);
    } finally {
      const deleted = await admin.auth.admin.deleteUser(userId);
      expect(deleted.error).toBeNull();
    }
  });

  test("resends a confirmation email and completes the real email callback", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    const { config, admin } = localAuth();
    const email = `morphmatch-browser-${randomUUID()}@example.com`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: `Browser-${randomUUID()}`,
      email_confirm: false,
    });
    expect(error).toBeNull();
    try {
      await page.goto(
        "/login?next=%2Fversus%3Fa%3Dlebron-james%26b%3Dmarcus-rashford%26mode%3Dside"
      );
      await page.getByRole("button", { name: "Resend confirmation email", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Confirm your email", exact: true })
      ).toBeVisible();
      await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByRole("button", { name: "Send confirmation link", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("a new link will arrive");
      await completeEmailLink(
        page,
        request,
        config,
        email,
        "/versus?a=lebron-james&b=marcus-rashford&mode=side"
      );
      await expect(page).toHaveURL(/\/versus\?a=lebron-james&b=marcus-rashford&mode=side$/);
      await expect(
        page.getByRole("button", { name: "Save comparison", exact: true })
      ).toBeVisible();
      const confirmed = await admin.auth.admin.getUserById(data.user!.id);
      expect(Boolean(confirmed.data.user?.email_confirmed_at)).toBe(true);
    } finally {
      const deleted = await admin.auth.admin.deleteUser(data.user!.id);
      expect(deleted.error).toBeNull();
    }
  });
});
