import type { WorldSpeed, WorldState } from "@evervale/domain/world.types";

export interface BuildCatalogEntryDto {
  id: string;
  name: string;
  category: string;
  techTier: number;
  moneyCost: number;
  varumCost: number;
  buildCycles: number;
  footprintCellsX: number;
  footprintCellsZ: number;
  gridCellMeters: number;
  sizeTitle: string;
  workers: number;
  jobCategory: string | null;
  moneyPerWorker: number;
  powerProduction: number;
  powerUse: number;
  waterProduction: number;
  waterUse: number;
  techProduction: number;
  upkeep: number;
  housingAdd: number;
  educationCoverageAdd: number;
  recreationCoverageAdd: number;
  safetyAdd: number;
}

export interface PropCatalogEntryDto {
  id: string;
  title: string;
  group: string;
  sizeXMeters: number;
  sizeZMeters: number;
  snapMeters: number;
  sizeTitle: string;
  moneyCost: number;
  decorClass: "visual" | "beauty" | "activity_anchor";
  beauty: number;
  activityAnchor: string | null;
}

export interface BlockerCatalogEntryDto {
  id: string;
  moneyCost: number;
  varumCost: number;
  clearCycles: number;
  techTier: number;
}

export interface WorldViewDto {
  world: WorldState;
  buildCatalog: BuildCatalogEntryDto[];
  blockerCatalog: BlockerCatalogEntryDto[];
  propCatalog: PropCatalogEntryDto[];
  serverNow: string;
}

export type WorldCommand =
  | {
      type: "PLACE_BUILDING";
      commandId: string;
      expectedRevision: number;
      payload: { definitionId: string; x: number; z: number; rotationY?: number };
    }
  | {
      type: "PLACE_PROP";
      commandId: string;
      expectedRevision: number;
      payload: { definitionId: string; x: number; z: number; rotationY?: number };
    }
  | {
      type: "MOVE_PROP";
      commandId: string;
      expectedRevision: number;
      payload: { propId: string; x: number; z: number };
    }
  | {
      type: "ROTATE_PROP";
      commandId: string;
      expectedRevision: number;
      payload: { propId: string; rotationY: number };
    }
  | {
      type: "DELETE_PROP";
      commandId: string;
      expectedRevision: number;
      payload: { propId: string };
    }
  | {
      type: "DRAW_ROAD";
      commandId: string;
      expectedRevision: number;
      payload: { fromX: number; fromZ: number; toX: number; toZ: number };
    }
  | {
      type: "SET_SPEED";
      commandId: string;
      expectedRevision: number;
      payload: { speed: WorldSpeed };
    }
  | {
      type: "CLEAR_BLOCKER";
      commandId: string;
      expectedRevision: number;
      payload: { blockerId: string };
    }
  | {
      type: "REPAIR_BUILDING";
      commandId: string;
      expectedRevision: number;
      payload: { buildingId: string };
    }
  | {
      type: "TRIGGER_TEST_WAVE";
      commandId: string;
      expectedRevision: number;
      payload: Record<string, never>;
    };

export interface CommandResultDto {
  accepted: boolean;
  world?: WorldState;
  error?: string;
}
