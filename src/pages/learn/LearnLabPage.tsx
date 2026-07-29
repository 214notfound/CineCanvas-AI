import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BeforeAfterFlash } from '@/components/BeforeAfterFlash'
import { HistogramPanel } from '@/components/HistogramPanel'
import { SliderPanel } from '@/components/SliderPanel'
import { UploadZone } from '@/components/UploadZone'
import type { SliderId } from '@/engine/sliders'
import { useGradingCanvas } from '@/engine/useGradingCanvas'
import { useGradingStore } from '@/store/useGradingStore'
import { useSessionStore } from '@/store/useSessionStore'

/**
 * Isolated P0 teaching-lab page. Shares the grading engine + session image,
 * but does not alter the `/workspace` coaching flow.
 */
export default function LearnLabPage() {
  const image = useSessionStore((s) => s.image)
  const adjustments = useGradingStore((s) => s.adjustments)
  const setAdjustment = useGradingStore((s) => s.setAdjustment)
  const reset = useGradingStore((s) => s.reset)
  const [activeSlider, setActiveSlider] = useState<SliderId | null>(null)
  const [ghostEpoch, setGhostEpoch] = useState(0)

  const {
    containerRef,
    showOriginal,
    showGraded,
  } = useGradingCanvas(image?.preview.url ?? null)

  return (
    <main className="min-h-full bg-maroon-deep px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-sans text-xs tracking-wide text-gold/80">
              P0 · 教学地基
            </p>
            <h1 className="font-display text-3xl font-bold text-cream text-shadow-paper">
              对比实验室
            </h1>
            <p className="mt-1 max-w-xl font-serif-sc text-sm text-paper-dim">
              拖滑块时看直方图：淡线是拖动前，彩色山是现在；下方句子解释山在怎么动。
            </p>
          </div>
          <div className="flex gap-4 font-serif-sc text-gold">
            <Link to="/workspace" className="underline-offset-4 hover:underline">
              工作台
            </Link>
            <Link to="/" className="underline-offset-4 hover:underline">
              首页
            </Link>
          </div>
        </div>

        <div className="mb-5 max-w-md">
          <UploadZone compact />
          {!image && (
            <p className="mt-2 font-sans text-xs text-paper-dim">
              刷新后需重新上传照片；滑块数值会保留。
            </p>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <div
                ref={containerRef}
                className="h-[50vh] w-full overflow-hidden rounded-lg bg-film lg:h-[62vh]"
              />
              {!image && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <p className="font-serif-sc text-sm text-paper-dim">
                    先上传一张照片
                  </p>
                </div>
              )}
            </div>

            <HistogramPanel
              imageUrl={image?.preview.url ?? null}
              activeSlider={activeSlider}
              ghostEpoch={ghostEpoch}
              disabled={!image}
            />

            <BeforeAfterFlash
              onShowOriginal={showOriginal}
              onShowGraded={showGraded}
              disabled={!image}
            />

            <button
              type="button"
              onClick={() => {
                reset()
                setActiveSlider(null)
                setGhostEpoch(0)
              }}
              disabled={!image}
              className="w-fit rounded border border-paper-dim px-4 py-2 font-sans text-sm text-paper hover:bg-maroon disabled:opacity-40"
            >
              重置全部滑块
            </button>
          </div>

          <SliderPanel
            adjustments={adjustments}
            onDragStart={(id) => {
              setActiveSlider(id)
              setGhostEpoch((n) => n + 1)
            }}
            onChange={(id, value) => {
              setActiveSlider(id)
              setAdjustment(id, value)
            }}
          />
        </div>
      </div>
    </main>
  )
}
