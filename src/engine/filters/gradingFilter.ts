import { Filter, GlProgram, type UniformGroup } from 'pixi.js'
import { gradingFragment, gradingVertex } from '../shaders/grading'
import type { GradingUniformValues } from '../pipeline'

/**
 * Build the single custom grading filter. All 10 controls live in one shader
 * pass; real-time updates only mutate the uniform values (no rebuild).
 */
export function createGradingFilter(): Filter {
  return new Filter({
    glProgram: new GlProgram({
      vertex: gradingVertex,
      fragment: gradingFragment,
    }),
    resources: {
      gradingUniforms: {
        uExposure: { value: 0, type: 'f32' },
        // Contrast is an amount in [-1, 1]; 0 = identity (sigmoid pivot).
        uContrast: { value: 0, type: 'f32' },
        uHighlights: { value: 0, type: 'f32' },
        uShadows: { value: 0, type: 'f32' },
        uWhites: { value: 0, type: 'f32' },
        uBlacks: { value: 0, type: 'f32' },
        uTemperature: { value: 0, type: 'f32' },
        uTint: { value: 0, type: 'f32' },
        uVibrance: { value: 0, type: 'f32' },
        uSaturation: { value: 1, type: 'f32' },
      },
    },
  })
}

/** Push new uniform values into an existing grading filter (cheap, per-frame safe). */
export function updateGradingFilter(
  filter: Filter,
  values: GradingUniformValues,
): void {
  const group = filter.resources.gradingUniforms as UniformGroup
  const u = group.uniforms as Record<keyof GradingUniformValues, number>
  u.uExposure = values.uExposure
  u.uContrast = values.uContrast
  u.uHighlights = values.uHighlights
  u.uShadows = values.uShadows
  u.uWhites = values.uWhites
  u.uBlacks = values.uBlacks
  u.uTemperature = values.uTemperature
  u.uTint = values.uTint
  u.uVibrance = values.uVibrance
  u.uSaturation = values.uSaturation
}
