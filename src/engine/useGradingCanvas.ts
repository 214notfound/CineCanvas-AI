import { useEffect, useRef, useState } from 'react'
import { GradingCanvas } from './GradingCanvas'
import { adjustmentsToUniforms } from './pipeline'
import { useGradingStore } from '@/store/useGradingStore'

/**
 * Binds a GradingCanvas to a container element and keeps it in sync with the
 * grading store. Returns a ref to attach to the container div.
 *
 * - Creates/destroys the Pixi app on mount/unmount (StrictMode-safe).
 * - Loads `imageSrc` once the canvas is ready and whenever it changes.
 * - Subscribes to the store so slider changes update uniforms in real time.
 */
export function useGradingCanvas(imageSrc: string | null) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<GradingCanvas | null>(null)
  const [ready, setReady] = useState(false)

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
    canvasRef.current?.setImage(imageSrc)
  }, [ready, imageSrc])

  useEffect(() => {
    return useGradingStore.subscribe((state) => {
      canvasRef.current?.setUniforms(adjustmentsToUniforms(state.adjustments))
    })
  }, [])

  return containerRef
}
