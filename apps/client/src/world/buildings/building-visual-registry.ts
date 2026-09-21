import type { BuildingInstance } from "@evervale/domain/world.types";
import type { BuildCatalogEntryDto } from "@evervale/protocol/world";
import type { BuildingVisualIdentity } from "../visual-identity";
import { createBuildingVisual as createLegacyBuildingVisual } from "../building-visual";
import { createHouseSmallVisual } from "./house-small-visual";
import { createTownCenterVisual } from "./town-center-visual";
import { createWorkshopVisual } from "./workshop-visual";
import { createPowerPlantVisual, createWaterPlantVisual } from "./utility-visual";

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
    case "workshop":
      return createWorkshopVisual(building, meta, identity);
    case "power_plant":
      return createPowerPlantVisual(building, meta, identity);
    case "water_plant":
      return createWaterPlantVisual(building, meta, identity);
    default: {
      const legacy = createLegacyBuildingVisual(building, meta);
      legacy.userData.visualVariant = identity.variantName;
      legacy.userData.visualDialect = identity.dialect.id;
      return legacy;
    }
  }
}
