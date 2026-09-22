import * as THREE from "three";
import { resolveWorldVisualDialect, type WorldVisualDialect } from "./visual-identity";

export interface EnvironmentVisualRig {
  scene: THREE.Scene;
  ground: THREE.Mesh;
  sun: THREE.DirectionalLight;
  hemisphere: THREE.HemisphereLight;
  fog: THREE.Fog;
  renderer: THREE.WebGLRenderer;
  dialect: WorldVisualDialect;
}

const environmentPalettes: Readonly<Record<WorldVisualDialect, {
  ground: number;
  skirt: number;
  moundA: number;
  moundB: number;
  rock: number;
  bush: number;
  patch: number;
  grassBlade: number;
  flower: number;
  crown: number;
  daySky: number;
}>> = {
  hearthstone: {
    ground: 0x809d70,
    skirt: 0x5e7457,
    moundA: 0x667f60,
    moundB: 0x718b66,
    rock: 0x777b70,
    bush: 0x536f50,
    patch: 0x718d63,
    grassBlade: 0x5f7d55,
    flower: 0xd8b76f,
    crown: 0x4f6d4b,
    daySky: 0xbfd4c4,
  },
  willowbrook: {
    ground: 0x789b73,
    skirt: 0x587257,
    moundA: 0x617f61,
    moundB: 0x6f9270,
    rock: 0x768178,
    bush: 0x4f7456,
    patch: 0x6f936c,
    grassBlade: 0x547b5b,
    flower: 0xc8c786,
    crown: 0x487452,
    daySky: 0xbfd6ca,
  },
  amberfield: {
    ground: 0x92945f,
    skirt: 0x726d4d,
    moundA: 0x7f8057,
    moundB: 0x939065,
    rock: 0x8a7d67,
    bush: 0x6e754d,
    patch: 0x89895b,
    grassBlade: 0x74794d,
    flower: 0xd5a45d,
    crown: 0x667149,
    daySky: 0xcbd0b7,
  },
  bluebell: {
    ground: 0x769483,
    skirt: 0x596f69,
    moundA: 0x627c72,
    moundB: 0x728e82,
    rock: 0x747f80,
    bush: 0x557267,
    patch: 0x6e8d7c,
    grassBlade: 0x57796d,
    flower: 0x9fb4c7,
    crown: 0x4e6f64,
    daySky: 0xbccfd0,
  },
};

function pseudo(seed:number): number {
  const x=Math.sin(seed*12.9898+78.233)*43758.5453;
  return x-Math.floor(x);
}

function moundGeometry(radius:number,height:number,seed:number): THREE.BufferGeometry {
  const rings=6;
  const segments=18;
  const positions:number[]=[0,height,0];
  const indices:number[]=[];
  for(let ring=1;ring<=rings;ring+=1) {
    const r=ring/rings;
    const ringRadius=radius*r;
    const fade=1-r;
    for(let i=0;i<segments;i+=1) {
      const angle=(i/segments)*Math.PI*2;
      const wobble=(pseudo(seed+ring*31+i*17)-0.5)*0.22;
      const rr=ringRadius*(1+wobble*fade);
      const base=Math.pow(1-r,1.45)*height;
      const noise=(pseudo(seed+i*7+ring*101)-0.5)*height*0.22*fade;
      positions.push(Math.cos(angle)*rr,Math.max(0,base+noise),Math.sin(angle)*rr);
    }
  }
  const idx=(ring:number,i:number)=>1+(ring-1)*segments+(i%segments+segments)%segments;
  for(let i=0;i<segments;i+=1) indices.push(0,idx(1,i+1),idx(1,i));
  for(let ring=1;ring<rings;ring+=1) {
    for(let i=0;i<segments;i+=1) {
      const a=idx(ring,i),b=idx(ring,i+1),c=idx(ring+1,i),d=idx(ring+1,i+1);
      indices.push(a,b,c,b,d,c);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addPerimeterLandscape(scene:THREE.Scene,dialect:WorldVisualDialect,worldSeed:number): void {
  const group=new THREE.Group();
  group.userData.environmentVisual=true;
  const palette=environmentPalettes[dialect];
  const seedBase=Math.abs(worldSeed%100000);
  const seeded=(salt:number)=>pseudo(seedBase+salt);
  const moundMat=new THREE.MeshStandardMaterial({color:palette.moundA,roughness:1,flatShading:true});
  const moundMat2=new THREE.MeshStandardMaterial({color:palette.moundB,roughness:1,flatShading:true});
  const placements=[
    [-50,-30,15,8,1],[-49,2,13,7,2],[-48,34,16,9,3],
    [49,-32,16,9,4],[49,2,13,7,5],[48,35,16,8,6],
    [-30,50,15,7,7],[0,50,18,8,8],[31,49,16,7,9],
  ] as const;
  placements.forEach(([x,z,r,h,seed],i)=>{
    const mound=new THREE.Mesh(moundGeometry(r,h,seedBase+seed),i%2?moundMat:moundMat2);
    mound.position.set(
      x+(seeded(seed*101)-0.5)*3.2,
      -0.08,
      z+(seeded(seed*131)-0.5)*3.2,
    );
    mound.receiveShadow=true;
    mound.castShadow=i%3===0;
    group.add(mound);
  });

  const rockGeo=new THREE.DodecahedronGeometry(0.72,0);
  const rockMat=new THREE.MeshStandardMaterial({color:palette.rock,roughness:1,flatShading:true});
  const rocks=new THREE.InstancedMesh(rockGeo,rockMat,18);
  const dummy=new THREE.Object3D();
  for(let i=0;i<18;i+=1) {
    const side=i%2===0?-1:1;
    dummy.position.set(side*(43+seeded(i+1)*8),0.38+seeded(i+12)*0.25,-42+seeded(i+33)*86);
    dummy.rotation.set(seeded(i+2)*1.3,seeded(i+7)*Math.PI*2,seeded(i+11)*1.1);
    const s=0.65+seeded(i+91)*0.95;
    dummy.scale.set(s,0.65*s,0.85*s);
    dummy.updateMatrix();
    rocks.setMatrixAt(i,dummy.matrix);
  }
  rocks.instanceMatrix.needsUpdate=true;
  rocks.castShadow=false;
  rocks.receiveShadow=true;
  group.add(rocks);

  const bushGeo=new THREE.DodecahedronGeometry(0.68,0);
  const bushMat=new THREE.MeshStandardMaterial({color:palette.bush,roughness:1,flatShading:true});
  const bushes=new THREE.InstancedMesh(bushGeo,bushMat,24);
  for(let i=0;i<24;i+=1) {
    const edge=i%4;
    const along=-48+seeded(i+200)*96;
    const x=edge<2 ? (edge===0?-46:46) : along;
    const z=edge>=2 ? (edge===2?-46:46) : along;
    dummy.position.set(x,0.55,z);
    dummy.rotation.set(0,seeded(i+220)*Math.PI*2,0);
    const s=0.65+seeded(i+250)*0.65;
    dummy.scale.set(s,0.75*s,s);
    dummy.updateMatrix();
    bushes.setMatrixAt(i,dummy.matrix);
  }
  bushes.instanceMatrix.needsUpdate=true;
  bushes.castShadow=false;
  bushes.receiveShadow=true;
  group.add(bushes);

  const patchGeo=new THREE.CircleGeometry(5.5,10);
  const patchMat=new THREE.MeshStandardMaterial({
    color:palette.patch,
    roughness:1,
    polygonOffset:true,
    polygonOffsetFactor:-1,
  });
  const patches=new THREE.InstancedMesh(patchGeo,patchMat,9);
  for(let i=0;i<9;i+=1) {
    dummy.position.set(-32+(i%3)*32,0.012,-30+Math.floor(i/3)*30);
    dummy.rotation.set(-Math.PI/2,0,seeded(i+400)*Math.PI);
    const s=0.7+seeded(i+410)*0.55;
    dummy.scale.set(s,0.75+s*0.18,1);
    dummy.updateMatrix();
    patches.setMatrixAt(i,dummy.matrix);
  }
  patches.instanceMatrix.needsUpdate=true;
  patches.receiveShadow=true;
  group.add(patches);

  const grassBladeGeo = new THREE.ConeGeometry(0.08, 0.55, 4);
  const grassBladeMat = new THREE.MeshStandardMaterial({
    color: palette.grassBlade,
    roughness: 1,
    flatShading: true,
  });
  const grass = new THREE.InstancedMesh(grassBladeGeo, grassBladeMat, 120);
  for (let i = 0; i < 120; i += 1) {
    const angle = pseudo(i + 500) * Math.PI * 2;
    const radius = 29 + pseudo(i + 520) * 19;
    dummy.position.set(
      Math.cos(angle) * radius,
      0.24,
      Math.sin(angle) * radius,
    );
    dummy.rotation.set(
      (pseudo(i + 540) - 0.5) * 0.16,
      pseudo(i + 560) * Math.PI * 2,
      (pseudo(i + 580) - 0.5) * 0.18,
    );
    const s = 0.7 + pseudo(i + 600) * 0.85;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
  }
  grass.instanceMatrix.needsUpdate = true;
  grass.castShadow = false;
  grass.receiveShadow = true;
  group.add(grass);

  const flowerGeo = new THREE.OctahedronGeometry(0.1, 0);
  const flowerMat = new THREE.MeshStandardMaterial({
    color: palette.flower,
    roughness: 0.95,
    flatShading: true,
  });
  const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, 48);
  for (let i = 0; i < 48; i += 1) {
    const angle = pseudo(i + 700) * Math.PI * 2;
    const radius = 27 + pseudo(i + 720) * 17;
    dummy.position.set(
      Math.cos(angle) * radius,
      0.34 + pseudo(i + 740) * 0.08,
      Math.sin(angle) * radius,
    );
    dummy.rotation.set(0, pseudo(i + 760) * Math.PI * 2, 0);
    const s = 0.7 + pseudo(i + 780) * 0.55;
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);
  }
  flowers.instanceMatrix.needsUpdate = true;
  flowers.castShadow = false;
  group.add(flowers);

  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.24, 2.15, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x70553e, roughness: 1 });
  const treeTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, 22);
  const crownGeo = new THREE.DodecahedronGeometry(0.82, 0);
  const crownMat = new THREE.MeshStandardMaterial({
    color: palette.crown,
    roughness: 1,
    flatShading: true,
  });
  const treeCrowns = new THREE.InstancedMesh(crownGeo, crownMat, 22);
  for (let i = 0; i < 22; i += 1) {
    const angle = (i / 22) * Math.PI * 2 + (pseudo(i + 820) - 0.5) * 0.2;
    const radius = 43 + pseudo(i + 840) * 7;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const s = 0.78 + pseudo(i + 860) * 0.65;

    dummy.position.set(x, 1.05 * s, z);
    dummy.rotation.set(0, pseudo(i + 880) * Math.PI * 2, 0);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    treeTrunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, 2.55 * s, z);
    dummy.rotation.set(
      0,
      pseudo(i + 900) * Math.PI * 2,
      (pseudo(i + 920) - 0.5) * 0.12,
    );
    dummy.scale.set(1.05 * s, 0.88 * s, 1.05 * s);
    dummy.updateMatrix();
    treeCrowns.setMatrixAt(i, dummy.matrix);
  }
  treeTrunks.instanceMatrix.needsUpdate = true;
  treeCrowns.instanceMatrix.needsUpdate = true;
  treeTrunks.castShadow = false;
  treeCrowns.castShadow = false;
  treeTrunks.receiveShadow = true;
  treeCrowns.receiveShadow = true;
  group.add(treeTrunks, treeCrowns);

  scene.add(group);
}

export function createEnvironmentVisuals(
  scene:THREE.Scene,
  renderer:THREE.WebGLRenderer,
  worldSeed:number,
): EnvironmentVisualRig {
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
  renderer.outputColorSpace=THREE.SRGBColorSpace;

  const dialect=resolveWorldVisualDialect(worldSeed);
  const palette=environmentPalettes[dialect];
  const sky=new THREE.Color(palette.daySky);
  scene.background=sky;
  const fog=new THREE.Fog(sky,86,178);
  scene.fog=fog;

  const hemisphere=new THREE.HemisphereLight(0xf4ead2,0x526456,1.75);
  scene.add(hemisphere);

  const sun=new THREE.DirectionalLight(0xffedc9,2.45);
  sun.position.set(38,58,28);
  sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  sun.shadow.camera.near=1;
  sun.shadow.camera.far=170;
  sun.shadow.camera.left=-58;
  sun.shadow.camera.right=58;
  sun.shadow.camera.top=58;
  sun.shadow.camera.bottom=-58;
  sun.shadow.normalBias=0.035;
  sun.shadow.bias=-0.00018;
  scene.add(sun);
  scene.add(sun.target);

  const ground=new THREE.Mesh(
    new THREE.PlaneGeometry(110,110,12,12),
    new THREE.MeshStandardMaterial({
      color:palette.ground,
      roughness:1,
      metalness:0,
    }),
  );
  ground.rotation.x=-Math.PI/2;
  ground.receiveShadow=true;
  ground.name="ground";
  scene.add(ground);

  const skirt=new THREE.Mesh(
    new THREE.BoxGeometry(112,1.4,112),
    new THREE.MeshStandardMaterial({color:palette.skirt,roughness:1}),
  );
  skirt.position.y=-0.74;
  skirt.receiveShadow=true;
  scene.add(skirt);

  addPerimeterLandscape(scene,dialect,worldSeed);
  return {scene,ground,sun,hemisphere,fog,renderer,dialect};
}

function smoothstep(a:number,b:number,x:number): number {
  const t=Math.max(0,Math.min(1,(x-a)/(b-a)));
  return t*t*(3-2*t);
}

export function updateEnvironmentLighting(
  rig:EnvironmentVisualRig,
  day:number,
): number {
  const angle=(day-0.25)*Math.PI*2;
  const elevation=Math.sin(angle);
  const daylight=smoothstep(-0.12,0.18,elevation);
  const twilight=1-Math.min(1,Math.abs(elevation)/0.42);
  const nightFactor=1-daylight;

  const daySky=new THREE.Color(environmentPalettes[rig.dialect].daySky);
  const duskSky=new THREE.Color(0xd5ad8a);
  const nightSky=new THREE.Color(0x52677a);
  const sky=nightSky.clone().lerp(duskSky,Math.max(daylight*0.45,twilight*0.65)).lerp(daySky,daylight);
  rig.renderer.toneMappingExposure=0.98+daylight*0.16+twilight*0.04;
  rig.fog.color.copy(sky);
  if (rig.scene.background instanceof THREE.Color) rig.scene.background.copy(sky);

  rig.sun.intensity=0.3+daylight*2.3+twilight*0.32;
  rig.hemisphere.intensity=0.82+daylight*1.05;
  rig.hemisphere.color.copy(new THREE.Color(0xaec4d2).lerp(new THREE.Color(0xffefd1),daylight));
  rig.hemisphere.groundColor.copy(new THREE.Color(0x435363).lerp(new THREE.Color(0x64725f),daylight));
  rig.sun.color.copy(new THREE.Color(0xffa45f).lerp(new THREE.Color(0xfff0ce),daylight));
  rig.sun.position.set(Math.cos(angle)*52,Math.max(10,18+Math.max(0,elevation)*52),Math.sin(angle)*42);
  rig.sun.target.position.set(0,0,0);
  return nightFactor;
}
