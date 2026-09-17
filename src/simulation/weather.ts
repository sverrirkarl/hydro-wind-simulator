
// ============================================================
// WEATHER MODEL
//
// FUTURE EXTRACTION TARGET:
// src/simulation/weather.ts
//
// Move everything between this marker and the END WEATHER
// MODEL marker into weather.ts.
//
// This block intentionally contains only weather generation,
// event effects on weather, and the wind power curve.
// ============================================================
import { clamp } from "./utils";

import type {
  EventType,
} from "./types";

export const getBaseConditions = (
  monthIndex: number
) => {
  if ([5, 6, 7].includes(monthIndex)) {
    return {
      wind: 15,
      rainfall: 22,
      demand: 138,
    };
  }

  if ([8, 9, 10].includes(monthIndex)) {
    return {
      wind: 23,
      rainfall: 43,
      demand: 165,
    };
  }

  if ([11, 0, 1].includes(monthIndex)) {
    return {
      wind: 26,
      rainfall: 35,
      demand: 205,
    };
  }

  return {
    wind: 19,
    rainfall: 50,
    demand: 172,
  };
};

export const applyEventToWeather = (
  windSpeed: number,
  rainfall: number,
  demand: number,
  event: EventType
) => {
  switch (event) {
    case "windStorm":
      return {
        windSpeed: clamp(
          windSpeed + 16,
          0,
          45
        ),
        rainfall: clamp(
          rainfall + 12,
          0,
          90
        ),
        demand,
      };

    case "drought":
      return {
        windSpeed,
        rainfall: clamp(
          rainfall * 0.15,
          0,
          90
        ),
        demand,
      };

    case "heavyRain":
      return {
        windSpeed,
        rainfall: clamp(
          rainfall + 38,
          0,
          90
        ),
        demand,
      };

    case "coldSpell":
      return {
        windSpeed,
        rainfall,
        demand: clamp(
          demand + 38,
          90,
          245
        ),
      };

    default:
      return {
        windSpeed,
        rainfall,
        demand,
      };
  }
};

export const generateWeather = (
  monthIndex: number,
  event: EventType
) => {
  const base =
    getBaseConditions(monthIndex);

  const windSpeed = Math.round(
    clamp(
      base.wind +
        Math.random() * 12 -
        6,
      0,
      45
    )
  );

  const rainfall = Math.round(
    clamp(
      base.rainfall +
        Math.random() * 20 -
        10,
      0,
      90
    )
  );

  const demand = Math.round(
    clamp(
      base.demand +
        Math.random() * 26 -
        13,
      90,
      245
    )
  );

  const modified =
    applyEventToWeather(
      windSpeed,
      rainfall,
      demand,
      event
    );

  return {
    windSpeed: Math.round(
      modified.windSpeed
    ),
    rainfall: Math.round(
      modified.rainfall
    ),
    demand: Math.round(
      modified.demand
    ),
  };
};

export const getWindCapacityFactor = (
  windSpeed: number
) => {
  if (windSpeed < 4) {
    return 0;
  }

  if (windSpeed >= 35) {
    return 0;
  }

  if (windSpeed >= 25) {
    return 1;
  }

  return clamp(
    (windSpeed - 4) / 21,
    0,
    1
  );
};

// ================= END WEATHER MODEL =========================