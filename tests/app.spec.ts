import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ reducedMotion: "reduce" });

test.beforeEach(async ({ page }) => {
  // Third-party availability must not control whether core workflows pass.
  await page.route(/https:\/\/(en\.wikipedia|commons\.wikimedia)\.org\//, (route) =>
    route.fulfill({ status: 503, body: "Photos unavailable during this test" })
  );
});

test("home, mobile menu and units work without page errors", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("built like");
  await page.getByRole("button", { name: "ft/lb" }).click();
  await expect(page.getByRole("button", { name: "ft/lb" })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: "ft/lb" })).toHaveAttribute("aria-pressed", "true");
  if (testInfo.project.use.isMobile) {
    await page.getByRole("button", { name: "Toggle menu" }).click();
    await page
      .getByRole("navigation", { name: "Main mobile" })
      .getByRole("link", { name: "Find my match" })
      .click();
  } else {
    await page
      .getByRole("navigation", { name: "Main", exact: true })
      .getByRole("link", { name: "Find my match" })
      .click();
  }
  await expect(page).toHaveURL(/\/match$/);
  await expect(page.getByLabel("Height feet")).toBeVisible();
  expect(errors).toEqual([]);
});

test("blank and invalid measurements remove stale matches, valid values persist", async ({
  page,
}) => {
  await page.goto("/match?athlete=lionel-messi");
  await expect(page.getByText("Lionel Messi", { exact: true }).first()).toBeVisible();
  const height = page.getByLabel("Height in centimetres");
  await height.fill("");
  await expect(page.locator("main").getByRole("alert")).toContainText("height");
  await expect(page.getByRole("button", { name: /Surprise me/ })).toHaveCount(0);
  await height.fill("183.5");
  await page.getByLabel("Weight in kilograms").fill("85.2");
  await page.getByRole("button", { name: "Numbers", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await page.reload();
  await expect(height).toHaveValue("183.5");
  await expect(page.getByLabel("Weight in kilograms")).toHaveValue("85.2");
});

test("corrupt profiles and denied storage leave matching usable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("mm.profile", '{"heightCm":"bad","weightKg":null,"gender":"invalid"}');
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage denied", "SecurityError");
    };
  });
  await page.goto("/match");
  await expect(page.getByLabel("Height in centimetres")).toHaveValue("178");
  await page.getByLabel("Height in centimetres").fill("180");
  await page.getByRole("button", { name: "ft/lb" }).click();
  await expect(page.getByLabel("Height feet")).toBeVisible();
  expect(errors).toEqual([]);
});

test("athlete search, filters, sorting and empty-state recovery work", async ({ page }) => {
  await page.goto("/athletes?sport=basketball");
  await expect(page.getByRole("button", { name: "Basketball", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.getByLabel("Search", { exact: true }).fill("Stephen Curry");
  await expect(page.getByRole("heading", { name: "Stephen Curry" })).toBeVisible();
  await page.getByLabel("Search", { exact: true }).fill("no-such-athlete");
  await expect(page.getByText("Nobody on the wall matches")).toBeVisible();
  await page.getByRole("button", { name: "Reset search and filters" }).click();
  await page.getByLabel("Sort by").selectOption("height");
  await expect(page.getByRole("heading", { name: "Victor Wembanyama" })).toBeVisible();
});

test("shared comparisons preserve views and respond to browser history", async ({ page }) => {
  await page.goto("/versus?a=lionel-messi&b=muggsy-bogues&mode=side");
  await expect(page.getByRole("button", { name: "Side by side", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.getByRole("button", { name: "Numbers", exact: true }).click();
  await expect(page).toHaveURL(/mode=table/);
  await expect(page.getByRole("table")).toBeVisible();
  await page.evaluate(() =>
    history.pushState(null, "", "/versus?a=stephen-curry&b=lebron-james&mode=overlay")
  );
  await expect(page.getByText("Stephen Curry", { exact: true }).first()).toBeVisible();
  await page.goBack();
  await expect(page.getByText("Lionel Messi", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
});

test("athletes can be chosen entirely with the keyboard", async ({ page }) => {
  await page.goto("/versus");
  const first = page.getByRole("combobox", { name: "First athlete" });
  await first.fill("Lionel Messi");
  await first.press("ArrowDown");
  await first.press("Enter");
  const second = page.getByRole("combobox", { name: "Second athlete" });
  await second.fill("Muggsy Bogues");
  await second.press("ArrowDown");
  await second.press("Enter");
  await expect(page.getByText(/build similarity/)).toBeVisible();
  await expect(page).toHaveURL(/a=lionel-messi/);
  await expect(page).toHaveURL(/b=muggsy-bogues/);
});

test("public routes fit the viewport and unavailable accounts explain their state", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/match",
    "/versus?a=victor-wembanyama&b=peter-crouch",
    "/athletes",
    "/privacy",
    "/saved",
    "/login",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      ),
      path
    ).toBe(true);
  }
  if (process.env.MORPHMATCH_ACCOUNTS_E2E !== "1") {
    await expect(page.getByRole("heading", { name: "Accounts are switched off" })).toBeVisible();
  }
  await page.goto("/does-not-exist");
  await expect(page.getByRole("heading", { name: "Off the ruler" })).toBeVisible();
});

test("deployment responses include security headers and valid metadata endpoints", async ({
  request,
}) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect((await request.get("/robots.txt")).status()).toBe(200);
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /saved");
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  expect((await request.get("/icon.svg")).status()).toBe(200);
  for (const path of ["/apple-icon", "/opengraph-image"]) {
    const image = await request.get(path);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toContain("image/png");
  }
});

test("main pages have no automated WCAG A/AA accessibility violations", async ({ page }) => {
  for (const path of [
    "/",
    "/match",
    "/versus?a=lionel-messi&b=muggsy-bogues",
    "/athletes",
    "/privacy",
    "/saved",
    "/login",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      scan.violations.map(({ id, nodes }) => ({ id, elements: nodes.map(({ target }) => target) })),
      path
    ).toEqual([]);
  }
});
