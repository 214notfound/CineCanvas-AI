/**
 * Luminance curve: control points → monotone cubic → 256 LUT.
 * Identity points bake to y=x (shader/CPU no-op).
 */

export interface CurvePoint {
  /** Input tone in [0, 1]. */
  x: number
  /** Output tone in [0, 1]. */
  y: number
}

export const CURVE_LUT_SIZE = 256

/** Default identity curve (black → white diagonal). */
export const IDENTITY_CURVE: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
]

export function cloneCurve(points: CurvePoint[]): CurvePoint[] {
  return points.map((p) => ({ x: p.x, y: p.y }))
}

export function isIdentityCurve(points: CurvePoint[]): boolean {
  if (points.length < 2) return true
  const sorted = normalizeCurvePoints(points)
  for (const p of sorted) {
    if (Math.abs(p.x - p.y) > 1e-5) return false
  }
  // Also require near-diagonal sampling.
  const lut = bakeCurveLut(sorted)
  for (let i = 0; i < CURVE_LUT_SIZE; i++) {
    const x = i / (CURVE_LUT_SIZE - 1)
    if (Math.abs(lut[i] - x) > 1e-4) return false
  }
  return true
}

/** Sort by x, clamp, force endpoints, drop duplicate x. */
export function normalizeCurvePoints(points: CurvePoint[]): CurvePoint[] {
  const clamped = points.map((p) => ({
    x: clamp01(p.x),
    y: clamp01(p.y),
  }))
  clamped.sort((a, b) => a.x - b.x)

  const uniq: CurvePoint[] = []
  for (const p of clamped) {
    if (uniq.length && Math.abs(uniq[uniq.length - 1].x - p.x) < 1e-6) {
      uniq[uniq.length - 1] = p
    } else {
      uniq.push(p)
    }
  }

  if (!uniq.length || uniq[0].x > 0) uniq.unshift({ x: 0, y: uniq[0]?.y ?? 0 })
  else uniq[0] = { x: 0, y: uniq[0].y }

  const last = uniq[uniq.length - 1]
  if (last.x < 1) uniq.push({ x: 1, y: last.y })
  else uniq[uniq.length - 1] = { x: 1, y: last.y }

  return uniq
}

/**
 * Bake a 256-entry LUT with Fritsch–Carlson monotone cubic Hermite.
 * Output values in [0, 1].
 */
export function bakeCurveLut(
  points: CurvePoint[],
  size = CURVE_LUT_SIZE,
): Float32Array {
  const pts = normalizeCurvePoints(points)
  const n = pts.length
  const lut = new Float32Array(size)

  if (n === 2 && pts[0].y === 0 && pts[1].y === 1) {
    for (let i = 0; i < size; i++) lut[i] = i / (size - 1)
    return lut
  }

  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const m = monotoneSlopes(xs, ys)

  for (let i = 0; i < size; i++) {
    const x = i / (size - 1)
    lut[i] = clamp01(evalMonotoneCubic(xs, ys, m, x))
  }
  return lut
}

/** Linear interpolate a baked LUT (matches shader LINEAR filter). */
export function sampleCurveLut(lut: Float32Array, x: number): number {
  const t = clamp01(x) * (lut.length - 1)
  const i = Math.floor(t)
  const f = t - i
  const a = lut[i]
  const b = lut[Math.min(i + 1, lut.length - 1)]
  return a + (b - a) * f
}

/** Teaching preset: mild S-curve (manual contrast). */
export function sCurvePreset(): CurvePoint[] {
  return [
    { x: 0, y: 0 },
    { x: 0.25, y: 0.18 },
    { x: 0.5, y: 0.5 },
    { x: 0.75, y: 0.82 },
    { x: 1, y: 1 },
  ]
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/** Fritsch–Carlson monotone cubic slopes. */
function monotoneSlopes(xs: number[], ys: number[]): number[] {
  const n = xs.length
  const m = new Array<number>(n).fill(0)
  const d = new Array<number>(n - 1).fill(0)

  for (let i = 0; i < n - 1; i++) {
    const h = xs[i + 1] - xs[i]
    d[i] = h < 1e-12 ? 0 : (ys[i + 1] - ys[i]) / h
  }

  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0
    else m[i] = (d[i - 1] + d[i]) / 2
  }

  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(d[i]) < 1e-12) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / d[i]
    const b = m[i + 1] / d[i]
    const s = a * a + b * b
    if (s > 9) {
      const t = 3 / Math.sqrt(s)
      m[i] = t * a * d[i]
      m[i + 1] = t * b * d[i]
    }
  }
  return m
}

function evalMonotoneCubic(
  xs: number[],
  ys: number[],
  m: number[],
  x: number,
): number {
  const n = xs.length
  if (x <= xs[0]) return ys[0]
  if (x >= xs[n - 1]) return ys[n - 1]

  let i = 0
  while (i < n - 2 && x > xs[i + 1]) i++

  const h = xs[i + 1] - xs[i]
  if (h < 1e-12) return ys[i]
  const t = (x - xs[i]) / h
  const t2 = t * t
  const t3 = t2 * t
  const h00 = 2 * t3 - 3 * t2 + 1
  const h10 = t3 - 2 * t2 + t
  const h01 = -2 * t3 + 3 * t2
  const h11 = t3 - t2
  return h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1]
}
