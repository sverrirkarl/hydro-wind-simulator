
// ============================================================
// MONTHLY OBJECTIVES AND RESERVOIR TARGETS
//
// FUTURE EXTRACTION TARGET:
// src/simulation/objectives.ts
//
// Move everything between this marker and the END MONTHLY
// OBJECTIVES marker into objectives.ts.
// ============================================================

export const getMonthlyObjective = (
  monthIndex: number
) => {
  const objectives: Record<number, string> = {
    5: "Keep the reservoir above 65% while meeting summer demand.",
    6: "Use available wind and conserve water for autumn.",
    7: "Prepare for increasing autumn demand.",
    8: "Build reservoir reserves before winter.",
    9: "Use autumn rainfall without allowing reservoir spill.",
    10: "Enter winter with at least 70% reservoir storage.",
    11: "Maintain reliable supply during the first winter peak.",
    0: "Preserve enough water for the remaining winter.",
    1: "Manage high demand without emptying the reservoir.",
    2: "Create reservoir capacity for spring inflow.",
    3: "Avoid spilling water during high spring rainfall.",
    4: "Finish the year with a healthy reservoir level.",
  };

  return objectives[monthIndex];
};

export const getMonthlyReservoirTarget = (
  monthIndex: number
) => {
  const targets: Record<number, number> = {
    5: 65,
    6: 68,
    7: 72,
    8: 76,
    9: 80,
    10: 78,
    11: 68,
    0: 58,
    1: 48,
    2: 42,
    3: 48,
    4: 55,
  };

  return targets[monthIndex];
};

// ============ END MONTHLY OBJECTIVES AND TARGETS =============