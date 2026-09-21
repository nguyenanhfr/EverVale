import type { CitizenPresentationRole } from "../../visual-identity";
import type { CitizenVisualFactory } from "../citizen-visual-registry";
import { createUtilityTechnicianReferenceFactory } from "./utility-technician-reference";

export const generatedCitizenFactories: Partial<
  Record<CitizenPresentationRole, CitizenVisualFactory>
> = {
  utility_technician: createUtilityTechnicianReferenceFactory,
};
