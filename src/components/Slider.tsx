import type { SliderHelpContent } from '@/data/sliderHelp'
import { SliderHelpTooltip } from './SliderHelpTooltip'

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
}: SliderProps) {
  return (
    <div className="block">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-serif-sc text-sm font-semibold text-ink">
          <span>
            {label}
            {labelEn && (
              <span className="ml-1 text-xs font-normal text-ink/50">{labelEn}</span>
            )}
          </span>
          {helpContent && <SliderHelpTooltip label={label} content={helpContent} />}
        </span>
        <span className="font-sans text-xs tabular-nums text-ink/70">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-maroon"
      />
    </div>
  )
}
