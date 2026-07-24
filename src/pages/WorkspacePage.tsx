import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Slider } from '@/components/Slider'
import { sliderHelpMap } from '@/data/sliderHelp'
import { SLIDERS } from '@/engine/sliders'
import { useGradingCanvas } from '@/engine/useGradingCanvas'
import { useGradingStore } from '@/store/useGradingStore'
import { processImageFile } from '@/lib/downsample'
import { useSessionStore } from '@/store/useSessionStore'

/**
 * TEMPORARY engine test harness for Todo 2/3 verification.
 * Lets you load a local image (auto-downsampled) and drag the 10 raw sliders to
 * confirm the WebGL grading engine renders in real time. This whole page will be
 * replaced by the real workspace (Pixi preview + target-range panel + StepCoach)
 * in the `workspace-coach` todo.
 */
export default function WorkspacePage() {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const adjustments = useGradingStore((s) => s.adjustments)
  const setAdjustment = useGradingStore((s) => s.setAdjustment)
  const reset = useGradingStore((s) => s.reset)

  const image = useSessionStore((s) => s.image)
  const setImage = useSessionStore((s) => s.setImage)

  const containerRef = useGradingCanvas(image?.preview.url ?? null)

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setProcessing(true)
    try {
      const processed = await processImageFile(file)
      setImage(processed)
      if (import.meta.env.DEV) {
        console.log(
          `[downsample] 原图 ${processed.originalWidth}×${processed.originalHeight} · ` +
            `预览 ${processed.preview.width}×${processed.preview.height} · ` +
            `送 AI ${processed.ai.width}×${processed.ai.height}`,
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片处理失败')
    } finally {
      setProcessing(false)
      // allow re-picking the same file
      e.target.value = ''
    }
  }

  return (
    <main className="min-h-full bg-maroon-deep px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold text-cream text-shadow-paper">
            工作台 · 引擎测试台
          </h1>
          <Link
            to="/"
            className="font-serif-sc text-gold underline-offset-4 hover:underline"
          >
            ← 返回首页
          </Link>
        </div>

        <p className="mb-6 font-sans text-sm text-paper-dim">
          临时测试页：选一张本地图片（自动降采样），拖动下方 10 个滑块，实时查看 WebGL 调色效果。
        </p>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Preview */}
          <div className="flex flex-col gap-4">
            <div
              ref={containerRef}
              className="h-[60vh] w-full overflow-hidden rounded-lg bg-film"
            />
            <div className="flex items-center gap-4">
              <label className="cursor-pointer rounded bg-paper px-4 py-2 font-sans text-sm font-medium text-maroon-deep hover:bg-cream">
                选择图片
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickFile}
                />
              </label>
              <button
                onClick={reset}
                className="rounded border border-paper-dim px-4 py-2 font-sans text-sm text-paper hover:bg-maroon"
              >
                重置全部
              </button>
              {processing && (
                <span className="font-sans text-sm text-paper-dim">处理中…</span>
              )}
              {error && (
                <span className="font-sans text-sm text-crimson">{error}</span>
              )}
              {!image && !processing && !error && (
                <span className="font-sans text-sm text-paper-dim">
                  尚未选择图片
                </span>
              )}
            </div>
          </div>

          {/* Sliders */}
          <div className="rounded-lg bg-paper/95 p-4">
            <div className="flex flex-col gap-3">
              {SLIDERS.map((s) => (
                <Slider
                  key={s.id}
                  label={s.label}
                  labelEn={s.labelEn}
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={adjustments[s.id]}
                  onChange={(v) => setAdjustment(s.id, v)}
                  helpContent={sliderHelpMap[s.id]}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
