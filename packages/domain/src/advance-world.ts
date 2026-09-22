import { clamp, clamp01 } from "@evervale/shared-kernel/clamp";
import { advanceBlockers } from "./blockers.js";
import { advanceCombat } from "./combat.js";
import { advanceConstruction } from "./construction.js";
import { happinessTarget, smoothHappiness } from "./happiness.js";
import { advancePopulation } from "./population.js";
import { beautyFromProps } from "./props.js";
import { advanceRepairs } from "./repair.js";
import { allocateWorkforce, applyWorkforceToSociety, type WorkforceResult } from "./workforce.js";
import { advanceWeatherWithEpisodes, weatherModifier } from "./weather.js";
import { applyWeatherHazards } from "./weather-hazards.js";
import type { SimulationDefinitions, WorldState } from "./world.types.js";

export type WorkforceAllocator = (
  population: number,
  buildings: WorldState["buildings"],
  definitions: SimulationDefinitions["buildings"],
  combatActive: boolean,
) => WorkforceResult;

export function advanceWorldWithAllocator(
  input: WorldState,
  definitions: SimulationDefinitions,
  realDeltaSeconds: number,
  workforceAllocator: WorkforceAllocator,
): WorldState {
  if (input.speed === 0 || realDeltaSeconds <= 0) return input;

  const deltaSeconds = realDeltaSeconds * input.speed;
  const cycleFraction = deltaSeconds / definitions.referenceCycleSeconds;

  let world = advanceBlockers(
    advanceRepairs(advanceConstruction(input, deltaSeconds), deltaSeconds),
    deltaSeconds,
  );
  const weatherAdvance = advanceWeatherWithEpisodes(
    world.weather,
    world.seed,
    world.simulationSeconds,
    deltaSeconds,
    definitions.weather,
  );
  if (weatherAdvance.weather) {
    world = { ...world, weather: weatherAdvance.weather };
  }
  world = applyWeatherHazards(
    world,
    weatherAdvance.startedEpisodes,
    definitions,
    realDeltaSeconds,
  );
  const weatherEffects = weatherModifier(
    weatherAdvance.weather,
    definitions.weather,
  );
  const combatActive = world.combat?.status === "ACTIVE" || world.combat?.status === "WARNING";
  const workforce = workforceAllocator(
    world.society.population,
    world.buildings,
    definitions.buildings,
    combatActive,
  );

  let moneyIncome = 0;
  let powerProduction = 0;
  let waterProduction = 0;
  let varumProduction = 0;
  let techProduction = 0;
  let buildingPowerUse = 0;
  let buildingWaterUse = 0;
  let upkeep = 0;
  let moneyCap = 0;
  let powerCap = 0;
  let waterCap = 0;
  let varumCap = 0;
  let housing = 0;
  let education = 0;
  let recreation = 0;
  let safety = 0;
  let occupiedHouses = 0;

  const buildings = world.buildings.map((instance) => {
    const def = definitions.buildings[instance.definitionId];
    if (!def || instance.constructionState !== "COMPLETE" || instance.damageState === "DISABLED") {
      return { ...instance, workersAssigned: 0 };
    }
    const assigned = workforce.assignments.get(instance.id) ?? 0;
    const staffing = def.workers <= 0 ? 1 : clamp01(assigned / def.workers);
    moneyIncome += def.moneyPerWorker * assigned;
    powerProduction += def.powerProduction * staffing;
    waterProduction += def.waterProduction * staffing;
    varumProduction += def.varumProduction * staffing;
    techProduction += def.techProduction * staffing;
    buildingPowerUse += def.powerUse * staffing;
    buildingWaterUse += def.waterUse * staffing;
    upkeep += def.upkeep;
    moneyCap += def.moneyCapAdd;
    powerCap += def.powerCapAdd;
    waterCap += def.waterCapAdd;
    varumCap += def.varumCapAdd;
    housing += def.housingAdd;
    education += def.educationCoverageAdd * staffing;
    recreation += def.recreationCoverageAdd * staffing;
    safety += def.safetyAdd * staffing;
    if (def.housingAdd > 0) occupiedHouses += 1;
    return { ...instance, workersAssigned: assigned };
  });

  const residentPowerUse =
    world.society.population * 0.5 * weatherEffects.citizenPowerMult;
  const residentWaterUse =
    world.society.population * 0.75 * weatherEffects.citizenWaterMult;
  const totalPowerUse = buildingPowerUse + residentPowerUse;
  const totalWaterUse = buildingWaterUse + residentWaterUse;

  const powerAvailable = world.resources.power + powerProduction * cycleFraction;
  const waterAvailable = world.resources.water + waterProduction * cycleFraction;
  const powerNeed = totalPowerUse * cycleFraction;
  const waterNeed = totalWaterUse * cycleFraction;

  const powerSatisfaction = powerNeed <= 0 ? 1 : clamp01(powerAvailable / powerNeed);
  const waterSatisfaction = waterNeed <= 0 ? 1 : clamp01(waterAvailable / waterNeed);

  const nextMoneyCap = Math.max(500, moneyCap);
  const nextPowerCap = Math.max(60, powerCap);
  const nextWaterCap = Math.max(60, waterCap);
  const nextVarumCap = Math.max(0, varumCap);
  const nextTechPoints = world.resources.techPoints + techProduction * cycleFraction;
  const nextTechTier =
    world.resources.techTier === 0 && nextTechPoints >= 40 ? 1 : world.resources.techTier;

  const resources = {
    ...world.resources,
    moneyCap: nextMoneyCap,
    powerCap: nextPowerCap,
    waterCap: nextWaterCap,
    varumCap: nextVarumCap,
    money: clamp(
      world.resources.money + (moneyIncome - upkeep) * cycleFraction,
      0,
      nextMoneyCap,
    ),
    power: clamp(powerAvailable - powerNeed, 0, nextPowerCap),
    water: clamp(waterAvailable - waterNeed, 0, nextWaterCap),
    varum: clamp(
      world.resources.varum + varumProduction * cycleFraction,
      0,
      nextVarumCap,
    ),
    techPoints: nextTechPoints,
    techTier: nextTechTier,
  };

  const employment = workforce.totalWorkforce <= 0 ? 1 : workforce.assigned / workforce.totalWorkforce;
  const beauty = beautyFromProps(world, definitions);

  let society = applyWorkforceToSociety({
    ...world.society,
    housingCapacity: Math.max(12, housing),
    educationCoverage: clamp01(education),
    recreationCoverage: clamp01(recreation),
    safety: clamp01(0.5 + safety),
    beauty,
  }, workforce);

  society = smoothHappiness(
    society,
    happinessTarget({
      powerSatisfaction,
      waterSatisfaction,
      employmentSatisfaction: employment,
      housingSatisfaction: clamp01(society.housingCapacity / Math.max(1, society.population)),
      educationCoverage: society.educationCoverage,
      recreationCoverage: clamp01(
        society.recreationCoverage * weatherEffects.outdoorActivityMult,
      ),
      safety: society.safety,
      beautyBonus: society.beauty,
    }),
    cycleFraction,
  );

  society = advancePopulation(society, occupiedHouses, cycleFraction);

  world = {
    ...world,
    simulationSeconds: world.simulationSeconds + deltaSeconds,
    buildings,
    resources,
    society,
  };

  return advanceCombat(world, definitions, deltaSeconds);
}


export function advanceWorld(
  input: WorldState,
  definitions: SimulationDefinitions,
  realDeltaSeconds: number,
): WorldState {
  return advanceWorldWithAllocator(
    input,
    definitions,
    realDeltaSeconds,
    allocateWorkforce,
  );
}
