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
 * Map raw slider values (each in -100..100) to the shader's uniform space.
 * Pure and Pixi-free so it can be unit-tested in isolation.
 *
 * Tuned for LR-like hand-feel with the linear-light pipeline:
 * - exposure   → stops in [-1.5, 1.5]
 * - contrast   → amount in [-1, 1] (0 = unchanged; sigmoid strength)
 * - saturation → factor in [0, 2] (1 = unchanged)
 * - everything else → normalized to [-1, 1]
 */
export function adjustmentsToUniforms(adj: Adjustments): GradingUniformValues {
  const n = (v: number) => v / 100
  return {
    uExposure: n(adj.exposure) * 1.5,
    // Slightly softer than ±1 full range so ±50 feels like a useful LR nudge.
    uContrast: n(adj.contrast) * 0.85,
    uHighlights: n(adj.highlights),
    uShadows: n(adj.shadows),
    uWhites: n(adj.whites) * 0.9,
    uBlacks: n(adj.blacks) * 0.9,
    // WB gains in the shader are stronger than the old additive path — tame a bit.
    uTemperature: n(adj.temperature) * 0.85,
    uTint: n(adj.tint) * 0.85,
    uVibrance: n(adj.vibrance),
    uSaturation: 1 + n(adj.saturation),
  }
}
