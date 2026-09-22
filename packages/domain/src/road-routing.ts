import type { RoadSegment } from "./world.types.js";

export interface Point2 {
  x: number;
  z: number;
}

export interface RoadRoute {
  connected: boolean;
  points: Point2[];
  roadDistance: number;
  totalDistance: number;
}

export interface RoadRouteBlocker extends Point2 {
  radius: number;
}

interface BreakPoint extends Point2 {
  t: number;
}

interface Projection extends Point2 {
  segmentIndex: number;
  t: number;
  distance: number;
}

interface Edge {
  to: string;
  weight: number;
}

const EPSILON = 1e-6;
const NODE_PRECISION = 1000;

const distance = (a: Point2, b: Point2): number =>
  Math.hypot(a.x - b.x, a.z - b.z);

const nodeKey = (point: Point2): string =>
  `${Math.round(point.x * NODE_PRECISION)}:${Math.round(point.z * NODE_PRECISION)}`;

const pointAt = (road: RoadSegment, t: number): Point2 => ({
  x: road.from.x + (road.to.x - road.from.x) * t,
  z: road.from.z + (road.to.z - road.from.z) * t,
});

function pointBlocked(
  point: Point2,
  blockers: readonly RoadRouteBlocker[],
): boolean {
  return blockers.some(
    (blocker) =>
      blocker.radius > EPSILON &&
      distance(point, blocker) < blocker.radius - EPSILON,
  );
}

function blockerBreaks(
  road: RoadSegment,
  blocker: RoadRouteBlocker,
): BreakPoint[] {
  if (blocker.radius <= EPSILON) return [];

  const dx = road.to.x - road.from.x;
  const dz = road.to.z - road.from.z;
  const fx = road.from.x - blocker.x;
  const fz = road.from.z - blocker.z;
  const a = dx * dx + dz * dz;
  if (a <= EPSILON) return [];

  const b = 2 * (fx * dx + fz * dz);
  const cc = fx * fx + fz * fz - blocker.radius * blocker.radius;
  const discriminant = b * b - 4 * a * cc;
  if (discriminant < -EPSILON) return [];

  const root = Math.sqrt(Math.max(0, discriminant));
  const candidates = [
    (-b - root) / (2 * a),
    (-b + root) / (2 * a),
  ];

  const result: BreakPoint[] = [];
  for (const t of candidates) {
    if (t < -EPSILON || t > 1 + EPSILON) continue;
    const clamped = Math.max(0, Math.min(1, t));
    const point = pointAt(road, clamped);
    if (
      !result.some(
        (existing) =>
          Math.abs(existing.t - clamped) <= EPSILON ||
          distance(existing, point) <= 0.001,
      )
    ) {
      result.push({ ...point, t: clamped });
    }
  }
  return result;
}

function segmentIntersection(
  a: RoadSegment,
  b: RoadSegment,
): { ta: number; tb: number; point: Point2 } | null {
  const ax = a.from.x;
  const az = a.from.z;
  const arx = a.to.x - a.from.x;
  const arz = a.to.z - a.from.z;

  const bx = b.from.x;
  const bz = b.from.z;
  const brx = b.to.x - b.from.x;
  const brz = b.to.z - b.from.z;

  const cross = arx * brz - arz * brx;
  if (Math.abs(cross) <= EPSILON) return null;

  const qx = bx - ax;
  const qz = bz - az;
  const ta = (qx * brz - qz * brx) / cross;
  const tb = (qx * arz - qz * arx) / cross;

  if (ta < -EPSILON || ta > 1 + EPSILON || tb < -EPSILON || tb > 1 + EPSILON) {
    return null;
  }

  const clampedA = Math.max(0, Math.min(1, ta));
  const clampedB = Math.max(0, Math.min(1, tb));
  return {
    ta: clampedA,
    tb: clampedB,
    point: pointAt(a, clampedA),
  };
}

function projectPointToRoad(
  point: Point2,
  road: RoadSegment,
  segmentIndex: number,
): Projection {
  const vx = road.to.x - road.from.x;
  const vz = road.to.z - road.from.z;
  const length2 = vx * vx + vz * vz;
  const t = length2 <= EPSILON
    ? 0
    : Math.max(
        0,
        Math.min(
          1,
          ((point.x - road.from.x) * vx + (point.z - road.from.z) * vz) / length2,
        ),
      );
  const projected = pointAt(road, t);
  return {
    ...projected,
    segmentIndex,
    t,
    distance: distance(point, projected),
  };
}

function nearestProjection(
  roads: RoadSegment[],
  point: Point2,
  blockers: readonly RoadRouteBlocker[],
): Projection | null {
  let best: Projection | null = null;
  roads.forEach((road, index) => {
    const candidate = projectPointToRoad(point, road, index);
    if (pointBlocked(candidate, blockers)) return;
    if (!best || candidate.distance < best.distance) best = candidate;
  });
  return best;
}

function pushBreak(list: BreakPoint[], point: BreakPoint): void {
  const duplicate = list.some(
    (existing) =>
      Math.abs(existing.t - point.t) <= EPSILON ||
      distance(existing, point) <= 0.001,
  );
  if (!duplicate) list.push(point);
}

function addEdge(
  adjacency: Map<string, Edge[]>,
  from: string,
  to: string,
  weight: number,
): void {
  if (weight <= EPSILON || from === to) return;
  const edges = adjacency.get(from) ?? [];
  if (!edges.some((edge) => edge.to === to)) edges.push({ to, weight });
  adjacency.set(from, edges);
}

function reconstruct(
  previous: Map<string, string>,
  start: string,
  end: string,
): string[] {
  const reversed = [end];
  let current = end;
  while (current !== start) {
    const parent = previous.get(current);
    if (!parent) return [];
    current = parent;
    reversed.push(current);
  }
  return reversed.reverse();
}

function dijkstra(
  adjacency: Map<string, Edge[]>,
  start: string,
  end: string,
): { keys: string[]; distance: number } | null {
  const distances = new Map<string, number>([[start, 0]]);
  const previous = new Map<string, string>();
  const unvisited = new Set(adjacency.keys());
  unvisited.add(start);
  unvisited.add(end);

  while (unvisited.size > 0) {
    let current: string | null = null;
    let currentDistance = Number.POSITIVE_INFINITY;

    for (const key of unvisited) {
      const value = distances.get(key) ?? Number.POSITIVE_INFINITY;
      if (value < currentDistance) {
        current = key;
        currentDistance = value;
      }
    }

    if (!current || !Number.isFinite(currentDistance)) break;
    unvisited.delete(current);
    if (current === end) {
      return {
        keys: reconstruct(previous, start, end),
        distance: currentDistance,
      };
    }

    for (const edge of adjacency.get(current) ?? []) {
      const candidate = currentDistance + edge.weight;
      if (candidate < (distances.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        distances.set(edge.to, candidate);
        previous.set(edge.to, current);
      }
    }
  }

  return null;
}

function dedupePolyline(points: Point2[]): Point2[] {
  const result: Point2[] = [];
  for (const point of points) {
    const last = result.at(-1);
    if (!last || distance(last, point) > 0.001) result.push(point);
  }
  return result;
}

export function routeAlongRoads(
  roads: RoadSegment[],
  origin: Point2,
  destination: Point2,
  blockers: readonly RoadRouteBlocker[] = [],
): RoadRoute {
  if (roads.length === 0) {
    return {
      connected: false,
      points: [origin],
      roadDistance: 0,
      totalDistance: 0,
    };
  }

  const originProjection = nearestProjection(roads, origin, blockers);
  const destinationProjection = nearestProjection(roads, destination, blockers);
  if (!originProjection || !destinationProjection) {
    return {
      connected: false,
      points: [origin],
      roadDistance: 0,
      totalDistance: 0,
    };
  }

  const breaks: BreakPoint[][] = roads.map((road) => [
    { ...road.from, t: 0 },
    { ...road.to, t: 1 },
  ]);

  for (let i = 0; i < roads.length; i += 1) {
    const a = roads[i];
    if (!a) continue;
    for (let j = i + 1; j < roads.length; j += 1) {
      const b = roads[j];
      if (!b) continue;
      const hit = segmentIntersection(a, b);
      if (!hit) continue;
      pushBreak(breaks[i]!, { ...hit.point, t: hit.ta });
      pushBreak(breaks[j]!, { ...hit.point, t: hit.tb });
    }
  }

  roads.forEach((road, roadIndex) => {
    for (const blocker of blockers) {
      for (const point of blockerBreaks(road, blocker)) {
        pushBreak(breaks[roadIndex]!, point);
      }
    }
  });

  pushBreak(breaks[originProjection.segmentIndex]!, {
    x: originProjection.x,
    z: originProjection.z,
    t: originProjection.t,
  });
  pushBreak(breaks[destinationProjection.segmentIndex]!, {
    x: destinationProjection.x,
    z: destinationProjection.z,
    t: destinationProjection.t,
  });

  const adjacency = new Map<string, Edge[]>();
  const positions = new Map<string, Point2>();

  breaks.forEach((list) => {
    list.sort((a, b) => a.t - b.t);
    for (const point of list) {
      positions.set(nodeKey(point), { x: point.x, z: point.z });
    }
    for (let i = 0; i < list.length - 1; i += 1) {
      const a = list[i];
      const b = list[i + 1];
      if (!a || !b) continue;
      const midpoint = {
        x: (a.x + b.x) / 2,
        z: (a.z + b.z) / 2,
      };
      if (pointBlocked(midpoint, blockers)) continue;

      const ak = nodeKey(a);
      const bk = nodeKey(b);
      const weight = distance(a, b);
      addEdge(adjacency, ak, bk, weight);
      addEdge(adjacency, bk, ak, weight);
    }
  });

  const startKey = nodeKey(originProjection);
  const endKey = nodeKey(destinationProjection);
  positions.set(startKey, { x: originProjection.x, z: originProjection.z });
  positions.set(endKey, { x: destinationProjection.x, z: destinationProjection.z });

  const roadPath = dijkstra(adjacency, startKey, endKey);
  if (!roadPath) {
    return {
      connected: false,
      points: [origin],
      roadDistance: 0,
      totalDistance: 0,
    };
  }

  const roadPoints = roadPath.keys.flatMap((key) => {
    const point = positions.get(key);
    return point ? [point] : [];
  });

  const points = dedupePolyline([
    origin,
    { x: originProjection.x, z: originProjection.z },
    ...roadPoints,
    { x: destinationProjection.x, z: destinationProjection.z },
    destination,
  ]);

  return {
    connected: true,
    points,
    roadDistance: roadPath.distance,
    totalDistance:
      originProjection.distance +
      roadPath.distance +
      destinationProjection.distance,
  };
}

export function samplePolyline(points: Point2[], tInput: number): Point2 {
  if (points.length === 0) return { x: 0, z: 0 };
  if (points.length === 1) return points[0]!;

  const t = Math.max(0, Math.min(1, tInput));
  const lengths: number[] = [];
  let total = 0;

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    const length = distance(a, b);
    lengths.push(length);
    total += length;
  }

  if (total <= EPSILON) return points.at(-1)!;

  let target = total * t;
  for (let i = 0; i < lengths.length; i += 1) {
    const length = lengths[i] ?? 0;
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    if (target <= length || i === lengths.length - 1) {
      const local = length <= EPSILON ? 1 : target / length;
      return {
        x: a.x + (b.x - a.x) * local,
        z: a.z + (b.z - a.z) * local,
      };
    }
    target -= length;
  }

  return points.at(-1)!;
}
