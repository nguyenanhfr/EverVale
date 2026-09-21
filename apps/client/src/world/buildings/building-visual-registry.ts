import type { BuildingInstance } from "@evervale/domain/world.types";
import type { BuildCatalogEntryDto } from "@evervale/protocol/world";
import type { BuildingVisualIdentity } from "../visual-identity";
import { createBuildingVisual as createLegacyBuildingVisual } from "../building-visual";
import { createHouseSmallVisual } from "./house-small-visual";
import { createTownCenterVisual } from "./town-center-visual";

export function createBuildingVisualFromRegistry(
  building: BuildingInstance,
  meta: BuildCatalogEntryDto | undefined,
  identity: BuildingVisualIdentity,
) {
  switch (building.definitionId) {
    case "house_small":
      return createHouseSmallVisual(building, meta, identity);
    case "town_center":
      return createTownCenterVisual(building, meta, identity);
    default: {
      const legacy = createLegacyBuildingVisual(building, meta);
      legacy.userData.visualVariant = identity.variantName;
      legacy.userData.visualDialect = identity.dialect.id;
      return legacy;
    }
  }
}
