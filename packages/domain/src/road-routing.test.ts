import assert from "node:assert/strict";
import test from "node:test";
import { routeAlongRoads, samplePolyline } from "./road-routing.js";
import type { RoadSegment } from "./world.types.js";

const road = (
  id: string,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): RoadSegment => ({
  id,
  type: "DIRT",
  from: { x: ax, y: 0, z: az },
  to: { x: bx, y: 0, z: bz },
});

test("crossing road segments become a real graph junction", () => {
  const roads = [
    road("h", -20, 2, 20, 2),
    road("v", 0, -20, 0, 20),
  ];

  const route = routeAlongRoads(
    roads,
    { x: -12, z: -2 },
    { x: 4, z: 14 },
  );

  assert.equal(route.connected, true);
  assert.ok(route.points.some((p) => Math.abs(p.x) < 0.001 && Math.abs(p.z - 2) < 0.001));
  assert.ok(route.roadDistance > 0);
});

test("shortest route follows connected L shape instead of direct diagonal", () => {
  const roads = [
    road("a", 0, 0, 20, 0),
    road("b", 20, 0, 20, 20),
  ];

  const route = routeAlongRoads(
    roads,
    { x: 2, z: 2 },
    { x: 18, z: 18 },
  );

  assert.equal(route.connected, true);
  assert.ok(route.points.some((p) => Math.abs(p.x - 20) < 0.001 && Math.abs(p.z) < 0.001));
  assert.ok(route.totalDistance > Math.hypot(16, 16));
});

test("disconnected road islands do not invent a route", () => {
  const roads = [
    road("left", -20, 0, -10, 0),
    road("right", 10, 0, 20, 0),
  ];

  const route = routeAlongRoads(
    roads,
    { x: -18, z: 2 },
    { x: 18, z: 2 },
  );

  assert.equal(route.connected, false);
  assert.deepEqual(route.points, [{ x: -18, z: 2 }]);
});

test("same road projection routes between arbitrary access points", () => {
  const roads = [road("main", -20, 0, 20, 0)];

  const route = routeAlongRoads(
    roads,
    { x: -7, z: 4 },
    { x: 11, z: -3 },
  );

  assert.equal(route.connected, true);
  assert.ok(route.points.some((p) => Math.abs(p.x + 7) < 0.001 && Math.abs(p.z) < 0.001));
  assert.ok(route.points.some((p) => Math.abs(p.x - 11) < 0.001 && Math.abs(p.z) < 0.001));
});

test("polyline sampling advances by distance rather than point count", () => {
  const points = [
    { x: 0, z: 0 },
    { x: 10, z: 0 },
    { x: 10, z: 30 },
  ];

  assert.deepEqual(samplePolyline(points, 0), { x: 0, z: 0 });
  assert.deepEqual(samplePolyline(points, 0.25), { x: 10, z: 0 });
  assert.deepEqual(samplePolyline(points, 0.5), { x: 10, z: 10 });
  assert.deepEqual(samplePolyline(points, 1), { x: 10, z: 30 });
});


test("blocker circle disconnects a single road across its occupied interval", () => {
  const roads = [road("main", -10, 0, 10, 0)];

  const route = routeAlongRoads(
    roads,
    { x: -8, z: 2 },
    { x: 8, z: 2 },
    [{ x: 0, z: 0, radius: 2 }],
  );

  assert.equal(route.connected, false);
  assert.deepEqual(route.points, [{ x: -8, z: 2 }]);
});

test("blocked road interval reroutes through an available road detour", () => {
  const roads = [
    road("bottom", -10, 0, 10, 0),
    road("top", -10, 10, 10, 10),
    road("left", -10, 0, -10, 10),
    road("right", 10, 0, 10, 10),
  ];

  const route = routeAlongRoads(
    roads,
    { x: -8, z: -2 },
    { x: 8, z: -2 },
    [{ x: 0, z: 0, radius: 2 }],
  );

  assert.equal(route.connected, true);
  assert.ok(route.points.some((p) => Math.abs(p.z - 10) < 0.001));
  assert.ok(route.roadDistance > 16);
});

test("blocker away from roads does not affect shortest route", () => {
  const roads = [road("main", -10, 0, 10, 0)];

  const open = routeAlongRoads(
    roads,
    { x: -8, z: 2 },
    { x: 8, z: 2 },
  );
  const blockedElsewhere = routeAlongRoads(
    roads,
    { x: -8, z: 2 },
    { x: 8, z: 2 },
    [{ x: 0, z: 8, radius: 2 }],
  );

  assert.deepEqual(blockedElsewhere, open);
});

test("removing blocker reconnects the same authoritative road graph", () => {
  const roads = [road("main", -10, 0, 10, 0)];
  const blocked = routeAlongRoads(
    roads,
    { x: -8, z: 2 },
    { x: 8, z: 2 },
    [{ x: 0, z: 0, radius: 2 }],
  );
  const cleared = routeAlongRoads(
    roads,
    { x: -8, z: 2 },
    { x: 8, z: 2 },
    [],
  );

  assert.equal(blocked.connected, false);
  assert.equal(cleared.connected, true);
});
