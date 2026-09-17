
// ============================================================
// SHARED UTILITY FUNCTIONS
//
// FUTURE EXTRACTION TARGET:
// src/simulation/utils.ts
//
// Move everything between this marker and the END SHARED
// UTILITY FUNCTIONS marker into utils.ts.
// ============================================================

export const clamp = (
  value: number,
  minimum: number,
  maximum: number
) => Math.min(maximum, Math.max(minimum, value));

// ================= END SHARED UTILITY FUNCTIONS ==============
