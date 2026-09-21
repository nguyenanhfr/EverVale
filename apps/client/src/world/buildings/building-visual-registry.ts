import type { BuildingInstance } from "@evervale/domain/world.types";
import type { BuildCatalogEntryDto } from "@evervale/protocol/world";
import type { BuildingVisualIdentity } from "../visual-identity";
import { createBuildingVisual as createLegacyBuildingVisual } from "../building-visual";
import { createHouseSmallVisual } from "./house-small-visual";
import { createTownCenterVisual } from "./town-center-visual";
import { createWorkshopVisual } from "./workshop-visual";
import { createPowerPlantVisual, createWaterPlantVisual } from "./utility-visual";
import { addBuildingGroundContact } from "./building-contact-visual";

export function createBuildingVisualFromRegistry(
  building: BuildingInstance,
  meta: BuildCatalogEntryDto | undefined,
  identity: BuildingVisualIdentity,
) {
  let visual;
  switch (building.definitionId) {
    case "house_small":
      visual = createHouseSmallVisual(building, meta, identity);
      break;
    case "town_center":
      visual = createTownCenterVisual(building, meta, identity);
      break;
    case "workshop":
      visual = createWorkshopVisual(building, meta, identity);
      break;
    case "power_plant":
      visual = createPowerPlantVisual(building, meta, identity);
      break;
    case "water_plant":
      visual = createWaterPlantVisual(building, meta, identity);
      break;
    default:
      visual = createLegacyBuildingVisual(building, meta);
      visual.userData.visualVariant = identity.variantName;
      visual.userData.visualDialect = identity.dialect.id;
      break;
  }

  addBuildingGroundContact(visual, building, meta, identity);
  return visual;
}
