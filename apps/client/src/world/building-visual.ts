import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { BuildingInstance } from "@evervale/domain/world.types";
import type { BuildCatalogEntryDto } from "@evervale/protocol/world";
import type { BuildingMaterialTone, BuildingVisualIdentity } from "./visual-identity";

const palette = {
  plaster: 0xe4d7bb,
  plasterWarm: 0xd7c39e,
  plasterSage: 0xc8d0b2,
  plasterOchre: 0xd6b982,
  plasterCool: 0xd7ded2,
  timber: 0x75573d,
  timberLight: 0x927253,
  timberDark: 0x4f3d31,
  stone: 0x9a9685,
  stoneWarm: 0xaaa087,
  stoneDark: 0x6c7068,
  brick: 0xa86f55,
  brickDark: 0x885b4b,
  roof: 0x675a50,
  roofWarm: 0x8a5e49,
  roofGreen: 0x4e6a5d,
  roofBlue: 0x536a73,
  roofRust: 0x865948,
  copper: 0x9d7447,
  brass: 0xb18f55,
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
  key: keyof typeof palette | BuildingMaterialTone,
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

function addTimberFront(
  group:THREE.Group,
  width:number,
  depth:number,
  height:number,
  trimTone: BuildingMaterialTone = "timber",
): void {
  const z=depth/2+0.055;
  for (const x of [-width*0.36,0,width*0.36]) {
    box(group,0.11,height*0.78,0.11,material(trimTone),x,height*0.48,z,false);
  }
  for (const y of [height*0.42,height*0.72]) {
    box(group,width*0.82,0.1,0.11,material(trimTone),0,y,z,false);
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

function addHouse(
  group:THREE.Group,
  width:number,
  depth:number,
  identity: BuildingVisualIdentity,
): void {
  const h=2.8;
  const variant=identity.variantIndex % 6;
  addFoundation(group,width,depth);
  box(group,width*0.88,h,depth*0.86,material(identity.wallTone),0,h/2+0.34,0);
  addTimberFront(group,width*0.88,depth*0.86,h,identity.trimTone);
  addGabledRoof(
    group,
    width*0.96,
    depth*0.92,
    h+0.34,
    material(identity.roofTone),
    variant===2 ? 1.42 : variant===1 ? 0.98 : 1.15,
  );

  const doorX=variant===1 ? -width*0.21 : variant===4 ? width*0.2 : 0;
  addDoor(group,doorX,depth*0.43+0.08);
  addStoneStep(group,doorX,depth*0.48+0.32);
  addWindow(group,-width*0.24,1.62,depth*0.43+0.09);
  addWindow(group,width*0.24,1.62,depth*0.43+0.09);
  addEaveBrackets(group,width*0.88,depth*0.86,h+0.15);

  if (variant===0 || variant===5) {
    addFlowerBox(group,-width*0.24,1.13,depth*0.45+0.14);
    addFlowerBox(group,width*0.24,1.13,depth*0.45+0.14);
  }

  if (variant===1) {
    const canopy=box(
      group,
      width*0.44,
      0.12,
      1.05,
      material(identity.roofTone),
      -width*0.2,
      2.12,
      depth*0.5+0.35,
    );
    canopy.rotation.x=-0.12;
    for(const x of [-width*0.36,-width*0.04]) {
      box(group,0.08,1.8,0.08,material(identity.trimTone),x,0.9,depth*0.5+0.72,false);
    }
    for(let i=0;i<4;i+=1) {
      box(group,0.56,0.13,0.18,material("timber"),width*0.34,0.16+i*0.14,-depth*0.37,false);
    }
  }

  if (variant===2) {
    box(
      group,
      width*0.27,
      0.78,
      0.62,
      material(identity.secondaryWallTone),
      0,
      h+0.72,
      depth*0.22,
      true,
    );
    addGabledRoof(
      group,
      width*0.34,
      0.72,
      h+1.1,
      material(identity.roofTone),
      0.42,
    );
    addWindow(group,0,h+0.72,depth*0.54+0.02);
  }

  if (variant===3) {
    box(
      group,
      0.28,
      h*0.92,
      depth*0.76,
      material("stoneWarm"),
      -width*0.43,
      h*0.46+0.34,
      0,
    );
    addChimney(group,-width*0.36,-depth*0.12,h+0.08);
    const post=box(group,0.08,1.1,0.08,material(identity.trimTone),width*0.43,0.55,depth*0.51,false);
    post.rotation.z=0.03;
    box(group,0.48,0.32,0.09,material(identity.accentTone),width*0.43,1.22,depth*0.51,false);
  } else {
    addChimney(group,variant===4 ? width*0.3 : -width*0.27,-depth*0.18,h+0.15);
  }

  if (variant===4) {
    box(
      group,
      width*0.34,
      1.42,
      depth*0.42,
      material(identity.secondaryWallTone),
      width*0.4,
      0.71,
      -depth*0.1,
    );
    const leanRoof=box(
      group,
      width*0.42,
      0.12,
      depth*0.5,
      material(identity.roofTone),
      width*0.4,
      1.55,
      -depth*0.1,
    );
    leanRoof.rotation.z=-0.12;
    for(let i=0;i<3;i+=1) {
      box(group,0.38,0.31,0.38,material("timber"),-width*0.32+i*0.42,0.16,-depth*0.55,false);
    }
  }

  if (variant===5) {
    for(const x of [-width*0.33,width*0.33]) {
      box(group,0.06,1.65,0.06,material(identity.trimTone),x,0.82,-depth*0.54,false);
    }
    box(group,width*0.68,0.025,0.025,material("metal"),0,1.52,-depth*0.54,false);
    for(const [x,color] of [[-0.22,"plasterCool"],[0.03,"awning"],[0.26,"plasterWarm"]] as const) {
      box(group,0.24,0.33,0.025,material(color),x,1.32,-depth*0.55,false);
    }
  }

  box(
    group,
    width*0.28,
    0.08,
    0.48,
    material("soil"),
    variant%2===0 ? width*0.26 : -width*0.26,
    0.08,
    depth*0.54,
    false,
  );
}

function addTownCenter(
  group:THREE.Group,
  width:number,
  depth:number,
  identity: BuildingVisualIdentity,
): void {
  const h=4.0;
  const variant=identity.variantIndex%3;
  addFoundation(group,width,depth);
  box(group,width*0.9,h,depth*0.84,material(identity.wallTone),0,h/2+0.34,0);
  addTimberFront(group,width*0.9,depth*0.84,h,identity.trimTone);
  addGabledRoof(group,width*0.98,depth*0.9,h+0.34,material(identity.roofTone),1.35);
  addDoor(group,0,depth*0.42+0.08,1.2,1.9);
  addStoneStep(group,0,depth*0.47+0.34,1.7);
  addEaveBrackets(group,width*0.9,depth*0.84,h+0.14);
  for (const x of [-width*0.28,width*0.28]) {
    addWindow(group,x,1.75,depth*0.42+0.09);
    addWindow(group,x,3.05,depth*0.42+0.09);
  }

  if (variant===0) {
    const towerY=h+1.2;
    box(group,1.75,2.15,1.75,material(identity.secondaryWallTone),0,towerY,0);
    addGabledRoof(group,2.1,2.1,h+2.28,material(identity.accentTone),0.85);
    const clock=mesh(new THREE.CylinderGeometry(0.48,0.48,0.08,18),material("cream"),0,h+1.45,0.91,false);
    clock.rotation.x=Math.PI/2;
    group.add(clock);
  } else if (variant===1) {
    const tx=-width*0.28;
    box(group,1.55,2.45,1.55,material(identity.secondaryWallTone),tx,h+1.35,0);
    addGabledRoof(group,1.9,1.9,h+2.58,material(identity.accentTone),0.78);
    const bell=mesh(new THREE.ConeGeometry(0.25,0.38,10),material(identity.accentTone),tx,h+1.65,depth*0.44,false);
    bell.rotation.x=Math.PI;
    group.add(bell);
    const porch=box(group,width*0.5,0.14,1.25,material(identity.roofTone),width*0.16,2.75,depth*0.53);
    porch.rotation.x=-0.08;
    for(const x of [-width*0.06,width*0.18,width*0.4]) {
      box(group,0.1,2.2,0.1,material(identity.trimTone),x,1.1,depth*0.61,false);
    }
  } else {
    for(const x of [-width*0.25,width*0.25]) {
      box(group,width*0.27,1.0,depth*0.34,material(identity.secondaryWallTone),x,h+0.4,depth*0.12);
      addGabledRoof(group,width*0.32,depth*0.38,h+0.9,material(identity.roofTone),0.48);
    }
    const lantern=mesh(new THREE.CylinderGeometry(0.22,0.3,0.5,8),windowMaterial(),0,h+0.78,depth*0.45,false);
    lantern.userData.buildingGlow=true;
    group.add(lantern);
  }

  box(group,width*0.32,0.12,0.52,material(identity.trimTone),-width*0.25,0.55,depth*0.5+0.35,false);
}

function addWorkshop(
  group:THREE.Group,
  width:number,
  depth:number,
  identity: BuildingVisualIdentity,
): void {
  const h=3.25;
  const variant=identity.variantIndex%4;
  addFoundation(group,width,depth);
  box(group,width*0.9,h,depth*0.86,material(variant===1 ? "brickDark" : "brick"),0,h/2+0.34,0);
  box(group,width*0.72,0.2,depth*0.98,material(identity.roofTone),0,h+0.52,0);
  addDoor(group,width*0.2,depth*0.43+0.08,1.35,1.85);
  addWindow(group,-width*0.25,1.72,depth*0.43+0.09);

  if(variant===0) {
    const awning=box(group,width*0.42,0.13,0.95,material(identity.accentTone),width*0.2,h*0.62,depth*0.49+0.4);
    awning.rotation.x=-0.12;
    const wheel=mesh(new THREE.TorusGeometry(0.62,0.12,8,18),material("metal",0.55,0.35),-width*0.32,1.25,depth*0.46+0.13,false);
    group.add(wheel);
  } else if(variant===1) {
    const stack=mesh(new THREE.CylinderGeometry(0.3,0.38,2.5,9),material("metal",0.68,0.25),-width*0.28,h+1.0,-depth*0.18);
    group.add(stack);
    box(group,width*0.34,1.45,depth*0.4,material(identity.secondaryWallTone),width*0.36,0.9,-depth*0.1);
    const forge=box(group,0.72,0.52,0.62,material("stoneDark"),width*0.23,0.4,depth*0.42,false);
    forge.rotation.y=0.08;
  } else if(variant===2) {
    box(group,width*0.38,2.0,depth*0.62,material(identity.secondaryWallTone),-width*0.38,1.0,-depth*0.02);
    const shedRoof=box(group,width*0.46,0.14,depth*0.72,material(identity.roofTone),-width*0.38,2.1,-depth*0.02);
    shedRoof.rotation.z=0.08;
    for(const x of [-width*0.38,-width*0.18,width*0.02]) {
      box(group,0.48,0.34,0.46,material("timber"),x,0.18,depth*0.57,false);
    }
  } else {
    const canopy=box(group,width*0.72,0.12,1.05,material(identity.roofTone),0,2.35,depth*0.55);
    canopy.rotation.x=-0.1;
    for(const x of [-width*0.3,0,width*0.3]) {
      box(group,0.08,2.1,0.08,material("metal"),x,1.05,depth*0.64,false);
    }
    for(let i=0;i<5;i+=1) {
      box(group,0.7,0.1,0.2,material("timber"),-width*0.32+i*0.35,0.12+i*0.04,-depth*0.56,false);
    }
  }
}

function addPowerPlant(
  group:THREE.Group,
  width:number,
  depth:number,
  identity: BuildingVisualIdentity,
): void {
  const h=3.8;
  const variant=identity.variantIndex%3;
  addFoundation(group,width,depth);
  box(group,width*0.9,h,depth*0.82,material(variant===2 ? "brickDark" : "brick"),0,h/2+0.34,0);
  box(group,width*0.94,0.28,depth*0.9,material("metal",0.72,0.25),0,h+0.45,0);
  addWindow(group,-width*0.24,1.75,depth*0.41+0.08);
  addWindow(group,width*0.24,1.75,depth*0.41+0.08);

  const stackXs = variant===1 ? [width*0.28] : [-width*0.24,width*0.24];
  for (const x of stackXs) {
    const stack=mesh(
      new THREE.CylinderGeometry(variant===1?0.42:0.34,variant===1?0.5:0.42,variant===1?3.0:2.45,10),
      material("metal",0.68,0.28),
      x,
      h+(variant===1?1.45:1.2),
      -depth*0.18,
    );
    group.add(stack);
    box(group,0.7,0.12,0.7,material(identity.accentTone,0.5,0.3),x,h+(variant===1?2.98:2.45),-depth*0.18,false);
  }

  const flywheel=mesh(
    new THREE.TorusGeometry(variant===1?0.92:0.75,0.14,8,20),
    material(identity.accentTone,0.55,0.28),
    variant===2 ? -width*0.18 : 0,
    1.45,
    depth*0.43+0.13,
    false,
  );
  group.add(flywheel);

  if(variant===2) {
    box(group,width*0.36,2.0,depth*0.48,material(identity.secondaryWallTone),width*0.4,1.0,-depth*0.1);
    box(group,width*0.42,0.14,depth*0.54,material(identity.roofTone),width*0.4,2.08,-depth*0.1);
    for(let i=0;i<3;i+=1) {
      box(group,0.22,0.75,0.28,material("metal"),width*0.31+i*0.23,0.38,depth*0.48,false);
    }
  }
}

function addWaterPlant(
  group:THREE.Group,
  width:number,
  depth:number,
  identity: BuildingVisualIdentity,
): void {
  const h=3.15;
  const variant=identity.variantIndex%3;
  addFoundation(group,width,depth);
  box(group,width*0.82,h,depth*0.76,material(identity.wallTone),0,h/2+0.34,0);
  addGabledRoof(group,width*0.9,depth*0.82,h+0.34,material(identity.roofTone),variant===2?1.0:0.8);
  addDoor(group,0,depth*0.38+0.08);

  if(variant===0) {
    for(const x of [-width*0.3,width*0.3]) {
      const tank=mesh(new THREE.CylinderGeometry(0.72,0.82,1.5,14),material("water",0.42,0.08),x,0.92,-depth*0.48,false);
      group.add(tank);
      const rim=mesh(new THREE.TorusGeometry(0.76,0.06,6,16),material("metal",0.62,0.22),x,1.56,-depth*0.48,false);
      rim.rotation.x=Math.PI/2;
      group.add(rim);
    }
  } else if(variant===1) {
    for(const x of [-width*0.28,0,width*0.28]) {
      const pipe=mesh(new THREE.CylinderGeometry(0.12,0.12,1.7,8),material("metal"),x,0.76,depth*0.47,false);
      pipe.rotation.x=Math.PI/2;
      group.add(pipe);
      const gauge=mesh(new THREE.CylinderGeometry(0.18,0.18,0.05,12),material(identity.accentTone),x,1.48,depth*0.48,false);
      gauge.rotation.x=Math.PI/2;
      group.add(gauge);
    }
    const pump=mesh(new THREE.CylinderGeometry(0.5,0.62,1.1,10),material("water",0.5,0.05),width*0.32,0.62,-depth*0.46,false);
    group.add(pump);
  } else {
    for(const x of [-width*0.28,0,width*0.28]) {
      const basin=mesh(new THREE.CylinderGeometry(0.58,0.62,0.28,14),material("stone"),x,0.16,-depth*0.5,false);
      const surface=mesh(new THREE.CylinderGeometry(0.5,0.5,0.04,14),material("water",0.25),x,0.32,-depth*0.5,false);
      surface.userData.propWater=true;
      group.add(basin,surface);
    }
    box(group,width*0.44,1.4,depth*0.34,material(identity.secondaryWallTone),-width*0.32,0.72,0);
  }
}

function addSchool(
  group:THREE.Group,
  width:number,
  depth:number,
  identity: BuildingVisualIdentity,
): void {
  const h=3.2;
  const variant=identity.variantIndex%3;
  addFoundation(group,width,depth);
  box(group,width*0.9,h,depth*0.82,material(identity.wallTone),0,h/2+0.34,0);
  addGabledRoof(group,width*0.96,depth*0.88,h+0.34,material(identity.roofTone),variant===2?1.18:1.0);
  addDoor(group,0,depth*0.41+0.08,1.05,1.75);
  addStoneStep(group,0,depth*0.46+0.3,1.45);
  addEaveBrackets(group,width*0.9,depth*0.82,h+0.13);
  for(const x of [-width*0.3,-width*0.1,width*0.1,width*0.3]) addWindow(group,x,1.65,depth*0.41+0.09);

  if(variant===0) {
    box(group,0.72,1.0,0.72,material("stone"),0,h+0.72,0);
    const bell=mesh(new THREE.ConeGeometry(0.24,0.35,10),material(identity.accentTone,0.45,0.3),0,h+0.9,depth*0.38,false);
    bell.rotation.x=Math.PI;
    group.add(bell);
  } else if(variant===1) {
    for(const x of [-width*0.46,width*0.46]) {
      box(group,width*0.22,1.8,depth*0.48,material(identity.secondaryWallTone),x,0.92,-depth*0.05);
      box(group,width*0.26,0.12,depth*0.55,material(identity.roofTone),x,1.88,-depth*0.05);
    }
    box(group,width*0.5,0.06,depth*0.3,material("stone"),0,0.12,depth*0.58,false);
  } else {
    box(group,width*0.34,2.4,depth*0.6,material(identity.secondaryWallTone),width*0.37,1.2,-depth*0.02);
    addGabledRoof(group,width*0.4,depth*0.66,2.48,material(identity.roofTone),0.64);
    for(const y of [1.0,1.75]) addWindow(group,width*0.37,y,depth*0.32,true);
  }
}

function addPark(
  group:THREE.Group,
  width:number,
  depth:number,
  identity: BuildingVisualIdentity,
): void {
  const variant=identity.variantIndex%4;
  box(group,width*0.96,0.12,depth*0.96,material("grass"),0,0.06,0,false);
  box(group,width*(variant===2?0.32:0.16),0.05,depth*0.9,material("stone"),0,0.15,0,false);

  if(variant===0) {
    const basin=mesh(new THREE.CylinderGeometry(0.85,0.95,0.22,14),material("stone"),0,0.2,0,false);
    const water=mesh(new THREE.CylinderGeometry(0.72,0.72,0.04,16),material("water",0.3),0,0.34,0,false);
    water.userData.propWater=true;
    group.add(basin,water);
  } else if(variant===1) {
    const pond=mesh(new THREE.CylinderGeometry(1.35,1.45,0.16,18),material("water",0.28),0,0.16,0,false);
    pond.scale.z=0.72;
    pond.userData.propWater=true;
    group.add(pond);
    for(const x of [-0.8,0.8]) {
      const reed=mesh(new THREE.ConeGeometry(0.08,0.72,5),material("grass"),x,0.42,0.5,false);
      group.add(reed);
    }
  } else if(variant===2) {
    for(const x of [-0.8,0.8]) {
      box(group,0.09,1.75,0.09,material(identity.trimTone),x,0.88,0,false);
    }
    box(group,1.72,0.08,0.08,material(identity.trimTone),0,1.65,0,false);
    for(const x of [-0.5,0.5]) {
      const seat=box(group,0.6,0.08,0.28,material("timber"),x,0.66,0,false);
      seat.rotation.z=x<0?-0.08:0.08;
      box(group,0.04,0.8,0.04,material("metal"),x,1.1,0,false);
    }
  } else {
    const roof=mesh(new THREE.ConeGeometry(1.0,0.55,8),material(identity.roofTone),0,2.15,0,false);
    group.add(roof);
    for(let i=0;i<6;i+=1) {
      const a=i*Math.PI*2/6;
      box(group,0.07,1.8,0.07,material(identity.trimTone),Math.cos(a)*0.75,0.9,Math.sin(a)*0.75,false);
    }
    box(group,1.6,0.09,0.42,material("timber"),0,0.48,1.05,false);
  }

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

function addGuardPost(
  group:THREE.Group,
  width:number,
  depth:number,
  identity: BuildingVisualIdentity,
): void {
  const h=2.85;
  const variant=identity.variantIndex%3;
  addFoundation(group,width,depth);
  box(group,width*0.86,1.0,depth*0.82,material("stoneDark"),0,0.84,0);
  box(group,width*0.78,h-0.7,depth*0.74,material(identity.wallTone),0,1.85,0);
  addGabledRoof(group,width*0.94,depth*0.86,h+0.34,material(identity.roofTone),0.95);
  addDoor(group,0,depth*0.37+0.08);
  addWindow(group,-width*0.24,1.78,depth*0.37+0.09);
  addWindow(group,width*0.24,1.78,depth*0.37+0.09);

  if(variant===1) {
    box(group,1.1,2.3,1.1,material("stone"),width*0.34,1.35,-depth*0.2);
    const platform=box(group,1.45,0.12,1.45,material(identity.trimTone),width*0.34,2.5,-depth*0.2,false);
    platform.rotation.y=0.03;
    for(const x of [width*0.18,width*0.5]) for(const z of [-depth*0.34,-depth*0.06]) {
      box(group,0.05,0.65,0.05,material("metal"),x,2.8,z,false);
    }
  } else if(variant===2) {
    for(const x of [-width*0.42,width*0.42]) {
      box(group,0.36,2.15,0.36,material("stone"),x,1.08,depth*0.5);
    }
    box(group,width*0.84,0.16,0.16,material(identity.trimTone),0,2.15,depth*0.5,false);
    box(group,width*0.72,0.09,0.09,material("metal"),0,1.0,depth*0.62,false);
  }

  const pole=mesh(new THREE.CylinderGeometry(0.035,0.04,2.3,6),material("metal"),width*0.46,1.35,0,false);
  const flag=box(group,0.7,0.42,0.04,material(identity.accentTone),width*0.46+0.36,2.1,0,false);
  group.add(pole,flag);
}

function addFarm(
  group:THREE.Group,
  width:number,
  depth:number,
  identity: BuildingVisualIdentity,
): void {
  const h=3.15;
  const variant=identity.variantIndex%4;
  addFoundation(group,width,depth);
  box(group,width*0.72,h,depth*0.76,material(variant===2?identity.wallTone:"timber"),-width*0.1,h/2+0.34,0);
  addGabledRoof(group,width*0.82,depth*0.84,h+0.34,material(identity.roofTone),variant===0?1.25:1.05);
  addDoor(group,-width*0.1,depth*0.38+0.08,1.35,1.9);

  if(variant===1) {
    for(const x of [-width*0.42,width*0.42]) {
      const silo=mesh(new THREE.CylinderGeometry(0.55,0.62,2.5,12),material("metal",0.82,0.2),x,1.3,-depth*0.18);
      group.add(silo);
    }
  } else if(variant===2) {
    for(let i=0;i<4;i+=1) {
      const x=-width*0.42+i*(width*0.28);
      const trunk=mesh(new THREE.CylinderGeometry(0.08,0.11,0.9,6),material("timber"),x,0.45,-depth*0.58,false);
      const crown=mesh(new THREE.DodecahedronGeometry(0.38,0),material("grass"),x,1.12,-depth*0.58,false);
      group.add(trunk,crown);
    }
    box(group,width*0.26,1.3,depth*0.3,material(identity.secondaryWallTone),width*0.38,0.66,depth*0.06);
  } else if(variant===3) {
    for(const x of [-width*0.42,width*0.42]) {
      box(group,0.08,0.85,0.08,material("timber"),x,0.43,depth*0.54,false);
    }
    for(let i=0;i<5;i+=1) {
      box(group,width*0.18,0.06,0.06,material("timber"),-width*0.36+i*width*0.18,0.55,depth*0.54,false);
    }
    const trough=box(group,1.3,0.28,0.5,material("water",0.42),width*0.2,0.18,-depth*0.55,false);
    trough.rotation.y=0.08;
  } else {
    for(let i=0;i<4;i+=1) {
      box(group,0.1,0.72,0.1,material("timber"),-width*0.4+i*(width*0.8/3),0.36,-depth*0.52,false);
    }
    for(let i=0;i<3;i+=1) {
      box(group,0.46,0.28,0.46,material("timber"),width*0.25+i*0.38,0.14,-depth*0.54,false);
    }
  }
}

function addRestaurant(
  group:THREE.Group,
  width:number,
  depth:number,
  identity: BuildingVisualIdentity,
): void {
  const h=2.95;
  const variant=identity.variantIndex%4;
  addFoundation(group,width,depth);
  box(group,width*0.9,h,depth*0.82,material(identity.wallTone),0,h/2+0.34,0);
  addGabledRoof(group,width*0.96,depth*0.88,h+0.34,material(identity.roofTone),variant===3?1.1:0.9);
  addDoor(group,width*0.22,depth*0.41+0.08);
  addStoneStep(group,width*0.22,depth*0.46+0.3,1.2);
  addWindow(group,-width*0.26,1.62,depth*0.41+0.09);
  addEaveBrackets(group,width*0.9,depth*0.82,h+0.12);

  if(variant===0) {
    addFlowerBox(group,-width*0.26,1.13,depth*0.43+0.14);
    const awning=box(group,width*0.48,0.12,0.9,material("awning"),-width*0.18,2.18,depth*0.5);
    awning.rotation.x=-0.1;
  } else if(variant===1) {
    const roof=box(group,width*0.58,0.1,1.35,material(identity.roofTone),-width*0.1,2.1,depth*0.62);
    roof.rotation.x=-0.08;
    for(const x of [-width*0.32,0,width*0.32]) box(group,0.07,1.85,0.07,material(identity.trimTone),x,0.93,depth*0.66,false);
  } else if(variant===2) {
    box(group,1.2,1.35,0.08,windowMaterial(),-width*0.28,1.5,depth*0.42+0.12,false).userData.buildingGlow=true;
    box(group,0.65,1.15,0.08,windowMaterial(),width*0.02,1.42,depth*0.42+0.12,false).userData.buildingGlow=true;
    box(group,0.42,0.72,0.08,material(identity.accentTone),-width*0.48,2.55,depth*0.44,false);
  } else {
    const porch=box(group,width*0.72,0.12,1.15,material(identity.roofTone),0,2.36,depth*0.56);
    porch.rotation.x=-0.08;
    for(const x of [-width*0.32,0,width*0.32]) {
      box(group,0.07,2.05,0.07,material(identity.trimTone),x,1.02,depth*0.65,false);
      const lamp=mesh(new THREE.SphereGeometry(0.11,8,6),windowMaterial(),x,1.82,depth*0.67,false);
      lamp.userData.buildingGlow=true;
      group.add(lamp);
    }
  }

  box(group,1.5,0.3,0.08,material(identity.trimTone),0,h+0.15,depth*0.43+0.08,false);
}

function addBuildersYard(
  group:THREE.Group,
  width:number,
  depth:number,
  identity: BuildingVisualIdentity,
): void {
  const variant=identity.variantIndex%4;
  box(group,width*0.96,0.08,depth*0.96,material("soil"),0,0.04,0,false);
  const shedH=2.45;
  box(group,width*(variant===1?0.62:0.52),shedH,depth*0.62,material("timber"),-width*0.16,shedH/2,0);
  const roof=box(group,width*(variant===1?0.7:0.6),0.16,depth*0.72,material(identity.roofTone),-width*0.16,shedH+0.12,0);
  roof.rotation.z=-0.06;

  if(variant===0) {
    for(const x of [-width*0.46,width*0.46]) box(group,0.08,2.6,0.08,material("metal"),x,1.3,depth*0.42,false);
    box(group,width*0.94,0.08,0.08,material("metal"),0,2.35,depth*0.42,false);
    const hook=mesh(new THREE.TorusGeometry(0.13,0.025,5,9),material(identity.accentTone),width*0.18,2.05,depth*0.42,false);
    hook.rotation.x=Math.PI/2;
    group.add(hook);
  } else if(variant===1) {
    for(let i=0;i<6;i+=1) {
      box(group,0.8,0.09,0.18,material("timber"),-width*0.38+i*0.28,0.12+i*0.05,-depth*0.5,false);
    }
    const saw=mesh(new THREE.CylinderGeometry(0.32,0.32,0.05,16),material("metal"),width*0.28,0.72,depth*0.46,false);
    saw.rotation.x=Math.PI/2;
    group.add(saw);
  } else if(variant===2) {
    for(let i=0;i<7;i+=1) {
      const x=-width*0.4+(i%4)*0.42;
      const y=0.15+Math.floor(i/4)*0.32;
      box(group,0.38,0.28,0.38,material(i%2?"stone":"stoneWarm"),x,y,-depth*0.5,false);
    }
  } else {
    for(const x of [-width*0.46,0,width*0.46]) {
      box(group,0.05,2.8,0.05,material("metal"),x,1.4,depth*0.42,false);
      box(group,0.05,2.8,0.05,material("metal"),x,1.4,-depth*0.42,false);
    }
    for(const y of [0.8,1.6,2.4]) {
      box(group,width*0.92,0.05,0.05,material("metal"),0,y,depth*0.42,false);
      box(group,width*0.92,0.05,0.05,material("metal"),0,y,-depth*0.42,false);
    }
  }

  for(let i=0;i<4;i+=1) {
    box(group,0.62,0.42,0.62,i%2 ? material("stone") : material("timber"),width*0.32+(i%2)*0.64,0.21+Math.floor(i/2)*0.43,-depth*0.24,false);
  }
}

function addIdentityDressing(
  group: THREE.Group,
  definitionId: string,
  width: number,
  depth: number,
  identity: BuildingVisualIdentity,
): void {
  const variant=identity.variantIndex;
  const front=depth*0.52;

  if (definitionId==="house_small") {
    if (variant%3===0) {
      box(group,0.13,1.02,0.13,material(identity.trimTone),width*0.36,0.51,front,false);
      box(group,0.52,0.34,0.08,material(identity.accentTone),width*0.36,1.08,front,false);
    } else if (variant%3===1) {
      const frame=mesh(new THREE.TorusGeometry(0.28,0.035,5,12),material("metal"),width*0.35,0.62,front,false);
      frame.rotation.y=Math.PI/2;
      group.add(frame);
      for(const offset of [-0.11,0.11]) {
        const wheel=mesh(new THREE.TorusGeometry(0.15,0.026,5,10),material("metal"),width*0.35+offset,0.25,front+0.06,false);
        wheel.rotation.y=Math.PI/2;
        group.add(wheel);
      }
    }
    return;
  }

  if (["workshop","power_plant","water_plant","builders_yard"].includes(definitionId)) {
    for(let i=0;i<3;i+=1) {
      box(
        group,
        0.46,
        0.28+0.06*(i%2),
        0.46,
        material(i===2 ? identity.accentTone : "timber"),
        -width*0.36+i*0.5,
        0.16,
        -depth*0.56,
        false,
      );
    }
    if (variant%2===1) {
      for(let i=0;i<3;i+=1) {
        const pipe=mesh(
          new THREE.CylinderGeometry(0.07,0.07,1.25,6),
          material("metal"),
          width*0.34+i*0.17,
          0.18,
          -depth*0.58,
          false,
        );
        pipe.rotation.z=Math.PI/2;
        group.add(pipe);
      }
    }
    return;
  }

  if (["town_center","school","guard_post"].includes(definitionId)) {
    box(group,1.45,0.13,0.44,material(identity.trimTone),-width*0.25,0.48,front+0.26,false);
    for(const x of [-width*0.28,width*0.28]) {
      box(group,0.44,0.26,0.44,material("stone"),x,0.13,front+0.2,false);
      const shrub=mesh(new THREE.DodecahedronGeometry(0.23,0),material("grass"),x,0.43,front+0.2,false);
      group.add(shrub);
    }
    return;
  }

  if (definitionId==="restaurant") {
    for(const x of [-width*0.25,0,width*0.25]) {
      const top=mesh(new THREE.CylinderGeometry(0.29,0.29,0.07,10),material("timber"),x,0.72,front+0.45,false);
      top.rotation.z=Math.PI/2;
      group.add(top);
      box(group,0.05,0.62,0.05,material("metal"),x,0.38,front+0.45,false);
    }
    return;
  }

  if (definitionId==="farm") {
    for(let i=0;i<5;i+=1) {
      box(group,0.08,0.65,0.08,material("timber"),-width*0.42+i*(width*0.84/4),0.33,front+0.15,false);
    }
    for(let i=0;i<4;i+=1) {
      box(group,width*0.82/4,0.06,0.06,material("timber"),-width*0.31+i*(width*0.82/4),0.48,front+0.15,false);
    }
  }
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
  meta: BuildCatalogEntryDto | undefined,
  identity: BuildingVisualIdentity,
): THREE.Group {
  const group=new THREE.Group();
  const width=meta ? meta.footprintCellsX*meta.gridCellMeters : building.definitionId==="town_center" ? 8 : 5;
  const depth=meta ? meta.footprintCellsZ*meta.gridCellMeters : building.definitionId==="town_center" ? 8 : 4;

  switch(building.definitionId) {
    case "town_center": addTownCenter(group,width,depth,identity); break;
    case "house_small": addHouse(group,width,depth,identity); break;
    case "workshop": addWorkshop(group,width,depth,identity); break;
    case "power_plant": addPowerPlant(group,width,depth,identity); break;
    case "water_plant": addWaterPlant(group,width,depth,identity); break;
    case "school": addSchool(group,width,depth,identity); break;
    case "park": addPark(group,width,depth,identity); break;
    case "guard_post": addGuardPost(group,width,depth,identity); break;
    case "farm": addFarm(group,width,depth,identity); break;
    case "restaurant": addRestaurant(group,width,depth,identity); break;
    case "builders_yard": addBuildersYard(group,width,depth,identity); break;
    default:
      addFoundation(group,width,depth);
      box(group,width*0.88,2.8,depth*0.84,material("plasterWarm"),0,1.74,0);
      addGabledRoof(group,width*0.94,depth*0.9,3.14,material("roof"),0.9);
      break;
  }

  addIdentityDressing(group,building.definitionId,width,depth,identity);
  const markerHeight=building.definitionId==="town_center" ? 6.5 : building.definitionId==="park" ? 2.5 : 4.6;
  addDamageMarker(group,building.damageState,markerHeight);
  compactBuilding(group);
  group.position.set(building.position.x,0,building.position.z);
  group.rotation.y=building.rotationY;
  group.userData.buildingId=building.id;
  group.userData.buildingDefinitionId=building.definitionId;
  group.userData.visualVariant=identity.variantName;
  group.userData.visualDialect=identity.dialect.id;
  return group;
}
