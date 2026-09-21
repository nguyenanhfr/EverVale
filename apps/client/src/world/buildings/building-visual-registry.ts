import type { BuildingInstance } from "@evervale/domain/world.types";
import type { BuildCatalogEntryDto } from "@evervale/protocol/world";
import type { BuildingVisualIdentity } from "../visual-identity";
import { createBuildingVisual as createLegacyBuildingVisual } from "../building-visual";
import { createHouseSmallVisual } from "./house-small-visual";
import { createTownCenterVisual } from "./town-center-visual";
import { createWorkshopVisual } from "./workshop-visual";
import { createPowerPlantVisual, createWaterPlantVisual } from "./utility-visual";
import { createSchoolVisual, createGuardPostVisual } from "./civic-visual";
import { createParkVisual } from "./park-visual";
import { createRestaurantVisual } from "./commerce-visual";
import { createFarmVisual } from "./rural-visual";
import { createBuildersYardVisual } from "./builders-yard-visual";
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
    case "school":
      visual = createSchoolVisual(building, meta, identity);
      break;
    case "park":
      visual = createParkVisual(building, meta, identity);
      break;
    case "guard_post":
      visual = createGuardPostVisual(building, meta, identity);
      break;
    case "restaurant":
      visual = createRestaurantVisual(building, meta, identity);
      break;
    case "farm":
      visual = createFarmVisual(building, meta, identity);
      break;
    case "builders_yard":
      visual = createBuildersYardVisual(building, meta, identity);
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
