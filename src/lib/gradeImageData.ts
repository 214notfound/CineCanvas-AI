import type { Adjustments } from '@/engine/sliders'
import { adjustmentsToUniforms } from '@/engine/pipeline'
import {
  gradePixelLinear,
  srgbToLinear,
  type GradeUniforms,
} from '@/engine/tonalMath'

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

/** Apply grading to every opaque pixel (CPU mirror of the shader). */
export function gradeImageData(
  source: ImageData,
  adjustments: Adjustments,
): ImageData {
  const uniforms = toGradeUniforms(adjustments)
  const out = new ImageData(source.width, source.height)
  const { data } = source
  const od = out.data

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    od[i + 3] = a
    if (a < 16) {
      od[i] = data[i]
      od[i + 1] = data[i + 1]
      od[i + 2] = data[i + 2]
      continue
    }
    const graded = gradePixelLinear(
      [
        srgbToLinear(data[i] / 255),
        srgbToLinear(data[i + 1] / 255),
        srgbToLinear(data[i + 2] / 255),
      ],
      uniforms,
    )
    od[i] = Math.round(Math.min(1, Math.max(0, graded[0])) * 255)
    od[i + 1] = Math.round(Math.min(1, Math.max(0, graded[1])) * 255)
    od[i + 2] = Math.round(Math.min(1, Math.max(0, graded[2])) * 255)
  }

  return out
}

/** Load an image URL into ImageData (for quiz thumbnails). */
export async function loadImageData(
  url: string,
  maxSide = 320,
): Promise<ImageData> {
  // Same SVG-safe path as histogram: <img> fallback beats createImageBitmap.
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`)
  const blob = await res.blob()
  if (blob.type.includes('text/html')) {
    throw new Error(`Asset missing or wrong case: ${url}`)
  }
  const objectUrl = URL.createObjectURL(blob)

  try {
    let drawSource: CanvasImageSource | null = null
    let width = 0
    let height = 0
    let bitmap: ImageBitmap | null = null

    if (typeof createImageBitmap === 'function') {
      try {
        bitmap = await createImageBitmap(blob)
        width = bitmap.width
        height = bitmap.height
        drawSource = bitmap
      } catch {
        bitmap = null
      }
    }

    if (!drawSource || width < 1 || height < 1) {
      bitmap?.close()
      bitmap = null
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error(`Failed to decode ${url}`))
        el.src = objectUrl
      })
      width = img.naturalWidth || img.width || 960
      height = img.naturalHeight || img.height || 640
      if (width < 1 || height < 1) {
        width = 960
        height = 640
      }
      drawSource = img
    }

    const scale = Math.min(1, maxSide / Math.max(width, height))
    const w = Math.max(1, Math.round(width * scale))
    const h = Math.max(1, Math.round(height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('2d context unavailable')
    ctx.drawImage(drawSource, 0, 0, w, h)
    bitmap?.close()
    return ctx.getImageData(0, 0, w, h)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
