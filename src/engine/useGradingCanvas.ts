import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { GradingCanvas } from './GradingCanvas'
import { adjustmentsToUniforms } from './pipeline'
import type { Adjustments } from './sliders'
import { useGradingStore } from '@/store/useGradingStore'

export interface UseGradingCanvasOptions {
  /**
   * When set, uniforms follow this object instead of `useGradingStore`.
   * Used by `/learn/lessons/*` so practice does not pollute the workspace.
   */
  adjustments?: Adjustments
}

export interface UseGradingCanvasResult {
  containerRef: RefObject<HTMLDivElement>
  /** Show the raw original photo (filter off). */
  showOriginal: () => void
  /** Restore graded view from current adjustments source. */
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
 * grading store (or an explicit adjustments override for lessons).
 */
export function useGradingCanvas(
  imageSrc: string | null,
  options?: UseGradingCanvasOptions,
): UseGradingCanvasResult {
  const externalAdj = options?.adjustments
  const useExternal = externalAdj !== undefined

  // Cast: React 18 useRef(null) infers `HTMLDivElement | null`; JSX ref wants RefObject<T>.
  const containerRef = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>
  const canvasRef = useRef<GradingCanvas | null>(null)
  const showingOriginalRef = useRef(false)
  const externalRef = useRef(externalAdj)
  externalRef.current = externalAdj

  const [ready, setReady] = useState(false)
  const [imageEpoch, setImageEpoch] = useState(0)

  const resolveAdjustments = useCallback((): Adjustments => {
    if (useExternal && externalRef.current) return externalRef.current
    return useGradingStore.getState().adjustments
  }, [useExternal])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const gc = new GradingCanvas(el)
    canvasRef.current = gc
    let cancelled = false

    gc.init().then(() => {
      if (cancelled) return
      gc.setUniforms(adjustmentsToUniforms(resolveAdjustments()))
      setReady(true)
    })

    return () => {
      cancelled = true
      setReady(false)
      gc.destroy()
      canvasRef.current = null
    }
  }, [resolveAdjustments])

  useEffect(() => {
    if (!ready || !imageSrc) return
    showingOriginalRef.current = false
    void canvasRef.current?.setImage(imageSrc).then(() => {
      canvasRef.current?.setFilterEnabled(true)
      canvasRef.current?.setUniforms(adjustmentsToUniforms(resolveAdjustments()))
      setImageEpoch((n) => n + 1)
    })
  }, [ready, imageSrc, resolveAdjustments])

  // Store-driven path (lab / workspace).
  useEffect(() => {
    if (useExternal) return
    return useGradingStore.subscribe((state) => {
      if (showingOriginalRef.current) return
      canvasRef.current?.setUniforms(adjustmentsToUniforms(state.adjustments))
    })
  }, [useExternal])

  // Lesson-driven path.
  useEffect(() => {
    if (!useExternal || !externalAdj) return
    if (showingOriginalRef.current) return
    canvasRef.current?.setUniforms(adjustmentsToUniforms(externalAdj))
  }, [useExternal, externalAdj])

  const showOriginal = useCallback(() => {
    showingOriginalRef.current = true
    canvasRef.current?.setFilterEnabled(false)
  }, [])

  const showGraded = useCallback(() => {
    showingOriginalRef.current = false
    canvasRef.current?.setFilterEnabled(true)
    canvasRef.current?.setUniforms(adjustmentsToUniforms(resolveAdjustments()))
  }, [resolveAdjustments])

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
