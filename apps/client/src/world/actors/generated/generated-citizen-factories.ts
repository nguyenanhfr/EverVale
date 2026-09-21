import type { CitizenPresentationRole } from "../../visual-identity";
import type { CitizenVisualFactory } from "../citizen-visual-registry";
import { createUtilityTechnicianReferenceFactory } from "./utility-technician-reference";
import {
  createSculptedBuilder,
  createSculptedTeacher,
  createSculptedUtilityTechnician,
} from "./sculpted-starter-reference-factories";
import { createSchoolChildReferenceFactory } from "./school-child-reference";
import { createWorkshopWorkerReferenceFactory } from "./workshop-worker-reference";
import {
  createBuilderReferenceFactory,
  createCafeWorkerReferenceFactory,
  createCasualResidentReferenceFactory,
  createFarmerReferenceFactory,
  createGuardReferenceFactory,
  createServiceCrewReferenceFactory,
  createTeacherReferenceFactory,
} from "./starter-role-reference-factories";

export const generatedCitizenFactories: Partial<
  Record<CitizenPresentationRole, CitizenVisualFactory>
> = {
  school_child: createSchoolChildReferenceFactory,
  workshop_worker: createWorkshopWorkerReferenceFactory,
  utility_technician: createSculptedUtilityTechnician,
  teacher: createSculptedTeacher,
  guard: createGuardReferenceFactory,
  builder: createSculptedBuilder,
  farmer: createFarmerReferenceFactory,
  cafe_worker: createCafeWorkerReferenceFactory,
  service_crew: createServiceCrewReferenceFactory,
  casual_resident: createCasualResidentReferenceFactory,
};
