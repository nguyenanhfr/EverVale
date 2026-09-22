import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("M1.4 stress: 40 citizens stay routed and renderer memory remains bounded", async ({ page }) => {
  test.setTimeout(55_000);

  const pageErrors: string[] = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
    console.log("M1_STRESS_PAGE_ERROR", error.message);
  });

  await page.goto("/?stressCitizens=40");
  await page.getByLabel("Builder name").fill(`stress-${randomUUID().slice(0, 8)}`);
  await page.getByRole("button", { name: "Enter the Vale" }).click();

  const worldView = page.locator(".world-view");
  await expect(page.locator("canvas")).toBeVisible();
  await expect.poll(async () => Number(await worldView.getAttribute("data-citizens"))).toBe(40);
  await expect.poll(async () => Number(await worldView.getAttribute("data-disconnected-routes"))).toBe(0);
  await expect.poll(async () => Number(await worldView.getAttribute("data-citizen-roles"))).toBeGreaterThanOrEqual(4);
  await expect(page.getByTestId("routing-status")).toContainText("40/40");

  // Let shaders/materials settle before taking the baseline.
  await page.waitForTimeout(3000);

  const drawCalls = Number(await worldView.getAttribute("data-draw-calls"));
  const triangles = Number(await worldView.getAttribute("data-triangles"));
  const geometriesStart = Number(await worldView.getAttribute("data-geometries"));
  const texturesStart = Number(await worldView.getAttribute("data-textures"));
  const frameStart = Number(await worldView.getAttribute("data-frame-count"));

  expect(drawCalls).toBeGreaterThan(0);
  expect(drawCalls).toBeLessThanOrEqual(450);
  expect(triangles).toBeGreaterThan(0);
  expect(triangles).toBeLessThanOrEqual(1_500_000);
  expect(geometriesStart).toBeGreaterThan(0);
  expect(texturesStart).toBeGreaterThanOrEqual(0);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("HeapProfiler.collectGarbage");
  const heapStart = await cdp.send("Runtime.getHeapUsage");

  // World polling continues during the soak. A stable scene must not rebuild GPU
  // resources every few seconds just because projected simulation time advances.
  await page.waitForTimeout(12_000);

  const frameEnd = Number(await worldView.getAttribute("data-frame-count"));
  const geometriesEnd = Number(await worldView.getAttribute("data-geometries"));
  const texturesEnd = Number(await worldView.getAttribute("data-textures"));

  await cdp.send("HeapProfiler.collectGarbage");
  const heapEnd = await cdp.send("Runtime.getHeapUsage");

  expect(frameEnd - frameStart).toBeGreaterThan(30);
  expect(geometriesEnd).toBeLessThanOrEqual(geometriesStart + 1);
  expect(texturesEnd).toBeLessThanOrEqual(texturesStart + 1);

  const heapDelta = Math.max(0, heapEnd.usedSize - heapStart.usedSize);
  const heapAllowance = Math.max(8 * 1024 * 1024, heapStart.usedSize * 0.35);
  expect(heapDelta).toBeLessThanOrEqual(heapAllowance);

  const runtime = page.getByTestId("runtime-metrics");
  const fps = Number(await runtime.getAttribute("data-fps"));
  const p95 = Number(await runtime.getAttribute("data-frame-p95"));

  console.log("M1_STRESS_40", {
    drawCalls,
    triangles,
    fps,
    p95,
    geometriesStart,
    geometriesEnd,
    texturesStart,
    texturesEnd,
    heapStart: heapStart.usedSize,
    heapEnd: heapEnd.usedSize,
    heapDelta,
    heapAllowance,
    frames: frameEnd - frameStart,
  });

  expect(pageErrors).toEqual([]);
});
