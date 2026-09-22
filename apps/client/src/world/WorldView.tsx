import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { routeAlongRoads, samplePolyline } from "@evervale/domain/road-routing";
import type { WorldState } from "@evervale/domain/world.types";
import type { BuildCatalogEntryDto, PropCatalogEntryDto } from "@evervale/protocol/world";
import { createPropObject, makeSelectionRing } from "./prop-factory";
import { createBuildingVisual } from "./building-visual";
import { resolveBuildingVisualIdentities } from "./visual-identity";
import { createRoadVisual } from "./road-visual";
import { animateCitizenVisual, createCitizenVisual, createDogVisual } from "./actor-visual";
import type { CitizenVisualRole } from "./actor-visual";
import { createAmbientVisuals, updateAmbientVisuals } from "./ambient-visual";
import { createEnvironmentVisuals, updateEnvironmentLighting } from "./environment-visual";
import {
  constructionVisualState,
  createBuilderObject,
  createConstructionObject,
} from "./construction-visual";

export interface RuntimeMetrics {
  fps: number;
  frameMsP95: number;
  drawCalls: number;
  triangles: number;
  animatedCitizens: number;
  routedCitizens: number;
  disconnectedRoutes: number;
}

function citizenRoleForJob(definitionId: string | undefined): CitizenVisualRole {
  switch (definitionId) {
    case "workshop":
      return "workshop_worker";
    case "power_plant":
    case "water_plant":
      return "utility_technician";
    case "school":
      return "teacher";
    case "guard_post":
      return "guard";
    default:
      return "resident";
  }
}

interface Props {
  world: WorldState;
  mode: "SELECT" | "BUILD" | "ROAD" | "DECOR" | "MOVE_PROP";
  selectedBuild: BuildCatalogEntryDto | null;
  buildCatalog: BuildCatalogEntryDto[];
  selectedProp: PropCatalogEntryDto | null;
  propCatalog: PropCatalogEntryDto[];
  propRotation: number;
  selectedPropId: string | null;
  selectedBuildingId: string | null;
  movingPropId: string | null;
  roadStart: { x: number; z: number } | null;
  visualPopulationOverride: number | null;
  onGroundClick(position: { x: number; z: number }): void;
  onPropSelect(propId: string | null): void;
  onBuildingSelect(buildingId: string | null): void;
  onRouting?(routedCitizens: number, disconnectedRoutes: number): void;
  onMetrics: ((metrics: RuntimeMetrics) => void) | undefined;
}

function makeBlocker(blocker: WorldState["blockers"][number]): THREE.Object3D {
  const group = new THREE.Group();

  if (blocker.definitionId === "fallen_tree") {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.55, 6, 8),
      new THREE.MeshStandardMaterial({ color: 0x795b3d, roughness: 1 }),
    );
    trunk.rotation.z = Math.PI / 2;
    trunk.position.y = 0.55;
    trunk.castShadow = true;
    group.add(trunk);
    for (const x of [-2.4, 2.4]) {
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(1.3, 2.2, 7),
        new THREE.MeshStandardMaterial({ color: 0x526f49, roughness: 1 }),
      );
      crown.position.set(x, 1.1, 0);
      crown.castShadow = true;
      group.add(crown);
    }
  } else {
    for (let i = 0; i < 5; i += 1) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.7 + (i % 3) * 0.18, 0),
        new THREE.MeshStandardMaterial({ color: 0x77776e, roughness: 1 }),
      );
      rock.scale.y = 0.7;
      rock.position.set((i % 3) * 1.2 - 1.2, 0.5, Math.floor(i / 3) * 1.2 - 0.5);
      rock.rotation.set(i * 0.4, i * 0.7, 0);
      rock.castShadow = true;
      group.add(rock);
    }
  }

  if (blocker.state === "CLEARING") {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.12, 6, 24),
      new THREE.MeshBasicMaterial({ color: 0xd7aa54 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.12;
    group.add(ring);
  }

  group.position.set(blocker.position.x, 0, blocker.position.z);
  return group;
}

function pointSegmentDistance(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const len2 = vx * vx + vz * vz;
  const t = len2 <= 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wz * vz) / len2));
  return Math.hypot(px - (ax + t * vx), pz - (az + t * vz));
}

function approximateBuildingPlacementValid(
  world: WorldState,
  selected: BuildCatalogEntryDto,
  x: number,
  z: number,
): boolean {
  const width = selected.footprintCellsX * selected.gridCellMeters;
  const depth = selected.footprintCellsZ * selected.gridCellMeters;

  const collision = world.buildings.some((b) => (
    Math.abs(b.position.x - x) < (6 + width) / 2 &&
    Math.abs(b.position.z - z) < (5 + depth) / 2
  ));
  if (collision) return false;

  const blocked = world.blockers.some((b) => {
    const dx = Math.max(0, Math.abs(b.position.x - x) - width / 2);
    const dz = Math.max(0, Math.abs(b.position.z - z) - depth / 2);
    return Math.hypot(dx, dz) < 3.5;
  });
  if (blocked) return false;

  return world.roads.some((road) =>
    pointSegmentDistance(x, z, road.from.x, road.from.z, road.to.x, road.to.z) <= 10
  );
}

function approximatePropPlacementValid(
  world: WorldState,
  catalog: PropCatalogEntryDto[],
  selected: PropCatalogEntryDto,
  x: number,
  z: number,
  rotationY: number,
  ignorePropId: string | null,
): boolean {
  const c = Math.abs(Math.cos(rotationY));
  const s = Math.abs(Math.sin(rotationY));
  const width = selected.sizeXMeters * c + selected.sizeZMeters * s;
  const depth = selected.sizeXMeters * s + selected.sizeZMeters * c;

  const buildingCollision = world.buildings.some((building) => (
    Math.abs(building.position.x - x) < 3 + width / 2 &&
    Math.abs(building.position.z - z) < 2.5 + depth / 2
  ));
  if (buildingCollision) return false;

  const propCollision = (world.props ?? []).some((prop) => {
    if (prop.id === ignorePropId) return false;
    const meta = catalog.find((item) => item.id === prop.definitionId);
    if (!meta) return false;
    const pc = Math.abs(Math.cos(prop.rotationY));
    const ps = Math.abs(Math.sin(prop.rotationY));
    const otherW = meta.sizeXMeters * pc + meta.sizeZMeters * ps;
    const otherD = meta.sizeXMeters * ps + meta.sizeZMeters * pc;
    return (
      Math.abs(prop.position.x - x) < (otherW + width) / 2 &&
      Math.abs(prop.position.z - z) < (otherD + depth) / 2
    );
  });
  if (propCollision) return false;

  return !world.blockers.some((blocker) => {
    const dx = Math.max(0, Math.abs(blocker.position.x - x) - width / 2);
    const dz = Math.max(0, Math.abs(blocker.position.z - z) - depth / 2);
    return Math.hypot(dx, dz) < 3.5;
  });
}

interface VisualRoute {
  connected: boolean;
  points: Array<{x:number;z:number}>;
}

function routePoint(
  route: VisualRoute | undefined,
  t: number,
  fallback: {x:number;z:number},
): {x:number;z:number} {
  if (!route?.connected || route.points.length === 0) return fallback;
  return samplePolyline(route.points, t);
}

function schedulePosition(
  current: WorldState,
  mesh: THREE.Mesh,
): { x: number; z: number; activity: string } {
  const home = mesh.userData.home as {x:number;z:number};
  const work = mesh.userData.work as {x:number;z:number};
  const leisure = mesh.userData.leisure as {x:number;z:number};
  const homeToWork = mesh.userData.homeToWork as VisualRoute | undefined;
  const workToLeisure = mesh.userData.workToLeisure as VisualRoute | undefined;
  const leisureToHome = mesh.userData.leisureToHome as VisualRoute | undefined;
  const homeToShelter = mesh.userData.homeToShelter as VisualRoute | undefined;
  const child = Boolean(mesh.userData.child);
  const hour = ((current.simulationSeconds % 1440) / 1440) * 24;

  if (current.combat && current.combat.status !== "RESOLVED") {
    return {
      ...routePoint(
        homeToShelter,
        Math.min(1, current.combat.elapsedSeconds / 5),
        home,
      ),
      activity: homeToShelter?.connected ? "SHELTER" : "SHELTER_BLOCKED",
    };
  }

  const commute = (
    startHour: number,
    endHour: number,
    route: VisualRoute | undefined,
    fallback: {x:number;z:number},
    activity: string,
  ) => {
    const t = Math.max(0, Math.min(1, (hour - startHour) / Math.max(0.01, endHour - startHour)));
    return {
      ...routePoint(route, t, fallback),
      activity: route?.connected ? activity : `${activity}_BLOCKED`,
    };
  };

  if (child) {
    if (hour < 7.5) return { ...home, activity: "HOME" };
    if (hour < 8.5) return commute(7.5, 8.5, homeToWork, home, "TO_SCHOOL");
    if (hour < 15) return { ...work, activity: "SCHOOL" };
    if (hour < 16) return commute(15, 16, workToLeisure, work, "TO_PLAY");
    if (hour < 18.5) return { ...leisure, activity: "PLAY" };
    if (hour < 19.5) return commute(18.5, 19.5, leisureToHome, leisure, "HOMEWARD");
    return { ...home, activity: "HOME" };
  }

  if (hour < 6.5) return { ...home, activity: "HOME" };
  if (hour < 8) return commute(6.5, 8, homeToWork, home, "TO_WORK");
  if (hour < 17) return { ...work, activity: "WORK" };
  if (hour < 18) return commute(17, 18, workToLeisure, work, "TO_LEISURE");
  if (hour < 20.5) return { ...leisure, activity: "LEISURE" };
  if (hour < 21.5) return commute(20.5, 21.5, leisureToHome, leisure, "HOMEWARD");
  return { ...home, activity: "HOME" };
}

export function WorldView({
  world,
  mode,
  selectedBuild,
  buildCatalog,
  selectedProp,
  propCatalog,
  propRotation,
  selectedPropId,
  selectedBuildingId,
  movingPropId,
  roadStart,
  visualPopulationOverride,
  onGroundClick,
  onPropSelect,
  onBuildingSelect,
  onRouting,
  onMetrics,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef(world);
  const clickRef = useRef(onGroundClick);
  const metricsRef = useRef(onMetrics);
  const modeRef = useRef(mode);
  const selectedBuildRef = useRef(selectedBuild);
  const buildCatalogRef = useRef(buildCatalog);
  const selectedPropRef = useRef(selectedProp);
  const propCatalogRef = useRef(propCatalog);
  const propRotationRef = useRef(propRotation);
  const selectedPropIdRef = useRef(selectedPropId);
  const selectedBuildingIdRef = useRef(selectedBuildingId);
  const movingPropIdRef = useRef(movingPropId);
  const propSelectRef = useRef(onPropSelect);
  const buildingSelectRef = useRef(onBuildingSelect);
  const routingRef = useRef(onRouting);
  const roadStartRef = useRef(roadStart);
  const visualPopulationRef = useRef(visualPopulationOverride);
  const citizensRef = useRef<THREE.Mesh[]>([]);
  const animalsRef = useRef<THREE.Object3D[]>([]);
  const propWaterRef = useRef<THREE.Mesh[]>([]);
  const propGlowRef = useRef<THREE.Mesh[]>([]);
  const buildingGlowRef = useRef<THREE.Mesh[]>([]);
  const buildersRef = useRef<Array<{
    object: THREE.Group;
    route: { connected: boolean; points: Array<{x:number;z:number}> };
    site: {x:number;z:number};
    buildingId: string;
  }>>([]);

  useEffect(() => { worldRef.current = world; }, [world]);
  useEffect(() => { clickRef.current = onGroundClick; }, [onGroundClick]);
  useEffect(() => { metricsRef.current = onMetrics; }, [onMetrics]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { selectedBuildRef.current = selectedBuild; }, [selectedBuild]);
  useEffect(() => { buildCatalogRef.current = buildCatalog; }, [buildCatalog]);
  useEffect(() => { selectedPropRef.current = selectedProp; }, [selectedProp]);
  useEffect(() => { propCatalogRef.current = propCatalog; }, [propCatalog]);
  useEffect(() => { propRotationRef.current = propRotation; }, [propRotation]);
  useEffect(() => { selectedPropIdRef.current = selectedPropId; }, [selectedPropId]);
  useEffect(() => { selectedBuildingIdRef.current = selectedBuildingId; }, [selectedBuildingId]);
  useEffect(() => { movingPropIdRef.current = movingPropId; }, [movingPropId]);
  useEffect(() => { propSelectRef.current = onPropSelect; }, [onPropSelect]);
  useEffect(() => { buildingSelectRef.current = onBuildingSelect; }, [onBuildingSelect]);
  useEffect(() => { routingRef.current = onRouting; }, [onRouting]);
  useEffect(() => { roadStartRef.current = roadStart; }, [roadStart]);
  useEffect(() => { visualPopulationRef.current = visualPopulationOverride; }, [visualPopulationOverride]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
    camera.position.set(46, 50, 55);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.15, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.minPolarAngle = 0.62;
    controls.maxPolarAngle = 1.08;
    controls.minDistance = 22;
    controls.maxDistance = 120;

    const environment = createEnvironmentVisuals(scene, renderer, world.seed);
    host.dataset.visualDialect = environment.dialect;
    host.dataset.visualScatter = environment.scatterSignature;
    const ambient = createAmbientVisuals(scene);
    const ground = environment.ground;

    const buildGrid = new THREE.GridHelper(110, 55, 0x687c62, 0x748b6c);
    buildGrid.position.y = 0.035;
    buildGrid.material.transparent = true;
    buildGrid.material.opacity = 0.32;
    scene.add(buildGrid);

    const decorGrid = new THREE.GridHelper(110, 110, 0x718369, 0x7c9273);
    decorGrid.position.y = 0.04;
    decorGrid.material.transparent = true;
    decorGrid.material.opacity = 0.18;
    scene.add(decorGrid);

    const dynamic = new THREE.Group();
    scene.add(dynamic);

    const preview = new THREE.Group();
    scene.add(preview);

    const ghostMaterial = new THREE.MeshStandardMaterial({
      color: 0x75b76e,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const buildGhost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ghostMaterial);
    buildGhost.position.y = 0.18;
    preview.add(buildGhost);

    const roadPreviewMaterial = new THREE.MeshBasicMaterial({
      color: 0x75b76e,
      transparent: true,
      opacity: 0.65,
    });
    const roadPreview = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1), roadPreviewMaterial);
    preview.add(roadPreview);

    const propPreview = new THREE.Group();
    preview.add(propPreview);
    const propFootprintMaterial = new THREE.MeshBasicMaterial({
      color: 0x75b76e,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const propFootprint = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), propFootprintMaterial);
    propFootprint.rotation.x = -Math.PI / 2;
    propFootprint.position.y = 0.055;
    propPreview.add(propFootprint);

    let previewPropId = "";
    const rebuildPropPreview = (meta: PropCatalogEntryDto) => {
      if (previewPropId === meta.id) return;
      while (propPreview.children.length > 1) {
        const child = propPreview.children[propPreview.children.length - 1]!;
        propPreview.remove(child);
        disposeObjectResources(child);
      }
      const visual = createPropObject(meta, `preview:${meta.id}`);
      visual.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = false;
          mesh.receiveShadow = false;
        }
      });
      propPreview.add(visual);
      previewPropId = meta.id;
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const setMouse = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
    };

    const groundPoint = (event: PointerEvent): THREE.Vector3 | null => {
      setMouse(event);
      return raycaster.intersectObject(ground)[0]?.point ?? null;
    };

    const pickEntity = (
      event: PointerEvent,
    ): { propId: string | null; buildingId: string | null } => {
      setMouse(event);
      const hits = raycaster.intersectObjects(dynamic.children, true);
      for (const hit of hits) {
        let object: THREE.Object3D | null = hit.object;
        while (object && object !== dynamic) {
          const propId = object.userData.propId;
          if (typeof propId === "string") {
            return { propId, buildingId: null };
          }
          const buildingId = object.userData.buildingId;
          if (typeof buildingId === "string") {
            return { propId: null, buildingId };
          }
          object = object.parent;
        }
      }
      return { propId: null, buildingId: null };
    };

    const hidePreviews = () => {
      buildGhost.visible = false;
      roadPreview.visible = false;
      propPreview.visible = false;
      delete host.dataset.placementValid;
      delete host.dataset.placementSize;
      delete host.dataset.decorValid;
      delete host.dataset.decorSize;
    };

    const onMove = (event: PointerEvent) => {
      const hit = groundPoint(event);
      if (!hit) return;
      hidePreviews();

      if (modeRef.current === "BUILD" && selectedBuildRef.current) {
        const selected = selectedBuildRef.current;
        const grid = selected.gridCellMeters;
        const x = Math.round(hit.x / grid) * grid;
        const z = Math.round(hit.z / grid) * grid;
        const width = selected.footprintCellsX * grid;
        const depth = selected.footprintCellsZ * grid;
        const valid = approximateBuildingPlacementValid(worldRef.current, selected, x, z);
        buildGhost.visible = true;
        buildGhost.scale.set(width, 0.32, depth);
        buildGhost.position.set(x, 0.18, z);
        ghostMaterial.color.setHex(valid ? 0x75b76e : 0xd46d61);
        host.dataset.placementValid = String(valid);
        host.dataset.placementSize = selected.sizeTitle;
        return;
      }

      if (modeRef.current === "ROAD" && roadStartRef.current) {
        const x = Math.round(hit.x / 2) * 2;
        const z = Math.round(hit.z / 2) * 2;
        const start = roadStartRef.current;
        const dx = x - start.x;
        const dz = z - start.z;
        const length = Math.hypot(dx, dz);
        const valid = length >= 2 && length <= 45;
        roadPreview.visible = true;
        roadPreview.scale.z = Math.max(0.1, length);
        roadPreview.position.set((start.x + x) / 2, 0.1, (start.z + z) / 2);
        roadPreview.rotation.y = Math.atan2(dx, dz);
        roadPreviewMaterial.color.setHex(valid ? 0x75b76e : 0xd46d61);
        return;
      }

      if (
        (modeRef.current === "DECOR" || modeRef.current === "MOVE_PROP") &&
        selectedPropRef.current
      ) {
        const selected = selectedPropRef.current;
        const snap = selected.snapMeters;
        const x = Math.round(hit.x / snap) * snap;
        const z = Math.round(hit.z / snap) * snap;
        const rotation = propRotationRef.current;
        const valid = approximatePropPlacementValid(
          worldRef.current,
          propCatalogRef.current,
          selected,
          x,
          z,
          rotation,
          movingPropIdRef.current,
        );
        rebuildPropPreview(selected);
        propPreview.visible = true;
        propPreview.position.set(x, 0, z);
        propPreview.rotation.y = rotation;
        propFootprint.scale.set(selected.sizeXMeters, selected.sizeZMeters, 1);
        propFootprintMaterial.color.setHex(valid ? 0x75b76e : 0xd46d61);
        host.dataset.decorValid = String(valid);
        host.dataset.decorSize = selected.sizeTitle;
      }
    };

    const onPointer = (event: PointerEvent) => {
      if (modeRef.current === "SELECT") {
        const picked = pickEntity(event);
        propSelectRef.current(picked.propId);
        buildingSelectRef.current(picked.buildingId);
        return;
      }

      const hit = groundPoint(event);
      if (!hit) return;

      if (
        (modeRef.current === "DECOR" || modeRef.current === "MOVE_PROP") &&
        selectedPropRef.current
      ) {
        const snap = selectedPropRef.current.snapMeters;
        clickRef.current({
          x: Math.round(hit.x / snap) * snap,
          z: Math.round(hit.z / snap) * snap,
        });
        return;
      }

      const grid = selectedBuildRef.current?.gridCellMeters ?? 2;
      clickRef.current({
        x: Math.round(hit.x / grid) * grid,
        z: Math.round(hit.z / grid) * grid,
      });
    };

    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerdown", onPointer);

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const disposeObjectResources = (root: THREE.Object3D) => {
      root.traverse((object) => {
        const resourceObject = object as THREE.Object3D & {
          geometry?: THREE.BufferGeometry;
          material?: THREE.Material | THREE.Material[];
        };
        resourceObject.geometry?.dispose();
        const materials = resourceObject.material
          ? Array.isArray(resourceObject.material)
            ? resourceObject.material
            : [resourceObject.material]
          : [];
        materials.forEach((material) => {
          if (!material.userData.sharedMaterial) material.dispose();
        });
      });
    };

    const clearGroup = (group: THREE.Group) => {
      [...group.children].forEach((child) => disposeObjectResources(child));
      group.clear();
    };

    const presentationSignature = (current: WorldState): string => {
      const buildingState = current.buildings
        .map((building) => {
          const stage =
            building.constructionState === "BUILDING"
              ? constructionVisualState(building).stage
              : "COMPLETE";
          return `${building.id}:${building.constructionState}:${stage}:${building.damageState}`;
        })
        .join("|");
      const blockerState = (current.blockers ?? [])
        .map((blocker) => `${blocker.id}:${blocker.state}`)
        .join("|");
      const combatState = current.combat
        ? `${current.combat.id}:${current.combat.status}:${current.combat.outcome ?? ""}:${current.combat.actors
            .filter((actor) => actor.hp > 0)
            .map((actor) => actor.id)
            .join(",")}`
        : "none";
      const population = Math.min(
        40,
        visualPopulationRef.current ?? current.society.population,
      );
      return [
        current.revision,
        selectedPropIdRef.current ?? "",
        selectedBuildingIdRef.current ?? "",
        population,
        buildingState,
        blockerState,
        combatState,
      ].join("::");
    };

    const rebuild = () => {
      clearGroup(dynamic);
      citizensRef.current = [];
      animalsRef.current = [];
      propWaterRef.current = [];
      propGlowRef.current = [];
      buildingGlowRef.current = [];
      buildersRef.current = [];
      const current = worldRef.current;

      for (const road of current.roads ?? []) {
        dynamic.add(createRoadVisual(road));
      }

      (current.blockers ?? []).forEach((blocker) => dynamic.add(makeBlocker(blocker)));

      const activeConstruction = current.buildings.filter(
        (building) => building.constructionState === "BUILDING",
      );
      const buildingVisualIdentities = resolveBuildingVisualIdentities(
        current.seed,
        current.buildings,
      );
      const firstVisualIdentity = buildingVisualIdentities.values().next().value;
      if (firstVisualIdentity) {
        host.dataset.visualDialect = firstVisualIdentity.dialect;
      }

      current.buildings.forEach((building) => {
        const meta = buildCatalogRef.current.find((item) => item.id === building.definitionId);
        const visual =
          building.constructionState === "BUILDING"
            ? createConstructionObject(building, meta)
            : createBuildingVisual(building, meta, buildingVisualIdentities.get(building.id));
        visual.userData.buildingId = building.id;
        visual.traverse((child) => {
          child.userData.buildingId = building.id;
          const mesh = child as THREE.Mesh;
          if (mesh.userData.buildingGlow) buildingGlowRef.current.push(mesh);
          if (mesh.userData.propWater) propWaterRef.current.push(mesh);
        });
        if (building.id === selectedBuildingIdRef.current) {
          const width = (meta?.footprintCellsX ?? 3) * (meta?.gridCellMeters ?? 2);
          const depth = (meta?.footprintCellsZ ?? 2) * (meta?.gridCellMeters ?? 2);
          visual.add(makeSelectionRing(width, depth));
        }
        dynamic.add(visual);
      });

      host.dataset.activeConstruction = String(activeConstruction.length);
      if (activeConstruction[0]) {
        host.dataset.constructionStage = constructionVisualState(activeConstruction[0]).stage;
      } else {
        delete host.dataset.constructionStage;
      }

      const builderSource =
        current.buildings.find(
          (building) =>
            building.definitionId === "builders_yard" &&
            building.constructionState === "COMPLETE" &&
            building.damageState !== "DISABLED",
        ) ??
        current.buildings.find(
          (building) =>
            building.definitionId === "town_center" &&
            building.constructionState === "COMPLETE" &&
            building.damageState !== "DISABLED",
        );

      if (builderSource) {
        for (const project of activeConstruction.slice(0, 3)) {
          const source = { x: builderSource.position.x, z: builderSource.position.z };
          const site = { x: project.position.x, z: project.position.z };
          const route = routeAlongRoads(current.roads, source, site);
          const builder = createBuilderObject();
          builder.position.set(source.x, 0, source.z);
          dynamic.add(builder);
          buildersRef.current.push({
            object: builder,
            route,
            site,
            buildingId: project.id,
          });
        }
      }

      const shadowCasterBudget = 24;
      let builderShadowCasters = 0;
      buildersRef.current.forEach(({ object }) => {
        object.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh && mesh.castShadow) builderShadowCasters += 1;
        });
      });
      const aliveCombatActors = current.combat?.actors.filter((actor) => actor.hp > 0) ?? [];
      const combatShadowBudget = Math.min(
        aliveCombatActors.length,
        Math.max(0, shadowCasterBudget - builderShadowCasters),
      );

      for (const prop of current.props ?? []) {
        const meta = propCatalogRef.current.find((item) => item.id === prop.definitionId);
        if (!meta) continue;
        const object = createPropObject(meta, `${current.seed}:${prop.id}`);
        object.position.set(prop.position.x, 0, prop.position.z);
        object.rotation.y = prop.rotationY;
        object.userData.propId = prop.id;
        object.traverse((child) => {
          child.userData.propId = prop.id;
          const mesh = child as THREE.Mesh;
          if (mesh.userData.propWater) propWaterRef.current.push(mesh);
          if (mesh.userData.propGlow) propGlowRef.current.push(mesh);
        });
        if (prop.id === selectedPropIdRef.current) {
          object.add(makeSelectionRing(meta.sizeXMeters, meta.sizeZMeters));
        }
        dynamic.add(object);
      }

      const homes = current.buildings.filter(
        (b) => b.definitionId === "house_small" && b.constructionState === "COMPLETE",
      );
      const dogShadowBudget =
        homes.length > 0 && builderShadowCasters + combatShadowBudget < shadowCasterBudget ? 1 : 0;
      const citizenShadowBudget = Math.max(
        0,
        shadowCasterBudget - builderShadowCasters - combatShadowBudget - dogShadowBudget,
      );
      const jobs = current.buildings.filter(
        (b) =>
          ["workshop", "power_plant", "water_plant", "school", "guard_post"].includes(b.definitionId) &&
          b.constructionState === "COMPLETE" &&
          b.damageState !== "DISABLED" &&
          b.workersAssigned > 0,
      );
      const staffedJobSlots = jobs
        .flatMap((building) =>
          Array.from(
            { length: Math.max(0, Math.floor(building.workersAssigned)) },
            () => building,
          ),
        )
        .slice(0, Math.max(0, current.society.assignedWorkers));
      const school = current.buildings.find(
        (b) => b.definitionId === "school" && b.constructionState === "COMPLETE",
      );
      const park = current.buildings.find(
        (b) => b.definitionId === "park" && b.constructionState === "COMPLETE",
      );

      const anchorProps = (current.props ?? []).flatMap((prop) => {
        const meta = propCatalogRef.current.find((item) => item.id === prop.definitionId);
        return meta?.activityAnchor ? [{ prop, meta }] : [];
      });
      const childAnchor = anchorProps.find(({ meta }) => meta.activityAnchor === "child_play")?.prop;
      const adultAnchor = anchorProps.find(({ meta }) =>
        ["sit", "social", "picnic", "read", "gather"].includes(meta.activityAnchor ?? "")
      )?.prop;

      const fallbackLeisure = park?.position ?? { x: 0, y: 0, z: 0 };

      const presentedPopulation = Math.min(
        40,
        visualPopulationRef.current ?? current.society.population,
      );
      let workerSlot = 0;
      for (let i = 0; i < presentedPopulation; i += 1) {
        const child = i % 5 === 0;
        const jobBuilding = child ? undefined : staffedJobSlots[workerSlot];
        if (!child && jobBuilding) workerSlot += 1;
        const role: CitizenVisualRole = child
          ? "school_child"
          : citizenRoleForJob(jobBuilding?.definitionId);
        const citizen = createCitizenVisual(i, role, i < citizenShadowBudget, current.seed);
        citizen.userData.index = i;
        citizen.userData.child = child;
        citizen.userData.role = role;
        const home = homes[i % Math.max(1, homes.length)]?.position ?? { x: 0, y: 0, z: 0 };
        const adultJob = jobBuilding?.position ?? home;
        const work = child
          ? (school?.position ?? home)
          : adultJob;
        const leisure = child
          ? (childAnchor?.position ?? fallbackLeisure)
          : (adultAnchor?.position ?? fallbackLeisure);

        const homePoint = { x: home.x, z: home.z };
        const workPoint = { x: work.x, z: work.z };
        const leisurePoint = { x: leisure.x, z: leisure.z };
        const shelterPoint = { x: 0, z: 0 };
        const homeToWork = routeAlongRoads(current.roads, homePoint, workPoint);
        const workToLeisure = routeAlongRoads(current.roads, workPoint, leisurePoint);
        const leisureToHome = routeAlongRoads(current.roads, leisurePoint, homePoint);
        const homeToShelter = routeAlongRoads(current.roads, homePoint, shelterPoint);

        citizen.userData.home = homePoint;
        citizen.userData.work = workPoint;
        citizen.userData.leisure = leisurePoint;
        citizen.userData.homeToWork = homeToWork;
        citizen.userData.workToLeisure = workToLeisure;
        citizen.userData.leisureToHome = leisureToHome;
        citizen.userData.homeToShelter = homeToShelter;
        citizen.userData.routingConnected =
          homeToWork.connected &&
          workToLeisure.connected &&
          leisureToHome.connected &&
          homeToShelter.connected;

        const angle = (i * 2.399963229728653) % (Math.PI * 2);
        const radius = 0.35 + (i % 4) * 0.12;
        citizen.userData.offsetX = Math.cos(angle) * radius;
        citizen.userData.offsetZ = Math.sin(angle) * radius;
        citizen.userData.activity = "HOME";
        dynamic.add(citizen);
        citizensRef.current.push(citizen);
      }

      const disconnectedRoutes = citizensRef.current.filter(
        (citizen) => citizen.userData.routingConnected === false,
      ).length;
      host.dataset.disconnectedRoutes = String(disconnectedRoutes);
      host.dataset.routedCitizens = String(citizensRef.current.length);
      host.dataset.citizenRoles = String(
        new Set(citizensRef.current.map((citizen) => citizen.userData.visualRole)).size,
      );
      routingRef.current?.(citizensRef.current.length, disconnectedRoutes);

      if (homes.length > 0) {
        const dog = createDogVisual();
        dog.castShadow = dogShadowBudget > 0;
        dog.userData.home = homes[0]?.position ?? { x: 0, y: 0, z: 0 };
        dynamic.add(dog);
        animalsRef.current.push(dog);
      }

      let combatShadowIndex = 0;
      current.combat?.actors.forEach((actor) => {
        if (actor.hp <= 0) return;
        const hostile = actor.side === "ENEMY";
        const mesh = new THREE.Mesh(
          hostile
            ? new THREE.SphereGeometry(0.65, 12, 8)
            : new THREE.CapsuleGeometry(0.35, 0.9, 4, 8),
          new THREE.MeshStandardMaterial({
            color: hostile ? 0xa65c83 : 0x566d55,
            emissive: hostile ? 0x2b0e20 : 0x081208,
          }),
        );
        mesh.position.set(actor.position.x, hostile ? 0.7 : 0.8, actor.position.z);
        mesh.castShadow = combatShadowIndex < combatShadowBudget;
        combatShadowIndex += 1;
        mesh.userData.combatBob = hostile;
        dynamic.add(mesh);
      });

      const dynamicShadowCasters =
        citizensRef.current.filter((citizen) => citizen.castShadow).length
        + animalsRef.current.filter((animal) => animal.castShadow).length
        + builderShadowCasters
        + combatShadowBudget;
      host.dataset.dynamicShadowCasters = String(dynamicShadowCasters);
    };

    let lastPresentationKey = "";
    let frame = 0;
    let lastFrameTime = performance.now();
    let lastMetricEmit = lastFrameTime;
    const frameTimes: number[] = [];

    renderer.setAnimationLoop((time) => {
      const current = worldRef.current;

      buildGrid.visible = modeRef.current === "BUILD" || modeRef.current === "ROAD";
      decorGrid.visible = modeRef.current === "DECOR" || modeRef.current === "MOVE_PROP";
      host.dataset.gridVisible = String(buildGrid.visible || decorGrid.visible);
      host.dataset.gridSize =
        modeRef.current === "DECOR" || modeRef.current === "MOVE_PROP" ? "1" : "2";

      const presentationKey = presentationSignature(current);
      if (presentationKey !== lastPresentationKey) {
        rebuild();
        lastPresentationKey = presentationKey;
      }

      citizensRef.current.forEach((mesh) => {
        const scheduled = schedulePosition(current, mesh);
        const i = Number(mesh.userData.index);
        const offsetX = Number(mesh.userData.offsetX ?? 0);
        const offsetZ = Number(mesh.userData.offsetZ ?? 0);
        const targetX = scheduled.x + offsetX;
        const targetZ = scheduled.z + offsetZ;
        const dx = targetX - mesh.position.x;
        const dz = targetZ - mesh.position.z;
        mesh.position.x += dx * 0.12;
        mesh.position.z += dz * 0.12;
        if (Math.hypot(dx, dz) > 0.02) {
          mesh.rotation.y = Math.atan2(dx, dz);
        }
        animateCitizenVisual(mesh, time, Math.hypot(dx, dz) > 0.02, i);
        mesh.userData.activity = scheduled.activity;
      });

      dynamic.children.forEach((object, i) => {
        if (object.userData.combatBob) {
          object.position.y = 0.7 + Math.sin(time / 130 + i) * 0.12;
        }
      });

      buildersRef.current.forEach((builder, i) => {
        const project = current.buildings.find((building) => building.id === builder.buildingId);
        const progress = project ? constructionVisualState(project).progress : 1;
        const travelT = Math.max(0, Math.min(1, progress / 0.08));
        let target = builder.site;

        if (travelT < 1 && builder.route.connected) {
          target = samplePolyline(builder.route.points, travelT);
        } else if (travelT >= 1) {
          const phase = time / 900 + i * 1.7;
          target = {
            x: builder.site.x + Math.cos(phase) * 1.25,
            z: builder.site.z + Math.sin(phase * 0.9) * 0.9,
          };
        }

        const dx = target.x - builder.object.position.x;
        const dz = target.z - builder.object.position.z;
        builder.object.position.x += dx * 0.16;
        builder.object.position.z += dz * 0.16;
        if (Math.hypot(dx, dz) > 0.02) {
          builder.object.rotation.y = Math.atan2(dx, dz);
        }
        builder.object.position.y = travelT >= 1
          ? Math.abs(Math.sin(time / 160 + i)) * 0.025
          : 0;

        builder.object.traverse((child) => {
          if (child.userData.builderHammer) {
            child.rotation.z = -0.3 + Math.sin(time / 120 + i) * 0.45;
          }
        });
      });

      animalsRef.current.forEach((dog, i) => {
        const home = dog.userData.home as {x:number;z:number};
        const t = current.simulationSeconds / 18 + i * 1.7;
        const combatActive = current.combat && current.combat.status !== "RESOLVED";
        const radius = combatActive ? 1.2 : 4.0;
        dog.position.x = home.x + Math.cos(t) * radius;
        dog.position.z = home.z + Math.sin(t * 0.8) * radius;
        dog.rotation.y = -t + Math.PI / 2;
      });

      propWaterRef.current.forEach((water, i) => {
        water.rotation.y = Math.sin(time / 1500 + i) * 0.04;
      });

      const day = (current.simulationSeconds % (24 * 60)) / (24 * 60);
      const nightFactor = updateEnvironmentLighting(environment, day);
      updateAmbientVisuals(ambient, time, nightFactor);
      propGlowRef.current.forEach((glow) => {
        const material = glow.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 0.55 + nightFactor * 2.05;
      });
      buildingGlowRef.current.forEach((glow) => {
        const material = glow.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 0.18 + nightFactor * 1.45;
      });

      controls.update();
      renderer.render(scene, camera);

      host.dataset.frameCount = String(frame + 1);
      host.dataset.drawCalls = String(renderer.info.render.calls);
      host.dataset.triangles = String(renderer.info.render.triangles);
      host.dataset.citizens = String(citizensRef.current.length);
      host.dataset.props = String(current.props?.length ?? 0);
      host.dataset.geometries = String(renderer.info.memory.geometries);
      host.dataset.textures = String(renderer.info.memory.textures);

      const now = performance.now();
      const frameMs = now - lastFrameTime;
      lastFrameTime = now;
      if (frameMs > 0 && frameMs < 250) {
        frameTimes.push(frameMs);
        if (frameTimes.length > 180) frameTimes.shift();
      }

      if (now - lastMetricEmit >= 1000 && frameTimes.length >= 10) {
        const sorted = [...frameTimes].sort((a, b) => a - b);
        const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0;
        const avg = frameTimes.reduce((sum, value) => sum + value, 0) / frameTimes.length;
        metricsRef.current?.({
          fps: Math.round(1000 / Math.max(1, avg)),
          frameMsP95: Math.round(p95 * 10) / 10,
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          animatedCitizens: citizensRef.current.length,
          routedCitizens: Number(host.dataset.routedCitizens ?? citizensRef.current.length),
          disconnectedRoutes: Number(host.dataset.disconnectedRoutes ?? 0),
        });
        lastMetricEmit = now;
      }

      frame += 1;
    });

    return () => {
      observer.disconnect();
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerdown", onPointer);
      renderer.setAnimationLoop(null);
      clearGroup(dynamic);
      [...preview.children].forEach((child) => disposeObjectResources(child));
      scene.remove(ambient.motes, ambient.fireflies);
      ambient.motes.geometry.dispose();
      ambient.fireflies.geometry.dispose();
      controls.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  return <div className="world-view" ref={hostRef} />;
}
