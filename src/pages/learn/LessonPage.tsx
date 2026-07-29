import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { BeforeAfterFlash } from '@/components/BeforeAfterFlash'
import { HistogramPanel } from '@/components/HistogramPanel'
import { LessonQuizPanel } from '@/components/learn/LessonQuizPanel'
import { SliderPanel } from '@/components/SliderPanel'
import { getLesson } from '@/data/lessons'
import {
  clampSlider,
  neutralAdjustments,
  type Adjustments,
  type SliderId,
} from '@/engine/sliders'
import { useGradingCanvas } from '@/engine/useGradingCanvas'
import { markLessonComplete } from '@/lib/lessonProgress'

type Phase = 'intro' | 'explore' | 'quiz' | 'done'

/**
 * Single mechanism lesson: intro → explore (hist + flash) → quiz → done.
 * Uses local adjustments so workspace store is untouched.
 */
export default function LessonPage() {
  const { id = '' } = useParams<{ id: string }>()
  const lesson = getLesson(id)

  const [phase, setPhase] = useState<Phase>('intro')
  const [adjustments, setAdjustments] = useState<Adjustments>(() =>
    neutralAdjustments(),
  )
  const [activeSlider, setActiveSlider] = useState<SliderId | null>(null)
  const [ghostEpoch, setGhostEpoch] = useState(0)

  // Remount-equivalent reset when navigating lesson → lesson.
  useEffect(() => {
    setPhase('intro')
    setAdjustments(neutralAdjustments())
    setActiveSlider(null)
    setGhostEpoch(0)
  }, [id])

  const imageSrc = lesson?.imageSrc ?? null
  const {
    containerRef,
    showOriginal,
    showGraded,
  } = useGradingCanvas(imageSrc, { adjustments })

  const nextHref = useMemo(() => {
    if (!lesson?.nextId) return '/learn'
    return `/learn/lessons/${lesson.nextId}`
  }, [lesson])

  if (!lesson) {
    return <Navigate to="/learn" replace />
  }

  function setAdjustment(sliderId: SliderId, value: number) {
    setAdjustments((prev) => ({
      ...prev,
      [sliderId]: clampSlider(sliderId, value),
    }))
  }

  function resetPractice() {
    setAdjustments(neutralAdjustments())
    setActiveSlider(null)
    setGhostEpoch(0)
  }

  return (
    <main className="min-h-full bg-maroon-deep px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-sans text-xs tracking-wide text-gold/80">
              辨析关 · {lesson.order}
            </p>
            <h1 className="font-display text-3xl font-bold text-cream text-shadow-paper">
              {lesson.title}
            </h1>
            <p className="mt-2 max-w-2xl font-serif-sc text-sm leading-relaxed text-paper-dim">
              {lesson.compareLine}
            </p>
          </div>
          <div className="flex gap-4 font-serif-sc text-gold">
            <Link to="/learn" className="underline-offset-4 hover:underline">
              课程目录
            </Link>
            <Link to="/" className="underline-offset-4 hover:underline">
              首页
            </Link>
          </div>
        </div>

        {phase === 'intro' && (
          <section className="mb-6 max-w-2xl rounded-lg border border-paper-dim/30 bg-film/40 px-5 py-5">
            <p className="font-serif-sc text-cream">{lesson.compareLine}</p>
            <p className="mt-3 font-sans text-sm text-paper-dim">
              {lesson.practiceHint}
            </p>
            <button
              type="button"
              onClick={() => {
                resetPractice()
                setPhase('explore')
              }}
              className="mt-5 rounded-sm bg-gold px-5 py-2.5 font-serif-sc text-ink"
            >
              开始拖滑块感受区别
            </button>
          </section>
        )}

        {/* Keep canvas mounted from first paint so Pixi can init (hidden on intro). */}
        <div className={phase === 'intro' ? 'hidden' : undefined}>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex flex-col gap-4">
              <div
                ref={containerRef}
                className="h-[42vh] w-full overflow-hidden rounded-lg bg-film lg:h-[54vh]"
              />

              {phase === 'explore' && (
                <>
                  <HistogramPanel
                    imageUrl={lesson.imageSrc}
                    activeSlider={activeSlider}
                    ghostEpoch={ghostEpoch}
                    adjustments={adjustments}
                  />
                  <BeforeAfterFlash
                    onShowOriginal={showOriginal}
                    onShowGraded={showGraded}
                  />
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={resetPractice}
                      className="rounded border border-paper-dim px-4 py-2 font-sans text-sm text-paper hover:bg-maroon"
                    >
                      重置滑块
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhase('quiz')}
                      className="rounded-sm bg-paper px-4 py-2 font-serif-sc text-sm text-maroon hover:bg-cream"
                    >
                      去做辨认题 →
                    </button>
                  </div>
                </>
              )}

              {phase === 'quiz' && (
                <LessonQuizPanel
                  imageSrc={lesson.imageSrc}
                  quiz={lesson.quiz}
                  onComplete={() => {
                    markLessonComplete(lesson.id)
                    setPhase('done')
                  }}
                />
              )}

              {phase === 'done' && (
                <section className="rounded-lg border border-gold/40 bg-film/50 px-5 py-5">
                  <h2 className="font-display text-xl text-cream">本关完成</h2>
                  <p className="mt-2 font-serif-sc text-sm text-paper-dim">
                    {lesson.compareLine}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      to={nextHref}
                      className="rounded-sm bg-gold px-5 py-2 font-serif-sc text-ink"
                    >
                      {lesson.nextId ? '下一关' : '回课程目录'}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        resetPractice()
                        setPhase('explore')
                      }}
                      className="rounded border border-paper-dim px-4 py-2 font-sans text-sm text-paper hover:bg-maroon"
                    >
                      再练一遍
                    </button>
                  </div>
                </section>
              )}
            </div>

            {phase === 'explore' && (
              <SliderPanel
                adjustments={adjustments}
                allowedSliders={lesson.allowedSliders}
                onDragStart={(sliderId) => {
                  setActiveSlider(sliderId)
                  setGhostEpoch((n) => n + 1)
                }}
                onChange={(sliderId, value) => {
                  setActiveSlider(sliderId)
                  setAdjustment(sliderId, value)
                }}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
