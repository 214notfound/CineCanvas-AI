import {
  BufferImageSource,
  Filter,
  GlProgram,
  Texture,
  type UniformGroup,
} from 'pixi.js'
import {
  bakeCurveLut,
  CURVE_LUT_SIZE,
  IDENTITY_CURVE,
  type CurvePoint,
} from '../curve'
import { gradingFragment, gradingVertex } from '../shaders/grading'
import type { GradingUniformValues } from '../pipeline'

function createCurveLutTexture(lut: Float32Array): Texture {
  const rgba = new Uint8Array(CURVE_LUT_SIZE * 4)
  for (let i = 0; i < CURVE_LUT_SIZE; i++) {
    const v = Math.round(Math.max(0, Math.min(1, lut[i])) * 255)
    const o = i * 4
    rgba[o] = v
    rgba[o + 1] = v
    rgba[o + 2] = v
    rgba[o + 3] = 255
  }

  const source = new BufferImageSource({
    resource: rgba,
    width: CURVE_LUT_SIZE,
    height: 1,
    scaleMode: 'linear',
    addressMode: 'clamp-to-edge',
  })
  return new Texture({ source })
}

/**
 * Build the grading filter. 10 controls + luminance curve LUT (default identity).
 */
export function createGradingFilter(): Filter {
  const identityLut = bakeCurveLut(IDENTITY_CURVE)
  const curveTexture = createCurveLutTexture(identityLut)

  return new Filter({
    glProgram: new GlProgram({
      vertex: gradingVertex,
      fragment: gradingFragment,
    }),
    resources: {
      gradingUniforms: {
        uExposure: { value: 0, type: 'f32' },
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
      uCurveLut: curveTexture.source,
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

/** Rebuild the curve LUT texture from control points (identity = no-op). */
export function updateCurveLut(
  filter: Filter,
  points: CurvePoint[],
): void {
  const lut = bakeCurveLut(points)
  const next = createCurveLutTexture(lut)
  const prev = filter.resources.uCurveLut as
    | { destroy?: (opts?: { destroyTexture?: boolean }) => void }
    | undefined
  filter.resources.uCurveLut = next.source
  // Drop previous GPU source if Pixi exposed destroy.
  try {
    prev?.destroy?.()
  } catch {
    /* ignore */
  }
}
