
// ============================================================
// CALENDAR MODEL
//
// FUTURE EXTRACTION TARGET:
// src/simulation/calendar.ts
//
// Move everything between this marker and the END CALENDAR
// MODEL marker into calendar.ts.
// ============================================================

export const getSimulationDate = (weekIndex: number) => {
  const date = new Date(Date.UTC(2026, 5, 1));

  date.setUTCDate(
    date.getUTCDate() + weekIndex * 7
  );

  return date;
};

export const getMonthName = (date: Date) =>
  date.toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });

export const getSeason = (monthIndex: number) => {
  if ([5, 6, 7].includes(monthIndex)) {
    return "Summer";
  }

  if ([8, 9, 10].includes(monthIndex)) {
    return "Autumn";
  }

  if ([11, 0, 1].includes(monthIndex)) {
    return "Winter";
  }

  return "Spring";
};

export const getWeekOfMonth = (date: Date) =>
  Math.min(
    5,
    Math.floor(
      (date.getUTCDate() - 1) / 7
    ) + 1
  );

// ================= END CALENDAR MODEL ========================