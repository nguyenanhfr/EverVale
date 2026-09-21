import * as THREE from "three";

export interface EnvironmentVisualRig {
  scene: THREE.Scene;
  ground: THREE.Mesh;
  sun: THREE.DirectionalLight;
  hemisphere: THREE.HemisphereLight;
  fog: THREE.Fog;
  renderer: THREE.WebGLRenderer;
  skyMaterial: THREE.ShaderMaterial;
  sunDisc: THREE.Sprite;
  moonDisc: THREE.Sprite;
  stars: THREE.Points;
}

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

function addPerimeterLandscape(scene:THREE.Scene): void {
  const group=new THREE.Group();
  group.userData.environmentVisual=true;
  const moundMat=new THREE.MeshStandardMaterial({color:0x667f60,roughness:1,flatShading:true});
  const moundMat2=new THREE.MeshStandardMaterial({color:0x718b66,roughness:1,flatShading:true});
  const placements=[
    [-50,-30,15,8,1],[-49,2,13,7,2],[-48,34,16,9,3],
    [49,-32,16,9,4],[49,2,13,7,5],[48,35,16,8,6],
    [-30,50,15,7,7],[0,50,18,8,8],[31,49,16,7,9],
  ] as const;
  placements.forEach(([x,z,r,h,seed],i)=>{
    const mound=new THREE.Mesh(moundGeometry(r,h,seed),i%2?moundMat:moundMat2);
    mound.position.set(x,-0.08,z);
    mound.receiveShadow=true;
    mound.castShadow=i%3===0;
    group.add(mound);
  });

  const rockGeo=new THREE.DodecahedronGeometry(0.72,0);
  const rockMat=new THREE.MeshStandardMaterial({color:0x777b70,roughness:1,flatShading:true});
  const rocks=new THREE.InstancedMesh(rockGeo,rockMat,18);
  const dummy=new THREE.Object3D();
  for(let i=0;i<18;i+=1) {
    const side=i%2===0?-1:1;
    dummy.position.set(side*(43+pseudo(i+1)*8),0.38+pseudo(i+12)*0.25,-42+pseudo(i+33)*86);
    dummy.rotation.set(pseudo(i+2)*1.3,pseudo(i+7)*Math.PI*2,pseudo(i+11)*1.1);
    const s=0.65+pseudo(i+91)*0.95;
    dummy.scale.set(s,0.65*s,0.85*s);
    dummy.updateMatrix();
    rocks.setMatrixAt(i,dummy.matrix);
  }
  rocks.instanceMatrix.needsUpdate=true;
  rocks.castShadow=false;
  rocks.receiveShadow=true;
  group.add(rocks);

  const bushGeo=new THREE.DodecahedronGeometry(0.68,0);
  const bushMat=new THREE.MeshStandardMaterial({color:0x536f50,roughness:1,flatShading:true});
  const bushes=new THREE.InstancedMesh(bushGeo,bushMat,24);
  for(let i=0;i<24;i+=1) {
    const edge=i%4;
    const along=-48+pseudo(i+200)*96;
    const x=edge<2 ? (edge===0?-46:46) : along;
    const z=edge>=2 ? (edge===2?-46:46) : along;
    dummy.position.set(x,0.55,z);
    dummy.rotation.set(0,pseudo(i+220)*Math.PI*2,0);
    const s=0.65+pseudo(i+250)*0.65;
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
    color:0x718d63,
    roughness:1,
    polygonOffset:true,
    polygonOffsetFactor:-1,
  });
  const patches=new THREE.InstancedMesh(patchGeo,patchMat,9);
  for(let i=0;i<9;i+=1) {
    dummy.position.set(-32+(i%3)*32,0.012,-30+Math.floor(i/3)*30);
    dummy.rotation.set(-Math.PI/2,0,pseudo(i+400)*Math.PI);
    const s=0.7+pseudo(i+410)*0.55;
    dummy.scale.set(s,0.75+s*0.18,1);
    dummy.updateMatrix();
    patches.setMatrixAt(i,dummy.matrix);
  }
  patches.instanceMatrix.needsUpdate=true;
  patches.receiveShadow=true;
  group.add(patches);

  scene.add(group);
}

function createSkyVisuals(scene: THREE.Scene): {
  skyMaterial: THREE.ShaderMaterial;
  sunDisc: THREE.Sprite;
  moonDisc: THREE.Sprite;
  stars: THREE.Points;
} {
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x8fb9c8) },
      bottomColor: { value: new THREE.Color(0xc7d5b8) },
    },
    vertexShader: `
      varying float vSkyY;
      void main() {
        vSkyY = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying float vSkyY;
      void main() {
        float h = smoothstep(-0.28, 0.92, vSkyY);
        h = pow(h, 0.72);
        gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0);
      }
    `,
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(240, 24, 14), skyMaterial);
  skyDome.frustumCulled = false;
  scene.add(skyDome);

  const sunMaterial = new THREE.SpriteMaterial({
    color: 0xffe2a6,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    depthTest: false,
  });
  const sunDisc = new THREE.Sprite(sunMaterial);
  sunDisc.scale.set(13,13,1);
  scene.add(sunDisc);

  const moonMaterial = new THREE.SpriteMaterial({
    color: 0xc9d8e8,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  const moonDisc = new THREE.Sprite(moonMaterial);
  moonDisc.scale.set(7.5,7.5,1);
  scene.add(moonDisc);

  const starPositions:number[]=[];
  for(let i=0;i<110;i+=1) {
    const u=(i*0.61803398875)%1;
    const v=((i*37)%113)/113;
    const theta=u*Math.PI*2;
    const phi=0.18+v*Math.PI*0.36;
    const r=205;
    starPositions.push(
      Math.cos(theta)*Math.sin(phi)*r,
      Math.cos(phi)*r,
      Math.sin(theta)*Math.sin(phi)*r,
    );
  }
  const starGeometry=new THREE.BufferGeometry();
  starGeometry.setAttribute("position",new THREE.Float32BufferAttribute(starPositions,3));
  const starMaterial=new THREE.PointsMaterial({
    color:0xf2e8d0,
    size:0.68,
    transparent:true,
    opacity:0,
    depthWrite:false,
    depthTest:false,
  });
  const stars=new THREE.Points(starGeometry,starMaterial);
  stars.frustumCulled=false;
  scene.add(stars);

  return {skyMaterial,sunDisc,moonDisc,stars};
}

export function createEnvironmentVisuals(
  scene:THREE.Scene,
  renderer:THREE.WebGLRenderer,
): EnvironmentVisualRig {
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;

  const sky=new THREE.Color(0xbfd1c1);
  scene.background=sky;
  const skyVisuals=createSkyVisuals(scene);
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

  const groundGeometry=new THREE.PlaneGeometry(110,110,22,22);
  const groundColors:number[]=[];
  const position=groundGeometry.getAttribute("position");
  const baseColor=new THREE.Color(0x809d70);
  const dryColor=new THREE.Color(0x91a878);
  const deepColor=new THREE.Color(0x708b64);
  for(let i=0;i<position.count;i+=1) {
    const x=position.getX(i);
    const y=position.getY(i);
    const wave=Math.sin(x*0.17)+Math.cos(y*0.13)+Math.sin((x+y)*0.075);
    const mix=Math.max(0,Math.min(1,0.5+wave*0.11));
    const color=deepColor.clone().lerp(baseColor,mix).lerp(dryColor,Math.max(0,wave)*0.055);
    groundColors.push(color.r,color.g,color.b);
  }
  groundGeometry.setAttribute("color",new THREE.Float32BufferAttribute(groundColors,3));
  const ground=new THREE.Mesh(
    groundGeometry,
    new THREE.MeshStandardMaterial({
      vertexColors:true,
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
    new THREE.MeshStandardMaterial({color:0x5e7457,roughness:1}),
  );
  skirt.position.y=-0.74;
  skirt.receiveShadow=true;
  scene.add(skirt);

  addPerimeterLandscape(scene);
  return {scene,ground,sun,hemisphere,fog,renderer,...skyVisuals};
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

  const daySky=new THREE.Color(0xbfd4c4);
  const duskSky=new THREE.Color(0xd5ad8a);
  const nightSky=new THREE.Color(0x52677a);
  const sky=nightSky.clone().lerp(duskSky,Math.max(daylight*0.45,twilight*0.65)).lerp(daySky,daylight);
  const topNight=new THREE.Color(0x34495f);
  const topDusk=new THREE.Color(0x9a7180);
  const topDay=new THREE.Color(0x7fb5d0);
  const bottomNight=new THREE.Color(0x647387);
  const bottomDusk=new THREE.Color(0xe0aa80);
  const bottomDay=new THREE.Color(0xd2dfbd);
  const top=topNight.clone().lerp(topDusk,twilight*0.72).lerp(topDay,daylight);
  const bottom=bottomNight.clone().lerp(bottomDusk,twilight*0.85).lerp(bottomDay,daylight);
  rig.skyMaterial.uniforms.topColor.value.copy(top);
  rig.skyMaterial.uniforms.bottomColor.value.copy(bottom);
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

  const celestialDirection=new THREE.Vector3(Math.cos(angle),Math.sin(angle),Math.sin(angle*0.82)).normalize();
  rig.sunDisc.position.copy(celestialDirection).multiplyScalar(128);
  rig.moonDisc.position.copy(celestialDirection).multiplyScalar(-118);
  (rig.sunDisc.material as THREE.SpriteMaterial).opacity=0.16+daylight*0.68+twilight*0.18;
  (rig.moonDisc.material as THREE.SpriteMaterial).opacity=Math.max(0,nightFactor*0.72-twilight*0.22);
  const starMaterial=rig.stars.material as THREE.PointsMaterial;
  starMaterial.opacity=Math.max(0,Math.min(0.72,nightFactor*0.88-twilight*0.32));
  rig.stars.rotation.y=day*Math.PI*0.35;
  return nightFactor;
}
