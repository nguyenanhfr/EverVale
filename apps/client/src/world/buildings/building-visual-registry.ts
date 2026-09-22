import * as THREE from "three";
import type { BuildingVisualIdentity } from "../visual-identity";
import { addHouseSmallVisual } from "./house-small-visual";
import { addTownCenterVisual } from "./town-center-visual";

type AuthoredFamilyRenderer = (
  group: THREE.Group,
  width: number,
  depth: number,
  identity?: BuildingVisualIdentity,
) => void;

const authoredFamilyRenderers: Readonly<Record<string, AuthoredFamilyRenderer>> = {
  town_center: addTownCenterVisual,
  house_small: addHouseSmallVisual,
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
  return true;
}
