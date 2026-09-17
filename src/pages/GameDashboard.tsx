// ============================================================
// IMPORTS
// ============================================================

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import FrequencyGauge from "../components/FrequencyGauge";
import HydroUnitCard from "../components/HydroUnitCard";
import TurbineIcon from "../components/TurbineIcon";

import {
  DIFFICULTIES,
} from "../scenarios/difficultySettings";

import {
  HYDRO_UNIT_CAPACITY,
  TOTAL_HYDRO_CAPACITY,
  TOTAL_INSTALLED_CAPACITY,
  TOTAL_WIND_CAPACITY,
  TURBINES_PER_GROUP,
  WIND_GROUP_CAPACITY,
} from "../simulation/constants";

import {
  getMonthName,
  getSeason,
  getSimulationDate,
  getWeekOfMonth,
} from "../simulation/calendar";

import {
  chooseWeatherEvent,
  getEventDuration,
} from "../simulation/events";

import {
  getForecast,
} from "../simulation/forecast";

import {
  generateAnnualScenario,
  getScenarioMonthWeather,
} from "../simulation/scenario";

import {
  getMonthlyReservoirTarget,
} from "../simulation/objectives";

import {
  calculateAverageScore,
  calculateOverallScore,
  calculateDelayedAverage,
  calculateWeeklyPublicScore,
  calculateWeeklySustainabilityScore,
  calculateWeeklyTechnicalScore,
} from "../simulation/scoring";

import {
  getWindCapacityFactor,
} from "../simulation/weather";

import {
  clamp,
} from "../simulation/utils";

import type {
  AnnualScenario,
  Difficulty,
  GameState,
  HistoryPoint,
} from "../simulation/types";

// ============================================================
// MAIN DASHBOARD COMPONENT
// ============================================================

export default function GameDashboard() {
  const HIGH_WIND_SHUTDOWN_SPEED = 28;
  const HIGH_WIND_GAMEOVER_WEEKS = 2;
  const RESERVOIR_OVERFILL_GAMEOVER_WEEKS = 3;

  // ==========================================================
  // DIFFICULTY AND APPLICATION STATE
  // ==========================================================

  const [
    selectedDifficulty,
    setSelectedDifficulty,
  ] =
    useState<Difficulty>(
      "beginner"
    );

  const [
    gameStarted,
    setGameStarted,
  ] = useState(false);

  const [
    isRunning,
    setIsRunning,
  ] = useState(false);

  const [
    yearComplete,
    setYearComplete,
  ] = useState(false);

  const [
    gameOverReason,
    setGameOverReason,
  ] = useState<string | null>(null);

  const [
    windShutdownWarning,
    setWindShutdownWarning,
  ] = useState(false);

  const [
    windShutdownCountdown,
    setWindShutdownCountdown,
  ] = useState(0);

  // ==========================================================
  // PLAYER CONTROL STATE
  // ==========================================================

  const [
    hydroDispatch,
    setHydroDispatch,
  ] = useState(55);

  const [
    windUtilization,
    setWindUtilization,
  ] = useState(100);

  const [
    simulationSpeed,
    setSimulationSpeed,
  ] = useState(1);

  // ==========================================================
  // MONTHLY BRIEFING STATE
  // ==========================================================

  // ==========================================================
  // INITIAL SIMULATION STATE
  // ==========================================================

  const [annualScenario, setAnnualScenario] =
    useState<AnnualScenario>(() =>
      generateAnnualScenario()
    );

  const initialDate =
    getSimulationDate(0);

  const initialWeather =
    getScenarioMonthWeather(
      annualScenario,
      initialDate.getUTCMonth(),
      "none"
    );

  const [
    gameState,
    setGameState,
  ] = useState<GameState>({
    weekIndex: 0,
    frequency: 50,
    powerBalance: 0,
    unservedPower: 0,
    reservoir: 74,
    demand:
      initialWeather.demand,
    hydroGeneration: 77,
    windGeneration: 50,
    availableWindGeneration: 50,
    windSpeed:
      initialWeather.windSpeed,
    rainfall:
      initialWeather.rainfall,
    activeEvent: "none",
    eventWeeksRemaining: 0,
    cumulativeTechnical: 0,
    cumulativeSustainability: 0,
    cumulativePublic: 0,
    scoredWeeks: 0,
    spilledWater: 0,
    unservedEnergy: 0,
    curtailedWind: 0,
    lastWeekSpilledWater: 0,
    lastWeekCurtailedWind: 0,
    consecutiveOverfillWeeks: 0,
    consecutiveHighWindWeeks: 0,
  });

  const [
    history,
    setHistory,
  ] =
    useState<HistoryPoint[]>(
      []
    );

  const [
    scoreHistory,
    setScoreHistory,
  ] = useState<
    Array<{
      week: string;
      technical: number;
      sustainability: number;
      public: number;
      powerBalance: number;
      frequency: number;
      reservoir: number;
      reservoirTarget: number;
    }>
  >([]);

  // ==========================================================
  // ACTIVE DIFFICULTY SETTINGS
  // ==========================================================

  const settings =
    DIFFICULTIES[
      selectedDifficulty
    ];

  const simulationSpeedOptions = [
    1,
    1.5,
    2,
    4,
  ];

  const effectiveTickMilliseconds =
    Math.max(
      250,
      Math.round(
        settings.tickMilliseconds /
          simulationSpeed
      )
    );

  // ==========================================================
  // DERIVED CALENDAR STATE
  // ==========================================================

  const currentDate =
    useMemo(
      () =>
        getSimulationDate(
          gameState.weekIndex
        ),
      [gameState.weekIndex]
    );

  const currentMonth =
    getMonthName(currentDate);

  const currentMonthIndex =
    currentDate.getUTCMonth();

  const currentSeason =
    getSeason(
      currentMonthIndex
    );

  const currentWeekOfMonth =
    getWeekOfMonth(currentDate);

  const progress = clamp(
    ((gameState.weekIndex + 1) /
      52) *
      100,
    0,
    100
  );

  // ==========================================================
  // DERIVED FORECAST STATE
  // ==========================================================

  const forecasts =
    useMemo(
      () => [
        getForecast(
          currentDate,
          1,
          settings.forecastAccuracy,
          annualScenario
        ),
        getForecast(
          currentDate,
          2,
          settings.forecastAccuracy,
          annualScenario
        ),
        getForecast(
          currentDate,
          3,
          settings.forecastAccuracy,
          annualScenario
        ),
      ],
      [
        annualScenario,
        currentDate,
        settings.forecastAccuracy,
      ]
    );

  // ==========================================================
  // DERIVED MAINTENANCE STATE
  // ==========================================================

  const plannedHydroMaintenance =
    settings.maintenance &&
    gameState.weekIndex >= 25 &&
    gameState.weekIndex <= 28;

  const plannedWindMaintenance =
    settings.maintenance &&
    gameState.weekIndex >= 14 &&
    gameState.weekIndex <= 17;

  const unexpectedHydroFailure =
    settings.unexpectedFailures &&
    gameState.weekIndex >= 37 &&
    gameState.weekIndex <= 38;

  const hydroUnitTwoMaintenance =
    plannedHydroMaintenance ||
    unexpectedHydroFailure;

  const windGroupThreeMaintenance =
    plannedWindMaintenance;

  // ==========================================================
  // DERIVED AVAILABLE CAPACITY
  // ==========================================================

  const availableHydroUnits =
    hydroUnitTwoMaintenance
      ? 1
      : 2;

  const availableHydroCapacity =
    availableHydroUnits *
    HYDRO_UNIT_CAPACITY;

  const availableWindGroups =
    windGroupThreeMaintenance
      ? 3
      : 4;

  // ==========================================================
  // DERIVED LIVE GRID STATE
  // ==========================================================

  const totalGeneration =
    gameState.hydroGeneration +
    gameState.windGeneration;

  const powerBalance =
    totalGeneration -
    gameState.demand;

  // ==========================================================
  // DERIVED HYDRO UNIT OUTPUT
  // ==========================================================

  const hydroOutputPerAvailableUnit =
    availableHydroUnits > 0
      ? gameState.hydroGeneration /
        availableHydroUnits
      : 0;

  const hydroUnitOneOutput =
    hydroOutputPerAvailableUnit;

  const hydroUnitTwoOutput =
    hydroUnitTwoMaintenance
      ? 0
      : hydroOutputPerAvailableUnit;

  // ==========================================================
  // DERIVED WIND GROUP OUTPUT
  // ==========================================================

  const windOutputPerAvailableGroup =
    availableWindGroups > 0
      ? gameState.windGeneration /
        availableWindGroups
      : 0;

  // ==========================================================
  // DERIVED SCORE STATE
  // ==========================================================

  const technicalScore =
    calculateAverageScore(
      gameState.cumulativeTechnical,
      gameState.scoredWeeks
    );

  const sustainabilityScore =
    calculateAverageScore(
      gameState
        .cumulativeSustainability,
      gameState.scoredWeeks
    );

  const publicScore =
    calculateAverageScore(
      gameState.cumulativePublic,
      gameState.scoredWeeks
    );

  const overallScore =
    calculateOverallScore(
      technicalScore,
      sustainabilityScore,
      publicScore
    );

  // ==========================================================
  // DERIVED OBJECTIVES AND BEGINNER RECOMMENDATIONS
  // ==========================================================

  const currentReservoirTarget =
    getMonthlyReservoirTarget(
      currentMonthIndex
    );

  const recommendedWind =
    gameState
      .availableWindGeneration;

  const recommendedHydro =
    Math.round(
      clamp(
        gameState.demand -
          recommendedWind,
        0,
        availableHydroCapacity
      )
    );

  // ==========================================================
  // SPRINT 2: VISUAL FORECAST DATA
  //
  // Converts the existing two-month categorical forecasts into
  // chart values. These are relative levels, not engineering
  // measurements:
  //
  // 1 = Low
  // 2 = Moderate
  // 3 = High
  // 4 = Very high
  // ==========================================================

  const getForecastLevel = (value: string): number => {
    const normalizedValue = value.toLowerCase();

    if (normalizedValue.includes("very high")) {
      return 4;
    }

    if (normalizedValue.includes("high")) {
      return 3;
    }

    if (normalizedValue.includes("moderate")) {
      return 2;
    }

    return 1;
  };

  const getForecastLevelLabel = (value: number): string => {
    if (value >= 4) {
      return "Very high";
    }

    if (value >= 3) {
      return "High";
    }

    if (value >= 2) {
      return "Moderate";
    }

    return "Low";
  };

  const forecastChartData = forecasts.map((forecast) => ({
    month: forecast.month,
    wind: getForecastLevel(forecast.wind),
    rainfall: getForecastLevel(forecast.rainfall),
    demand: getForecastLevel(forecast.demand),
  }));

  useEffect(() => {
    if (
      !gameStarted ||
      yearComplete
    ) {
      setWindShutdownWarning(false);
      setWindShutdownCountdown(0);
      return;
    }

    const shouldWarn =
      (selectedDifficulty ===
        "advanced" ||
        selectedDifficulty ===
          "expert") &&
      gameState.windSpeed >=
        HIGH_WIND_SHUTDOWN_SPEED &&
      windUtilization > 0;

    if (!shouldWarn) {
      setWindShutdownWarning(false);
      setWindShutdownCountdown(0);
      return;
    }

    if (!windShutdownWarning) {
      setWindShutdownWarning(true);
      setWindShutdownCountdown(10);
    }
  }, [
    gameStarted,
    gameState.windSpeed,
    selectedDifficulty,
    windShutdownWarning,
    windUtilization,
    yearComplete,
  ]);

  useEffect(() => {
    if (
      !windShutdownWarning ||
      yearComplete ||
      !isRunning
    ) {
      return;
    }

    const countdownTimer =
      window.setTimeout(() => {
        setWindShutdownCountdown(
          (current) => {
            if (current <= 1) {
              setGameOverReason(
                "Wind speed exceeded 28 m/s while turbines were still online. The grid failed before shutdown was completed."
              );
              setYearComplete(true);
              setIsRunning(false);
              setWindShutdownWarning(false);
              return 0;
            }

            return current - 1;
          }
        );
      }, 1000);

    return () =>
      window.clearTimeout(
        countdownTimer
      );
  }, [
    windShutdownWarning,
    windShutdownCountdown,
    yearComplete,
  ]);

  // ==========================================================
  // IMMEDIATE PLAYER CONTROL RESPONSE EFFECT
  //
  // This effect updates generation and frequency immediately
  // when either player slider moves.
  // ==========================================================

  useEffect(() => {
    if (
      !gameStarted ||
      yearComplete
    ) {
      return;
    }

    setGameState(
      (previous) => {
        const hydroGeneration =
          previous.reservoir <= 0
            ? 0
            : clamp(
                availableHydroCapacity *
                  (hydroDispatch /
                    100),
                0,
                availableHydroCapacity
              );

        const windGeneration =
          previous
            .availableWindGeneration *
          (windUtilization / 100);

        const balance =
          hydroGeneration +
          windGeneration -
          previous.demand;

        const frequency = clamp(
          50 +
            balance *
              0.012 *
              settings
                .frequencyPenaltyMultiplier,
          48.8,
          51.2
        );

        return {
          ...previous,
          hydroGeneration:
            Math.round(
              hydroGeneration
            ),
          windGeneration:
            Math.round(
              windGeneration
            ),
          frequency,
        };
      }
    );
  }, [
    hydroDispatch,
    windUtilization,
    availableHydroCapacity,
    gameStarted,
    yearComplete,
    settings
      .frequencyPenaltyMultiplier,
  ]);

  // ==========================================================
  // MAIN WEEKLY SIMULATION LOOP
  //
  // FUTURE EXTRACTION TARGET:
  // src/simulation/simulationEngine.ts
  //
  // The calculation inside setGameState can later be converted
  // into a pure updateSimulationWeek() function.
  // ==========================================================

  useEffect(() => {
    if (
      !gameStarted ||
      !isRunning ||
      yearComplete
    ) {
      return;
    }

    const simulationTimer =
      window.setInterval(() => {
        setGameState(
          (previous) => {
            // ------------------------------------------------
            // FINISH THE SIMULATED YEAR
            // ------------------------------------------------

            if (
              previous.weekIndex >=
              51
            ) {
              setGameOverReason(null);
              setYearComplete(
                true
              );

              setIsRunning(false);

              return previous;
            }

            // ------------------------------------------------
            // ADVANCE THE CALENDAR
            // ------------------------------------------------

            const nextWeekIndex =
              previous.weekIndex +
              1;

            const nextDate =
              getSimulationDate(
                nextWeekIndex
              );

            const nextMonthIndex =
              nextDate.getUTCMonth();

            // ------------------------------------------------
            // UPDATE THE ACTIVE WEATHER EVENT
            // ------------------------------------------------

            let activeEvent =
              previous.activeEvent;

            let eventWeeksRemaining =
              previous
                .eventWeeksRemaining;

            if (
              eventWeeksRemaining >
              0
            ) {
              eventWeeksRemaining -=
                1;

              if (
                eventWeeksRemaining ===
                0
              ) {
                activeEvent =
                  "none";
              }
            } else {
              activeEvent =
                chooseWeatherEvent(
                  settings
                );

              eventWeeksRemaining =
                getEventDuration(
                  activeEvent
                );
            }

            // ------------------------------------------------
            // GENERATE THIS WEEK'S CONDITIONS
            // ------------------------------------------------

            const weather =
              getScenarioMonthWeather(
                annualScenario,
                nextMonthIndex,
                activeEvent
              );

            // ------------------------------------------------
            // CALCULATE NEXT WEEK'S MAINTENANCE STATUS
            // ------------------------------------------------

            const nextHydroMaintenance =
              settings.maintenance &&
              nextWeekIndex >= 25 &&
              nextWeekIndex <= 28;

            const nextUnexpectedHydroFailure =
              settings
                .unexpectedFailures &&
              nextWeekIndex >= 37 &&
              nextWeekIndex <= 38;

            const nextHydroUnavailable =
              nextHydroMaintenance ||
              nextUnexpectedHydroFailure;

            const nextAvailableHydroCapacity =
              nextHydroUnavailable
                ? HYDRO_UNIT_CAPACITY
                : TOTAL_HYDRO_CAPACITY;

            const nextWindMaintenance =
              settings.maintenance &&
              nextWeekIndex >= 14 &&
              nextWeekIndex <= 17;

            const nextAvailableWindCapacity =
              nextWindMaintenance
                ? TOTAL_WIND_CAPACITY -
                  WIND_GROUP_CAPACITY
                : TOTAL_WIND_CAPACITY;

            // ------------------------------------------------
            // CALCULATE WIND GENERATION
            // ------------------------------------------------

            const windCapacityFactor =
              getWindCapacityFactor(
                weather.windSpeed
              );

            const availableWindGeneration =
              nextAvailableWindCapacity *
              windCapacityFactor;

            const windGeneration =
              availableWindGeneration *
              (windUtilization /
                100);

            // ------------------------------------------------
            // CALCULATE HYDRO GENERATION
            // ------------------------------------------------

            let hydroGeneration =
              nextAvailableHydroCapacity *
              (hydroDispatch /
                100);

            if (
              previous.reservoir <=
              0
            ) {
              hydroGeneration = 0;
            }

            // ------------------------------------------------
            // CALCULATE GRID BALANCE AND FREQUENCY
            // ------------------------------------------------

            const generation =
              hydroGeneration +
              windGeneration;

            const balance =
              generation -
              weather.demand;

            const frequency =
              clamp(
                50 +
                  balance *
                    0.012 *
                    settings
                      .frequencyPenaltyMultiplier,
                48.8,
                51.2
              );

            // ------------------------------------------------
            // UPDATE THE RESERVOIR
            // ------------------------------------------------

            const rainfallInflow =
              weather.rainfall *
              0.052;

            const hydroWaterUse =
              hydroGeneration *
              0.022;

            const rawReservoir =
              previous.reservoir +
              rainfallInflow -
              hydroWaterUse;

            const spilledWater =
              Math.max(
                0,
                rawReservoir -
                  100
              );

            const reservoir =
              clamp(
                rawReservoir,
                0,
                100
              );

            const overfilledThisWeek =
              spilledWater > 0;

            const nextConsecutiveOverfillWeeks =
              overfilledThisWeek
                ? previous
                    .consecutiveOverfillWeeks +
                  1
                : 0;

            const shouldTriggerOverfillGameOver =
              nextConsecutiveOverfillWeeks >=
              RESERVOIR_OVERFILL_GAMEOVER_WEEKS;

            const highWindThisWeek =
              (selectedDifficulty ===
                "advanced" ||
                selectedDifficulty ===
                  "expert") &&
              weather.windSpeed >=
                HIGH_WIND_SHUTDOWN_SPEED &&
              windGeneration > 0;

            const nextConsecutiveHighWindWeeks =
              highWindThisWeek
                ? previous
                    .consecutiveHighWindWeeks +
                  1
                : 0;

            const shouldTriggerHighWindGameOver =
              nextConsecutiveHighWindWeeks >=
              HIGH_WIND_GAMEOVER_WEEKS;

            if (
              shouldTriggerHighWindGameOver
            ) {
              setGameOverReason(
                `High wind conditions persisted for ${HIGH_WIND_GAMEOVER_WEEKS} consecutive weeks while turbines were still online.`
              );
              setYearComplete(true);
              setIsRunning(false);
              return previous;
            }

            if (
              shouldTriggerOverfillGameOver
            ) {
              setGameOverReason(
                `Reservoir overflow continued for ${RESERVOIR_OVERFILL_GAMEOVER_WEEKS} consecutive weeks. Storage exceeded safe operating limits.`
              );
              setYearComplete(true);
              setIsRunning(false);
              return previous;
            }

            // ------------------------------------------------
            // CALCULATE UNSERVED AND CURTAILED POWER
            // ------------------------------------------------

            const unservedPower =
              Math.max(
                0,
                -balance
              );

            const curtailedWind =
              Math.max(
                0,
                availableWindGeneration -
                  windGeneration
              );

            // ------------------------------------------------
            // CALCULATE WEEKLY SCORES
            // ------------------------------------------------

            const reservoirTarget =
              getMonthlyReservoirTarget(
                nextMonthIndex
              );

            const weeklyTechnical =
              calculateWeeklyTechnicalScore(
                calculateDelayedAverage(
                  frequency,
                  previous.frequency,
                  previous.scoredWeeks > 0
                ),
                calculateDelayedAverage(
                  balance,
                  previous.powerBalance,
                  previous.scoredWeeks > 0
                )
              );

            const weeklySustainability =
              calculateWeeklySustainabilityScore(
                calculateDelayedAverage(
                  curtailedWind,
                  previous.lastWeekCurtailedWind,
                  previous.scoredWeeks > 0
                ),
                calculateDelayedAverage(
                  spilledWater,
                  previous.lastWeekSpilledWater,
                  previous.scoredWeeks > 0
                ),
                calculateDelayedAverage(
                  reservoir,
                  previous.reservoir,
                  previous.scoredWeeks > 0
                ),
                reservoirTarget
              );

            const weeklyPublic =
              calculateWeeklyPublicScore(
                calculateDelayedAverage(
                  unservedPower,
                  previous.unservedPower,
                  previous.scoredWeeks > 0
                ),
                calculateDelayedAverage(
                  frequency,
                  previous.frequency,
                  previous.scoredWeeks > 0
                )
              );

            // ------------------------------------------------
            // ADD THE WEEK TO GRAPH HISTORY
            // ------------------------------------------------

            const weekLabel =
              `${nextDate.toLocaleString(
                "en-US",
                {
                  month: "short",
                  timeZone:
                    "UTC",
                }
              )} W${getWeekOfMonth(
                nextDate
              )}`;

            setHistory(
              (
                currentHistory
              ) => [
                ...currentHistory,
                {
                  week:
                    weekLabel,
                  demand:
                    weather.demand,
                  hydro:
                    Math.round(
                      hydroGeneration
                    ),
                  wind:
                    Math.round(
                      windGeneration
                    ),
                  total:
                    Math.round(
                      generation
                    ),
                  powerBalance: Math.round(balance),
                  windSpeed:
                    weather.windSpeed,
                  rainfall:
                    weather.rainfall,
                  reservoir:
                    Math.round(
                      reservoir
                    ),
                  reservoirTarget,
                  frequency,
                },
              ]
            );

            setScoreHistory(
              (currentHistory) => [
                ...currentHistory,
                {
                  week: weekLabel,
                  technical:
                    weeklyTechnical,
                  sustainability:
                    weeklySustainability,
                  public:
                    weeklyPublic,
                  powerBalance: balance,
                  frequency,
                  reservoir,
                  reservoirTarget,
                },
              ]
            );

            // ------------------------------------------------
            // RETURN THE NEXT COMPLETE GAME STATE
            // ------------------------------------------------

            return {
              weekIndex:
                nextWeekIndex,
              frequency,
              powerBalance: balance,
              unservedPower,
              reservoir,
              demand:
                weather.demand,
              hydroGeneration:
                Math.round(
                  hydroGeneration
                ),
              windGeneration:
                Math.round(
                  windGeneration
                ),
              availableWindGeneration:
                Math.round(
                  availableWindGeneration
                ),
              windSpeed:
                weather.windSpeed,
              rainfall:
                weather.rainfall,
              activeEvent,
              eventWeeksRemaining,
              cumulativeTechnical:
                previous
                  .cumulativeTechnical +
                weeklyTechnical,
              cumulativeSustainability:
                previous
                  .cumulativeSustainability +
                weeklySustainability,
              cumulativePublic:
                previous
                  .cumulativePublic +
                weeklyPublic,
              scoredWeeks:
                previous.scoredWeeks +
                1,
              spilledWater:
                previous
                  .spilledWater +
                spilledWater,
              unservedEnergy:
                previous
                  .unservedEnergy +
                unservedPower,
              curtailedWind:
                previous
                  .curtailedWind +
                curtailedWind,
              lastWeekSpilledWater:
                spilledWater,
              lastWeekCurtailedWind:
                curtailedWind,
              consecutiveOverfillWeeks:
                nextConsecutiveOverfillWeeks,
              consecutiveHighWindWeeks:
                nextConsecutiveHighWindWeeks,
            };
          }
        );
      }, effectiveTickMilliseconds);

    return () =>
      window.clearInterval(
        simulationTimer
      );
  }, [
    effectiveTickMilliseconds,
    gameStarted,
    hydroDispatch,
    isRunning,
    selectedDifficulty,
    settings,
    windUtilization,
    yearComplete,
  ]);

  // ==========================================================
  // UI ACTIONS
  //
  // FUTURE EXTRACTION POSSIBILITY:
  // These actions may eventually move into a custom hook:
  // src/hooks/useGameSimulation.ts
  // ==========================================================

  const startGame = () => {
    const nextScenario =
      generateAnnualScenario();

    setAnnualScenario(nextScenario);

    const startingWeather =
      getScenarioMonthWeather(
        nextScenario,
        5,
        "none"
      );

    const availableWind =
      TOTAL_WIND_CAPACITY *
      getWindCapacityFactor(
        startingWeather.windSpeed
      );

    const startingWind =
      availableWind *
      (windUtilization / 100);

    const startingHydro =
      TOTAL_HYDRO_CAPACITY *
      (hydroDispatch / 100);

    const startingBalance =
      startingHydro +
      startingWind -
      startingWeather.demand;

    const startingFrequency =
      clamp(
        50 +
          startingBalance *
            0.012 *
            settings
              .frequencyPenaltyMultiplier,
        48.8,
        51.2
      );

    setGameState({
      weekIndex: 0,
      frequency:
        startingFrequency,
      powerBalance: startingBalance,
      unservedPower: Math.max(0, -startingBalance),
      reservoir: 74,
      demand:
        startingWeather.demand,
      hydroGeneration:
        Math.round(
          startingHydro
        ),
      windGeneration:
        Math.round(
          startingWind
        ),
      availableWindGeneration:
        Math.round(
          availableWind
        ),
      windSpeed:
        startingWeather.windSpeed,
      rainfall:
        startingWeather.rainfall,
      activeEvent: "none",
      eventWeeksRemaining: 0,
      cumulativeTechnical: 0,
      cumulativeSustainability: 0,
      cumulativePublic: 0,
      scoredWeeks: 0,
      spilledWater: 0,
      unservedEnergy: 0,
      curtailedWind: 0,
      lastWeekSpilledWater: 0,
      lastWeekCurtailedWind: 0,
      consecutiveOverfillWeeks: 0,
      consecutiveHighWindWeeks: 0,
    });

    setGameOverReason(null);
    setWindShutdownWarning(false);
    setWindShutdownCountdown(0);

    setGameStarted(true);
    setIsRunning(true);
  };

  const restartGame = () => {
    setGameStarted(false);
    setIsRunning(false);
    setYearComplete(false);
    setGameOverReason(null);
    setWindShutdownWarning(false);
    setWindShutdownCountdown(0);
    setHistory([]);
    setScoreHistory([]);

    setHydroDispatch(55);
    setWindUtilization(100);
  };

  // ================= END UI ACTIONS ==========================

  // ==========================================================
  // START SCREEN
  //
  // FUTURE COMPONENT EXTRACTION TARGET:
  // src/components/StartScreen.tsx
  // ==========================================================

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-slate-100 to-emerald-100 p-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl bg-white p-8 shadow-2xl md:p-10">
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
                Renewable Energy Strategy Simulator
              </p>

              <h1 className="mt-3 text-4xl font-bold text-slate-900 md:text-5xl">
                Hydro & Wind Grid Operator
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                Operate the grid from
                June through May. Match
                generation to demand,
                maintain 50 Hz, and
                manage reservoir water
                for future needs.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {(
                Object.keys(
                  DIFFICULTIES
                ) as Difficulty[]
              ).map(
                (difficulty) => {
                  const option =
                    DIFFICULTIES[
                      difficulty
                    ];

                  const selected =
                    difficulty ===
                    selectedDifficulty;

                  return (
                    <button
                      key={
                        difficulty
                      }
                      type="button"
                      onClick={() =>
                        setSelectedDifficulty(
                          difficulty
                        )
                      }
                      className={`rounded-2xl border-2 p-5 text-left transition ${
                        selected
                          ? "border-blue-600 bg-blue-50 shadow-md"
                          : "border-slate-200 bg-white hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">
                          {
                            option.label
                          }
                        </h2>

                        <span
                          className={`h-5 w-5 rounded-full border-4 ${
                            selected
                              ? "border-blue-600 bg-white"
                              : "border-slate-300"
                          }`}
                        />
                      </div>

                      <p className="mt-2 text-sm text-slate-600">
                        {
                          option.description
                        }
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <span className="rounded-lg bg-slate-100 p-2">
                          Forecast:{" "}
                          {
                            option.forecastAccuracy
                          }
                          %
                        </span>

                        <span className="rounded-lg bg-slate-100 p-2">
                          Monthly
                          pause:{" "}
                          {
                            option.monthlyPauseSeconds
                          }
                          s
                        </span>

                        <span className="rounded-lg bg-slate-100 p-2">
                          Weather
                          events:{" "}
                          {option.weatherEvents
                            ? "Yes"
                            : "No"}
                        </span>

                        <span className="rounded-lg bg-slate-100 p-2">
                          Maintenance:{" "}
                          {option.maintenance
                            ? "Yes"
                            : "No"}
                        </span>
                      </div>
                    </button>
                  );
                }
              )}
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="font-bold">
                Selected:{" "}
                {settings.label}
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                {
                  settings.description
                }
              </p>

              {selectedDifficulty ===
                "beginner" && (
                <p className="mt-3 rounded-xl bg-blue-100 p-3 text-sm text-blue-800">
                  Beginner mode
                  keeps both controls
                  manual and provides
                  suggested wind and
                  hydro dispatch values
                  during play.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={startGame}
              className="mt-8 w-full rounded-2xl bg-blue-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-blue-700"
            >
              Start {settings.label}{" "}
              Simulation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= END START SCREEN ========================

  // ==========================================================
  // MAIN DASHBOARD
  // ==========================================================

  return (
    <div className="min-h-screen bg-slate-100 p-3 lg:p-4">
      {/* =====================================================
          MONTHLY BRIEFING MODAL

          FUTURE COMPONENT EXTRACTION TARGET:
          src/components/MonthlyBriefing.tsx
          ===================================================== */}

      <div className="mx-auto max-w-[1920px] space-y-4">
        {/* ===================================================
            DASHBOARD HEADER
            =================================================== */}

        <header className="rounded-2xl bg-slate-900 p-5 text-white shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-300">
                {settings.label}{" "}
                Difficulty
              </p>

              <h1 className="text-2xl font-bold md:text-3xl">
                Hydro & Wind Grid
                Operator
              </h1>

              <p className="mt-1 text-slate-300">
                {currentMonth}, Week{" "}
                {
                  currentWeekOfMonth
                }{" "}
                · {currentSeason}
              </p>

              <p className="mt-1 text-sm text-slate-300">
                Scenario: <span className="font-semibold text-white">{annualScenario.label}</span>
                <span className="mx-2 text-slate-400">•</span>
                {annualScenario.summary}
              </p>

              {(selectedDifficulty === "advanced" ||
                selectedDifficulty === "expert") &&
                windShutdownWarning && (
                  <p className="mt-2 rounded-xl border border-amber-400 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-200">
                    Turbine shutdown required: wind is {gameState.windSpeed} m/s. The grid will fail in {windShutdownCountdown}s unless wind generation is set to 0.
                  </p>
                )}

              {(selectedDifficulty === "advanced" ||
                selectedDifficulty === "expert") &&
                gameState.windSpeed >= HIGH_WIND_SHUTDOWN_SPEED &&
                !windShutdownWarning &&
                windUtilization > 0 && (
                  <p className="mt-2 rounded-xl border border-amber-400 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-200">
                    Wind speed is rising toward the shutdown threshold. Reduce wind output to 0 before the turbines are damaged.
                  </p>
                )}

              <p className="mt-1 text-sm text-slate-400">
                140 MW hydro · 120 MW
                wind ·{" "}
                {
                  TOTAL_INSTALLED_CAPACITY
                }{" "}
                MW installed
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setIsRunning(
                    (current) =>
                      !current
                  )
                }
                disabled={
                  yearComplete
                }
                className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 disabled:opacity-50"
              >
                {isRunning
                  ? "Pause"
                  : "Continue"}
              </button>

              <div className="flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/70 px-2 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Speed
                </span>

                {simulationSpeedOptions.map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() =>
                      setSimulationSpeed(speed)
                    }
                    className={`rounded-lg px-2.5 py-1.5 text-sm font-semibold transition ${
                      simulationSpeed === speed
                        ? "bg-blue-500 text-white"
                        : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={
                  restartGame
                }
                className="rounded-xl border border-slate-500 px-5 py-3 font-semibold"
              >
                Change Difficulty
              </button>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex justify-between text-sm text-slate-300">
              <span>June</span>

              <span>
                {Math.round(
                  progress
                )}
                % complete
              </span>

              <span>May</span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-blue-400 transition-all duration-500"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        </header>

        {/* ================= END DASHBOARD HEADER ============== */}

        {/* ===================================================
            YEAR COMPLETE MESSAGE
            =================================================== */}

        {yearComplete && (
          <section
            className={`rounded-2xl border p-6 text-center shadow ${
              gameOverReason
                ? "border-red-300 bg-red-50"
                : "border-emerald-300 bg-emerald-50"
            }`}
          >
            <h2
              className={`text-3xl font-bold ${
                gameOverReason
                  ? "text-red-800"
                  : "text-emerald-800"
              }`}
            >
              {gameOverReason
                ? "Game Over"
                : "Simulated Year Complete"}
            </h2>

            {gameOverReason && (
              <p className="mt-2 text-red-700">
                {gameOverReason}
              </p>
            )}

            <p
              className={`mt-2 ${
                gameOverReason
                  ? "text-red-700"
                  : "text-emerald-700"
              }`}
            >
              Overall score:{" "}
              {overallScore}/100
            </p>

            <button
              type="button"
              onClick={
                restartGame
              }
              className={`mt-4 rounded-xl px-6 py-3 font-bold text-white ${
                gameOverReason
                  ? "bg-red-700"
                  : "bg-emerald-700"
              }`}
            >
              Play Again
            </button>
          </section>
        )}

        {yearComplete && scoreHistory.length > 0 && (
          <section className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">
                Annual Performance Report
              </h2>
              <p className="text-xs text-slate-500">
                Scores are evaluated using a two-week rolling window so brief
                disturbances do not cause an immediate penalty.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-blue-700">
                  Technical Score and Power Balance
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={scoreHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis
                        yAxisId="score"
                        domain={[0, 100]}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        yAxisId="metric"
                        orientation="right"
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="score"
                        type="monotone"
                        dataKey="technical"
                        name="Technical Score"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={false}
                      />
                      <Line
                        yAxisId="metric"
                        type="monotone"
                        dataKey="powerBalance"
                        name="Power Balance (MW)"
                        stroke="#64748b"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-emerald-700">
                  Sustainability Score and Reservoir
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={scoreHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis
                        yAxisId="score"
                        domain={[0, 100]}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        yAxisId="metric"
                        orientation="right"
                        domain={[0, 100]}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="score"
                        type="monotone"
                        dataKey="sustainability"
                        name="Sustainability Score"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={false}
                      />
                      <Line
                        yAxisId="metric"
                        type="monotone"
                        dataKey="reservoir"
                        name="Reservoir Level (%)"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="metric"
                        type="monotone"
                        dataKey="reservoirTarget"
                        name="Reservoir Target (%)"
                        stroke="#94a3b8"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-amber-700">
                  Public Satisfaction and Frequency
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={scoreHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis
                        yAxisId="score"
                        domain={[0, 100]}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        yAxisId="metric"
                        orientation="right"
                        domain={[48.8, 51.2]}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="score"
                        type="monotone"
                        dataKey="public"
                        name="Public Satisfaction"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        dot={false}
                      />
                      <Line
                        yAxisId="metric"
                        type="monotone"
                        dataKey="frequency"
                        name="Frequency (Hz)"
                        stroke="#dc2626"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =============== END YEAR COMPLETE MESSAGE ========== */}

        {/* ===================================================
            PRIMARY STATUS PANELS
            =================================================== */}

                {/* ===================================================
            SPRINT 2 WIDESCREEN OPERATOR CONSOLE

            On wide screens, the controls and immediate feedback
            are kept together. Historical charts and generation
            fleet information remain below this console.
            =================================================== */}

        <section className="grid gap-4 2xl:grid-cols-12">
          {/* OPERATOR CONTROLS */}

          <div className="rounded-2xl bg-white p-5 shadow 2xl:col-span-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">
                Operator Controls
              </h2>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  isRunning
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {isRunning ? "Running" : "Paused"}
              </span>
            </div>

            {selectedDifficulty === "beginner" && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  Suggested dispatch
                </p>

                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      Wind
                    </p>

                    <p className="font-bold text-emerald-700">
                      {recommendedWind} MW
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Hydro
                    </p>

                    <p className="font-bold text-blue-700">
                      {recommendedHydro} MW
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-7">
              <div>
                <div className="mb-2 flex justify-between gap-3">
                  <label
                    htmlFor="hydro-dispatch"
                    className="font-semibold"
                  >
                    Hydro Dispatch
                  </label>

                  <strong className="text-blue-700">
                    {gameState.hydroGeneration} MW
                  </strong>
                </div>

                <input
                  id="hydro-dispatch"
                  type="range"
                  min="0"
                  max="100"
                  value={hydroDispatch}
                  onChange={(event) =>
                    setHydroDispatch(
                      Number(event.target.value)
                    )
                  }
                  className="h-4 w-full cursor-pointer accent-blue-600"
                />

                <div className="mt-1 flex justify-between text-xs text-slate-500">
                  <span>0%</span>
                  <span>{hydroDispatch}%</span>
                  <span>100%</span>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Available capacity: {availableHydroCapacity} MW
                </p>
              </div>

              <div>
                <div className="mb-2 flex justify-between gap-3">
                  <label
                    htmlFor="wind-utilization"
                    className="font-semibold"
                  >
                    Wind Utilization
                  </label>

                  <strong className="text-emerald-700">
                    {gameState.windGeneration} MW
                  </strong>
                </div>

                <input
                  id="wind-utilization"
                  type="range"
                  min="0"
                  max="100"
                  value={windUtilization}
                  onChange={(event) =>
                    setWindUtilization(
                      Number(event.target.value)
                    )
                  }
                  className="h-4 w-full cursor-pointer accent-emerald-600"
                />

                <div className="mt-1 flex justify-between text-xs text-slate-500">
                  <span>0%</span>
                  <span>{windUtilization}%</span>
                  <span>100%</span>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Available now:{" "}
                  {gameState.availableWindGeneration} MW
                </p>
              </div>
            </div>
          </div>

          {/* FREQUENCY */}

          <div className="rounded-2xl bg-white p-5 shadow 2xl:col-span-2">
            <h2 className="text-center text-lg font-semibold">
              Grid Frequency
            </h2>

            <div className="mt-3">
              <FrequencyGauge frequency={gameState.frequency} />
            </div>

            <p className="mt-3 text-center text-xs text-slate-500">
              Stable operating range: 49.8 to 50.2 Hz
            </p>
          </div>

          {/* LIVE GRID STATUS */}

          <div className="rounded-2xl bg-white p-5 shadow 2xl:col-span-2">
            <h2 className="text-lg font-semibold">
              Live Grid Status
            </h2>

            <div className="mt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Demand</span>

                <strong className="text-red-600">
                  {gameState.demand} MW
                </strong>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-600">Hydro</span>

                <strong className="text-blue-600">
                  {gameState.hydroGeneration} MW
                </strong>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-600">Wind</span>

                <strong className="text-emerald-600">
                  {gameState.windGeneration} MW
                </strong>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-3">
                <span className="font-semibold">
                  Total Generation
                </span>

                <strong>{totalGeneration} MW</strong>
              </div>
            </div>

            <div
              className={`mt-5 rounded-2xl p-4 text-center ${
                Math.abs(powerBalance) <= 5
                  ? "bg-green-100 text-green-700"
                  : powerBalance < 0
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-wide">
                Power Balance
              </p>

              <p className="mt-1 text-4xl font-bold">
                {powerBalance > 0 ? "+" : ""}
                {powerBalance} MW
              </p>

              <p className="mt-1 text-sm font-semibold">
                {Math.abs(powerBalance) <= 5
                  ? "Balanced"
                  : powerBalance < 0
                    ? "Generation deficit"
                    : "Generation surplus"}
              </p>
            </div>
          </div>

          {/* RESERVOIR */}

          <div className="rounded-2xl bg-white p-5 shadow 2xl:col-span-2">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold">
                Reservoir
              </h2>

              <span
                className={`rounded-full px-2 py-1 text-xs font-bold ${
                  gameState.reservoir >= currentReservoirTarget
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                Target {currentReservoirTarget}%
              </span>
            </div>

            <div className="mx-auto mt-3 flex h-52 w-28 items-end overflow-hidden rounded-b-3xl border-4 border-slate-500 bg-sky-50">
              <div
                className="relative w-full bg-gradient-to-t from-blue-700 to-sky-400 transition-all duration-700"
                style={{
                  height: `${gameState.reservoir}%`,
                }}
              >
                <div className="absolute left-0 right-0 top-0 h-2 bg-white/30" />
              </div>
            </div>

            <p className="mt-3 text-center text-4xl font-bold text-blue-700">
              {Math.round(gameState.reservoir)}%
            </p>

            <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs text-slate-500">
              <div className="rounded-lg bg-slate-100 p-2">
                Rain
                <strong className="block text-slate-900">
                  {gameState.rainfall} mm
                </strong>
              </div>

              <div className="rounded-lg bg-slate-100 p-2">
                Wind
                <strong className="block text-slate-900">
                  {gameState.windSpeed} km/h
                </strong>
              </div>
            </div>
          </div>

          {/* FUTURE FORECAST */}

          <div className="rounded-2xl bg-white p-5 shadow 2xl:col-span-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Two-Month Outlook
                </h2>

                <p className="text-xs text-slate-500">
                  Future forecast, not historical weather
                </p>
              </div>

            </div>

            <div className="mt-3 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={forecastChartData}
                  margin={{
                    top: 8,
                    right: 8,
                    left: -14,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                  />

                  <YAxis
                    domain={[0, 4]}
                    ticks={[1, 2, 3, 4]}
                    width={66}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value: number) =>
                      getForecastLevelLabel(value)
                    }
                  />

                  <Tooltip
                    formatter={(value) =>
                      getForecastLevelLabel(Number(value))
                    }
                  />

                  <Legend
                    wrapperStyle={{
                      fontSize: "11px",
                    }}
                  />

                  <Bar
                    dataKey="rainfall"
                    name="Rain"
                    fill="#38bdf8"
                    radius={[4, 4, 0, 0]}
                  />

                  <Line
                    type="monotone"
                    dataKey="wind"
                    name="Wind"
                    stroke="#059669"
                    strokeWidth={3}
                  />

                  <Line
                    type="monotone"
                    dataKey="demand"
                    name="Demand"
                    stroke="#ef4444"
                    strokeWidth={3}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              {forecasts.map((forecast) => (
                <div
                  key={forecast.month}
                  className="rounded-xl bg-slate-50 p-3 text-xs"
                >
                  <div className="flex justify-between gap-2">
                    <strong>{forecast.month}</strong>

                    <span className="text-slate-500">
                      {forecast.confidence}% confidence
                    </span>
                  </div>

                  <p className="mt-1 text-slate-600">
                    Wind {forecast.wind} · Rain{" "}
                    {forecast.rainfall} · Demand{" "}
                    {forecast.demand}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================================================
            HISTORICAL CHARTS

            These show completed simulation weeks.
            The forecast above shows the next two months.
            =================================================== */}

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Demand and Generation History
                </h2>

                <p className="text-xs text-slate-500">
                  Completed weeks
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                MW
              </span>
            </div>

            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={history.slice(-18)}
                  margin={{
                    right: 10,
                    left: -15,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 10 }}
                  />

                  <YAxis domain={[0, 260]} />

                  <Tooltip />
                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="demand"
                    name="Demand"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total Generation"
                    stroke="#111827"
                    strokeWidth={3}
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="hydro"
                    name="Hydro"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="wind"
                    name="Wind"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Actual Weather History
                </h2>

                <p className="text-xs text-slate-500">
                  Completed weeks, not forecast conditions
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                Historical
              </span>
            </div>

            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={history.slice(-18)}
                  margin={{
                    right: 5,
                    left: -15,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 10 }}
                  />

                  <YAxis
                    yAxisId="wind"
                    orientation="left"
                    domain={[0, 45]}
                  />

                  <YAxis
                    yAxisId="rain"
                    orientation="right"
                    domain={[0, 90]}
                  />

                  <Tooltip />
                  <Legend />

                  <Bar
                    yAxisId="rain"
                    dataKey="rainfall"
                    name="Rainfall"
                    fill="#38bdf8"
                    opacity={0.65}
                  />

                  <Line
                    yAxisId="wind"
                    type="monotone"
                    dataKey="windSpeed"
                    name="Wind Speed"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ===================================================
            GENERATION FLEET
            =================================================== */}

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Hydropower Station
                </h2>

                <p className="text-sm text-slate-500">
                  Equal loading between available units
                </p>
              </div>

              <strong className="text-blue-700">
                {gameState.hydroGeneration} MW
              </strong>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <HydroUnitCard
                name="Hydro Unit H1"
                output={hydroUnitOneOutput}
                maintenance={false}
              />

              <HydroUnitCard
                name="Hydro Unit H2"
                output={hydroUnitTwoOutput}
                maintenance={hydroUnitTwoMaintenance}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Wind Farm
                </h2>

                <p className="text-sm text-slate-500">
                  Four groups · seven turbines per group · 30 MW
                  per group
                </p>
              </div>

              <strong className="text-emerald-700">
                {gameState.windGeneration} MW
              </strong>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {[1, 2, 3, 4].map((groupNumber) => {
                const maintenance =
                  groupNumber === 3 &&
                  windGroupThreeMaintenance;

                const output = maintenance
                  ? 0
                  : windOutputPerAvailableGroup;

                const spinning =
                  !maintenance &&
                  output > 0.5 &&
                  gameState.windSpeed >= 4 &&
                  gameState.windSpeed < 35;

                return (
                  <div
                    key={groupNumber}
                    className={`rounded-xl border p-3 ${
                      maintenance
                        ? "border-red-200 bg-red-50"
                        : "border-emerald-200 bg-emerald-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong>Wind Group W{groupNumber}</strong>

                      <span className="text-xs font-semibold">
                        {maintenance
                          ? "Maintenance"
                          : spinning
                            ? "Generating"
                            : "Stopped"}
                      </span>
                    </div>

                    <div className="mt-3 flex justify-between gap-1">
                      {Array.from({
                        length: TURBINES_PER_GROUP,
                      }).map((_, index) => (
                        <TurbineIcon
                          key={index}
                          spinning={spinning}
                          maintenance={maintenance}
                        />
                      ))}
                    </div>

                    <p className="mt-3 text-xl font-bold">
                      {Math.round(output)} MW
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =============== END PRIMARY STATUS PANELS ========== */}

        {/* ===================================================
            MAINTENANCE AND NEWS
            =================================================== */}

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">
            Maintenance and News
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border-l-4 border-blue-500 bg-blue-50 p-4">
              <strong>
                Grid Bulletin
              </strong>

              <p className="mt-1 text-sm text-slate-600">
                {currentSeason ===
                "Winter"
                  ? "Heating demand is elevated during the winter period."
                  : currentSeason ===
                      "Spring"
                    ? "High spring inflow may create reservoir spill risk."
                    : currentSeason ===
                        "Autumn"
                      ? "Autumn rainfall can help prepare the reservoir for winter."
                      : "Summer is an opportunity to conserve water for later demand."}
              </p>
            </div>

            <div
              className={`rounded-xl border-l-4 p-4 ${
                hydroUnitTwoMaintenance
                  ? "border-red-500 bg-red-50"
                  : "border-green-500 bg-green-50"
              }`}
            >
              <strong>
                Hydro Unit H2
              </strong>

              <p className="mt-1 text-sm text-slate-600">
                {hydroUnitTwoMaintenance
                  ? "Unavailable. Hydro capacity is reduced by 70 MW."
                  : settings.maintenance
                    ? "Available. Planned winter maintenance remains on the schedule."
                    : "Available. Maintenance events are disabled."}
              </p>
            </div>

            <div
              className={`rounded-xl border-l-4 p-4 ${
                windGroupThreeMaintenance
                  ? "border-red-500 bg-red-50"
                  : "border-green-500 bg-green-50"
              }`}
            >
              <strong>
                Wind Group W3
              </strong>

              <p className="mt-1 text-sm text-slate-600">
                {windGroupThreeMaintenance
                  ? "Unavailable. Wind capacity is reduced by 30 MW."
                  : settings.maintenance
                    ? "Available. Planned autumn maintenance is shown in briefings."
                    : "Available. Maintenance events are disabled."}
              </p>
            </div>
          </div>
        </section>

        {/* ================ END MAINTENANCE AND NEWS =========== */}

        {/* ===================================================
            SCORE PANELS
            =================================================== */}

        <section className="grid gap-6 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-900 p-6 text-center text-white shadow">
            <p className="text-sm uppercase tracking-wide text-slate-400">
              Overall
            </p>

            <p className="mt-2 text-5xl font-bold">
              {overallScore}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 text-center shadow">
            <p className="text-sm uppercase tracking-wide text-slate-500">
              Technical
            </p>

            <p className="mt-2 text-5xl font-bold text-blue-600">
              {technicalScore}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Frequency stability and
              demand matching
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 text-center shadow">
            <p className="text-sm uppercase tracking-wide text-slate-500">
              Sustainability
            </p>

            <p className="mt-2 text-5xl font-bold text-emerald-600">
              {
                sustainabilityScore
              }
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Wind utilization and
              reservoir management
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 text-center shadow">
            <p className="text-sm uppercase tracking-wide text-slate-500">
              Public Satisfaction
            </p>

            <p className="mt-2 text-5xl font-bold text-amber-500">
              {publicScore}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Reliable electricity
              delivery
            </p>
          </div>
        </section>

        {/* ================= END SCORE PANELS ================== */}
      </div>
    </div>
  );
}