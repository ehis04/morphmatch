import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/(en\.wikipedia|commons\.wikimedia)\.org\//, (route) =>
    route.fulfill({ status: 503, body: "Photos unavailable during this test" })
  );
});

test("imperial drafts reject missing feet and invalid inches, and allow long spans", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/match");
  await page.getByRole("button", { name: "ft/lb" }).click();
  const feet = page.getByLabel("Height feet", { exact: true });
  const inches = page.getByLabel("Height inches", { exact: true });
  await feet.fill("");
  await expect(page.locator("main").getByRole("alert")).toContainText("height");
  await expect(feet).toHaveAttribute("aria-invalid", "true");
  await expect(feet).toHaveAccessibleDescription("Enter your height");
  await expect(page.getByRole("button", { name: /Surprise me/ })).toHaveCount(0);
  await feet.fill("6");
  await inches.fill("12");
  await expect(page.locator("main").getByRole("alert")).toContainText("height");
  await expect(inches).toHaveValue("12");
  await inches.fill("1.5");
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  await expect(feet).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("button", { name: /Surprise me/ })).toBeVisible();
  const spanFeet = page.getByLabel("Wingspan feet", { exact: true });
  const spanInches = page.getByLabel("Wingspan inches", { exact: true });
  await spanFeet.fill("8");
  await spanInches.fill("6");
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  await expect(spanFeet).toHaveValue("8");
  await spanFeet.fill("");
  await spanInches.fill("");
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("measurement errors describe each field and mobile users can jump to matches", async ({
  page,
}, testInfo) => {
  await page.goto("/match");
  const height = page.getByLabel("Height in centimetres");
  const weight = page.getByLabel("Weight in kilograms");
  await height.fill("");
  await weight.fill("20");
  await expect(height).toHaveAccessibleDescription("Enter your height");
  await expect(weight).toHaveAccessibleDescription(/Weight must be at least/);
  await expect(page.locator("main").getByRole("alert")).toContainText("Enter your height");
  await expect(page.locator("main").getByRole("alert")).toContainText("Weight must be at least");
  await height.fill("183");
  await weight.fill("85");
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  if (testInfo.project.use.isMobile || Number(testInfo.project.use.viewport?.width) < 1024) {
    await page.getByRole("link", { name: /View my matches/ }).click();
    await expect(page.locator("#match-results")).toBeFocused();
    await expect(page.getByRole("button", { name: /Surprise me/ })).toBeInViewport();
  } else {
    await expect(page.getByRole("link", { name: /View my matches/ })).toBeHidden();
  }
});

test("reset measurements restores defaults and clears optional span without changing units", async ({
  page,
}) => {
  await page.goto("/match");
  await page.locator("ol").getByRole("button").nth(1).click();
  await page.getByLabel("Height in centimetres").fill("190");
  await page.getByLabel("Weight in kilograms").fill("100");
  await page.getByLabel("Wingspan in centimetres").fill("205");
  await page.getByRole("button", { name: "Female", exact: true }).click();
  await page.getByRole("button", { name: "ft/lb" }).click();
  await page.getByRole("button", { name: "Reset measurements", exact: true }).click();
  await expect(page.getByRole("button", { name: "ft/lb" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Height feet", { exact: true })).toHaveValue("5");
  await expect(page.getByLabel("Height inches", { exact: true })).toHaveValue("10");
  await expect(page.getByLabel("Wingspan feet", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Wingspan inches", { exact: true })).toHaveValue("");
  await expect(page.locator("ol").getByRole("button").first()).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(page.getByRole("button", { name: "Male", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.reload();
  await page.getByRole("button", { name: "cm/kg" }).click();
  await expect(page.getByLabel("Height in centimetres")).toHaveValue("178");
  await expect(page.getByLabel("Weight in kilograms")).toHaveValue("75");
  await expect(page.getByLabel("Wingspan in centimetres")).toHaveValue("");
});

test("matching restores Numbers from the URL and keeps the linked athlete when views change", async ({
  page,
}) => {
  const expectPageFits = async () => {
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      )
    ).toBe(true);
  };
  await page.goto("/match?athlete=lionel-messi&mode=table");
  await expect(page.getByRole("table")).toBeVisible();
  await expectPageFits();
  await expect(page.getByRole("button", { name: "Numbers", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.getByRole("button", { name: "Side by side", exact: true }).click();
  await expect(page).toHaveURL(/athlete=lionel-messi&mode=side$/);
  await expect(page.getByRole("table")).toHaveCount(0);
  await expectPageFits();
  await page.reload();
  await expect(page.getByRole("button", { name: "Side by side", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.evaluate(() =>
    history.pushState(null, "", "/match?athlete=giannis-antetokounmpo&mode=table")
  );
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText("Giannis Antetokounmpo", { exact: true }).first()).toBeVisible();
  await expectPageFits();
  await page.goBack();
  await expect(page.getByRole("button", { name: "Side by side", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(page.getByText("Lionel Messi", { exact: true }).first()).toBeVisible();
});

test("filters exclude pinned and selected athletes and reset unavailable countries", async ({
  page,
}) => {
  await page.goto("/match?athlete=lionel-messi");
  const comparison = page
    .locator("section")
    .filter({ has: page.getByRole("button", { name: /Surprise me/ }) });
  await expect(comparison.getByText("Lionel Messi", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Basketball", exact: true }).click();
  await expect(comparison.getByText("Lionel Messi", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Basketball", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.getByLabel("Country", { exact: true }).selectOption("AR");
  // Argentina exists in basketball but has no swimming athletes in this dataset.
  await page.getByRole("button", { name: "Swimming", exact: true }).click();
  await page.getByRole("button", { name: "Basketball", exact: true }).click();
  await expect(page.getByLabel("Country", { exact: true })).toHaveValue("");
  await expect(page.getByText("No athletes match these filters", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /^Reset \(/ }).click();
  await expect(comparison.getByText("Lionel Messi", { exact: true })).toBeVisible();
  await page.locator("ol").getByRole("button").first().click();
  await page.evaluate(() => history.pushState(null, "", "/match?athlete=stephen-curry"));
  await expect(comparison.getByText("Stephen Curry", { exact: true })).toBeVisible();
  await page.goBack();
  await expect(comparison.getByText("Lionel Messi", { exact: true })).toBeVisible();
});

test("blocked storage reads and writes leave units and measurements usable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    for (const method of ["getItem", "setItem"] as const) {
      Storage.prototype[method] = () => {
        throw new DOMException("Storage denied", "SecurityError");
      };
    }
  });
  await page.goto("/match");
  await expect(page.getByLabel("Height in centimetres")).toHaveValue("178");
  await page.getByLabel("Weight in kilograms").fill("82.5");
  await page.getByRole("button", { name: "ft/lb" }).click();
  await expect(page.getByLabel("Height feet", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Surprise me/ })).toBeVisible();
  expect(errors).toEqual([]);
});
