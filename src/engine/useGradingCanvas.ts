import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { GradingCanvas } from './GradingCanvas'
import { adjustmentsToUniforms } from './pipeline'
import { useGradingStore } from '@/store/useGradingStore'

export interface UseGradingCanvasResult {
  containerRef: RefObject<HTMLDivElement>
  /** Show the raw original photo (filter off). */
  showOriginal: () => void
  /** Restore graded view from current store adjustments. */
  showGraded: () => void
  /** Whether the canvas has finished Pixi init. */
  ready: boolean
  /**
   * Sample graded pixels for histogram / heatmap.
   * Safe to call from rAF; returns null if canvas not ready.
   */
  sampleImageData: (maxSide?: number) => ImageData | null
  /**
   * Bumps when the image finishes loading so consumers can re-sample.
   * Adjustment changes should be observed via the grading store instead.
   */
  imageEpoch: number
}

/**
 * Binds a GradingCanvas to a container element and keeps it in sync with the
 * grading store. Returns a ref to attach to the container div, plus
 * before/after flash helpers and pixel sampling for teaching tools.
 */
export function useGradingCanvas(imageSrc: string | null): UseGradingCanvasResult {
  // Cast: React 18 useRef(null) infers `HTMLDivElement | null`; JSX ref wants RefObject<T>.
  const containerRef = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>
  const canvasRef = useRef<GradingCanvas | null>(null)
  const showingOriginalRef = useRef(false)
  const [ready, setReady] = useState(false)
  const [imageEpoch, setImageEpoch] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const gc = new GradingCanvas(el)
    canvasRef.current = gc
    let cancelled = false

    gc.init().then(() => {
      if (cancelled) return
      gc.setUniforms(adjustmentsToUniforms(useGradingStore.getState().adjustments))
      setReady(true)
    })

    return () => {
      cancelled = true
      setReady(false)
      gc.destroy()
      canvasRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!ready || !imageSrc) return
    showingOriginalRef.current = false
    void canvasRef.current?.setImage(imageSrc).then(() => {
      // Re-apply filter + uniforms after image load (setImage recreates sprite).
      canvasRef.current?.setFilterEnabled(true)
      canvasRef.current?.setUniforms(
        adjustmentsToUniforms(useGradingStore.getState().adjustments),
      )
      setImageEpoch((n) => n + 1)
    })
  }, [ready, imageSrc])

  useEffect(() => {
    return useGradingStore.subscribe((state) => {
      // Don't overwrite the flash-to-original view while the user is holding.
      if (showingOriginalRef.current) return
      canvasRef.current?.setUniforms(adjustmentsToUniforms(state.adjustments))
    })
  }, [])

  const showOriginal = useCallback(() => {
    showingOriginalRef.current = true
    canvasRef.current?.setFilterEnabled(false)
  }, [])

  const showGraded = useCallback(() => {
    showingOriginalRef.current = false
    canvasRef.current?.setFilterEnabled(true)
    canvasRef.current?.setUniforms(
      adjustmentsToUniforms(useGradingStore.getState().adjustments),
    )
  }, [])

  const sampleImageData = useCallback((maxSide = 256) => {
    return canvasRef.current?.sampleImageData(maxSide) ?? null
  }, [])

  return {
    containerRef,
    showOriginal,
    showGraded,
    ready,
    sampleImageData,
    imageEpoch,
  }
}
