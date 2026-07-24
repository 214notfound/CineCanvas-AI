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
 * - exposure   -> stops in [-1.5, 1.5]
 * - contrast   -> multiplier in [0.5, 1.5] (1 = unchanged)
 * - saturation -> factor in [0, 2] (1 = unchanged)
 * - everything else -> normalized to [-1, 1]
 */
export function adjustmentsToUniforms(adj: Adjustments): GradingUniformValues {
  const n = (v: number) => v / 100
  return {
    uExposure: n(adj.exposure) * 1.5,
    uContrast: 1 + n(adj.contrast) * 0.5,
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
