import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceWeather,
  createWeatherState,
  weatherModifier,
} from "./weather.js";
import type {
  WeatherDefinitions,
  WeatherState,
} from "./world.types.js";

const definitions: WeatherDefinitions = {
  seasonDurationSeconds: 100,
  normalEpisodeMinSeconds: 10,
  normalEpisodeMaxSeconds: 10,
  severeEpisodeMinSeconds: 5,
  severeEpisodeMaxSeconds: 5,
  severeCooldownSeconds: 30,
  seasonWeights: {
    SPRING: { CLEAR: 1, LIGHT_RAIN: 1 },
    SUMMER: { CLEAR: 1, HEATWAVE: 1 },
    AUTUMN: { RAIN: 1 },
    WINTER: { SNOW: 1 },
  },
  modifiers: {
    HEATWAVE: {
      citizenPowerMult: 1.05,
      citizenWaterMult: 1.15,
      travelCostMult: 1,
      outdoorActivityMult: 0.7,
      civilianTrafficMult: 0.9,
    },
  },
};

test("weather replay is deterministic across chunked catch-up", () => {
  const initial = createWeatherState(12345, 0, definitions);
  const direct = advanceWeather(initial, 12345, 0, 37, definitions);
  const first = advanceWeather(initial, 12345, 0, 17, definitions);
  const chunked = advanceWeather(first, 12345, 17, 20, definitions);

  assert.deepEqual(chunked, direct);
});

test("season order follows simulation time", () => {
  const initial = createWeatherState(55, 0, definitions);
  const summer = advanceWeather(initial, 55, 0, 100, definitions);
  const autumn = advanceWeather(initial, 55, 0, 200, definitions);
  const winter = advanceWeather(initial, 55, 0, 300, definitions);
  const springAgain = advanceWeather(initial, 55, 0, 400, definitions);

  assert.equal(summer?.season, "SUMMER");
  assert.equal(autumn?.season, "AUTUMN");
  assert.equal(winter?.season, "WINTER");
  assert.equal(springAgain?.season, "SPRING");
});

test("severe cooldown prevents consecutive severe episodes", () => {
  const severeOnly: WeatherDefinitions = {
    ...definitions,
    seasonWeights: {
      SPRING: { SEVERE_STORM: 1 },
      SUMMER: { SEVERE_STORM: 1 },
      AUTUMN: { SEVERE_STORM: 1 },
      WINTER: { SEVERE_STORM: 1 },
    },
  };
  const state: WeatherState = {
    season: "SPRING",
    seasonProgress: 0,
    climateSeed: 9,
    current: "SEVERE_STORM",
    episodeIndex: 3,
    episodeSeed: 123,
    episodeRemainingSeconds: 1,
    severeCooldownRemainingSeconds: 30,
  };

  const next = advanceWeather(state, 9, 0, 2, severeOnly);

  assert.equal(next?.episodeIndex, 4);
  assert.equal(next?.current, "CLEAR");
  assert.ok((next?.severeCooldownRemainingSeconds ?? 0) > 0);
});

test("weather modifiers default safely and expose canonical pressure", () => {
  const heatwave: WeatherState = {
    season: "SUMMER",
    seasonProgress: 0.5,
    climateSeed: 1,
    current: "HEATWAVE",
    episodeIndex: 1,
    episodeSeed: 2,
    episodeRemainingSeconds: 100,
    severeCooldownRemainingSeconds: 0,
  };

  assert.equal(
    weatherModifier(heatwave, definitions).citizenWaterMult,
    1.15,
  );
  assert.deepEqual(weatherModifier(undefined, definitions), {
    citizenPowerMult: 1,
    citizenWaterMult: 1,
    travelCostMult: 1,
    outdoorActivityMult: 1,
    civilianTrafficMult: 1,
  });
});
