import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test("M1 visual canon: deterministic 40x40 presentation capture", async ({ page }, testInfo) => {
  test.setTimeout(90_000);

  const pageErrors: string[] = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
    console.log("M1_VISUAL_PAGE_ERROR", error.message);
  });

  // Fixed handle => fixed owner id => fixed world seed and presentation dialect.
  await page.goto("/");
  await page.getByLabel("Builder name").fill("visual-canon-v1");
  await page.getByRole("button", { name: "Enter the Vale" }).click();

  const worldView = page.locator(".world-view");
  await expect(page.locator("canvas")).toBeVisible();
  await expect.poll(async () => Number(await worldView.getAttribute("data-frame-count"))).toBeGreaterThan(5);
  await expect.poll(async () => Number(await worldView.getAttribute("data-disconnected-routes"))).toBe(0);
  await expect.poll(async () => await worldView.getAttribute("data-visual-dialect")).not.toBeNull();

  // Freeze authoritative world time before capture so lighting and actor targets are stable.
  const pause = page.getByRole("button", { name: "Ⅱ", exact: true });
  await pause.click();
  await expect(pause).toHaveClass(/active/);

  // Let the presentation settle after the final authoritative snapshot.
  await page.waitForTimeout(1000);

  const screenshotPath = testInfo.outputPath("visual-canon.png");
  await worldView.screenshot({
    path: screenshotPath,
    animations: "disabled",
  });
  await testInfo.attach("visual-canon", {
    path: screenshotPath,
    contentType: "image/png",
  });

  console.log("M1_VISUAL_CANON", {
    dialect: await worldView.getAttribute("data-visual-dialect"),
    drawCalls: Number(await worldView.getAttribute("data-draw-calls")),
    triangles: Number(await worldView.getAttribute("data-triangles")),
    citizens: Number(await worldView.getAttribute("data-citizens")),
  });

  expect(pageErrors).toEqual([]);
});
