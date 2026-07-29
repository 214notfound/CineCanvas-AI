import type { Adjustments, SliderId } from '@/engine/sliders'
import { adjustmentsToUniforms } from '@/engine/pipeline'
import {
  gradePixelLinear,
  srgbToLinear,
  type GradeUniforms,
} from '@/engine/tonalMath'

export interface HistogramData {
  /** Per-channel counts, length 256. */
  r: Uint32Array
  g: Uint32Array
  b: Uint32Array
  /** Rec.709 luma histogram, length 256. */
  luma: Uint32Array
  /** Total opaque-ish pixels counted. */
  pixelCount: number
}

/** Inclusive bin range on the 0–255 axis. */
export interface HistZone {
  start: number
  end: number
}

export type HistHighlight =
  | { kind: 'luma'; zones: HistZone[] }
  | { kind: 'rgb' }
  | { kind: 'all' }
  | { kind: 'none' }

const BINS = 256

/** Build RGB + luma histograms from RGBA ImageData (skips near-transparent pixels). */
export function computeHistogram(image: ImageData): HistogramData {
  const r = new Uint32Array(BINS)
  const g = new Uint32Array(BINS)
  const b = new Uint32Array(BINS)
  const luma = new Uint32Array(BINS)
  const { data } = image
  let pixelCount = 0

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) continue
    const rv = data[i]
    const gv = data[i + 1]
    const bv = data[i + 2]
    r[rv]++
    g[gv]++
    b[bv]++
    const y = Math.min(
      255,
      Math.max(0, Math.round(0.2126 * rv + 0.7152 * gv + 0.0722 * bv)),
    )
    luma[y]++
    pixelCount++
  }

  return { r, g, b, luma, pixelCount }
}

function toGradeUniforms(adj: Adjustments): GradeUniforms {
  const u = adjustmentsToUniforms(adj)
  return {
    exposure: u.uExposure,
    contrast: u.uContrast,
    highlights: u.uHighlights,
    shadows: u.uShadows,
    whites: u.uWhites,
    blacks: u.uBlacks,
    temperature: u.uTemperature,
    tint: u.uTint,
    vibrance: u.uVibrance,
    saturation: u.uSaturation,
  }
}

/**
 * Grade a downsampled sRGB source through the CPU tonal mirror and build a
 * histogram. Prefer this over WebGL readback — deterministic and teachable.
 */
export function computeGradedHistogram(
  source: ImageData,
  adjustments: Adjustments,
): HistogramData {
  const uniforms = toGradeUniforms(adjustments)
  const r = new Uint32Array(BINS)
  const g = new Uint32Array(BINS)
  const b = new Uint32Array(BINS)
  const luma = new Uint32Array(BINS)
  const { data } = source
  let pixelCount = 0

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) continue
    const lin: [number, number, number] = [
      srgbToLinear(data[i] / 255),
      srgbToLinear(data[i + 1] / 255),
      srgbToLinear(data[i + 2] / 255),
    ]
    const out = gradePixelLinear(lin, uniforms)
    const rv = Math.min(255, Math.max(0, Math.round(out[0] * 255)))
    const gv = Math.min(255, Math.max(0, Math.round(out[1] * 255)))
    const bv = Math.min(255, Math.max(0, Math.round(out[2] * 255)))
    r[rv]++
    g[gv]++
    b[bv]++
    const y = Math.min(
      255,
      Math.max(0, Math.round(0.2126 * rv + 0.7152 * gv + 0.0722 * bv)),
    )
    luma[y]++
    pixelCount++
  }

  return { r, g, b, luma, pixelCount }
}

/** Decode an image URL into a downscaled ImageData for histogram sampling. */
export async function loadHistogramSource(
  url: string,
  maxSide = 240,
): Promise<ImageData> {
  // Prefer fetch→bitmap: works for blob: and http(s), avoids <img crossOrigin traps.
  const res = await fetch(url)
  if (!res.ok) throw new Error(`histogram fetch failed: ${res.status}`)
  const blob = await res.blob()

  let bitmap: ImageBitmap | null = null
  let width = 0
  let height = 0
  let drawSource: CanvasImageSource

  if (typeof createImageBitmap === 'function') {
    bitmap = await createImageBitmap(blob)
    width = bitmap.width
    height = bitmap.height
    drawSource = bitmap
  } else {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('histogram image decode failed'))
      el.src = URL.createObjectURL(blob)
    })
    width = img.naturalWidth
    height = img.naturalHeight
    drawSource = img
  }

  try {
    const scale = Math.min(1, maxSide / Math.max(width, height))
    const w = Math.max(1, Math.round(width * scale))
    const h = Math.max(1, Math.round(height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('2d context unavailable')
    ctx.drawImage(drawSource, 0, 0, w, h)
    return ctx.getImageData(0, 0, w, h)
  } finally {
    bitmap?.close()
  }
}

/**
 * Which part of the histogram the active slider primarily moves.
 * Used for the gold highlight band behind the bars.
 */
export function highlightForSlider(slider: SliderId | null): HistHighlight {
  if (!slider) return { kind: 'none' }

  switch (slider) {
    case 'exposure':
      return { kind: 'all' }
    case 'contrast':
      return {
        kind: 'luma',
        zones: [
          { start: 0, end: 72 },
          { start: 183, end: 255 },
        ],
      }
    case 'shadows':
      return { kind: 'luma', zones: [{ start: 0, end: 140 }] }
    case 'blacks':
      return { kind: 'luma', zones: [{ start: 0, end: 72 }] }
    case 'highlights':
      return { kind: 'luma', zones: [{ start: 115, end: 255 }] }
    case 'whites':
      return { kind: 'luma', zones: [{ start: 183, end: 255 }] }
    case 'temperature':
    case 'tint':
    case 'vibrance':
    case 'saturation':
      return { kind: 'rgb' }
  }
}

/** Max bin count across channels — for normalizing bar heights. */
export function maxBin(hist: HistogramData): number {
  let m = 1
  for (let i = 0; i < BINS; i++) {
    if (hist.luma[i] > m) m = hist.luma[i]
    if (hist.r[i] > m) m = hist.r[i]
    if (hist.g[i] > m) m = hist.g[i]
    if (hist.b[i] > m) m = hist.b[i]
  }
  return m
}

/** Clone histogram bins (for freezing a ghost baseline). */
export function cloneHistogram(hist: HistogramData): HistogramData {
  return {
    r: new Uint32Array(hist.r),
    g: new Uint32Array(hist.g),
    b: new Uint32Array(hist.b),
    luma: new Uint32Array(hist.luma),
    pixelCount: hist.pixelCount,
  }
}

/**
 * Plain-language description of how the active slider moves the histogram "mountain".
 * `value` is the current slider reading (-100..100); direction follows its sign.
 */
export function describeSliderMotion(
  slider: SliderId | null,
  value: number,
): string {
  if (!slider) {
    return '拖动右侧滑块：金色区是这个参数主要推动的影调，对照淡色轮廓看山怎么动。'
  }

  const up = value > 0
  const neutral = value === 0

  switch (slider) {
    case 'exposure':
      if (neutral) return '曝光 · 拖动时整座山会左右平移（右=变亮，左=变暗）'
      return up
        ? '整座山向右滑 → 照片整体变亮'
        : '整座山向左滑 → 照片整体变暗'
    case 'contrast':
      if (neutral) return '对比度 · 拖动时山的两头会撑开或收拢'
      return up
        ? '山的两头往外撑开 → 明暗差距变大（更硬朗）'
        : '山的两头往中间收拢 → 明暗差距变小（更平）'
    case 'shadows':
      if (neutral) return '阴影 · 主要推动左半边（暗部）'
      return up
        ? '左半边被抬起 → 暗部提亮，找回细节'
        : '左半边被压低 → 暗部更暗'
    case 'blacks':
      if (neutral) return '黑色 · 推动最左端的黑点'
      return up
        ? '最左端离开左墙 → 黑点上移（暗部发灰）'
        : '最左端推向左墙 → 黑点更黑（更扎实）'
    case 'highlights':
      if (neutral) return '高光 · 主要推动右半边（亮部）'
      return up
        ? '右半边被抬起 → 亮部更亮'
        : '右半边被压低 → 找回高光细节'
    case 'whites':
      if (neutral) return '白色 · 推动最右端的白点'
      return up
        ? '最右端推向右墙 → 更敞亮'
        : '最右端离开右墙 → 白点压低（略闷）'
    case 'temperature':
      if (neutral) return '色温 · 红/蓝通道会分开或靠拢'
      return up
        ? '红通道右移、蓝通道左移 → 画面偏暖（黄）'
        : '蓝通道右移、红通道左移 → 画面偏冷（蓝）'
    case 'tint':
      if (neutral) return '色调 · 绿/品红倾向变化'
      return up
        ? '偏品红/洋红 → 绿品红轴往右'
        : '偏绿 → 绿品红轴往左'
    case 'vibrance':
      if (neutral) return '自然饱和度 · RGB 曲线会拉开或收拢（保护肤色）'
      return up
        ? 'RGB 曲线拉开 → 淡色区域更鲜艳'
        : 'RGB 曲线收拢 → 色彩更寡淡'
    case 'saturation':
      if (neutral) return '饱和度 · 所有颜色同等变浓或变淡'
      return up
        ? 'RGB 曲线拉开 → 所有颜色更浓'
        : 'RGB 曲线收拢 → 接近灰'
  }
}

export interface HistogramDiagnosis {
  /** One-line plain verdict for beginners. */
  verdict: string
  /** Fraction of pixels in bin 0 (dead black-ish). */
  clipLowRatio: number
  /** Fraction of pixels in bin 255 (dead white-ish). */
  clipHighRatio: number
}

/** Lightweight text diagnosis — no photo overlay / pixel mask. */
export function diagnoseHistogram(hist: HistogramData): HistogramDiagnosis {
  const n = Math.max(hist.pixelCount, 1)
  // Sum a few edge bins so single-bin noise doesn't dominate.
  let low = 0
  let high = 0
  for (let i = 0; i < 4; i++) low += hist.luma[i]
  for (let i = 252; i < 256; i++) high += hist.luma[i]
  const clipLowRatio = low / n
  const clipHighRatio = high / n

  // Rough mass in left / mid / right thirds.
  let left = 0
  let mid = 0
  let right = 0
  for (let i = 0; i < 256; i++) {
    const v = hist.luma[i]
    if (i < 85) left += v
    else if (i < 170) mid += v
    else right += v
  }
  const leftR = left / n
  const midR = mid / n
  const rightR = right / n

  let verdict: string
  if (clipLowRatio > 0.12) {
    verdict = '暗部堆在最左 = 容易死黑，细节可能丢了'
  } else if (clipHighRatio > 0.08) {
    verdict = '亮部贴在最右 = 容易过曝，高光可能糊了'
  } else if (leftR > 0.55 && rightR < 0.2) {
    verdict = '山偏左 = 整体偏暗'
  } else if (rightR > 0.55 && leftR < 0.2) {
    verdict = '山偏右 = 整体偏亮'
  } else if (midR > 0.55 && leftR < 0.2 && rightR < 0.2) {
    verdict = '山挤在中间 = 反差偏弱，略发灰'
  } else {
    verdict = '影调分布还算开：两端都有内容'
  }

  return { verdict, clipLowRatio, clipHighRatio }
}
