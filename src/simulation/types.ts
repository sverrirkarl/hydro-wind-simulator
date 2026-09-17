export type Difficulty =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert";

export type EventType =
  | "none"
  | "windStorm"
  | "drought"
  | "heavyRain"
  | "coldSpell";

export type ScenarioType =
  | "normal"
  | "dry"
  | "wet"
  | "windy-autumn"
  | "harsh-winter"
  | "extreme";

export interface ScenarioMonthWeather {
  monthIndex: number;
  monthName: string;
  windSpeed: number;
  rainfall: number;
  demand: number;
}

export interface AnnualScenario {
  type: ScenarioType;
  label: string;
  description: string;
  summary: string;
  months: ScenarioMonthWeather[];
}

export interface Forecast {
  month: string;
  wind: string;
  rainfall: string;
  demand: string;
  confidence: number;
}

export interface DifficultySettings {
  label: string;
  description: string;
  tickMilliseconds: number;
  monthlyPauseSeconds: number;
  forecastAccuracy: number;
  weatherEvents: boolean;
  maintenance: boolean;
  unexpectedFailures: boolean;
  assistedDispatch: boolean;
  eventProbability: number;
  frequencyPenaltyMultiplier: number;
}


// ============================================================
// LOCAL TYPES
//
// FUTURE EXTRACTION TARGET:
// src/simulation/types.ts
//
// HistoryPoint and GameState can later be moved into types.ts
// as one complete block.
// ============================================================

export type HistoryPoint = {
  week: string;
  demand: number;
  hydro: number;
  wind: number;
  total: number;
  powerBalance: number;
  windSpeed: number;
  rainfall: number;
  reservoir: number;
  reservoirTarget: number;
  frequency: number;
};

export type GameState = {
  weekIndex: number;
  frequency: number;
  powerBalance: number;
  unservedPower: number;
  reservoir: number;
  demand: number;
  hydroGeneration: number;
  windGeneration: number;
  availableWindGeneration: number;
  windSpeed: number;
  rainfall: number;
  activeEvent: EventType;
  eventWeeksRemaining: number;
  cumulativeTechnical: number;
  cumulativeSustainability: number;
  cumulativePublic: number;
  scoredWeeks: number;
  spilledWater: number;
  unservedEnergy: number;
  curtailedWind: number;
  lastWeekSpilledWater: number;
  lastWeekCurtailedWind: number;
  consecutiveOverfillWeeks: number;
  consecutiveHighWindWeeks: number;
};

// ================= END LOCAL TYPES ===========================