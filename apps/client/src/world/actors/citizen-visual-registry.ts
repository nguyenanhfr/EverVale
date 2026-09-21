import * as THREE from "three";
import type { CitizenPresentationRole } from "../visual-identity";
import { createCitizenVisual } from "./citizen-visual";
import { generatedCitizenFactories } from "./generated/generated-citizen-factories";

export interface CitizenVisualFactoryContext {
  worldSeed: string | number;
  presentationSlot: number;
  child: boolean;
  role: CitizenPresentationRole;
  castShadow: boolean;
}

export type CitizenVisualFactory = (
  context: CitizenVisualFactoryContext,
) => THREE.Object3D;

const generatedFactories: Partial<
  Record<CitizenPresentationRole, CitizenVisualFactory>
> = { ...generatedCitizenFactories };

const GENERATED_DETAIL_SLOT_LIMIT = 12;

export function registerGeneratedCitizenFactory(
  role: CitizenPresentationRole,
  factory: CitizenVisualFactory,
): void {
  generatedFactories[role] = factory;
}

function normalizeCitizenObject(
  object: THREE.Object3D,
  context: CitizenVisualFactoryContext,
  source: "generated_factory" | "procedural" | "procedural_lod",
): THREE.Object3D {
  object.userData.visualRole = context.role;
  object.userData.visualSource = source;
  object.userData.presentationSlot = context.presentationSlot;

  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = context.castShadow;
    mesh.receiveShadow = true;
  });

  return object;
}

export function createCitizenVisualFromRegistry(
  context: CitizenVisualFactoryContext,
): THREE.Object3D {
  const generated = generatedFactories[context.role];
  const useGeneratedDetail =
    Boolean(generated) &&
    context.presentationSlot < GENERATED_DETAIL_SLOT_LIMIT;

  if (useGeneratedDetail && generated) {
    return normalizeCitizenObject(generated(context), context, "generated_factory");
  }

  return normalizeCitizenObject(
    createCitizenVisual(
      context.worldSeed,
      context.presentationSlot,
      context.child,
      context.role,
      context.castShadow,
    ),
    context,
    generated ? "procedural_lod" : "procedural",
  );
}
