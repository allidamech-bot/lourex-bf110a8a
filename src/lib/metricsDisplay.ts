/**
 * A missing, non-finite, or out-of-range score is unavailable data.
 * Do not replace missing operational measurements with invented percentages.
 */
export const resolvePercentage = (value: number | null | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : null;
