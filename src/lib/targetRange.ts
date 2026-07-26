export interface TargetRange {
  min: number
  max: number
}

/** Inclusive check: is `value` inside the coaching target band? */
export function isInTargetRange(value: number, range: TargetRange): boolean {
  return value >= range.min && value <= range.max
}

/** Map a slider value to 0–100% along a [trackMin, trackMax] track. */
export function valueToPercent(
  value: number,
  trackMin: number,
  trackMax: number,
): number {
  if (trackMax === trackMin) return 0
  const pct = ((value - trackMin) / (trackMax - trackMin)) * 100
  return Math.max(0, Math.min(100, pct))
}
