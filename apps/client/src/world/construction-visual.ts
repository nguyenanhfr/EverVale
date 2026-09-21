import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { BuildingInstance } from "@evervale/domain/world.types";
import type { BuildCatalogEntryDto } from "@evervale/protocol/world";

export type ConstructionVisualStage =
  | "FOOTPRINT"
  | "FOUNDATION"
  | "FRAME"
  | "SHELL"
  | "FINISHING";

export interface ConstructionVisualState {
  progress: number;
  stage: ConstructionVisualStage;
  stageIndex: number;
}

const materials = {
  soil: new THREE.MeshStandardMaterial({ color: 0x6f5b45, roughness: 1 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0xa5a092, roughness: 0.96 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x856446, roughness: 0.94 }),
  timberDark: new THREE.MeshStandardMaterial({ color: 0x604a37, roughness: 0.98 }),
  scaffold: new THREE.MeshStandardMaterial({ color: 0x686f6a, roughness: 0.72, metalness: 0.2 }),
  shell: new THREE.MeshStandardMaterial({
    color: 0xc9bfa6,
    roughness: 0.9,
    transparent: true,
    opacity: 0.78,
  }),
  tarp: new THREE.MeshStandardMaterial({ color: 0xa77845, roughness: 0.9 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd2ab61, roughness: 0.65 }),
  cloth: new THREE.MeshStandardMaterial({ color: 0xb87952, roughness: 0.95 }),
  worker: new THREE.MeshStandardMaterial({ color: 0x6f7e67, roughness: 0.92 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xc89a77, roughness: 0.95 }),
};

Object.values(materials).forEach((material) => {
  material.userData.sharedMaterial = true;
});

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const value = new THREE.Mesh(geometry, material);
  value.position.set(x, y, z);
  value.castShadow = true;
  value.receiveShadow = true;
  return value;
}

export function constructionVisualState(
  building: BuildingInstance,
): ConstructionVisualState {
  const total = Math.max(0, building.constructionTotalSeconds);
  const progress =
    building.constructionState === "COMPLETE"
      ? 1
      : total <= 0
        ? 0
        : Math.max(
            0,
            Math.min(1, 1 - building.constructionRemainingSeconds / total),
          );

  if (progress < 0.12) return { progress, stage: "FOOTPRINT", stageIndex: 0 };
  if (progress < 0.32) return { progress, stage: "FOUNDATION", stageIndex: 1 };
  if (progress < 0.62) return { progress, stage: "FRAME", stageIndex: 2 };
  if (progress < 0.88) return { progress, stage: "SHELL", stageIndex: 3 };
  return { progress, stage: "FINISHING", stageIndex: 4 };
}

function addCornerStakes(group: THREE.Group, width: number, depth: number): void {
  for (const x of [-width / 2 + 0.25, width / 2 - 0.25]) {
    for (const z of [-depth / 2 + 0.25, depth / 2 - 0.25]) {
      group.add(
        mesh(
          new THREE.BoxGeometry(0.12, 0.7, 0.12),
          materials.wood,
          x,
          0.35,
          z,
        ),
      );
    }
  }
}

function addFrame(group: THREE.Group, width: number, depth: number, height: number): void {
  const inset = 0.28;
  for (const x of [-width / 2 + inset, width / 2 - inset]) {
    for (const z of [-depth / 2 + inset, depth / 2 - inset]) {
      group.add(
        mesh(
          new THREE.BoxGeometry(0.18, height, 0.18),
          materials.timberDark,
          x,
          height / 2,
          z,
        ),
      );
    }
  }

  const beamY = height - 0.15;
  for (const z of [-depth / 2 + inset, depth / 2 - inset]) {
    group.add(
      mesh(
        new THREE.BoxGeometry(width - inset * 2, 0.18, 0.18),
        materials.wood,
        0,
        beamY,
        z,
      ),
    );
  }
  for (const x of [-width / 2 + inset, width / 2 - inset]) {
    group.add(
      mesh(
        new THREE.BoxGeometry(0.18, 0.18, depth - inset * 2),
        materials.wood,
        x,
        beamY,
        0,
      ),
    );
  }
}

function addScaffold(group: THREE.Group, width: number, depth: number, height: number): void {
  const outerX = width / 2 + 0.45;
  const outerZ = depth / 2 + 0.45;
  for (const x of [-outerX, outerX]) {
    for (const z of [-outerZ, outerZ]) {
      group.add(
        mesh(
          new THREE.CylinderGeometry(0.035, 0.035, height + 0.6, 5),
          materials.scaffold,
          x,
          (height + 0.6) / 2,
          z,
        ),
      );
    }
  }

  for (const y of [0.8, Math.max(1.2, height * 0.55), height]) {
    for (const z of [-outerZ, outerZ]) {
      group.add(
        mesh(
          new THREE.BoxGeometry(width + 0.9, 0.06, 0.08),
          materials.scaffold,
          0,
          y,
          z,
        ),
      );
    }
    for (const x of [-outerX, outerX]) {
      group.add(
        mesh(
          new THREE.BoxGeometry(0.08, 0.06, depth + 0.9),
          materials.scaffold,
          x,
          y,
          0,
        ),
      );
    }
  }
}

function addMaterialStacks(group: THREE.Group, width: number, depth: number): void {
  const x = Math.max(1, width / 2 + 0.9);
  const z = -Math.max(1, depth / 2 - 0.4);

  for (let i = 0; i < 3; i += 1) {
    const crate = mesh(
      new THREE.BoxGeometry(0.55, 0.42, 0.55),
      i % 2 === 0 ? materials.wood : materials.tarp,
      x + (i % 2) * 0.58,
      0.22 + Math.floor(i / 2) * 0.43,
      z,
    );
    crate.castShadow = true;
    group.add(crate);
  }

  const boards = mesh(
    new THREE.BoxGeometry(1.7, 0.18, 0.55),
    materials.wood,
    -x,
    0.18,
    z,
  );
  boards.rotation.y = 0.12;
  group.add(boards);
}

function addConstructionDetails(
  group: THREE.Group,
  width: number,
  depth: number,
  height: number,
  stageIndex: number,
): void {
  const frontZ = depth / 2 + 0.7;

  if (stageIndex >= 1) {
    for (let i = 0; i < 5; i += 1) {
      const brick = mesh(
        new THREE.BoxGeometry(0.42,0.22,0.28),
        i % 2 === 0 ? materials.concrete : materials.tarp,
        -width*0.25 + (i%3)*0.46,
        0.12 + Math.floor(i/3)*0.23,
        frontZ,
      );
      brick.castShadow = false;
      group.add(brick);
    }
  }

  if (stageIndex >= 2) {
    const ladderX = width/2 + 0.72;
    for(const x of [ladderX-0.18,ladderX+0.18]) {
      const rail=mesh(new THREE.BoxGeometry(0.07,height*0.78,0.07),materials.wood,x,height*0.4,frontZ-0.3);
      rail.rotation.z=-0.09;
      group.add(rail);
    }
    for(let i=0;i<5;i+=1) {
      const rung=mesh(new THREE.BoxGeometry(0.44,0.055,0.07),materials.wood,ladderX,0.55+i*0.46,frontZ-0.3);
      rung.rotation.z=-0.09;
      group.add(rung);
    }

    for(const side of [-1,1] as const) {
      const brace=mesh(
        new THREE.BoxGeometry(0.09,height*0.68,0.09),
        materials.timberDark,
        side*(width/2+0.43),
        height*0.5,
        -depth/2-0.43,
      );
      brace.rotation.z=side*0.48;
      group.add(brace);
    }
  }

  if (stageIndex >= 3) {
    const tray=mesh(new THREE.BoxGeometry(1.0,0.18,0.56),materials.scaffold,-width/2-0.9,0.62,frontZ-0.55);
    tray.rotation.z=-0.08;
    group.add(tray);
    const wheel=mesh(new THREE.TorusGeometry(0.22,0.055,6,12),materials.scaffold,-width/2-0.52,0.38,frontZ-0.55);
    wheel.rotation.y=Math.PI/2;
    group.add(wheel);
    for(const z of [-0.18,0.18]) {
      const handle=mesh(new THREE.CylinderGeometry(0.025,0.025,0.9,5),materials.wood,-width/2-1.2,0.65,frontZ-0.55+z);
      handle.rotation.z=Math.PI/2.7;
      group.add(handle);
    }
  }

  if (stageIndex >= 4) {
    const tarp=mesh(new THREE.PlaneGeometry(Math.min(2.4,width*0.38),1.35),materials.cloth,width/2+0.47,height*0.55,0);
    tarp.rotation.y=-Math.PI/2;
    tarp.rotation.z=0.06;
    tarp.castShadow=false;
    group.add(tarp);
  }
}

function compactConstruction(group: THREE.Group): void {
  const buckets = new Map<string, {material: THREE.Material; geometries: THREE.BufferGeometry[]; castShadow: boolean; receiveShadow: boolean}>();

  for(const child of [...group.children]) {
    const source=child as THREE.Mesh;
    if(!source.isMesh) continue;
    source.updateMatrix();
    const geometry=source.geometry.index ? source.geometry.toNonIndexed() : source.geometry.clone();
    geometry.applyMatrix4(source.matrix);
    const material=Array.isArray(source.material) ? source.material[0]! : source.material;
    const key=`${material.uuid}:${source.castShadow ? 1 : 0}:${source.receiveShadow ? 1 : 0}`;
    let bucket=buckets.get(key);
    if(!bucket) {
      bucket={material,geometries:[],castShadow:source.castShadow,receiveShadow:source.receiveShadow};
      buckets.set(key,bucket);
    }
    bucket.geometries.push(geometry);
    source.geometry.dispose();
  }

  group.clear();
  for(const bucket of buckets.values()) {
    const geometry=bucket.geometries.length===1 ? bucket.geometries[0]! : mergeGeometries(bucket.geometries,false);
    if(!geometry) {
      bucket.geometries.forEach((item)=>item.dispose());
      continue;
    }
    if(bucket.geometries.length>1) bucket.geometries.forEach((item)=>item.dispose());
    const combined=new THREE.Mesh(geometry,bucket.material);
    combined.castShadow=bucket.castShadow;
    combined.receiveShadow=bucket.receiveShadow;
    group.add(combined);
  }
}

function addProgressFlag(group: THREE.Group, width: number, progress: number): void {
  const poleX = -width / 2 - 0.65;
  group.add(
    mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 1.8, 6),
      materials.scaffold,
      poleX,
      0.9,
      0,
    ),
  );
  const flag = mesh(
    new THREE.PlaneGeometry(0.9, 0.45),
    progress > 0.87 ? materials.gold : materials.cloth,
    poleX + 0.46,
    1.55,
    0,
  );
  flag.rotation.y = Math.PI / 2;
  group.add(flag);
}

export function createConstructionObject(
  building: BuildingInstance,
  meta: BuildCatalogEntryDto | undefined,
): THREE.Group {
  const group = new THREE.Group();
  const width = meta ? meta.footprintCellsX * meta.gridCellMeters : 5;
  const depth = meta ? meta.footprintCellsZ * meta.gridCellMeters : 4;
  const height = building.definitionId.includes("plant") ? 4 : building.definitionId === "town_center" ? 5 : 3;
  const state = constructionVisualState(building);

  const ground = mesh(
    new THREE.BoxGeometry(width, 0.08, depth),
    materials.soil,
    0,
    0.04,
    0,
  );
  group.add(ground);
  addCornerStakes(group, width, depth);

  if (state.stageIndex >= 1) {
    group.add(
      mesh(
        new THREE.BoxGeometry(width * 0.94, 0.24, depth * 0.94),
        materials.concrete,
        0,
        0.12,
        0,
      ),
    );
  }

  if (state.stageIndex >= 2) {
    addFrame(group, width, depth, height);
  }

  if (state.stageIndex >= 3) {
    const shellHeight = height * (state.stage === "SHELL" ? 0.72 : 0.95);
    const shell = mesh(
      new THREE.BoxGeometry(width * 0.9, shellHeight, depth * 0.9),
      materials.shell,
      0,
      shellHeight / 2 + 0.15,
      0,
    );
    shell.castShadow = false;
    group.add(shell);
  }

  if (state.stageIndex >= 2) {
    addScaffold(group, width, depth, height);
  }

  addMaterialStacks(group, width, depth);
  addConstructionDetails(group, width, depth, height, state.stageIndex);
  addProgressFlag(group, width, state.progress);
  compactConstruction(group);

  group.position.set(building.position.x, 0, building.position.z);
  group.rotation.y = building.rotationY;
  group.userData.constructionStage = state.stage;
  group.userData.constructionProgress = state.progress;
  group.userData.buildingId = building.id;
  return group;
}

export function createBuilderObject(): THREE.Group {
  const group = new THREE.Group();

  const body = mesh(
    new THREE.CapsuleGeometry(0.28, 0.72, 4, 7),
    materials.worker,
    0,
    0.78,
    0,
  );
  group.add(body);

  const head = mesh(
    new THREE.SphereGeometry(0.22, 8, 6),
    materials.skin,
    0,
    1.42,
    0,
  );
  group.add(head);

  const hat = mesh(
    new THREE.CylinderGeometry(0.3, 0.36, 0.12, 8),
    materials.gold,
    0,
    1.62,
    0,
  );
  group.add(hat);

  const hammer = mesh(
    new THREE.BoxGeometry(0.08, 0.62, 0.08),
    materials.timberDark,
    0.42,
    0.9,
    0,
  );
  hammer.rotation.z = -0.3;
  hammer.userData.builderHammer = true;
  group.add(hammer);

  group.userData.builderActor = true;
  return group;
}
