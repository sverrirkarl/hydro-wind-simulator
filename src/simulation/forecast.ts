
// ============================================================
// FORECAST MODEL
//
// FUTURE EXTRACTION TARGET:
// src/simulation/forecast.ts
//
// Move everything between this marker and the END FORECAST
// MODEL marker into forecast.ts.
// ============================================================
import {
  getMonthName,
} from "./calendar";

import {
  getBaseConditions,
} from "./weather";

import {
  getScenarioMonthWeather,
} from "./scenario";

import {
  clamp,
} from "./utils";

import type {
  AnnualScenario,
  Forecast,
} from "./types";

export const getForecast = (
  currentDate: Date,
  monthsAhead: number,
  accuracy: number,
  annualScenario?: AnnualScenario
): Forecast => {
  const forecastDate = new Date(
    Date.UTC(
      currentDate.getUTCFullYear(),
      currentDate.getUTCMonth() +
        monthsAhead,
      1
    )
  );

  const monthIndex =
    forecastDate.getUTCMonth();

  const base = annualScenario
    ? getScenarioMonthWeather(
        annualScenario,
        monthIndex
      )
    : {
        windSpeed:
          getBaseConditions(
            monthIndex
          ).wind,
        rainfall:
          getBaseConditions(
            monthIndex
          ).rainfall,
        demand:
          getBaseConditions(
            monthIndex
          ).demand,
      };

  const uncertainty =
    ((100 - accuracy) / 100) *
    (monthsAhead === 1 ? 20 : 32);

  const forecastWind =
    base.windSpeed +
    (Math.random() * 2 - 1) *
      uncertainty;

  const forecastRain =
    base.rainfall +
    (Math.random() * 2 - 1) *
      uncertainty *
      1.8;

  const forecastDemand =
    base.demand +
    (Math.random() * 2 - 1) *
      uncertainty *
      2;

  const wind =
    forecastWind < 15
      ? "Low"
      : forecastWind < 23
        ? "Moderate"
        : "High";

  const rainfall =
    forecastRain < 25
      ? "Low"
      : forecastRain < 45
        ? "Moderate"
        : "High";

  const demand =
    forecastDemand < 150
      ? "Moderate"
      : forecastDemand < 190
        ? "High"
        : "Very high";

  const confidence = clamp(
    accuracy -
      (monthsAhead - 1) * 12,
    35,
    98
  );

  return {
    month:
      getMonthName(forecastDate),
    wind,
    rainfall,
    demand,
    confidence,
  };
};

// ================= END FORECAST MODEL ========================
