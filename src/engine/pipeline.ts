import type { Adjustments } from './sliders'

/** Uniform values consumed by the grading fragment shader. */
export interface GradingUniformValues {
  uExposure: number
  uContrast: number
  uHighlights: number
  uShadows: number
  uWhites: number
  uBlacks: number
  uTemperature: number
  uTint: number
  uVibrance: number
  uSaturation: number
}

/**
 * Full-scale exposure stops at slider ±100.
 * ±50 → ±EXPOSURE_STOPS_AT_100/2 stops — teaching-visible, not clipped.
 */
export const EXPOSURE_STOPS_AT_100 = 3

/**
 * Map raw slider values (each in -100..100) to the shader's uniform space.
 * Pure and Pixi-free so it can be unit-tested in isolation.
 *
 * Tuned for teaching-visible hand-feel with the linear-light pipeline:
 * - exposure   → stops in [-3, 3] (±50 ≈ ±1.5 stops)
 * - contrast   → amount in [-1, 1] (0 = unchanged; sigmoid strength)
 * - saturation → factor in [0, 2] (1 = unchanged)
 * - everything else → normalized to [-1, 1]
 */
export function adjustmentsToUniforms(adj: Adjustments): GradingUniformValues {
  const n = (v: number) => v / 100
  return {
    uExposure: n(adj.exposure) * EXPOSURE_STOPS_AT_100,
    uContrast: n(adj.contrast),
    uHighlights: n(adj.highlights),
    uShadows: n(adj.shadows),
    uWhites: n(adj.whites),
    uBlacks: n(adj.blacks),
    uTemperature: n(adj.temperature),
    uTint: n(adj.tint),
    uVibrance: n(adj.vibrance),
    uSaturation: 1 + n(adj.saturation),
  }
}
