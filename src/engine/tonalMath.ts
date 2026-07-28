/**
 * CPU-side mirror of the key tonal curves in grading.ts.
 * Used for deterministic verification (black anchoring, soft shoulder, etc.)
 * without needing a WebGL context.
 */

export const MID_GREY = 0.18
const EPS = 1e-6
const LUMA = [0.2126, 0.7152, 0.0722] as const

export type Rgb = readonly [number, number, number]

export function softShoulder(x: number): number {
  const knee = 0.85
  if (x <= knee) return x
  const over = x - knee
  const range = 1.0 - knee
  const compressed = range * (1.0 - Math.exp(-over / 0.55))
  return knee + compressed
}

export function baseSCurve(x: number): number {
  const t = Math.max(x, 0)
  const logX = Math.log2(Math.max(t, EPS))
  const logMid = Math.log2(MID_GREY)
  const shaped = 2 ** ((logX - logMid) * 1.12 + logMid)
  const mixed = t * (1 - 0.35) + shaped * 0.35
  return softShoulder(mixed)
}

export function applyShadows(x: number, amount: number): number {
  const edge = Math.min(Math.max(x / 0.55, 0), 1)
  const sm = edge * edge * (3 - 2 * edge)
  const w = x * (1 - sm) ** 1.5
  return x + amount * w * 0.85
}

export function applyHighlights(x: number, amount: number): number {
  const t = Math.min(Math.max((x - 0.35) / (1 - 0.35), 0), 1)
  const sm = t * t * (3 - 2 * t)
  const w = sm ** 1.4 * (1 - x * 0.35)
  return x + amount * w * 0.75
}

export function applyWhites(x: number, amount: number): number {
  const t = Math.min(Math.max((x - 0.55) / (1 - 0.55), 0), 1)
  const sm = t * t * (3 - 2 * t)
  const w = sm ** 1.6
  return x + amount * w * 0.55
}

export function applyBlacks(x: number, amount: number): number {
  const t = Math.min(Math.max(x / 0.45, 0), 1)
  const sm = t * t * (3 - 2 * t)
  const w = (1 - sm) ** 1.6
  return x + amount * w * 0.45
}

export function remapTonal(
  luma: number,
  shadows: number,
  highlights: number,
  whites: number,
  blacks: number,
): number {
  let y = Math.max(luma, 0)
  y = applyBlacks(y, blacks)
  y = applyShadows(y, shadows)
  y = applyHighlights(y, highlights)
  y = applyWhites(y, whites)
  return Math.max(y, 0)
}

export function applyContrast(x: number, amount: number): number {
  const pivot = MID_GREY
  const a = Math.min(Math.max(amount, -1), 1)
  const d = x - pivot

  if (a >= 0) {
    const k = 2.4 + a * 3.2
    const shaped = pivot + (Math.tanh(d * k) / k) * (1 + a * 1.8)
    return x * (1 - a) + Math.max(shaped, 0) * a
  }

  const factor = 1 + a * 0.85
  return Math.max(pivot + d * factor, 0)
}

export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function linearToSrgb(c: number): number {
  const x = Math.max(c, 0)
  return x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055
}

export function lumaOf(rgb: Rgb): number {
  return rgb[0] * LUMA[0] + rgb[1] * LUMA[1] + rgb[2] * LUMA[2]
}

/** Scale RGB by luma ratio — same chroma-preserving step as the shader. */
export function applyLumaRatio(rgb: Rgb, newLuma: number): Rgb {
  const old = Math.max(lumaOf(rgb), EPS)
  const s = newLuma / old
  return [rgb[0] * s, rgb[1] * s, rgb[2] * s]
}

export interface GradeUniforms {
  exposure: number
  contrast: number
  highlights: number
  shadows: number
  whites: number
  blacks: number
  temperature: number
  tint: number
  vibrance: number
  saturation: number
}

export const NEUTRAL_UNIFORMS: GradeUniforms = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  vibrance: 0,
  saturation: 1,
}

/**
 * Mirror of grading.ts main() for one linear-light RGB pixel → encoded sRGB.
 * Keeps verification coupled to the real pipeline order, not isolated helpers.
 */
export function gradePixelLinear(rgbIn: Rgb, u: GradeUniforms): Rgb {
  let c: Rgb = [...rgbIn] as unknown as Rgb

  const rGain = Math.max(1 + u.temperature * 0.28 + u.tint * 0.08, 0.05)
  const gGain = Math.max(1 - u.tint * 0.2, 0.05)
  const bGain = Math.max(1 - u.temperature * 0.28 + u.tint * 0.08, 0.05)
  const wb: Rgb = [rGain, gGain, bGain]
  const wbLuma = Math.max(lumaOf(wb), EPS)
  c = [c[0] * (wb[0] / wbLuma), c[1] * (wb[1] / wbLuma), c[2] * (wb[2] / wbLuma)]

  const exp = 2 ** u.exposure
  c = [c[0] * exp, c[1] * exp, c[2] * exp]

  const oldLuma = Math.max(lumaOf(c), EPS)
  const newLuma = remapTonal(oldLuma, u.shadows, u.highlights, u.whites, u.blacks)
  c = applyLumaRatio(c, newLuma)

  const luma2 = Math.max(lumaOf(c), EPS)
  c = applyLumaRatio(c, baseSCurve(luma2))

  const luma3 = Math.max(lumaOf(c), EPS)
  c = applyLumaRatio(c, applyContrast(luma3, u.contrast))

  c = [softShoulder(c[0]), softShoulder(c[1]), softShoulder(c[2])]

  let enc: Rgb = [linearToSrgb(c[0]), linearToSrgb(c[1]), linearToSrgb(c[2])]

  const lumaP =
    Math.min(Math.max(enc[0], 0), 1) * LUMA[0] +
    Math.min(Math.max(enc[1], 0), 1) * LUMA[1] +
    Math.min(Math.max(enc[2], 0), 1) * LUMA[2]
  const mx = Math.max(enc[0], enc[1], enc[2])
  const mn = Math.min(enc[0], enc[1], enc[2])
  const pxSat = Math.min(Math.max(mx - mn, 0), 1)
  const vibFactor = 1 + u.vibrance * (1 - pxSat)
  enc = [
    lumaP + (enc[0] - lumaP) * vibFactor,
    lumaP + (enc[1] - lumaP) * vibFactor,
    lumaP + (enc[2] - lumaP) * vibFactor,
  ]
  enc = [
    lumaP + (enc[0] - lumaP) * u.saturation,
    lumaP + (enc[1] - lumaP) * u.saturation,
    lumaP + (enc[2] - lumaP) * u.saturation,
  ]

  return [
    Math.min(Math.max(enc[0], 0), 1),
    Math.min(Math.max(enc[1], 0), 1),
    Math.min(Math.max(enc[2], 0), 1),
  ]
}

/** Classic HSV saturation in [0,1]; hue in degrees [0,360). */
export function rgbToHsv(rgb: Rgb): { h: number; s: number; v: number } {
  const r = rgb[0]
  const g = rgb[1]
  const b = rgb[2]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  const s = max < EPS ? 0 : d / max
  let h = 0
  if (d >= EPS) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s, v: max }
}

export function hueDeltaDeg(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/** Sample a greyscale ramp through tonal remaps for inspection / tests. */
export function sampleRamp(
  count: number,
  remap: (x: number) => number,
): number[] {
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    out.push(remap(i / (count - 1)))
  }
  return out
}
