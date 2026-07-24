// Image preprocessing for upload.
//
// Phone photos are often 20MP+, which is both too heavy to drag-render in
// real time and larger than vision models want. On upload we produce:
//   - preview: long edge <= 2000px, as an object URL for the WebGL workspace
//   - ai:      long edge <= 1280px JPEG data URL for the vision model
// while keeping a reference to the original File (for future full-res export).
//
// EXIF orientation is respected so portrait phone shots aren't sideways.

export const PREVIEW_MAX_EDGE = 2000
export const AI_MAX_EDGE = 1280
export const PREVIEW_JPEG_QUALITY = 0.92
export const AI_JPEG_QUALITY = 0.85

export interface ProcessedImage {
  originalFile: File
  originalWidth: number
  originalHeight: number
  preview: { url: string; width: number; height: number }
  ai: { dataUrl: string; width: number; height: number }
}

type DrawableSource = ImageBitmap | HTMLImageElement

interface LoadedSource {
  source: DrawableSource
  width: number
  height: number
  /** Free underlying resources (ImageBitmap only). */
  close: () => void
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

async function loadSource(file: File): Promise<LoadedSource> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      }
    } catch {
      // fall through to the <img> fallback
    }
  }
  const img = await loadImageElement(file)
  return {
    source: img,
    width: img.naturalWidth,
    height: img.naturalHeight,
    close: () => {},
  }
}

function targetSize(w: number, h: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(w, h))
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  }
}

function drawScaled(source: DrawableSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 2D canvas 上下文')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return canvas
}

function canvasToBlobUrl(canvas: HTMLCanvasElement, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('图片编码失败'))
          return
        }
        resolve(URL.createObjectURL(blob))
      },
      'image/jpeg',
      quality,
    )
  })
}

/**
 * Downsample an uploaded image into preview + AI variants.
 * Never upscales: images already smaller than a target edge keep their size.
 */
export async function processImageFile(file: File): Promise<ProcessedImage> {
  const loaded = await loadSource(file)
  try {
    const { source, width: ow, height: oh } = loaded

    const previewSize = targetSize(ow, oh, PREVIEW_MAX_EDGE)
    const previewUrl = await canvasToBlobUrl(
      drawScaled(source, previewSize.width, previewSize.height),
      PREVIEW_JPEG_QUALITY,
    )

    const aiSize = targetSize(ow, oh, AI_MAX_EDGE)
    const aiDataUrl = drawScaled(source, aiSize.width, aiSize.height).toDataURL(
      'image/jpeg',
      AI_JPEG_QUALITY,
    )

    return {
      originalFile: file,
      originalWidth: ow,
      originalHeight: oh,
      preview: { url: previewUrl, width: previewSize.width, height: previewSize.height },
      ai: { dataUrl: aiDataUrl, width: aiSize.width, height: aiSize.height },
    }
  } finally {
    loaded.close()
  }
}
