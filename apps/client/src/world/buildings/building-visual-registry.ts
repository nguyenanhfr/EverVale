import * as THREE from "three";
import type { BuildingVisualIdentity } from "../visual-identity";
import { addHouseSmallVisual } from "./house-small-visual";
import { addTownCenterVisual } from "./town-center-visual";
import { addWorkshopVisual } from "./workshop-visual";
import { addPowerPlantVisual, addWaterPlantVisual } from "./utility-visual";
import { addParkVisual, addSchoolVisual } from "./civic-visual";
import { addGuardPostVisual } from "./safety-visual";
import { applyFamilyDialect } from "./building-family-helpers";

type AuthoredFamilyRenderer = (
  group: THREE.Group,
  width: number,
  depth: number,
  identity?: BuildingVisualIdentity,
) => void;

// Presentation-only dispatch. Gameplay definitions and footprints remain authoritative elsewhere.
const authoredFamilyRenderers: Readonly<Record<string, AuthoredFamilyRenderer>> = {
  town_center: addTownCenterVisual,
  house_small: addHouseSmallVisual,
  workshop: addWorkshopVisual,
  power_plant: addPowerPlantVisual,
  water_plant: addWaterPlantVisual,
  school: addSchoolVisual,
  park: addParkVisual,
  guard_post: addGuardPostVisual,
};

export function renderAuthoredBuildingFamily(
  definitionId: string,
  group: THREE.Group,
  width: number,
  depth: number,
  identity?: BuildingVisualIdentity,
): boolean {
  const renderer = authoredFamilyRenderers[definitionId];
  if (!renderer) return false;
  renderer(group, width, depth, identity);
  applyFamilyDialect(group, identity?.dialect);
  return true;
}
