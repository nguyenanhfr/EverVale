import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { BuildingInstance } from "@evervale/domain/world.types";
import type { BuildCatalogEntryDto } from "@evervale/protocol/world";
import type { BuildingVisualIdentity } from "./visual-identity";
import { renderAuthoredBuildingFamily } from "./buildings/building-visual-registry";

const palette = {
  plaster: 0xe4d7bb,
  plasterWarm: 0xd7c39e,
  timber: 0x75573d,
  timberDark: 0x4f3d31,
  stone: 0x9a9685,
  stoneDark: 0x6c7068,
  brick: 0xa86f55,
  roof: 0x675a50,
  roofWarm: 0x8a5e49,
  copper: 0x9d7447,
  metal: 0x4f5958,
  water: 0x72a9ad,
  grass: 0x789a6a,
  soil: 0x806447,
  awning: 0xb86f59,
  cream: 0xf0e4c8,
  window: 0xffd89a,
  warning: 0xd56a55,
  damaged: 0xd59a4d,
};

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

function material(
  key: keyof typeof palette,
  roughness = 0.9,
  metalness = 0,
): THREE.MeshStandardMaterial {
  const cacheKey=`${key}:${roughness}:${metalness}`;
  let value=materialCache.get(cacheKey);
  if (!value) {
    value=new THREE.MeshStandardMaterial({
      color: palette[key],
      roughness,
      metalness,
    });
    value.userData.sharedMaterial=true;
    materialCache.set(cacheKey,value);
  }
  return value;
}

function windowMaterial(): THREE.MeshStandardMaterial {
  const key="window-glow";
  let value=materialCache.get(key);
  if (!value) {
    value=new THREE.MeshStandardMaterial({
      color: palette.window,
      emissive: 0xffb45f,
      emissiveIntensity: 0.35,
      roughness: 0.42,
    });
    value.userData.sharedMaterial=true;
    materialCache.set(key,value);
  }
  return value;
}

function mesh(
  geometry: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  castShadow=true,
): THREE.Mesh {
  const value=new THREE.Mesh(geometry,mat);
  value.position.set(x,y,z);
  value.castShadow=castShadow;
  value.receiveShadow=true;
  return value;
}

function box(
  group: THREE.Group,
  width: number,
  height: number,
  depth: number,
  mat: THREE.Material,
  x=0,
  y=height/2,
  z=0,
  castShadow=true,
): THREE.Mesh {
  const value=mesh(new THREE.BoxGeometry(width,height,depth),mat,x,y,z,castShadow);
  group.add(value);
  return value;
}

function addFoundation(group: THREE.Group,width:number,depth:number): void {
  box(group,width*0.96,0.28,depth*0.96,material("stoneDark"),0,0.14,0);
  box(group,width*0.9,0.12,depth*0.9,material("stone"),0,0.34,0,false);
}

function addWindow(group:THREE.Group,x:number,y:number,z:number,front=true): void {
  const value=box(
    group,
    front ? 0.72 : 0.08,
    0.82,
    front ? 0.08 : 0.72,
    windowMaterial(),
    x,
    y,
    z,
    false,
  );
  value.userData.buildingGlow=true;
  const frameMat=material("timberDark");
  if (front) {
    box(group,0.86,0.08,0.1,frameMat,x,y+0.45,z,false);
    box(group,0.86,0.08,0.1,frameMat,x,y-0.45,z,false);
  } else {
    box(group,0.1,0.08,0.86,frameMat,x,y+0.45,z,false);
    box(group,0.1,0.08,0.86,frameMat,x,y-0.45,z,false);
  }
}

function addDoor(group:THREE.Group,x:number,z:number,width=0.85,height=1.55): void {
  box(group,width,height,0.1,material("timberDark"),x,height/2+0.34,z,false);
  const knob=mesh(new THREE.SphereGeometry(0.055,6,4),material("copper",0.5,0.25),x+width*0.28,1.05,z+0.08,false);
  group.add(knob);
}

function addGabledRoof(
  group:THREE.Group,
  width:number,
  depth:number,
  baseY:number,
  roofMat:THREE.Material,
  rise=1.0,
): void {
  const run=width/2+0.28;
  const length=Math.hypot(run,rise);
  const angle=Math.atan2(rise,run);
  for (const side of [-1,1] as const) {
    const slab=mesh(
      new THREE.BoxGeometry(length,0.18,depth+0.55),
      roofMat,
      side*run/2,
      baseY+rise/2,
      0,
      true,
    );
    slab.rotation.z=side<0 ? angle : -angle;
    group.add(slab);
  }
  box(group,0.16,0.2,depth+0.58,material("copper",0.56,0.22),0,baseY+rise+0.03,0,false);
}

function addTimberFront(group:THREE.Group,width:number,depth:number,height:number): void {
  const z=depth/2+0.055;
  for (const x of [-width*0.36,0,width*0.36]) {
    box(group,0.11,height*0.78,0.11,material("timber"),x,height*0.48,z,false);
  }
  for (const y of [height*0.42,height*0.72]) {
    box(group,width*0.82,0.1,0.11,material("timber"),0,y,z,false);
  }
}

function addStoneStep(group: THREE.Group, x: number, z: number, width = 1.25): void {
  box(group, width, 0.16, 0.5, material("stone"), x, 0.12, z, false);
  box(group, width * 0.78, 0.12, 0.34, material("stoneDark"), x, 0.26, z - 0.12, false);
}

function addFlowerBox(group: THREE.Group, x: number, y: number, z: number): void {
  box(group, 0.78, 0.16, 0.22, material("timberDark"), x, y, z, false);
  for (const dx of [-0.24, 0, 0.24]) {
    const blossom = mesh(
      new THREE.OctahedronGeometry(0.09, 0),
      dx === 0 ? material("awning") : material("plasterWarm"),
      x + dx,
      y + 0.18 + Math.abs(dx) * 0.08,
      z + 0.02,
      false,
    );
    group.add(blossom);
  }
}

function addEaveBrackets(group: THREE.Group, width: number, depth: number, y: number): void {
  for (const x of [-width * 0.35, -width * 0.12, width * 0.12, width * 0.35]) {
    const bracket = box(group, 0.09, 0.34, 0.28, material("timberDark"), x, y, depth / 2 + 0.16, false);
    bracket.rotation.x = -0.32;
  }
}

function addChimney(group:THREE.Group,x:number,z:number,y:number): void {
  box(group,0.48,1.35,0.48,material("brick"),x,y+0.3,z);
  box(group,0.62,0.14,0.62,material("stoneDark"),x,y+0.98,z,false);
}

function addSchool(group:THREE.Group,width:number,depth:number): void {
  const h=3.2;
  addFoundation(group,width,depth);
  box(group,width*0.9,h,depth*0.82,material("plasterWarm"),0,h/2+0.34,0);
  addGabledRoof(group,width*0.96,depth*0.88,h+0.34,material("roofWarm"),1.0);
  addDoor(group,0,depth*0.41+0.08,1.05,1.75);
  addStoneStep(group,0,depth*0.46+0.3,1.45);
  addEaveBrackets(group,width*0.9,depth*0.82,h+0.13);
  for(const x of [-width*0.3,-width*0.1,width*0.1,width*0.3]) addWindow(group,x,1.65,depth*0.41+0.09);
  box(group,0.72,1.0,0.72,material("stone"),0,h+0.72,0);
  const bell=mesh(new THREE.ConeGeometry(0.24,0.35,10),material("copper",0.45,0.3),0,h+0.9,depth*0.38,false);
  bell.rotation.x=Math.PI;
  group.add(bell);
}

function addPark(group:THREE.Group,width:number,depth:number): void {
  box(group,width*0.96,0.12,depth*0.96,material("grass"),0,0.06,0,false);
  box(group,width*0.16,0.05,depth*0.9,material("stone"),0,0.15,0,false);
  const basin=mesh(new THREE.CylinderGeometry(0.85,0.95,0.22,14),material("stone"),0,0.2,0,false);
  const water=mesh(new THREE.CylinderGeometry(0.72,0.72,0.04,16),material("water",0.3),0,0.34,0,false);
  water.userData.propWater=true;
  group.add(basin,water);
  for(const [x,z,s] of [
    [-width*0.3,-depth*0.28,0.9],
    [width*0.3,-depth*0.24,0.82],
    [-width*0.3,depth*0.28,0.78],
    [width*0.3,depth*0.3,0.92],
  ] as const) {
    const trunk=mesh(new THREE.CylinderGeometry(0.14*s,0.2*s,1.65*s,6),material("timber"),x,0.86*s,z);
    const crown=mesh(new THREE.DodecahedronGeometry(0.72*s,0),material("grass"),x,2.05*s,z);
    group.add(trunk,crown);
  }
}

function addGuardPost(group:THREE.Group,width:number,depth:number): void {
  const h=2.85;
  addFoundation(group,width,depth);
  box(group,width*0.86,1.0,depth*0.82,material("stoneDark"),0,0.84,0);
  box(group,width*0.78,h-0.7,depth*0.74,material("timber"),0,1.85,0);
  addGabledRoof(group,width*0.94,depth*0.86,h+0.34,material("roof"),0.95);
  addDoor(group,0,depth*0.37+0.08);
  addWindow(group,-width*0.24,1.78,depth*0.37+0.09);
  addWindow(group,width*0.24,1.78,depth*0.37+0.09);
  const pole=mesh(new THREE.CylinderGeometry(0.035,0.04,2.3,6),material("metal"),width*0.46,1.35,0,false);
  const flag=box(group,0.7,0.42,0.04,material("awning"),width*0.46+0.36,2.1,0,false);
  group.add(pole,flag);
}

function addFarm(group:THREE.Group,width:number,depth:number): void {
  const h=3.15;
  addFoundation(group,width,depth);
  box(group,width*0.72,h,depth*0.76,material("timber"),-width*0.1,h/2+0.34,0);
  addGabledRoof(group,width*0.82,depth*0.84,h+0.34,material("roofWarm"),1.25);
  addDoor(group,-width*0.1,depth*0.38+0.08,1.35,1.9);
  for(const x of [-width*0.42,width*0.42]) {
    const silo=mesh(new THREE.CylinderGeometry(0.55,0.62,2.2,12),material("metal",0.82,0.2),x,1.15,-depth*0.18);
    group.add(silo);
  }
  for(let i=0;i<4;i+=1) {
    box(group,0.1,0.72,0.1,material("timber"),-width*0.4+i*(width*0.8/3),0.36,-depth*0.52,false);
  }
}

function addRestaurant(group:THREE.Group,width:number,depth:number): void {
  const h=2.95;
  addFoundation(group,width,depth);
  box(group,width*0.9,h,depth*0.82,material("cream"),0,h/2+0.34,0);
  addGabledRoof(group,width*0.96,depth*0.88,h+0.34,material("roofWarm"),0.9);
  addDoor(group,width*0.22,depth*0.41+0.08);
  addStoneStep(group,width*0.22,depth*0.46+0.3,1.2);
  addWindow(group,-width*0.26,1.62,depth*0.41+0.09);
  addFlowerBox(group,-width*0.26,1.13,depth*0.43+0.14);
  addEaveBrackets(group,width*0.9,depth*0.82,h+0.12);
  const awning=box(group,width*0.48,0.12,0.9,material("awning"),-width*0.18,2.18,depth*0.5);
  awning.rotation.x=-0.1;
  box(group,1.5,0.3,0.08,material("timberDark"),0,h+0.15,depth*0.43+0.08,false);
  for(const x of [-width*0.26,0,width*0.26]) {
    const top=mesh(new THREE.CylinderGeometry(0.34,0.34,0.08,10),material("timber"),x,0.72,depth*0.62,false);
    top.rotation.z=Math.PI/2;
    group.add(top);
  }
}

function addBuildersYard(group:THREE.Group,width:number,depth:number): void {
  box(group,width*0.96,0.08,depth*0.96,material("soil"),0,0.04,0,false);
  const shedH=2.45;
  box(group,width*0.52,shedH,depth*0.62,material("timber"),-width*0.16,shedH/2,0);
  const roof=box(group,width*0.6,0.16,depth*0.72,material("roof"),-width*0.16,shedH+0.12,0);
  roof.rotation.z=-0.06;
  for(let i=0;i<4;i+=1) {
    box(group,0.62,0.42,0.62,i%2 ? material("stone") : material("timber"),width*0.32+(i%2)*0.64,0.21+Math.floor(i/2)*0.43,-depth*0.24,false);
  }
  for(const x of [-width*0.46,width*0.46]) {
    box(group,0.08,2.6,0.08,material("metal"),x,1.3,depth*0.42,false);
  }
  box(group,width*0.94,0.08,0.08,material("metal"),0,2.35,depth*0.42,false);
}

function addDamageMarker(group:THREE.Group,state:BuildingInstance["damageState"],height:number): void {
  if (state!=="DISABLED" && state!=="DAMAGED") return;
  const marker=mesh(
    new THREE.OctahedronGeometry(0.42,0),
    state==="DISABLED" ? material("warning",0.55) : material("damaged",0.6),
    0,
    height+1.25,
    0,
    false,
  );
  marker.userData.damageMarker=true;
  group.add(marker);
}

function compactBuilding(group: THREE.Group): void {
  const buckets = new Map<
    string,
    {
      material: THREE.Material;
      geometries: THREE.BufferGeometry[];
      castShadow: boolean;
      receiveShadow: boolean;
      buildingGlow: boolean;
      propWater: boolean;
      damageMarker: boolean;
    }
  >();

  for (const child of [...group.children]) {
    const source = child as THREE.Mesh;
    if (!source.isMesh) continue;
    source.updateMatrix();
    const transformed = source.geometry.index
      ? source.geometry.toNonIndexed()
      : source.geometry.clone();
    transformed.applyMatrix4(source.matrix);

    const sourceMaterial = Array.isArray(source.material)
      ? source.material[0]!
      : source.material;
    const key = [
      sourceMaterial.uuid,
      source.castShadow ? "cast" : "no-cast",
      source.receiveShadow ? "recv" : "no-recv",
      source.userData.buildingGlow ? "glow" : "",
      source.userData.propWater ? "water" : "",
      source.userData.damageMarker ? "damage" : "",
    ].join(":");

    let bucket = buckets.get(key);
    if (!bucket) {
      const created = {
        material: sourceMaterial,
        geometries: [] as THREE.BufferGeometry[],
        castShadow: source.castShadow,
        receiveShadow: source.receiveShadow,
        buildingGlow: Boolean(source.userData.buildingGlow),
        propWater: Boolean(source.userData.propWater),
        damageMarker: Boolean(source.userData.damageMarker),
      };
      buckets.set(key, created);
      bucket = created;
    }
    bucket.geometries.push(transformed);
    source.geometry.dispose();
  }

  group.clear();

  for (const bucket of buckets.values()) {
    const geometry =
      bucket.geometries.length === 1
        ? bucket.geometries[0]!
        : mergeGeometries(bucket.geometries, false);
    if (!geometry) {
      bucket.geometries.forEach((item) => item.dispose());
      continue;
    }
    if (bucket.geometries.length > 1) {
      bucket.geometries.forEach((item) => item.dispose());
    }
    const combined = new THREE.Mesh(geometry, bucket.material);
    combined.castShadow = bucket.castShadow;
    combined.receiveShadow = bucket.receiveShadow;
    combined.userData.buildingGlow = bucket.buildingGlow;
    combined.userData.propWater = bucket.propWater;
    combined.userData.damageMarker = bucket.damageMarker;
    group.add(combined);
  }
}

export function createBuildingVisual(
  building: BuildingInstance,
  meta?: BuildCatalogEntryDto,
  identity?: BuildingVisualIdentity,
): THREE.Group {
  const group=new THREE.Group();
  const width=meta ? meta.footprintCellsX*meta.gridCellMeters : building.definitionId==="town_center" ? 8 : 5;
  const depth=meta ? meta.footprintCellsZ*meta.gridCellMeters : building.definitionId==="town_center" ? 8 : 4;

  if (!renderAuthoredBuildingFamily(building.definitionId, group, width, depth, identity)) {
    switch(building.definitionId) {
      case "school": addSchool(group,width,depth); break;
      case "park": addPark(group,width,depth); break;
      case "guard_post": addGuardPost(group,width,depth); break;
      case "farm": addFarm(group,width,depth); break;
      case "restaurant": addRestaurant(group,width,depth); break;
      case "builders_yard": addBuildersYard(group,width,depth); break;
      default:
        addFoundation(group,width,depth);
        box(group,width*0.88,2.8,depth*0.84,material("plasterWarm"),0,1.74,0);
        addGabledRoof(group,width*0.94,depth*0.9,3.14,material("roof"),0.9);
        break;
    }
  }

  const markerHeight=building.definitionId==="town_center" ? 6.5 : building.definitionId==="park" ? 2.5 : 4.6;
  addDamageMarker(group,building.damageState,markerHeight);
  compactBuilding(group);
  group.position.set(building.position.x,0,building.position.z);
  group.rotation.y=building.rotationY;
  group.userData.buildingId=building.id;
  group.userData.buildingDefinitionId=building.definitionId;
  group.userData.visualVariant=identity?.variant ?? "legacy";
  group.userData.visualDialect=identity?.dialect ?? "legacy";
  return group;
}
