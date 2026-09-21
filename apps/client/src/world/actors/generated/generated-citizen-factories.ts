import type { CitizenPresentationRole } from "../../visual-identity";
import type { CitizenVisualFactory } from "../citizen-visual-registry";
import { createUtilityTechnicianReferenceFactory } from "./utility-technician-reference";
import { createSchoolChildReferenceFactory } from "./school-child-reference";
import { createWorkshopWorkerReferenceFactory } from "./workshop-worker-reference";

export const generatedCitizenFactories: Partial<
  Record<CitizenPresentationRole, CitizenVisualFactory>
> = {
  school_child: createSchoolChildReferenceFactory,
  workshop_worker: createWorkshopWorkerReferenceFactory,
  utility_technician: createUtilityTechnicianReferenceFactory,
};
