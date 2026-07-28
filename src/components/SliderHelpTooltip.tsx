import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { SliderHelpContent } from '@/data/sliderHelp'

/** Parse inline **bold** markup into <strong>, leaving the rest as plain text. */
function renderRich(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((part) => part.length > 0)
    .map((part, i) => {
      const m = /^\*\*([^*]+)\*\*$/.exec(part)
      return m ? (
        <strong key={i} className="font-semibold text-ink">
          {m[1]}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    })
}

type Placement = 'below' | 'above'

const GAP_PX = 8
/** Keep a little margin from the viewport edge (taskbar / browser chrome). */
const VIEWPORT_PAD_PX = 8

/**
 * Prefer below; flip above when the tooltip would overflow the visual viewport.
 * Uses whichever side has more room if neither fully fits.
 */
function resolvePlacement(
  trigger: DOMRect,
  tipHeight: number,
): Placement {
  const vh = window.visualViewport?.height ?? window.innerHeight
  const spaceBelow = vh - trigger.bottom - VIEWPORT_PAD_PX
  const spaceAbove = trigger.top - VIEWPORT_PAD_PX
  const need = tipHeight + GAP_PX

  if (need <= spaceBelow) return 'below'
  if (need <= spaceAbove) return 'above'
  return spaceAbove > spaceBelow ? 'above' : 'below'
}

interface SliderHelpTooltipProps {
  /** Slider label, used for the icon's accessible name. */
  label: string
  content: SliderHelpContent
}

/**
 * Small "?" icon that reveals a structured help popover.
 * - Desktop: opens on hover, closes ~150ms after the pointer leaves.
 * - Touch: toggles on tap; tapping elsewhere closes it.
 * - Placement: default below the trigger; flips above when viewport space is tight.
 */
export function SliderHelpTooltip({ label, content }: SliderHelpTooltipProps) {
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<Placement>('below')
  const closeTimer = useRef<number | null>(null)
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const tooltipId = useId()

  const clearClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }
  const scheduleClose = () => {
    clearClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), 150)
  }

  useEffect(() => clearClose, [])

  // Close on tap/click outside (primarily for touch devices).
  useEffect(() => {
    if (!open) return
    const onDocPointerDown = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDocPointerDown)
    return () => document.removeEventListener('pointerdown', onDocPointerDown)
  }, [open])

  // Recompute placement before paint whenever the tooltip is open.
  useLayoutEffect(() => {
    if (!open) {
      setPlacement('below')
      return
    }

    const update = () => {
      const triggerEl = wrapperRef.current
      const tipEl = tooltipRef.current
      if (!triggerEl || !tipEl) return
      setPlacement(
        resolvePlacement(triggerEl.getBoundingClientRect(), tipEl.offsetHeight),
      )
    }

    update()

    window.addEventListener('resize', update)
    // Capture scroll from nested overflow containers too.
    window.addEventListener('scroll', update, true)
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)

    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
    }
  }, [open, content])

  const below = placement === 'below'

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={() => {
        clearClose()
        setOpen(true)
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-label={`${label}说明`}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-ink/30 text-[10px] font-semibold leading-none text-ink/45 transition-colors hover:border-ink/50 hover:text-ink/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-maroon/40"
      >
        ?
      </button>

      {open && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          onMouseEnter={clearClose}
          onMouseLeave={scheduleClose}
          className={[
            'absolute right-0 z-50 w-64 rounded-lg border border-ink/10 bg-paper p-3 text-left shadow-xl',
            below ? 'top-full mt-2' : 'bottom-full mb-2',
          ].join(' ')}
        >
          <span
            className={[
              'absolute right-1.5 h-3 w-3 rotate-45 border-ink/10 bg-paper',
              below
                ? '-top-1.5 border-l border-t'
                : '-bottom-1.5 border-r border-b',
            ].join(' ')}
          />

          <div className="relative space-y-2">
            <p className="text-[13px] leading-relaxed text-ink">
              {renderRich(content.definition)}
            </p>

            <div>
              <div className="mb-0.5 text-[11px] font-semibold tracking-wide text-maroon">
                什么时候用
              </div>
              <p className="text-[12px] leading-relaxed text-ink/80">
                {renderRich(content.useCase)}
              </p>
            </div>

            {content.comparison && (
              <div className="rounded bg-maroon/5 p-2">
                <p className="text-[12px] leading-relaxed text-ink/80">
                  {renderRich(content.comparison)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  )
}
