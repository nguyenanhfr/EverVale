import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import "./people-demo.css";
import {
  createSculptedBuilder,
  createSculptedTeacher,
  createSculptedUtilityTechnician,
} from "./world/actors/generated/sculpted-starter-reference-factories";
import type {
  CitizenPresentationRole,
} from "./world/visual-identity";

type DemoRole = "builder" | "teacher" | "utility_technician";
type DemoMode = "all" | DemoRole;

interface DemoActor {
  role: DemoRole;
  object: THREE.Object3D;
  basePosition: THREE.Vector3;
  phase: number;
}

const root = document.querySelector<HTMLDivElement>("#people-demo-root");
if (!root) throw new Error("PEOPLE_DEMO_ROOT_MISSING");

root.innerHTML = `
  <div class="people-demo-shell">
    <div class="people-demo-panel">
      <div class="people-demo-badge">isolated visual test</div>
      <h1>EverVale People Demo</h1>
      <p>
        Standalone render only. No server, simulation, pathfinding or gameplay.
        Use this page to judge character shape before the models enter the game.
      </p>
      <div class="people-demo-controls">
        <button data-mode="all" class="active">All 3</button>
        <button data-mode="builder">Builder</button>
        <button data-mode="teacher">Teacher</button>
        <button data-mode="utility_technician">Utility</button>
        <button data-action="walk">Walk: ON</button>
        <button data-action="turntable">Turntable: OFF</button>
        <button data-action="reset">Reset camera</button>
      </div>
    </div>
    <div class="people-demo-hint">Left drag: orbit · Right drag: pan · Wheel: zoom</div>
  </div>
`;

const shellQuery = root.querySelector<HTMLDivElement>(".people-demo-shell");
if (!shellQuery) throw new Error("PEOPLE_DEMO_SHELL_MISSING");
const shell: HTMLDivElement = shellQuery;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd8e2d2);
scene.fog = new THREE.Fog(0xd8e2d2, 18, 38);

const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 120);
camera.position.set(6.8, 4.8, 8.6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.domElement.className = "people-demo-canvas";
shell.prepend(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.target.set(0, 1.05, 0);
controls.minDistance = 2.2;
controls.maxDistance = 22;
controls.minPolarAngle = 0.12;
controls.maxPolarAngle = Math.PI / 2 - 0.03;
controls.enablePan = true;
controls.zoomToCursor = true;

const hemi = new THREE.HemisphereLight(0xf5f2df, 0x687463, 2.4);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffe5bd, 3.4);
sun.position.set(7, 10, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -10;
sun.shadow.camera.right = 10;
sun.shadow.camera.top = 10;
sun.shadow.camera.bottom = -10;
scene.add(sun);

const fill = new THREE.DirectionalLight(0xbfd6df, 0.85);
fill.position.set(-5, 4, -5);
scene.add(fill);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(10.5, 64),
  new THREE.MeshStandardMaterial({
    color: 0x9fb690,
    roughness: 0.98,
  }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const platform = new THREE.Mesh(
  new THREE.CylinderGeometry(4.7, 5.1, 0.18, 48),
  new THREE.MeshStandardMaterial({
    color: 0xc7c2ac,
    roughness: 0.94,
  }),
);
platform.position.y = 0.05;
platform.receiveShadow = true;
scene.add(platform);

const grid = new THREE.GridHelper(8, 8, 0x7f8c78, 0xb2b9a8);
grid.position.y = 0.15;
(grid.material as THREE.Material).transparent = true;
(grid.material as THREE.Material).opacity = 0.24;
scene.add(grid);

const factoryMap = {
  builder: createSculptedBuilder,
  teacher: createSculptedTeacher,
  utility_technician: createSculptedUtilityTechnician,
} as const;

const placements: Record<DemoRole, THREE.Vector3> = {
  builder: new THREE.Vector3(-2.15, 0.16, 0.25),
  teacher: new THREE.Vector3(0, 0.16, -0.1),
  utility_technician: new THREE.Vector3(2.15, 0.16, 0.25),
};

const actors: DemoActor[] = (
  Object.keys(factoryMap) as DemoRole[]
).map((role, index) => {
  const factory = factoryMap[role];
  const object = factory({
    worldSeed: "people-demo-v1",
    presentationSlot: index,
    child: false,
    role: role as CitizenPresentationRole,
    castShadow: true,
  });
  object.position.copy(placements[role]);
  object.rotation.y = role === "builder" ? 0.18 : role === "utility_technician" ? -0.18 : 0;
  scene.add(object);
  return {
    role,
    object,
    basePosition: placements[role].clone(),
    phase: index * 2.1,
  };
});

const roleLabels: Record<DemoRole, string> = {
  builder: "Builder",
  teacher: "Teacher",
  utility_technician: "Utility Technician",
};

for (const actor of actors) {
  const spriteCanvas = document.createElement("canvas");
  spriteCanvas.width = 320;
  spriteCanvas.height = 80;
  const context = spriteCanvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, spriteCanvas.width, spriteCanvas.height);
    context.font = "700 27px Inter, Arial";
    context.textAlign = "center";
    context.fillStyle = "#2e342c";
    context.fillText(roleLabels[actor.role], 160, 48);
  }
  const texture = new THREE.CanvasTexture(spriteCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );
  sprite.scale.set(2.25, 0.56, 1);
  sprite.position.copy(actor.basePosition).add(new THREE.Vector3(0, 2.65, 0));
  sprite.userData.role = actor.role;
  scene.add(sprite);
}

let demoMode: DemoMode = "all";
let walking = true;
let turntable = false;
let elapsed = 0;

function updateVisibility(): void {
  for (const actor of actors) {
    actor.object.visible = demoMode === "all" || demoMode === actor.role;
  }

  scene.traverse((object) => {
    if (!(object instanceof THREE.Sprite)) return;
    const role = object.userData.role as DemoRole | undefined;
    if (!role) return;
    object.visible = demoMode === "all" || demoMode === role;
  });
}

function resetCamera(): void {
  camera.position.set(6.8, 4.8, 8.6);
  controls.target.set(0, 1.05, 0);
  controls.update();
}

for (const button of root.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
  button.addEventListener("click", () => {
    const next = button.dataset.mode as DemoMode;
    demoMode = next;
    for (const peer of root.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
      peer.classList.toggle("active", peer === button);
    }
    updateVisibility();
  });
}

root.querySelector<HTMLButtonElement>('[data-action="walk"]')?.addEventListener("click", (event) => {
  walking = !walking;
  (event.currentTarget as HTMLButtonElement).textContent = `Walk: ${walking ? "ON" : "OFF"}`;
});

root.querySelector<HTMLButtonElement>('[data-action="turntable"]')?.addEventListener("click", (event) => {
  turntable = !turntable;
  (event.currentTarget as HTMLButtonElement).textContent = `Turntable: ${turntable ? "ON" : "OFF"}`;
});

root.querySelector<HTMLButtonElement>('[data-action="reset"]')?.addEventListener("click", resetCamera);

function resize(): void {
  const width = shell.clientWidth;
  const height = shell.clientHeight;
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(shell);
resize();

const clock = new THREE.Clock();

function frame(): void {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  for (const actor of actors) {
    const tick = actor.object.userData.tick as
      | ((delta: number, elapsedSeconds: number) => void)
      | undefined;
    tick?.(dt, elapsed);

    if (walking) {
      actor.object.position.y = actor.basePosition.y + Math.abs(Math.sin(elapsed * 6 + actor.phase)) * 0.025;
      actor.object.rotation.y =
        (actor.role === "builder" ? 0.18 : actor.role === "utility_technician" ? -0.18 : 0) +
        Math.sin(elapsed * 1.35 + actor.phase) * 0.055;
    } else {
      actor.object.position.y = actor.basePosition.y;
    }
  }

  if (turntable) {
    const radius = camera.position.distanceTo(controls.target);
    const angle = elapsed * 0.22;
    camera.position.x = controls.target.x + Math.cos(angle) * radius;
    camera.position.z = controls.target.z + Math.sin(angle) * radius;
  }

  controls.update();
  renderer.render(scene, camera);
}

frame();

window.addEventListener("beforeunload", () => {
  resizeObserver.disconnect();
  renderer.dispose();
});
