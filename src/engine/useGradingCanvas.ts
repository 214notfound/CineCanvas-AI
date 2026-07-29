import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { GradingCanvas } from './GradingCanvas'
import { adjustmentsToUniforms } from './pipeline'
import type { Adjustments } from './sliders'
import type { CurvePoint } from './curve'
import { useGradingStore } from '@/store/useGradingStore'

export interface UseGradingCanvasOptions {
  /**
   * When set, uniforms follow this object instead of `useGradingStore`.
   * Used by `/learn/lessons/*` so practice does not pollute the workspace.
   */
  adjustments?: Adjustments
  /** Optional curve override (lessons). Store curve used when omitted. */
  lumaCurve?: CurvePoint[]
}

export interface UseGradingCanvasResult {
  containerRef: RefObject<HTMLDivElement>
  /** Show the raw original photo (filter off). */
  showOriginal: () => void
  /** Restore graded view from current adjustments source. */
  showGraded: () => void
  /** Whether the canvas has finished Pixi init. */
  ready: boolean
  sampleImageData: (maxSide?: number) => ImageData | null
  imageEpoch: number
}

/**
 * Binds a GradingCanvas to a container element and keeps it in sync with the
 * grading store (or explicit overrides for lessons).
 */
export function useGradingCanvas(
  imageSrc: string | null,
  options?: UseGradingCanvasOptions,
): UseGradingCanvasResult {
  const externalAdj = options?.adjustments
  const externalCurve = options?.lumaCurve
  const useExternal = externalAdj !== undefined

  const containerRef = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>
  const canvasRef = useRef<GradingCanvas | null>(null)
  const showingOriginalRef = useRef(false)
  const externalRef = useRef(externalAdj)
  externalRef.current = externalAdj
  const curveRef = useRef(externalCurve)
  curveRef.current = externalCurve

  const [ready, setReady] = useState(false)
  const [imageEpoch, setImageEpoch] = useState(0)

  const resolveAdjustments = useCallback((): Adjustments => {
    if (useExternal && externalRef.current) return externalRef.current
    return useGradingStore.getState().adjustments
  }, [useExternal])

  const resolveCurve = useCallback((): CurvePoint[] => {
    if (curveRef.current) return curveRef.current
    return useGradingStore.getState().lumaCurve
  }, [])

  const pushAll = useCallback(() => {
    const gc = canvasRef.current
    if (!gc) return
    gc.setUniforms(adjustmentsToUniforms(resolveAdjustments()))
    gc.setCurvePoints(resolveCurve())
  }, [resolveAdjustments, resolveCurve])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const gc = new GradingCanvas(el)
    canvasRef.current = gc
    let cancelled = false

    gc.init().then(() => {
      if (cancelled) return
      pushAll()
      setReady(true)
    })

    return () => {
      cancelled = true
      setReady(false)
      gc.destroy()
      canvasRef.current = null
    }
  }, [pushAll])

  useEffect(() => {
    if (!ready || !imageSrc) return
    showingOriginalRef.current = false
    void canvasRef.current?.setImage(imageSrc).then(() => {
      canvasRef.current?.setFilterEnabled(true)
      pushAll()
      setImageEpoch((n) => n + 1)
    })
  }, [ready, imageSrc, pushAll])

  useEffect(() => {
    if (useExternal) return
    return useGradingStore.subscribe(() => {
      if (showingOriginalRef.current) return
      pushAll()
    })
  }, [useExternal, pushAll])

  useEffect(() => {
    if (!useExternal || !externalAdj) return
    if (showingOriginalRef.current) return
    pushAll()
  }, [useExternal, externalAdj, externalCurve, pushAll])

  const showOriginal = useCallback(() => {
    showingOriginalRef.current = true
    canvasRef.current?.setFilterEnabled(false)
  }, [])

  const showGraded = useCallback(() => {
    showingOriginalRef.current = false
    canvasRef.current?.setFilterEnabled(true)
    pushAll()
  }, [pushAll])

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
