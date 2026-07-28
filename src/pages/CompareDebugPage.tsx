import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Slider } from '@/components/Slider'
import { useGradingCanvas } from '@/engine/useGradingCanvas'
import { SLIDERS, type SliderId } from '@/engine/sliders'
import { createGreyscaleRampDataUrl } from '@/lib/greyscaleRamp'
import { useGradingStore } from '@/store/useGradingStore'
import { useSessionStore } from '@/store/useSessionStore'

/**
 * Dev-only split compare: site grading (left) vs a Lightroom export (right).
 * Drag the divider; load greyscale ramp or session photo as the source.
 */
export default function CompareDebugPage() {
  const adjustments = useGradingStore((s) => s.adjustments)
  const setAdjustment = useGradingStore((s) => s.setAdjustment)
  const reset = useGradingStore((s) => s.reset)
  const sessionImage = useSessionStore((s) => s.image)

  const [sourceMode, setSourceMode] = useState<'session' | 'ramp'>('ramp')
  const [lrUrl, setLrUrl] = useState<string | null>(null)
  const [split, setSplit] = useState(50)
  const lrObjectUrl = useRef<string | null>(null)

  const rampUrl = useMemo(() => createGreyscaleRampDataUrl(), [])

  const imageSrc =
    sourceMode === 'ramp' ? rampUrl : (sessionImage?.preview.url ?? rampUrl)

  const containerRef = useGradingCanvas(imageSrc)

  useEffect(() => {
    return () => {
      if (lrObjectUrl.current) URL.revokeObjectURL(lrObjectUrl.current)
    }
  }, [])

  function onLrFile(file: File | null) {
    if (lrObjectUrl.current) {
      URL.revokeObjectURL(lrObjectUrl.current)
      lrObjectUrl.current = null
    }
    if (!file) {
      setLrUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    lrObjectUrl.current = url
    setLrUrl(url)
  }

  function applyRecipe(name: 'neutral' | 'liftShadows' | 'classic') {
    reset()
    if (name === 'liftShadows') {
      setAdjustment('shadows', 40)
      setAdjustment('contrast', 20)
    } else if (name === 'classic') {
      setAdjustment('exposure', 33) // ~+0.5 stops
      setAdjustment('shadows', 40)
      setAdjustment('contrast', 20)
      setAdjustment('highlights', -25)
      setAdjustment('vibrance', 15)
    }
  }

  return (
    <main className="min-h-full bg-maroon-deep px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-cream text-shadow-paper">
              引擎对照 /debug/compare
            </h1>
            <p className="mt-1 max-w-2xl font-serif-sc text-sm text-paper-dim">
              左侧为本站 WebGL 渲染，右侧上传 LR 导出图做分屏比对。灰阶图用于检查黑点锚定与高光软滚降。
            </p>
          </div>
          <Link
            to="/workspace"
            className="font-serif-sc text-gold underline-offset-4 hover:underline"
          >
            ← 工作台
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex rounded-sm border border-paper-dim/30 overflow-hidden">
            <button
              type="button"
              onClick={() => setSourceMode('ramp')}
              className={`px-3 py-1.5 font-serif-sc text-sm ${
                sourceMode === 'ramp'
                  ? 'bg-paper text-maroon'
                  : 'bg-film/40 text-cream hover:bg-film/60'
              }`}
            >
              灰阶图
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('session')}
              className={`px-3 py-1.5 font-serif-sc text-sm ${
                sourceMode === 'session'
                  ? 'bg-paper text-maroon'
                  : 'bg-film/40 text-cream hover:bg-film/60'
              }`}
            >
              会话照片
            </button>
          </div>

          <button
            type="button"
            onClick={() => applyRecipe('neutral')}
            className="rounded-sm border border-paper-dim/40 px-3 py-1.5 font-serif-sc text-sm text-cream hover:bg-film/50"
          >
            重置
          </button>
          <button
            type="button"
            onClick={() => applyRecipe('liftShadows')}
            className="rounded-sm border border-gold/40 px-3 py-1.5 font-serif-sc text-sm text-gold hover:bg-film/50"
          >
            配方：阴影+40 / 对比+20
          </button>
          <button
            type="button"
            onClick={() => applyRecipe('classic')}
            className="rounded-sm border border-gold/40 px-3 py-1.5 font-serif-sc text-sm text-gold hover:bg-film/50"
          >
            配方：曝光≈+0.5 / 阴影+40 / 对比+20
          </button>

          <label className="ml-auto cursor-pointer rounded-sm bg-paper px-3 py-1.5 font-serif-sc text-sm text-maroon hover:bg-cream">
            上传 LR 对照图
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onLrFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-paper-dim/20 bg-film">
            {/* Graded canvas (full size underneath) */}
            <div ref={containerRef} className="absolute inset-0" />

            {/* LR reference clipped to the right of the split */}
            {lrUrl && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  clipPath: `inset(0 0 0 ${split}%)`,
                }}
              >
                <img
                  src={lrUrl}
                  alt="Lightroom reference"
                  className="h-full w-full object-contain"
                />
              </div>
            )}

            {/* Divider */}
            <div
              className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-gold shadow"
              style={{ left: `${split}%` }}
            />

            <input
              type="range"
              min={0}
              max={100}
              value={split}
              onChange={(e) => setSplit(Number(e.target.value))}
              className="absolute inset-x-4 bottom-3 z-20"
              aria-label="分屏位置"
            />

            <div className="pointer-events-none absolute left-3 top-3 rounded-sm bg-ink/70 px-2 py-1 font-serif-sc text-xs text-cream">
              本站渲染
            </div>
            <div className="pointer-events-none absolute right-3 top-3 rounded-sm bg-ink/70 px-2 py-1 font-serif-sc text-xs text-cream">
              {lrUrl ? 'LR 导出' : '请上传 LR 对照'}
            </div>
          </div>

          <aside className="paper-texture max-h-[70vh] space-y-3 overflow-y-auto rounded-lg border border-paper-dim/40 p-3">
            <p className="font-serif-sc text-xs text-ink/60">
              验收：提阴影后灰阶最左端仍接近黑；高光有软滚降不死白；彩色图提阴影不发灰脱色。
            </p>
            {SLIDERS.map((def) => (
              <Slider
                key={def.id}
                label={def.label}
                labelEn={def.labelEn}
                min={def.min}
                max={def.max}
                step={def.step}
                value={adjustments[def.id]}
                onChange={(v) => setAdjustment(def.id as SliderId, v)}
              />
            ))}
          </aside>
        </div>
      </div>
    </main>
  )
}
