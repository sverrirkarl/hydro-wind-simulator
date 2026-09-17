import { getMonthName } from "./calendar";
import { applyEventToWeather, getBaseConditions } from "./weather";
import { clamp } from "./utils";

import type {
  AnnualScenario,
  EventType,
  ScenarioMonthWeather,
  ScenarioType,
} from "./types";

const SCENARIO_DEFINITIONS: Record<
  ScenarioType,
  {
    label: string;
    description: string;
    summary: string;
    windBias: number;
    rainfallBias: number;
    demandBias: number;
    windSwing: number;
    rainfallSwing: number;
    demandSwing: number;
  }
> = {
  normal: {
    label: "Normal Year",
    description: "Typical seasonal variation with no strong long-term bias.",
    summary: "A balanced year with moderate wind, average rainfall, and steady demand.",
    windBias: 0,
    rainfallBias: 0,
    demandBias: 0,
    windSwing: 4,
    rainfallSwing: 12,
    demandSwing: 14,
  },
  dry: {
    label: "Dry Year",
    description: "Low rainfall and a more fragile reservoir outlook.",
    summary: "Reservoir inflow is weak through much of the year, forcing tighter conservation.",
    windBias: 1,
    rainfallBias: -18,
    demandBias: 12,
    windSwing: 5,
    rainfallSwing: 18,
    demandSwing: 18,
  },
  wet: {
    label: "Wet Year",
    description: "High rainfall keeps storage healthy but can reduce usable hydro flexibility.",
    summary: "Strong inflow and saturated ground create a wet and resilient year.",
    windBias: -2,
    rainfallBias: 22,
    demandBias: -8,
    windSwing: 4,
    rainfallSwing: 20,
    demandSwing: 12,
  },
  "windy-autumn": {
    label: "Windy Autumn",
    description: "Autumn delivers exceptional wind resources and a strong seasonal generation boost.",
    summary: "A notably windy autumn increases renewable output but must be balanced against autumn demand peaks.",
    windBias: 6,
    rainfallBias: 2,
    demandBias: 6,
    windSwing: 7,
    rainfallSwing: 10,
    demandSwing: 16,
  },
  "harsh-winter": {
    label: "Harsh Winter",
    description: "Winter is colder and more energy intensive with weaker renewable support.",
    summary: "Cold weather and winter demand pressures test grid resilience and storage decisions.",
    windBias: -4,
    rainfallBias: -6,
    demandBias: 24,
    windSwing: 6,
    rainfallSwing: 14,
    demandSwing: 22,
  },
  extreme: {
    label: "Extreme Year",
    description: "The year combines strong climate volatility with operational challenge across all seasons.",
    summary: "This is a high-variance year with sharp seasonal swings and elevated system stress.",
    windBias: 3,
    rainfallBias: 10,
    demandBias: 16,
    windSwing: 9,
    rainfallSwing: 22,
    demandSwing: 24,
  },
};

const getScenarioMonthValue = (
  monthIndex: number,
  baseValue: number,
  bias: number,
  swing: number,
  variance: number
) => {
  const seasonalWave = Math.sin(
    ((monthIndex + 1) / 12) * Math.PI * 2
  );

  const randomVariation =
    (Math.random() - 0.5) * variance;

  return clamp(
    baseValue + bias + seasonalWave * swing + randomVariation,
    0,
    999
  );
};

const buildScenarioMonth = (
  monthIndex: number,
  profile: (typeof SCENARIO_DEFINITIONS)[ScenarioType]
): ScenarioMonthWeather => {
  const base = getBaseConditions(monthIndex);

  return {
    monthIndex,
    monthName: getMonthName(
      new Date(Date.UTC(2026, monthIndex, 1))
    ),
    windSpeed: Math.round(
      getScenarioMonthValue(
        monthIndex,
        base.wind,
        profile.windBias,
        profile.windSwing,
        8
      )
    ),
    rainfall: Math.round(
      getScenarioMonthValue(
        monthIndex,
        base.rainfall,
        profile.rainfallBias,
        profile.rainfallSwing,
        18
      )
    ),
    demand: Math.round(
      getScenarioMonthValue(
        monthIndex,
        base.demand,
        profile.demandBias,
        profile.demandSwing,
        22
      )
    ),
  };
};

export const generateAnnualScenario = (): AnnualScenario => {
  const scenarioTypes = Object.keys(
    SCENARIO_DEFINITIONS
  ) as ScenarioType[];

  const type =
    scenarioTypes[
      Math.floor(
        Math.random() *
          scenarioTypes.length
      )
    ];

  const profile =
    SCENARIO_DEFINITIONS[type];

  const months = Array.from(
    { length: 12 },
    (_, monthIndex) =>
      buildScenarioMonth(
        monthIndex,
        profile
      )
  );

  return {
    type,
    label: profile.label,
    description: profile.description,
    summary: profile.summary,
    months,
  };
};

export const getScenarioMonthWeather = (
  scenario: AnnualScenario,
  monthIndex: number,
  event: EventType = "none"
) => {
  const month =
    scenario.months.find(
      (item) =>
        item.monthIndex ===
        monthIndex
    ) ?? {
      monthIndex,
      monthName: getMonthName(
        new Date(
          Date.UTC(
            2026,
            monthIndex,
            1
          )
        )
      ),
      windSpeed: getBaseConditions(
        monthIndex
      ).wind,
      rainfall: getBaseConditions(
        monthIndex
      ).rainfall,
      demand: getBaseConditions(
        monthIndex
      ).demand,
    };

  const baseWeather = {
    windSpeed: month.windSpeed,
    rainfall: month.rainfall,
    demand: month.demand,
  };

  if (event === "none") {
    return baseWeather;
  }

  return applyEventToWeather(
    baseWeather.windSpeed,
    baseWeather.rainfall,
    baseWeather.demand,
    event
  );
};
