import {
  clamp,
} from "./utils";

export const calculateWeeklyTechnicalScore = (
  frequency: number,
  balance: number
) =>
  clamp(
    100 -
      Math.abs(frequency - 50) * 105 -
      Math.abs(balance) * 0.12,
    0,
    100
  );

export const calculateWeeklySustainabilityScore = (
  curtailedWind: number,
  spilledWater: number,
  reservoir: number,
  reservoirTarget: number
) => {
  const targetDifference = Math.abs(
    reservoir - reservoirTarget
  );

  return clamp(
    100 -
      curtailedWind * 0.35 -
      spilledWater * 4 -
      targetDifference * 0.35 -
      (reservoir <= 5 ? 35 : 0),
    0,
    100
  );
};

export const calculateWeeklyPublicScore = (
  unservedPower: number,
  frequency: number
) =>
  clamp(
    100 -
      unservedPower * 1.1 -
      Math.abs(frequency - 50) * 55,
    0,
    100
  );

export const calculateAverageScore = (
  cumulativeScore: number,
  scoredWeeks: number
) =>
  scoredWeeks > 0
    ? Math.round(
        cumulativeScore / scoredWeeks
      )
    : 100;

export const calculateDelayedAverage = (
  currentValue: number,
  previousValue: number,
  hasPreviousValue: boolean
) =>
  hasPreviousValue
    ? (currentValue + previousValue) / 2
    : currentValue;

export const calculateOverallScore = (
  technicalScore: number,
  sustainabilityScore: number,
  publicScore: number
) =>
  Math.round(
    technicalScore * 0.4 +
      sustainabilityScore * 0.3 +
      publicScore * 0.3
  );