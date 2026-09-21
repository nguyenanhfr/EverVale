import * as THREE from "three";
import type { BuildingInstance } from "@evervale/domain/world.types";
import type { BuildCatalogEntryDto } from "@evervale/protocol/world";
import type { BuildingVisualIdentity } from "../visual-identity";
import {
  addDoor,
  addFoundation,
  addGabledRoof,
  addWindow,
  box,
  finalizeBuilding,
  material,
  mesh,
} from "./shared-building-visual";

export function createPowerPlantVisual(
  building: BuildingInstance,
  meta: BuildCatalogEntryDto | undefined,
  identity: BuildingVisualIdentity,
): THREE.Group {
  const group = new THREE.Group();
  const width = meta ? meta.footprintCellsX * meta.gridCellMeters : 7;
  const depth = meta ? meta.footprintCellsZ * meta.gridCellMeters : 6;
  const h = 3.8;

  addFoundation(group, width, depth);
  box(
    group,
    width * 0.9,
    h,
    depth * 0.82,
    material(identity.variantName === "generator_annex" ? "brickDark" : "brick"),
    0,
    h / 2 + 0.34,
    0,
  );
  box(group, width * 0.94, 0.28, depth * 0.9, material("metal", 0.72, 0.25), 0, h + 0.45, 0);

  for (const x of [-width * 0.24, width * 0.24]) {
    addWindow(group, x, 1.75, depth * 0.41 + 0.08, identity);
  }

  const stackXs = identity.variantName === "turbine_hall"
    ? [width * 0.28]
    : [-width * 0.24, width * 0.24];

  for (const x of stackXs) {
    const large = identity.variantName === "turbine_hall";
    const stack = mesh(
      new THREE.CylinderGeometry(
        large ? 0.42 : 0.34,
        large ? 0.5 : 0.42,
        large ? 3 : 2.45,
        10,
      ),
      material("metal", 0.68, 0.28),
      x,
      h + (large ? 1.45 : 1.2),
      -depth * 0.18,
    );
    group.add(stack);
    box(
      group,
      0.7,
      0.12,
      0.7,
      material(identity.accentTone, 0.5, 0.3),
      x,
      h + (large ? 2.98 : 2.45),
      -depth * 0.18,
      false,
    );
  }

  const flywheel = mesh(
    new THREE.TorusGeometry(
      identity.variantName === "turbine_hall" ? 0.92 : 0.75,
      0.14,
      8,
      20,
    ),
    material(identity.accentTone, 0.55, 0.28),
    identity.variantName === "generator_annex" ? -width * 0.18 : 0,
    1.45,
    depth * 0.43 + 0.13,
    false,
  );
  group.add(flywheel);

  if (identity.variantName === "generator_annex") {
    box(
      group,
      width * 0.36,
      2,
      depth * 0.48,
      material(identity.secondaryWallTone),
      width * 0.4,
      1,
      -depth * 0.1,
    );
    box(
      group,
      width * 0.42,
      0.14,
      depth * 0.54,
      material(identity.roofTone),
      width * 0.4,
      2.08,
      -depth * 0.1,
    );
    for (let i = 0; i < 3; i += 1) {
      box(
        group,
        0.22,
        0.75,
        0.28,
        material("metal"),
        width * 0.31 + i * 0.23,
        0.38,
        depth * 0.48,
        false,
      );
    }
  }

  return finalizeBuilding(group, building, identity, 6.2);
}

export function createWaterPlantVisual(
  building: BuildingInstance,
  meta: BuildCatalogEntryDto | undefined,
  identity: BuildingVisualIdentity,
): THREE.Group {
  const group = new THREE.Group();
  const width = meta ? meta.footprintCellsX * meta.gridCellMeters : 7;
  const depth = meta ? meta.footprintCellsZ * meta.gridCellMeters : 6;
  const h = 3.15;

  addFoundation(group, width, depth);
  box(group, width * 0.82, h, depth * 0.76, material(identity.wallTone), 0, h / 2 + 0.34, 0);
  addGabledRoof(
    group,
    width * 0.9,
    depth * 0.82,
    h + 0.34,
    identity,
    identity.variantName === "filter_house" ? 1 : 0.8,
  );
  addDoor(group, 0, depth * 0.38 + 0.08, identity);

  if (identity.variantName === "pump_court") {
    for (const x of [-width * 0.28, 0, width * 0.28]) {
      const pipe = mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 1.7, 8),
        material("metal"),
        x,
        0.76,
        depth * 0.47,
        false,
      );
      pipe.rotation.x = Math.PI / 2;
      group.add(pipe);
      const gauge = mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.05, 12),
        material(identity.accentTone),
        x,
        1.48,
        depth * 0.48,
        false,
      );
      gauge.rotation.x = Math.PI / 2;
      group.add(gauge);
    }
    group.add(
      mesh(
        new THREE.CylinderGeometry(0.5, 0.62, 1.1, 10),
        material("water", 0.5, 0.05),
        width * 0.32,
        0.62,
        -depth * 0.46,
        false,
      ),
    );
  } else if (identity.variantName === "filter_house") {
    for (const x of [-width * 0.28, 0, width * 0.28]) {
      const basin = mesh(
        new THREE.CylinderGeometry(0.58, 0.62, 0.28, 14),
        material("stone"),
        x,
        0.16,
        -depth * 0.5,
        false,
      );
      const surface = mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 0.04, 14),
        material("water", 0.25),
        x,
        0.32,
        -depth * 0.5,
        false,
      );
      surface.userData.propWater = true;
      group.add(basin, surface);
    }
    box(
      group,
      width * 0.44,
      1.4,
      depth * 0.34,
      material(identity.secondaryWallTone),
      -width * 0.32,
      0.72,
      0,
    );
  } else {
    for (const x of [-width * 0.3, width * 0.3]) {
      const tank = mesh(
        new THREE.CylinderGeometry(0.72, 0.82, 1.5, 14),
        material("water", 0.42, 0.08),
        x,
        0.92,
        -depth * 0.48,
        false,
      );
      const rim = mesh(
        new THREE.TorusGeometry(0.76, 0.06, 6, 16),
        material("metal", 0.62, 0.22),
        x,
        1.56,
        -depth * 0.48,
        false,
      );
      rim.rotation.x = Math.PI / 2;
      group.add(tank, rim);
    }
  }

  return finalizeBuilding(group, building, identity, 5.1);
}
