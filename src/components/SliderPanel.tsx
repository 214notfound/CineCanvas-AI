import { sliderHelpMap } from '@/data/sliderHelp'
import { SLIDERS, type SliderId } from '@/engine/sliders'
import { isInTargetRange, type TargetRange } from '@/lib/targetRange'
import { Slider } from './Slider'

// Re-export for consumers that import TargetRange from SliderPanel.
export type { TargetRange } from '@/lib/targetRange'

interface SliderPanelProps {
  adjustments: Record<SliderId, number>
  onChange: (id: SliderId, value: number) => void
  /** Slider id for the active coaching step (gets target band + emphasis). */
  activeSliderId?: SliderId | null
  /** Target band for the active step. */
  activeTargetRange?: TargetRange | null
  /**
   * When true, non-active sliders are disabled so the learner focuses on one control.
   * Free-practice mode (no lesson) leaves all enabled.
   */
  lockOthers?: boolean
}

export function SliderPanel({
  adjustments,
  onChange,
  activeSliderId = null,
  activeTargetRange = null,
  lockOthers = false,
}: SliderPanelProps) {
  const light = SLIDERS.filter((s) => s.group === 'light')
  const color = SLIDERS.filter((s) => s.group === 'color')

  function renderGroup(title: string, defs: typeof SLIDERS) {
    return (
      <div>
        <h3 className="mb-2 font-serif-sc text-xs font-semibold tracking-wide text-maroon/70">
          {title}
        </h3>
        <div className="flex flex-col gap-1">
          {defs.map((s) => {
            const isActive = activeSliderId === s.id
            const target = isActive ? activeTargetRange : null
            const value = adjustments[s.id]
            const achieved =
              isActive && target != null ? isInTargetRange(value, target) : false
            const disabled = lockOthers && activeSliderId != null && !isActive

            return (
              <Slider
                key={s.id}
                label={s.label}
                labelEn={s.labelEn}
                min={s.min}
                max={s.max}
                step={s.step}
                value={value}
                onChange={(v) => onChange(s.id, v)}
                helpContent={sliderHelpMap[s.id]}
                targetRange={target ?? undefined}
                emphasized={isActive}
                achieved={achieved}
                disabled={disabled}
              />
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <aside className="flex flex-col gap-5 rounded-lg bg-paper/95 p-4 paper-texture">
      {renderGroup('光线', light)}
      {renderGroup('色彩', color)}
    </aside>
  )
}
