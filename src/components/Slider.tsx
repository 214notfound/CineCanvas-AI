import type { SliderHelpContent } from '@/data/sliderHelp'
import { valueToPercent, type TargetRange } from '@/lib/targetRange'
import { SliderHelpTooltip } from './SliderHelpTooltip'

export type { TargetRange }

interface SliderProps {
  label: string
  labelEn?: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
  /** Optional structured help copy; when present a "?" tooltip is shown. */
  helpContent?: SliderHelpContent
  /** Coaching target band drawn on the track (current step only). */
  targetRange?: TargetRange
  /** Stronger visual weight when this is the active coaching slider. */
  emphasized?: boolean
  /** Value currently sits inside targetRange. */
  achieved?: boolean
  disabled?: boolean
}

export function Slider({
  label,
  labelEn,
  min,
  max,
  step,
  value,
  onChange,
  helpContent,
  targetRange,
  emphasized = false,
  achieved = false,
  disabled = false,
}: SliderProps) {
  const rangeLeft = targetRange
    ? valueToPercent(targetRange.min, min, max)
    : null
  const rangeWidth = targetRange
    ? valueToPercent(targetRange.max, min, max) - (rangeLeft ?? 0)
    : null

  return (
    <div
      className={[
        'rounded-sm px-1 py-1 transition-colors',
        emphasized ? 'bg-maroon/8 ring-1 ring-maroon/25' : '',
        disabled ? 'opacity-45' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-serif-sc text-sm font-semibold text-ink">
          <span>
            {label}
            {labelEn && (
              <span className="ml-1 text-xs font-normal text-ink/50">{labelEn}</span>
            )}
          </span>
          {helpContent && <SliderHelpTooltip label={label} content={helpContent} />}
          {emphasized && (
            <span
              className={[
                'rounded-sm px-1.5 py-0.5 font-sans text-[10px] font-semibold tracking-wide',
                achieved
                  ? 'bg-maroon text-cream'
                  : 'bg-gold/90 text-ink',
              ].join(' ')}
            >
              {achieved ? '已达成' : '本步'}
            </span>
          )}
        </span>
        <span className="font-sans text-xs tabular-nums text-ink/70">{value}</span>
      </div>

      <div className="relative h-6">
        {/* Track */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink/12" />

        {/* Target band */}
        {rangeLeft != null && rangeWidth != null && (
          <div
            className={[
              'pointer-events-none absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full transition-colors',
              achieved ? 'bg-maroon/55' : 'bg-gold/70',
            ].join(' ')}
            style={{ left: `${rangeLeft}%`, width: `${Math.max(rangeWidth, 1)}%` }}
            aria-hidden
          />
        )}

        {/* Zero tick */}
        {min < 0 && max > 0 && (
          <div
            className="pointer-events-none absolute top-1/2 h-3 w-px -translate-y-1/2 bg-ink/25"
            style={{ left: `${valueToPercent(0, min, max)}%` }}
            aria-hidden
          />
        )}

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="grading-slider absolute inset-0 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed"
        />
      </div>

      {targetRange && (
        <p className="mt-0.5 font-sans text-[10px] tabular-nums text-ink/45">
          目标 {targetRange.min} ~ {targetRange.max}
        </p>
      )}
    </div>
  )
}
