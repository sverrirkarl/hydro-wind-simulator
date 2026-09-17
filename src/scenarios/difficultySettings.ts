import type {
  Difficulty,
  DifficultySettings,
} from "../simulation/types";

export const DIFFICULTIES:
  Record<Difficulty, DifficultySettings> =
{
  beginner: {
    label: "Beginner",
    description:
      "Learn the system with forecasts and no major disruptions.",
    tickMilliseconds: 4000,
    monthlyPauseSeconds: 5,
    forecastAccuracy: 95,
    weatherEvents: false,
    maintenance: false,
    unexpectedFailures: false,
    assistedDispatch: false,
    eventProbability: 0,
    frequencyPenaltyMultiplier: 0.65,
  },

  intermediate: {
    label: "Intermediate",
    description:
      "Weather events begin to affect grid operation.",
    tickMilliseconds: 3500,
    monthlyPauseSeconds: 4,
    forecastAccuracy: 85,
    weatherEvents: true,
    maintenance: false,
    unexpectedFailures: false,
    assistedDispatch: false,
    eventProbability: 0.12,
    frequencyPenaltyMultiplier: 0.85,
  },

  advanced: {
    label: "Advanced",
    description:
      "Weather events and planned maintenance.",
    tickMilliseconds: 3000,
    monthlyPauseSeconds: 2,
    forecastAccuracy: 75,
    weatherEvents: true,
    maintenance: true,
    unexpectedFailures: false,
    assistedDispatch: false,
    eventProbability: 0.16,
    frequencyPenaltyMultiplier: 1,
  },

  expert: {
    label: "Expert",
    description:
      "All events, failures and reduced reaction time.",
    tickMilliseconds: 1600,
    monthlyPauseSeconds: 0,
    forecastAccuracy: 60,
    weatherEvents: true,
    maintenance: true,
    unexpectedFailures: true,
    assistedDispatch: false,
    eventProbability: 0.22,
    frequencyPenaltyMultiplier: 1.25,
  },
};