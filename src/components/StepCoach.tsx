import type { GradingStep } from '@/ai/types'
import { SLIDER_MAP } from '@/engine/sliders'
import { isInTargetRange } from '@/lib/targetRange'

interface StepCoachProps {
  steps: GradingStep[]
  currentIndex: number
  /** Current value of the active step's slider. */
  currentValue: number
  onStepChange: (index: number) => void
}

/**
 * Hands-on lesson card: which slider, which direction, why, and whether
 * the learner has dragged into the target band.
 */
export function StepCoach({
  steps,
  currentIndex,
  currentValue,
  onStepChange,
}: StepCoachProps) {
  if (steps.length === 0) return null

  const safeIndex = Math.max(0, Math.min(currentIndex, steps.length - 1))
  const step = steps[safeIndex]
  const label = SLIDER_MAP[step.slider]?.label ?? step.slider
  const achieved = isInTargetRange(currentValue, step.targetRange)
  const isLast = safeIndex >= steps.length - 1
  const isFirst = safeIndex <= 0
  const directionText = step.direction === 'increase' ? '向右拖' : '向左拖'
  const allDone = isLast && achieved

  return (
    <section
      className={[
        'rounded-lg border px-5 py-4 transition-colors',
        achieved
          ? 'border-maroon/40 bg-paper paper-texture'
          : 'border-gold/40 bg-paper/95 paper-texture',
      ].join(' ')}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-serif-sc text-xs font-semibold tracking-wide text-maroon">
          第 {safeIndex + 1} / {steps.length} 步
        </p>
        {achieved ? (
          <p className="font-serif-sc text-sm font-semibold text-maroon">
            ✓ 已达成目标区间
          </p>
        ) : (
          <p className="font-sans text-xs text-ink/50">
            把滑块拖进金色高亮区间
          </p>
        )}
      </div>

      <h2 className="mt-2 font-display text-2xl leading-snug text-ink">
        {label}
        <span className="ml-2 font-serif-sc text-base font-normal text-maroon">
          {directionText}
        </span>
      </h2>

      <p className="mt-2 font-sans text-sm leading-relaxed text-ink/80">
        {step.reason}
      </p>

      <p className="mt-2 font-sans text-xs tabular-nums text-ink/45">
        目标区间 [{step.targetRange.min}, {step.targetRange.max}] · 当前{' '}
        {currentValue}
      </p>

      {allDone && (
        <p className="mt-3 rounded-sm bg-maroon/10 px-3 py-2 font-serif-sc text-sm text-maroon">
          全部步骤完成！可以继续微调，或重置后重练一遍。
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isFirst}
          onClick={() => onStepChange(safeIndex - 1)}
          className="rounded-sm border border-ink/20 px-3 py-1.5 font-serif-sc text-sm text-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-35"
        >
          上一步
        </button>

        {!isLast && (
          <button
            type="button"
            disabled={!achieved}
            onClick={() => onStepChange(safeIndex + 1)}
            className="rounded-sm bg-maroon px-4 py-1.5 font-serif-sc text-sm text-cream hover:bg-maroon-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            下一步
          </button>
        )}

        {!achieved && !isLast && (
          <button
            type="button"
            onClick={() => onStepChange(safeIndex + 1)}
            className="ml-auto font-sans text-xs text-ink/40 underline-offset-2 hover:text-ink/70 hover:underline"
          >
            跳过此步
          </button>
        )}
      </div>
    </section>
  )
}
