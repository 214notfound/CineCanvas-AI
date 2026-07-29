import { useEffect, useRef, useState } from 'react'
import {
  cloneCurve,
  IDENTITY_CURVE,
  normalizeCurvePoints,
  sCurvePreset,
  type CurvePoint,
} from '@/engine/curve'

interface CurvePanelProps {
  points: CurvePoint[]
  onChange: (points: CurvePoint[]) => void
  disabled?: boolean
}

const W = 280
const H = 180
const PAD = 12

/**
 * Teaching luminance-curve editor for /learn/lab.
 * Drag control points; black/white stay locked on x=0 / x=1.
 */
export function CurvePanel({
  points,
  onChange,
  disabled = false,
}: CurvePanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragIndex = useRef<number | null>(null)
  const [local, setLocal] = useState(() => normalizeCurvePoints(points))

  useEffect(() => {
    setLocal(normalizeCurvePoints(points))
  }, [points])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.fillStyle = 'rgba(20, 18, 16, 0.95)'
    ctx.fillRect(0, 0, W, H)

    const plotW = W - PAD * 2
    const plotH = H - PAD * 2

    // Grid
    ctx.strokeStyle = 'rgba(242, 237, 224, 0.12)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const t = i / 4
      const x = PAD + t * plotW
      const y = PAD + t * plotH
      ctx.beginPath()
      ctx.moveTo(x, PAD)
      ctx.lineTo(x, PAD + plotH)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(PAD, y)
      ctx.lineTo(PAD + plotW, y)
      ctx.stroke()
    }

    // Identity diagonal
    ctx.strokeStyle = 'rgba(242, 237, 224, 0.25)'
    ctx.beginPath()
    ctx.moveTo(PAD, PAD + plotH)
    ctx.lineTo(PAD + plotW, PAD)
    ctx.stroke()

    // Curve polyline (sample dense)
    const pts = normalizeCurvePoints(local)
    ctx.strokeStyle = 'rgba(200, 151, 63, 0.95)'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i <= 64; i++) {
      const x = i / 64
      const y = evalApprox(pts, x)
      const px = PAD + x * plotW
      const py = PAD + (1 - y) * plotH
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // Handles
    for (const p of pts) {
      const px = PAD + p.x * plotW
      const py = PAD + (1 - p.y) * plotH
      ctx.fillStyle = '#c8973f'
      ctx.beginPath()
      ctx.arc(px, py, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#f2ede0'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }, [local])

  function clientToCurve(e: React.PointerEvent<HTMLCanvasElement>): {
    x: number
    y: number
  } {
    const rect = e.currentTarget.getBoundingClientRect()
    const plotW = W - PAD * 2
    const plotH = H - PAD * 2
    const x = (e.clientX - rect.left - PAD) / plotW
    const y = 1 - (e.clientY - rect.top - PAD) / plotH
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    }
  }

  function hitIndex(x: number, y: number): number {
    const plotW = W - PAD * 2
    const plotH = H - PAD * 2
    let best = -1
    let bestD = 14
    local.forEach((p, i) => {
      const px = PAD + p.x * plotW
      const py = PAD + (1 - p.y) * plotH
      const cx = PAD + x * plotW
      const cy = PAD + (1 - y) * plotH
      const d = Math.hypot(px - cx, py - cy)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    return best
  }

  function commit(next: CurvePoint[]) {
    const normalized = normalizeCurvePoints(next)
    setLocal(normalized)
    onChange(normalized)
  }

  return (
    <section className="rounded-lg border border-paper-dim/30 bg-film/60 px-3 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-serif-sc text-xs font-semibold tracking-wide text-cream">
          亮度曲线
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => commit(sCurvePreset())}
            className="rounded border border-paper-dim/40 px-2 py-0.5 font-sans text-[11px] text-paper hover:border-gold hover:text-gold disabled:opacity-40"
          >
            S 曲线
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => commit(cloneCurve(IDENTITY_CURVE))}
            className="rounded border border-paper-dim/40 px-2 py-0.5 font-sans text-[11px] text-paper hover:border-gold hover:text-gold disabled:opacity-40"
          >
            重置
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="touch-none rounded-sm"
        aria-label="亮度曲线编辑器"
        onPointerDown={(e) => {
          if (disabled) return
          e.currentTarget.setPointerCapture(e.pointerId)
          const { x, y } = clientToCurve(e)
          let idx = hitIndex(x, y)
          if (idx < 0) {
            const next = [...local, { x, y }]
            commit(next)
            idx = normalizeCurvePoints(next).findIndex(
              (p) => Math.abs(p.x - x) < 0.02,
            )
          }
          dragIndex.current = idx
        }}
        onPointerMove={(e) => {
          if (disabled || dragIndex.current == null) return
          const { x, y } = clientToCurve(e)
          const i = dragIndex.current
          const next = local.map((p, idx) => {
            if (idx !== i) return p
            // Lock endpoints on x
            if (i === 0) return { x: 0, y }
            if (i === local.length - 1) return { x: 1, y }
            return { x, y }
          })
          commit(next)
        }}
        onPointerUp={() => {
          dragIndex.current = null
        }}
        onPointerCancel={() => {
          dragIndex.current = null
        }}
      />
      <p className="mt-2 font-sans text-[11px] leading-relaxed text-paper-dim">
        拖动控制点改变亮度映射。对角线 = 不动；S 形 ≈ 手调对比度。默认对角线对画面无影响。
      </p>
    </section>
  )
}

/** Piecewise-linear preview (fast draw); bake uses true monotone cubic. */
function evalApprox(pts: CurvePoint[], x: number): number {
  if (x <= pts[0].x) return pts[0].y
  for (let i = 0; i < pts.length - 1; i++) {
    if (x <= pts[i + 1].x) {
      const t =
        (x - pts[i].x) / Math.max(1e-9, pts[i + 1].x - pts[i].x)
      return pts[i].y + (pts[i + 1].y - pts[i].y) * t
    }
  }
  return pts[pts.length - 1].y
}
