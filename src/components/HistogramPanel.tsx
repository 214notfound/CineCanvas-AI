import { useEffect, useRef, useState } from 'react'
import type { Adjustments, SliderId } from '@/engine/sliders'
import {
  cloneHistogram,
  computeGradedHistogram,
  describeSliderMotion,
  diagnoseHistogram,
  highlightForSlider,
  loadHistogramSource,
  maxBin,
  type HistHighlight,
  type HistogramData,
} from '@/lib/histogram'
import { useGradingStore } from '@/store/useGradingStore'

interface HistogramPanelProps {
  /** Preview image URL (object URL or http). */
  imageUrl: string | null
  /** Last-dragged / focused slider — drives highlight + translation. */
  activeSlider: SliderId | null
  /**
   * Bumps when the user presses a slider (before value changes).
   * Parent should increment this from SliderPanel.onDragStart.
   */
  ghostEpoch: number
  disabled?: boolean
  /** When set, histogram follows these values instead of the grading store. */
  adjustments?: Adjustments
}

const H = 104
const PAD = 2

/**
 * Teaching-first histogram: self-explaining axis, ghost baseline, live
 * plain-language translation of how the active slider moves the "mountain".
 */
export function HistogramPanel({
  imageUrl,
  activeSlider,
  ghostEpoch,
  disabled = false,
  adjustments: adjustmentsProp,
}: HistogramPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sourceRef = useRef<ImageData | null>(null)
  const histRef = useRef<HistogramData | null>(null)
  const ghostRef = useRef<HistogramData | null>(null)
  const rafRef = useRef<number | null>(null)
  const activeSliderRef = useRef(activeSlider)
  const adjustmentsRef = useRef<Adjustments | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  )
  const [helpOpen, setHelpOpen] = useState(false)
  const [diagnosis, setDiagnosis] = useState<string | null>(null)
  const [hasGhost, setHasGhost] = useState(false)
  const storeAdjustments = useGradingStore((s) => s.adjustments)
  const adjustments = adjustmentsProp ?? storeAdjustments
  adjustmentsRef.current = adjustments

  activeSliderRef.current = activeSlider

  const draw = (
    hist: HistogramData,
    highlight: HistHighlight,
    ghost: HistogramData | null,
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cssW = Math.max(canvas.clientWidth || 320, 1)
    const cssH = Math.max(canvas.clientHeight || H, 1)
    const pw = Math.round(cssW * dpr)
    const ph = Math.round(cssH * dpr)
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw
      canvas.height = ph
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.clearRect(0, 0, cssW, cssH)
    ctx.fillStyle = 'rgba(20, 18, 16, 0.92)'
    ctx.fillRect(0, 0, cssW, cssH)

    const plotW = cssW - PAD * 2
    const plotH = cssH - PAD * 2
    const peak = Math.max(maxBin(hist), ghost ? maxBin(ghost) : 1)
    const binW = plotW / 256

    if (highlight.kind === 'luma' || highlight.kind === 'all') {
      ctx.fillStyle = 'rgba(200, 151, 63, 0.18)'
      if (highlight.kind === 'all') {
        ctx.fillRect(PAD, PAD, plotW, plotH)
      } else {
        for (const z of highlight.zones) {
          const x0 = PAD + (z.start / 255) * plotW
          const x1 = PAD + ((z.end + 1) / 255) * plotW
          ctx.fillRect(x0, PAD, Math.max(1, x1 - x0), plotH)
        }
      }
    }

    const strokeOutline = (bins: Uint32Array, color: string, width: number) => {
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.beginPath()
      for (let i = 0; i < 256; i++) {
        const barH = (bins[i] / peak) * plotH
        const x = PAD + i * binW + binW / 2
        const y = PAD + plotH - barH
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.restore()
    }

    // Ghost baseline: frozen outline from drag-start.
    if (ghost) {
      strokeOutline(ghost.luma, 'rgba(242, 237, 224, 0.28)', 1.25)
    }

    const drawChannel = (
      bins: Uint32Array,
      color: string,
      composite: GlobalCompositeOperation = 'screen',
    ) => {
      ctx.save()
      ctx.globalCompositeOperation = composite
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(PAD, PAD + plotH)
      for (let i = 0; i < 256; i++) {
        const barH = (bins[i] / peak) * plotH
        const x = PAD + i * binW
        ctx.lineTo(x, PAD + plotH - barH)
        ctx.lineTo(x + binW, PAD + plotH - barH)
      }
      ctx.lineTo(PAD + plotW, PAD + plotH)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    drawChannel(hist.luma, 'rgba(242, 237, 224, 0.55)', 'source-over')

    const rgbAlpha = highlight.kind === 'rgb' ? 0.55 : 0.28
    drawChannel(hist.r, `rgba(220, 70, 70, ${rgbAlpha})`)
    drawChannel(hist.g, `rgba(70, 180, 90, ${rgbAlpha})`)
    drawChannel(hist.b, `rgba(70, 120, 220, ${rgbAlpha})`)

    ctx.strokeStyle = 'rgba(242, 237, 224, 0.2)'
    ctx.lineWidth = 1
    const midX = PAD + 0.5 * plotW
    ctx.beginPath()
    ctx.moveTo(midX, PAD)
    ctx.lineTo(midX, PAD + plotH)
    ctx.stroke()
  }

  const recomputeNow = () => {
    const source = sourceRef.current
    const canvas = canvasRef.current
    if (!source || !canvas) return
    try {
      const hist = computeGradedHistogram(
        source,
        adjustmentsRef.current ?? useGradingStore.getState().adjustments,
      )
      histRef.current = hist
      setDiagnosis(diagnoseHistogram(hist).verdict)
      draw(
        hist,
        highlightForSlider(activeSliderRef.current),
        ghostRef.current,
      )
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[HistogramPanel] recompute failed', err)
      }
    }
  }

  const scheduleRecompute = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      recomputeNow()
    })
  }

  // Freeze ghost when parent signals a new drag start (value not yet changed).
  useEffect(() => {
    if (ghostEpoch <= 0) return
    if (histRef.current) {
      ghostRef.current = cloneHistogram(histRef.current)
      setHasGhost(true)
      draw(
        histRef.current,
        highlightForSlider(activeSliderRef.current),
        ghostRef.current,
      )
    }
  }, [ghostEpoch])

  useEffect(() => {
    let cancelled = false
    sourceRef.current = null
    histRef.current = null
    ghostRef.current = null
    setHasGhost(false)
    setDiagnosis(null)

    if (!imageUrl || disabled) {
      setStatus('idle')
      return
    }

    setStatus('loading')
    void loadHistogramSource(imageUrl, 240)
      .then((data) => {
        if (cancelled) return
        sourceRef.current = data
        setStatus('ready')
        recomputeNow()
        requestAnimationFrame(() => {
          if (!cancelled) recomputeNow()
        })
      })
      .catch((err) => {
        if (cancelled) return
        setStatus('error')
        if (import.meta.env.DEV) {
          console.warn('[HistogramPanel] load failed', err)
        }
      })

    return () => {
      cancelled = true
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [imageUrl, disabled])

  useEffect(() => {
    if (adjustmentsProp) return
    return useGradingStore.subscribe(() => {
      if (sourceRef.current) scheduleRecompute()
    })
  }, [adjustmentsProp])

  useEffect(() => {
    if (!adjustmentsProp) return
    if (sourceRef.current) scheduleRecompute()
  }, [adjustmentsProp])

  useEffect(() => {
    if (status === 'ready' && sourceRef.current) {
      recomputeNow()
    }
  }, [status])

  useEffect(() => {
    if (histRef.current) {
      draw(
        histRef.current,
        highlightForSlider(activeSlider),
        ghostRef.current,
      )
    }
  }, [activeSlider])

  const activeValue = activeSlider ? adjustments[activeSlider] : 0
  const motionText =
    status === 'loading'
      ? '正在计算直方图…'
      : status === 'error'
        ? '直方图加载失败，请重新上传'
        : disabled || !imageUrl
          ? '上传照片后，这里会显示明暗分布'
          : describeSliderMotion(activeSlider, activeValue)

  return (
    <section className="rounded-lg border border-paper-dim/30 bg-film/60 px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h3 className="font-serif-sc text-xs font-semibold tracking-wide text-cream">
            直方图
          </h3>
          <button
            type="button"
            onClick={() => setHelpOpen((o) => !o)}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-paper-dim/40 font-sans text-[10px] text-paper-dim hover:border-gold hover:text-gold"
            aria-expanded={helpOpen}
            aria-label="什么是直方图"
            title="什么是直方图"
          >
            ?
          </button>
        </div>
        {hasGhost && status === 'ready' && (
          <p className="font-sans text-[10px] text-paper-dim/70">
            淡线 = 拖动前
          </p>
        )}
      </div>

      {helpOpen && (
        <div className="mb-3 rounded-md border border-paper-dim/25 bg-maroon-deep/40 px-3 py-2">
          <p className="font-serif-sc text-xs leading-relaxed text-cream">
            直方图把照片里每个像素的明暗统计成一座「山」：
          </p>
          <ul className="mt-1.5 space-y-1 font-sans text-[11px] leading-relaxed text-paper-dim">
            <li>横轴从左到右 = 从最黑到最白</li>
            <li>山越高 = 这个亮度的像素越多</li>
            <li>山偏左 → 照片偏暗；偏右 → 偏亮；挤中间 → 反差弱</li>
          </ul>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ShapeCard label="偏暗" kind="dark" />
            <ShapeCard label="均衡" kind="balanced" />
            <ShapeCard label="偏亮" kind="bright" />
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="h-[104px] w-full rounded-sm"
        style={{ width: '100%', height: H }}
        aria-label="实时直方图"
      />

      {/* Self-explaining black→white axis */}
      <div className="mt-1.5 px-0.5">
        <div
          className="h-2 w-full rounded-full"
          style={{
            background:
              'linear-gradient(to right, #0a0a0a 0%, #6b6b6b 50%, #f2ede0 100%)',
          }}
          aria-hidden
        />
        <div className="mt-1 flex justify-between font-sans text-[10px] text-paper-dim/80">
          <span>越暗</span>
          <span>中间调</span>
          <span>越亮</span>
        </div>
      </div>

      <p className="mt-2 font-sans text-[11px] leading-relaxed text-paper-dim">
        这是照片里明暗像素的分布：越靠左越暗、越靠右越亮，山越高说明这个亮度的像素越多。
      </p>

      <p
        className={[
          'mt-2 rounded-sm px-2.5 py-2 font-serif-sc text-sm leading-snug',
          activeSlider && status === 'ready'
            ? 'bg-gold/15 text-cream'
            : 'bg-film/50 text-paper-dim',
        ].join(' ')}
        aria-live="polite"
      >
        {motionText}
      </p>

      {diagnosis && status === 'ready' && !disabled && (
        <p className="mt-1.5 font-sans text-[11px] text-paper-dim/85">
          {diagnosis}
        </p>
      )}
    </section>
  )
}

function ShapeCard({
  label,
  kind,
}: {
  label: string
  kind: 'dark' | 'balanced' | 'bright'
}) {
  return (
    <div className="rounded bg-film/70 px-1.5 py-1.5 text-center">
      <svg viewBox="0 0 40 20" className="mx-auto h-5 w-full" aria-hidden>
        <path
          d={
            kind === 'dark'
              ? 'M0,18 C4,18 6,4 10,4 C14,4 14,16 22,16 C30,16 34,14 40,14 L40,20 L0,20 Z'
              : kind === 'bright'
                ? 'M0,14 C6,14 10,16 18,16 C26,16 26,4 30,4 C34,4 36,18 40,18 L40,20 L0,20 Z'
                : 'M0,16 C8,16 12,6 20,6 C28,6 32,16 40,16 L40,20 L0,20 Z'
          }
          fill="rgba(200,151,63,0.45)"
        />
      </svg>
      <p className="mt-0.5 font-sans text-[10px] text-paper-dim">{label}</p>
    </div>
  )
}
