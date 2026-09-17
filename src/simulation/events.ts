
// ============================================================
// EVENT ENGINE
//
// FUTURE EXTRACTION TARGET:
// src/simulation/events.ts
//
// Move everything between this marker and the END EVENT
// ENGINE marker into events.ts.
// ============================================================
import type {
  DifficultySettings,
  EventType,
} from "./types";


export const chooseWeatherEvent = (
  settings: DifficultySettings
): EventType => {
  if (
    !settings.weatherEvents ||
    Math.random() >
      settings.eventProbability
  ) {
    return "none";
  }

  const possibleEvents: EventType[] = [
    "windStorm",
    "drought",
    "heavyRain",
    "coldSpell",
  ];

  const randomIndex = Math.floor(
    Math.random() *
      possibleEvents.length
  );

  return possibleEvents[randomIndex];
};

export const getEventDuration = (
  event: EventType
) => {
  if (event === "drought") {
    return 4;
  }

  if (event === "coldSpell") {
    return 3;
  }

  if (event === "windStorm") {
    return 2;
  }

  if (event === "heavyRain") {
    return 2;
  }

  return 0;
};

export const getEventLabel = (
  event: EventType
) => {
  const labels: Record<
    EventType,
    string
  > = {
    none: "Normal seasonal conditions",
    windStorm: "Wind storm",
    drought: "Drought",
    heavyRain: "Heavy rainfall",
    coldSpell: "Cold spell",
  };

  return labels[event];
};

// ================= END EVENT ENGINE ==========================