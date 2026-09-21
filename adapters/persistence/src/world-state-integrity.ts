import { createHash } from "node:crypto";
import type { AcceptedCommandReceipt } from "@evervale/application/ports";
import type {
  BlockerInstance,
  BuildingInstance,
  CombatActor,
  CombatState,
  PropInstance,
  RoadSegment,
  WorldEvent,
  WorldState,
} from "@evervale/domain/world.types";

export const WORLD_SCHEMA_VERSION = 1;
const WORLD_FILE_FORMAT = "evervale-world";

interface WorldEnvelope {
  format: typeof WORLD_FILE_FORMAT;
  schemaVersion: number;
  checksum: string;
  world: unknown;
}

function fail(code: string): never {
  throw new Error(code);
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return fail("WORLD_STATE_CORRUPT");
  }
  return value as Record<string, unknown>;
}

function requiredString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  if (typeof value !== "string" || value.length === 0 || value.length > 512) {
    return fail("WORLD_STATE_CORRUPT");
  }
  return value;
}

function finiteNumber(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fail("WORLD_STATE_CORRUPT");
  }
  return value;
}

function nonNegativeNumber(source: Record<string, unknown>, key: string): number {
  const value = finiteNumber(source, key);
  if (value < 0) return fail("WORLD_STATE_CORRUPT");
  return value;
}

function nonNegativeInteger(source: Record<string, unknown>, key: string): number {
  const value = nonNegativeNumber(source, key);
  if (!Number.isSafeInteger(value)) return fail("WORLD_STATE_CORRUPT");
  return value;
}

function validDate(source: Record<string, unknown>, key: string): string {
  const value = requiredString(source, key);
  if (!Number.isFinite(Date.parse(value))) return fail("WORLD_STATE_CORRUPT");
  return value;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) return fail("WORLD_STATE_CORRUPT");
  return value;
}

function uniqueIds(items: readonly { id: string }[]): void {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) fail("WORLD_STATE_CORRUPT");
    ids.add(item.id);
  }
}

function vec3(value: unknown): { x: number; y: number; z: number } {
  const source = record(value);
  return {
    x: finiteNumber(source, "x"),
    y: finiteNumber(source, "y"),
    z: finiteNumber(source, "z"),
  };
}

function building(value: unknown): BuildingInstance {
  const source = record(value);
  const constructionState = requiredString(source, "constructionState");
  if (constructionState !== "COMPLETE" && constructionState !== "BUILDING") {
    return fail("WORLD_STATE_CORRUPT");
  }
  const damageState = requiredString(source, "damageState");
  if (
    damageState !== "HEALTHY" &&
    damageState !== "DAMAGED" &&
    damageState !== "DISABLED" &&
    damageState !== "REPAIRING"
  ) {
    return fail("WORLD_STATE_CORRUPT");
  }

  const condition = finiteNumber(source, "condition");
  if (condition < 0 || condition > 100) return fail("WORLD_STATE_CORRUPT");

  return {
    id: requiredString(source, "id"),
    definitionId: requiredString(source, "definitionId"),
    position: vec3(source.position),
    rotationY: finiteNumber(source, "rotationY"),
    constructionState,
    constructionRemainingSeconds: nonNegativeNumber(source, "constructionRemainingSeconds"),
    constructionTotalSeconds: nonNegativeNumber(source, "constructionTotalSeconds"),
    workersAssigned: nonNegativeInteger(source, "workersAssigned"),
    priority: finiteNumber(source, "priority"),
    condition,
    damageState,
    repairRemainingSeconds: nonNegativeNumber(source, "repairRemainingSeconds"),
  };
}

function road(value: unknown): RoadSegment {
  const source = record(value);
  if (source.type !== "DIRT") return fail("WORLD_STATE_CORRUPT");
  return {
    id: requiredString(source, "id"),
    type: "DIRT",
    from: vec3(source.from),
    to: vec3(source.to),
  };
}

function blocker(value: unknown): BlockerInstance {
  const source = record(value);
  const state = requiredString(source, "state");
  if (state !== "BLOCKING" && state !== "CLEARING") return fail("WORLD_STATE_CORRUPT");
  return {
    id: requiredString(source, "id"),
    definitionId: requiredString(source, "definitionId"),
    position: vec3(source.position),
    state,
    clearRemainingSeconds: nonNegativeNumber(source, "clearRemainingSeconds"),
  };
}

function prop(value: unknown): PropInstance {
  const source = record(value);
  return {
    id: requiredString(source, "id"),
    definitionId: requiredString(source, "definitionId"),
    position: vec3(source.position),
    rotationY: finiteNumber(source, "rotationY"),
  };
}

function combatActor(value: unknown): CombatActor {
  const source = record(value);
  const side = requiredString(source, "side");
  if (side !== "DEFENDER" && side !== "ENEMY") return fail("WORLD_STATE_CORRUPT");
  const maxHp = nonNegativeNumber(source, "maxHp");
  const hp = nonNegativeNumber(source, "hp");
  if (maxHp <= 0 || hp > maxHp) return fail("WORLD_STATE_CORRUPT");
  return {
    id: requiredString(source, "id"),
    definitionId: requiredString(source, "definitionId"),
    side,
    hp,
    maxHp,
    position: vec3(source.position),
  };
}

function combat(value: unknown): CombatState | null {
  if (value === null) return null;
  const source = record(value);
  const status = requiredString(source, "status");
  if (status !== "WARNING" && status !== "ACTIVE" && status !== "RESOLVED") {
    return fail("WORLD_STATE_CORRUPT");
  }

  const actors = array(source.actors).map(combatActor);
  uniqueIds(actors);

  const outcomeRaw = source.outcome;
  let outcome: "CLEAN" | "COSTLY" | "BREACH" | undefined;
  if (outcomeRaw !== undefined) {
    if (outcomeRaw !== "CLEAN" && outcomeRaw !== "COSTLY" && outcomeRaw !== "BREACH") {
      return fail("WORLD_STATE_CORRUPT");
    }
    outcome = outcomeRaw;
  }
  if (status === "RESOLVED" && outcome === undefined) return fail("WORLD_STATE_CORRUPT");
  if (status !== "RESOLVED" && outcome !== undefined) return fail("WORLD_STATE_CORRUPT");

  const summaryRaw = source.summary;
  if (summaryRaw !== undefined && typeof summaryRaw !== "string") {
    return fail("WORLD_STATE_CORRUPT");
  }

  return {
    id: requiredString(source, "id"),
    status,
    warningRemainingSeconds: nonNegativeNumber(source, "warningRemainingSeconds"),
    elapsedSeconds: nonNegativeNumber(source, "elapsedSeconds"),
    actors,
    ...(outcome !== undefined ? { outcome } : {}),
    ...(typeof summaryRaw === "string" ? { summary: summaryRaw } : {}),
  };
}

function event(value: unknown): WorldEvent {
  const source = record(value);
  return {
    id: requiredString(source, "id"),
    type: requiredString(source, "type"),
    happenedAt: validDate(source, "happenedAt"),
    severity: nonNegativeInteger(source, "severity"),
    summary: requiredString(source, "summary"),
  };
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const source = value as Record<string, unknown>;
  return `{${Object.keys(source)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(source[key])}`)
    .join(",")}}`;
}

export function worldChecksum(world: WorldState): string {
  const digest = createHash("sha256").update(stableJson(world)).digest("hex");
  return `sha256:${digest}`;
}

export function validateWorldState(value: unknown): WorldState {
  const source = record(value);
  const lifecycle = requiredString(source, "lifecycle");
  if (lifecycle !== "ACTIVE" && lifecycle !== "WARM" && lifecycle !== "COLD") {
    return fail("WORLD_STATE_CORRUPT");
  }

  const speed = finiteNumber(source, "speed");
  if (speed !== 0 && speed !== 1 && speed !== 2 && speed !== 4) {
    return fail("WORLD_STATE_CORRUPT");
  }

  const resourcesSource = record(source.resources);
  const resources = {
    money: nonNegativeNumber(resourcesSource, "money"),
    moneyCap: nonNegativeNumber(resourcesSource, "moneyCap"),
    power: nonNegativeNumber(resourcesSource, "power"),
    powerCap: nonNegativeNumber(resourcesSource, "powerCap"),
    water: nonNegativeNumber(resourcesSource, "water"),
    waterCap: nonNegativeNumber(resourcesSource, "waterCap"),
    varum: nonNegativeNumber(resourcesSource, "varum"),
    varumCap: nonNegativeNumber(resourcesSource, "varumCap"),
    techPoints: nonNegativeNumber(resourcesSource, "techPoints"),
    techTier: nonNegativeInteger(resourcesSource, "techTier"),
  };
  if (
    resources.money > resources.moneyCap ||
    resources.power > resources.powerCap ||
    resources.water > resources.waterCap ||
    resources.varum > resources.varumCap
  ) {
    return fail("WORLD_STATE_CORRUPT");
  }

  const societySource = record(source.society);
  const happiness = finiteNumber(societySource, "happiness");
  const safety = finiteNumber(societySource, "safety");
  const beauty = finiteNumber(societySource, "beauty");
  if (happiness < 0 || happiness > 100 || safety < 0 || safety > 1 || beauty < 0) {
    return fail("WORLD_STATE_CORRUPT");
  }
  const society = {
    population: nonNegativeInteger(societySource, "population"),
    housingCapacity: nonNegativeInteger(societySource, "housingCapacity"),
    happiness,
    growthProgress: nonNegativeNumber(societySource, "growthProgress"),
    workforce: nonNegativeInteger(societySource, "workforce"),
    assignedWorkers: nonNegativeInteger(societySource, "assignedWorkers"),
    educationCoverage: nonNegativeNumber(societySource, "educationCoverage"),
    recreationCoverage: nonNegativeNumber(societySource, "recreationCoverage"),
    safety,
    beauty,
  };
  if (society.population > society.housingCapacity || society.assignedWorkers > society.workforce) {
    return fail("WORLD_STATE_CORRUPT");
  }

  const buildings = array(source.buildings).map(building);
  const roads = array(source.roads).map(road);
  const blockers = array(source.blockers).map(blocker);
  const props = array(source.props).map(prop);
  const events = array(source.events).map(event);
  uniqueIds(buildings);
  uniqueIds(roads);
  uniqueIds(blockers);
  uniqueIds(props);
  uniqueIds(events);

  return {
    worldId: requiredString(source, "worldId"),
    ownerId: requiredString(source, "ownerId"),
    seed: finiteNumber(source, "seed"),
    revision: nonNegativeInteger(source, "revision"),
    lifecycle,
    speed,
    simulationSeconds: nonNegativeNumber(source, "simulationSeconds"),
    lastSimulatedAt: validDate(source, "lastSimulatedAt"),
    resources,
    society,
    buildings,
    roads,
    blockers,
    props,
    combat: combat(source.combat),
    events,
  };
}

export function encodeWorldEnvelope(world: WorldState): string {
  const validated = validateWorldState(world);
  const envelope: WorldEnvelope = {
    format: WORLD_FILE_FORMAT,
    schemaVersion: WORLD_SCHEMA_VERSION,
    checksum: worldChecksum(validated),
    world: validated,
  };
  return JSON.stringify(envelope, null, 2);
}

export function decodeWorldDocument(raw: string): {
  world: WorldState;
  legacy: boolean;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return fail("WORLD_STATE_CORRUPT");
  }

  if (
    parsed !== null &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    (parsed as Record<string, unknown>).format === WORLD_FILE_FORMAT
  ) {
    const envelope = record(parsed);
    const schemaVersion = envelope.schemaVersion;
    if (schemaVersion !== WORLD_SCHEMA_VERSION) {
      return fail("WORLD_SCHEMA_UNSUPPORTED");
    }
    if (typeof envelope.checksum !== "string") return fail("WORLD_STATE_CORRUPT");
    const world = validateWorldState(envelope.world);
    if (envelope.checksum !== worldChecksum(world)) {
      return fail("WORLD_STATE_CHECKSUM_MISMATCH");
    }
    return { world, legacy: false };
  }

  return {
    world: validateWorldState(parsed),
    legacy: true,
  };
}

export function validateSchemaVersion(value: unknown): void {
  if (value !== WORLD_SCHEMA_VERSION) fail("WORLD_SCHEMA_UNSUPPORTED");
}


export function validateAcceptedCommandReceipt(value: unknown): AcceptedCommandReceipt {
  const source = record(value);
  const world = validateWorldState(source.world);
  const commandId = requiredString(source, "commandId");
  const worldId = requiredString(source, "worldId");
  const ownerId = requiredString(source, "ownerId");
  const expectedRevision = nonNegativeInteger(source, "expectedRevision");
  const commandType = requiredString(source, "commandType");
  const fingerprint = requiredString(source, "fingerprint");

  if (world.worldId !== worldId || world.ownerId !== ownerId) {
    return fail("WORLD_COMMAND_RECEIPT_CORRUPT");
  }
  if (world.revision < expectedRevision + 1) {
    return fail("WORLD_COMMAND_RECEIPT_CORRUPT");
  }

  return {
    commandId,
    worldId,
    ownerId,
    expectedRevision,
    commandType,
    fingerprint,
    world,
  };
}
