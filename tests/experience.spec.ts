import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/(en\.wikipedia|commons\.wikimedia)\.org\//, (route) =>
    route.fulfill({ status: 503, body: "Optional photos unavailable" })
  );
});

test("sharing copies a clean link with the current athletes and view", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as Window & { copiedComparison?: string }).copiedComparison = value;
        },
      },
    });
  });
  await page.goto("/versus?a=lionel-messi&b=muggsy-bogues&mode=side&next=%2Fsaved&profile=private");
  await page.getByRole("button", { name: "Numbers", exact: true }).click();
  await page.getByRole("button", { name: "Share comparison", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Comparison link copied." })
  ).toBeVisible();
  expect(
    await page.evaluate(() => (window as Window & { copiedComparison?: string }).copiedComparison)
  ).toBe(new URL("/versus?a=lionel-messi&b=muggsy-bogues&mode=table", page.url()).href);
  await page.getByRole("button", { name: "Side by side", exact: true }).click();
  await expect(
    page.locator("main").getByText("Comparison link copied.", { exact: true })
  ).toHaveCount(0);
});

test("native sharing and cancellation do not fall through to the clipboard", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        const state = window as Window & {
          sharedComparison?: ShareData;
          cancelComparison?: boolean;
        };
        if (state.cancelComparison) throw new DOMException("Cancelled", "AbortError");
        state.sharedComparison = data;
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Native sharing must not copy");
        },
      },
    });
  });
  await page.goto("/versus?a=lionel-messi&b=muggsy-bogues&mode=table");
  await page.getByRole("button", { name: "Share comparison", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Comparison sent to your share target." })
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as Window & { sharedComparison?: ShareData }).sharedComparison?.url
    )
  ).toBe(new URL("/versus?a=lionel-messi&b=muggsy-bogues&mode=table", page.url()).href);
  await page.evaluate(() => {
    (window as Window & { cancelComparison?: boolean }).cancelComparison = true;
  });
  await page.getByRole("button", { name: "Share comparison", exact: true }).click();
  await expect(page.getByLabel("Comparison link", { exact: true })).toHaveCount(0);
  await expect(
    page.locator("main").getByText("Comparison sent to your share target.", { exact: true })
  ).toHaveCount(0);
});

test("blocked sharing offers a focused selectable manual link", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        throw new DOMException("Blocked", "NotAllowedError");
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Clipboard denied");
        },
      },
    });
  });
  await page.goto("/versus?a=lionel-messi&b=muggsy-bogues&mode=side");
  await page.getByRole("button", { name: "Share comparison", exact: true }).click();
  const link = page.getByLabel("Comparison link", { exact: true });
  await expect(link).toHaveValue(
    new URL("/versus?a=lionel-messi&b=muggsy-bogues&mode=side", page.url()).href
  );
  await expect(link).toBeFocused();
  expect(
    await link.evaluate((element: HTMLInputElement) => [
      element.selectionStart,
      element.selectionEnd,
    ])
  ).toEqual([0, (await link.inputValue()).length]);
});

test("phone, tablet and landscape pages fit and mobile navigation dismisses accessibly", async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    for (const path of [
      "/",
      "/match",
      "/versus?a=giannis-antetokounmpo&b=juan-martin-del-potro&mode=table",
      "/athletes",
      "/login",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
        ),
        `${path} at ${viewport.width}px`
      ).toBe(true);
    }
    const menu = page.getByRole("button", { name: "Toggle menu" });
    await menu.click();
    await expect(page.getByRole("navigation", { name: "Main mobile" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toBeFocused();
    await menu.click();
    await page.getByRole("heading", { level: 1 }).click();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
  }
});

test("touch devices use comfortable controls and inputs", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.use.isMobile, "Touches are checked in mobile projects.");
  await page.goto("/match");
  const height = page.getByLabel("Height in centimetres");
  await expect(height).toBeVisible();
  for (const control of [
    height,
    page.getByRole("button", { name: "Toggle menu" }),
    page.getByRole("button", { name: "cm/kg", exact: true }),
  ]) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  expect(
    await height.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))
  ).toBeGreaterThanOrEqual(16);
});
