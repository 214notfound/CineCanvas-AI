import { Link } from 'react-router-dom'
import { isFallbackAdvice } from '@/ai/types'
import { SliderPanel } from '@/components/SliderPanel'
import { StepCoach } from '@/components/StepCoach'
import { useGradingCanvas } from '@/engine/useGradingCanvas'
import { useGradingStore } from '@/store/useGradingStore'
import { useSessionStore } from '@/store/useSessionStore'

/**
 * Hands-on grading workspace:
 * left WebGL preview · StepCoach lesson card · right sliders with target band.
 */
export default function WorkspacePage() {
  const adjustments = useGradingStore((s) => s.adjustments)
  const setAdjustment = useGradingStore((s) => s.setAdjustment)
  const reset = useGradingStore((s) => s.reset)

  const image = useSessionStore((s) => s.image)
  const analysis = useSessionStore((s) => s.analysis)
  const currentStepIndex = useSessionStore((s) => s.currentStepIndex)
  const setCurrentStepIndex = useSessionStore((s) => s.setCurrentStepIndex)

  const { containerRef } = useGradingCanvas(image?.preview.url ?? null)

  const lesson =
    analysis && !isFallbackAdvice(analysis) ? analysis : null
  const steps = lesson?.steps ?? []
  const activeStep =
    steps.length > 0
      ? steps[Math.max(0, Math.min(currentStepIndex, steps.length - 1))]
      : null
  const activeValue = activeStep ? adjustments[activeStep.slider] : 0

  return (
    <main className="min-h-full bg-maroon-deep px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-cream text-shadow-paper">
              工作台
            </h1>
            {lesson && (
              <p className="mt-1 max-w-xl font-serif-sc text-sm text-paper-dim">
                {lesson.oneLineDiagnosis}
              </p>
            )}
          </div>
          <div className="flex gap-4 font-serif-sc text-gold">
            <Link to="/analyze" className="underline-offset-4 hover:underline">
              ← 分析页
            </Link>
            <Link to="/" className="underline-offset-4 hover:underline">
              首页
            </Link>
          </div>
        </div>

        {!image && (
          <div className="mb-6 rounded-lg border border-dashed border-paper-dim/50 bg-film/40 px-5 py-4">
            <p className="font-serif-sc text-cream">还没有照片</p>
            <p className="mt-1 font-sans text-sm text-paper-dim">
              请先去分析页上传并完成 AI 分析，再回来动手调色。
            </p>
            <Link
              to="/analyze"
              className="mt-3 inline-block rounded-sm bg-paper px-4 py-2 font-serif-sc text-sm text-maroon hover:bg-cream"
            >
              去分析照片 →
            </Link>
          </div>
        )}

        {image && analysis && isFallbackAdvice(analysis) && (
          <div className="mb-5 rounded-lg border border-dashed border-gold/30 bg-film/40 px-5 py-3">
            <p className="font-serif-sc text-sm text-cream">
              本次没有分步教案，可自由拖滑块练习。
            </p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-4">
            <div
              ref={containerRef}
              className="h-[50vh] w-full overflow-hidden rounded-lg bg-film lg:h-[62vh]"
            />

            {activeStep && (
              <StepCoach
                steps={steps}
                currentIndex={currentStepIndex}
                currentValue={activeValue}
                onStepChange={setCurrentStepIndex}
              />
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={reset}
                disabled={!image}
                className="rounded border border-paper-dim px-4 py-2 font-sans text-sm text-paper hover:bg-maroon disabled:opacity-40"
              >
                重置全部滑块
              </button>
              {steps.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    reset()
                    setCurrentStepIndex(0)
                  }}
                  className="font-sans text-xs text-paper-dim underline-offset-2 hover:text-cream hover:underline"
                >
                  重置并从头练习
                </button>
              )}
            </div>
          </div>

          <SliderPanel
            adjustments={adjustments}
            onChange={setAdjustment}
            activeSliderId={activeStep?.slider ?? null}
            activeTargetRange={activeStep?.targetRange ?? null}
          />
        </div>
      </div>
    </main>
  )
}
