import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const SERVER = "http://127.0.0.1:2567";
const HANDLE = `e2e-${randomUUID().slice(0, 8)}`;

async function apiWorld(request: Parameters<typeof test>[0] extends never ? never : any, ownerId: string) {
  const response = await request.get(`${SERVER}/api/world`, {
    headers: { "x-evervale-owner": ownerId },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function apiCommand(
  request: any,
  ownerId: string,
  type: string,
  payload: Record<string, unknown>,
) {
  const current = await apiWorld(request, ownerId);
  const response = await request.post(`${SERVER}/api/world/command`, {
    headers: {
      "content-type": "application/json",
      "x-evervale-owner": ownerId,
    },
    data: {
      type,
      commandId: crypto.randomUUID(),
      expectedRevision: current.world.revision,
      payload,
    },
  });
  return response;
}

test("M1 loop: build, Decor, persistence, offline catch-up, combat, repair", async ({ page, request }) => {
  test.setTimeout(180_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
    console.log("M1_PAGE_ERROR", error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") console.log("M1_CONSOLE_ERROR", message.text());
  });

  await page.goto("/");
  await page.getByLabel("Builder name").fill(HANDLE);
  await page.getByRole("button", { name: "Enter the Vale" }).click();

  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByTestId("building-count")).toContainText("7");
  await expect(page.getByTestId("blocker-list")).toBeVisible();

  const worldView = page.locator(".world-view");
  await expect.poll(async () => Number(await worldView.getAttribute("data-frame-count"))).toBeGreaterThan(5);
  const drawCalls = Number(await worldView.getAttribute("data-draw-calls"));
  const triangles = Number(await worldView.getAttribute("data-triangles"));
  const citizens = Number(await worldView.getAttribute("data-citizens"));
  expect(drawCalls).toBeGreaterThan(0);
  expect(drawCalls).toBeLessThanOrEqual(450);
  expect(triangles).toBeGreaterThan(0);
  expect(triangles).toBeLessThanOrEqual(1_500_000);
  expect(citizens).toBeGreaterThan(0);
  expect(citizens).toBeLessThanOrEqual(30);

  const visualDialect = await worldView.getAttribute("data-visual-dialect");
  expect(["hearthstone", "willowbrook", "amberfield", "bluebell"]).toContain(visualDialect);
  await expect.poll(async () => Number(await worldView.getAttribute("data-house-variant-count"))).toBe(3);
  const houseVariants = (await worldView.getAttribute("data-house-variants"))?.split(",").filter(Boolean) ?? [];
  expect(new Set(houseVariants).size).toBe(3);
  await expect.poll(async () => Number(await worldView.getAttribute("data-citizen-role-count"))).toBeGreaterThanOrEqual(3);
  const citizenRoles = (await worldView.getAttribute("data-citizen-roles"))?.split(",").filter(Boolean) ?? [];
  expect(citizenRoles).toContain("school_child");
  expect(citizenRoles).toContain("workshop_worker");
  expect(citizenRoles).toContain("utility_technician");
  const citizenVisualSources =
    (await worldView.getAttribute("data-citizen-visual-sources"))?.split(",").filter(Boolean) ?? [];
  expect(citizenVisualSources).toContain("generated_factory");
  expect(citizenVisualSources).toContain("procedural");

  await expect.poll(async () => Number(await worldView.getAttribute("data-disconnected-routes"))).toBe(0);
  await expect(page.getByTestId("routing-status")).toContainText("12/12");
  console.log("M1_RENDER_METRICS", {
    drawCalls,
    triangles,
    citizens,
    disconnectedRoutes: 0,
    visualDialect,
    houseVariants,
    citizenRoles,
    citizenVisualSources,
  });

  const cottageButton = page.getByRole("button", { name: /Hearth Cottage/i });
  await expect(cottageButton).toContainText("3×2 grid · 6×4m");

  // Grid must appear as soon as build mode is selected.
  await cottageButton.click();
  await expect(page.locator(".world-view")).toHaveAttribute("data-grid-visible", "true");

  // Build ghost must immediately show invalid placement over the occupied civic core.
  const canvasBox = await page.locator("canvas").boundingBox();
  expect(canvasBox).not.toBeNull();
  if (canvasBox) {
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
    await expect(page.locator(".world-view")).toHaveAttribute("data-placement-valid", "false");
    await expect(page.locator(".world-view")).toHaveAttribute("data-placement-size", "3×2 grid · 6×4m");
  }
  await page.getByRole("button", { name: "Select" }).click();

  const ownerId = await page.evaluate(() => localStorage.getItem("evervale.owner"));
  expect(ownerId).toBe(`dev:${HANDLE}`);

  // Decor catalog is a real editor lane with 1m snap.
  await page.getByRole("button", { name: "Decor", exact: true }).click();
  await page.getByRole("button", { name: "street", exact: true }).click();
  const benchButton = page.getByRole("button", { name: /Wooden Bench/i });
  await expect(benchButton).toContainText("2×0.8m");
  await benchButton.click();
  await expect(worldView).toHaveAttribute("data-grid-size", "1");

  const initial = await apiWorld(request, ownerId!);
  expect(initial.world.buildings).toHaveLength(7);
  expect(initial.world.blockers).toHaveLength(2);
  expect(initial.world.props).toHaveLength(0);

  const placedProp = await apiCommand(request, ownerId!, "PLACE_PROP", {
    definitionId: "bench_wood",
    x: 21.4,
    z: 12.6,
    rotationY: 0.8,
  });
  expect(placedProp.ok()).toBeTruthy();
  const placedPropBody = await placedProp.json();
  const bench = placedPropBody.world.props.at(-1);
  expect(bench.position).toEqual({ x: 21, y: 0, z: 13 });
  expect(bench.rotationY).toBeCloseTo(Math.PI / 4, 6);
  await expect(page.getByTestId("prop-count")).toContainText("1");
  await expect.poll(async () => Number(await worldView.getAttribute("data-props"))).toBe(1);
  const decorDrawCalls = Number(await worldView.getAttribute("data-draw-calls"));
  const decorTriangles = Number(await worldView.getAttribute("data-triangles"));
  expect(decorDrawCalls).toBeGreaterThan(0);
  expect(decorDrawCalls).toBeLessThanOrEqual(450);
  expect(decorTriangles).toBeGreaterThan(0);
  expect(decorTriangles).toBeLessThanOrEqual(1_500_000);
  console.log("M1_DECOR_RENDER_METRICS", { decorDrawCalls, decorTriangles });

  const movedProp = await apiCommand(request, ownerId!, "MOVE_PROP", {
    propId: bench.id,
    x: 24.4,
    z: 14.4,
  });
  expect(movedProp.ok()).toBeTruthy();
  expect((await movedProp.json()).world.props.at(-1).position).toEqual({ x: 24, y: 0, z: 14 });

  const rotatedProp = await apiCommand(request, ownerId!, "ROTATE_PROP", {
    propId: bench.id,
    rotationY: Math.PI / 2,
  });
  expect(rotatedProp.ok()).toBeTruthy();
  expect((await rotatedProp.json()).world.props.at(-1).rotationY).toBeCloseTo(Math.PI / 2, 6);

  // Terrain blocker must participate in authoritative placement.
  const blockerPlacement = await apiCommand(request, ownerId!, "PLACE_BUILDING", {
    definitionId: "house_small",
    x: 29,
    z: 11,
  });
  expect(blockerPlacement.status()).toBe(400);
  expect((await blockerPlacement.json()).error).toBe("PLACEMENT_BLOCKED");

  // Clear action is visible in UI and persists as simulation work.
  const clearButton = page.getByTestId("blocker-list").getByRole("button", { name: "Clear" }).first();
  await clearButton.click();
  await expect(page.getByTestId("blocker-list")).toContainText(/s/);

  // Server must reject an isolated building.
  const rejected = await apiCommand(request, ownerId!, "PLACE_BUILDING", {
    definitionId: "house_small",
    x: 42,
    z: 42,
  });
  expect(rejected.status()).toBe(400);
  expect((await rejected.json()).error).toBe("NO_ROAD_ACCESS");

  // Extend the authoritative road graph, then place a house beside it.
  const road = await apiCommand(request, ownerId!, "DRAW_ROAD", {
    fromX: 24,
    fromZ: 2,
    toX: 36,
    toZ: 2,
  });
  expect(road.ok()).toBeTruthy();

  const placed = await apiCommand(request, ownerId!, "PLACE_BUILDING", {
    definitionId: "house_small",
    x: 31.2,
    z: 4.7,
  });
  expect(placed.ok()).toBeTruthy();
  const placedBody = await placed.json();
  const placedHouse = placedBody.world.buildings.at(-1);
  expect(placedHouse.position).toEqual({ x: 32, y: 0, z: 4 });
  expect(placedHouse.constructionState).toBe("BUILDING");
  expect(placedHouse.constructionTotalSeconds).toBe(1200);
  expect(placedHouse.constructionRemainingSeconds).toBeGreaterThan(0);

  await expect(page.getByTestId("building-count")).toContainText("8");
  await expect(page.getByTestId("construction-list")).toContainText(/Hearth Cottage/i);
  await expect(page.getByTestId("construction-list")).toContainText(/footprint/i);
  await expect(page.locator(".world-view")).toHaveAttribute("data-active-construction", "1");
  await expect(page.locator(".world-view")).toHaveAttribute("data-construction-stage", "FOOTPRINT");

  // Browser reload must reconstruct the persisted world.
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByTestId("building-count")).toContainText("8");
  await expect(page.getByTestId("prop-count")).toContainText("1");
  await expect(page.getByTestId("construction-list")).toBeVisible();

  const beforeLogout = await apiWorld(request, ownerId!);
  const simBefore = beforeLogout.world.simulationSeconds as number;

  // No browser polling while logged out. Re-login must catch up elapsed time.
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("button", { name: "Enter the Vale" })).toBeVisible();
  await page.waitForTimeout(1600);
  await page.getByLabel("Builder name").fill(HANDLE);
  await page.getByRole("button", { name: "Enter the Vale" }).click();
  await expect(page.locator("canvas")).toBeVisible();

  const afterLogin = await apiWorld(request, ownerId!);
  expect(afterLogin.world.simulationSeconds).toBeGreaterThan(simBefore + 1);

  // Accelerate only for the runtime proof, then trigger the M1 surprise wave through UI.
  await page.getByRole("button", { name: "4×", exact: true }).click();
  await page.getByRole("button", { name: "Test surprise wave" }).click();
  await expect(page.getByTestId("combat-status")).toBeVisible();
  await expect(page.getByTestId("event-summary")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("event-summary")).toContainText(/repelled|breached/i);

  // Read-side combat resolution is authoritative: repeated reads must observe the
  // same persisted event/revision instead of regenerating a projection-only event.
  const resolvedReadA = await apiWorld(request, ownerId!);
  const resolvedEventA = resolvedReadA.world.events.find(
    (event: { type: string }) => event.type === "COMBAT_RESOLVED",
  );
  expect(resolvedEventA).toBeTruthy();

  const resolvedReadB = await apiWorld(request, ownerId!);
  const resolvedEventB = resolvedReadB.world.events.find(
    (event: { type: string }) => event.type === "COMBAT_RESOLVED",
  );
  expect(resolvedEventB?.id).toBe(resolvedEventA.id);
  expect(resolvedReadB.world.revision).toBe(resolvedReadA.world.revision);

  // The reference M1 wave is intentionally costly enough to exercise aftermath + repair.
  const repairButton = page.getByRole("button", { name: "Repair" }).first();
  await expect(repairButton).toBeVisible();
  await repairButton.click();
  await expect(page.locator(".repair-list")).toContainText(/s$/);

  const persisted = await apiWorld(request, ownerId!);
  expect(persisted.world.events.some((event: { type: string }) => event.type === "COMBAT_RESOLVED")).toBeTruthy();
  expect(
    persisted.world.buildings.some((building: { damageState: string }) => building.damageState === "REPAIRING"),
  ).toBeTruthy();
  expect(pageErrors).toEqual([]);
});
