import { Link } from 'react-router-dom'
import { isFallbackAdvice, type AnalyzeResult } from '@/ai/types'
import { SLIDER_MAP } from '@/engine/sliders'
import { useGradingStore } from '@/store/useGradingStore'

interface AnalysisReportCardProps {
  result: AnalyzeResult
  /** Show the CTA that jumps into the grading workspace. */
  showStartGrading?: boolean
}

/**
 * Renders the AI analysis: structured report card, or plain-text fallback.
 * Hands-on step coaching continues on /workspace (StepCoach).
 */
export function AnalysisReportCard({
  result,
  showStartGrading = true,
}: AnalysisReportCardProps) {
  const resetGrading = useGradingStore((s) => s.reset)

  if (isFallbackAdvice(result)) {
    return (
      <section className="rounded-lg bg-paper p-5 text-ink shadow-lg">
        <p className="font-serif-sc text-xs font-semibold tracking-wide text-maroon">
          分析降级
        </p>
        <h2 className="mt-1 font-display text-2xl text-ink">暂时给不出分步教案</h2>
        <p className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink/80">
          {result.text}
        </p>
        {showStartGrading && (
          <Link
            to="/workspace"
            onClick={() => resetGrading()}
            className="mt-5 inline-block rounded-sm bg-maroon px-5 py-2.5 font-serif-sc text-sm text-cream hover:bg-maroon-deep"
          >
            仍可进入工作台自由练习 →
          </Link>
        )}
      </section>
    )
  }

  return (
    <section className="rounded-lg bg-paper p-5 text-ink shadow-lg">
      <p className="font-serif-sc text-xs font-semibold tracking-wide text-maroon">
        AI 诊断
      </p>
      <h2 className="mt-1 font-display text-2xl leading-snug text-ink">
        {result.oneLineDiagnosis}
      </h2>

      <div className="mt-5 space-y-4">
        <div>
          <h3 className="font-serif-sc text-sm font-semibold text-maroon">优点</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 font-sans text-sm text-ink/80">
            {result.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-serif-sc text-sm font-semibold text-maroon">问题</h3>
          <ul className="mt-1 space-y-2">
            {result.issues.map((issue) => (
              <li
                key={issue.title}
                className="rounded bg-maroon/5 px-3 py-2 font-sans text-sm text-ink/85"
              >
                <span className="font-semibold text-ink">{issue.title}</span>
                {issue.locationHint && (
                  <span className="mt-0.5 block text-xs text-ink/55">
                    位置：{issue.locationHint}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-serif-sc text-sm font-semibold text-maroon">调色方向</h3>
          <p className="mt-1 font-sans text-sm leading-relaxed text-ink/80">
            {result.direction}
          </p>
        </div>

        <div>
          <h3 className="font-serif-sc text-sm font-semibold text-maroon">
            分步教案预览（共 {result.steps.length} 步）
          </h3>
          <ol className="mt-2 space-y-1.5">
            {result.steps.map((step) => {
              const label = SLIDER_MAP[step.slider]?.label ?? step.slider
              return (
                <li
                  key={`${step.order}-${step.slider}`}
                  className="flex items-baseline gap-2 font-sans text-sm text-ink/80"
                >
                  <span className="w-5 shrink-0 tabular-nums text-ink/40">
                    {step.order}.
                  </span>
                  <span>
                    <span className="font-semibold text-ink">{label}</span>
                    <span className="text-ink/50">
                      {' '}
                      {step.direction === 'increase' ? '向右' : '向左'}
                      {` [${step.targetRange.min}, ${step.targetRange.max}]`}
                    </span>
                  </span>
                </li>
              )
            })}
          </ol>
          <p className="mt-2 font-sans text-xs text-ink/50">
            进入工作台后，会一步一步带着你把滑块拖进目标区间。
          </p>
        </div>
      </div>

      {showStartGrading && (
        <Link
          to="/workspace"
          onClick={() => resetGrading()}
          className="mt-6 inline-block rounded-sm bg-maroon px-6 py-3 font-serif-sc text-base text-cream transition-colors hover:bg-maroon-deep"
        >
          开始动手调色 →
        </Link>
      )}
    </section>
  )
}
