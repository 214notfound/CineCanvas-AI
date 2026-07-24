import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
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

interface SliderHelpTooltipProps {
  /** Slider label, used for the icon's accessible name. */
  label: string
  content: SliderHelpContent
}

/**
 * Small "?" icon that reveals a structured help popover.
 * - Desktop: opens on hover, closes ~150ms after the pointer leaves.
 * - Touch: toggles on tap; tapping elsewhere closes it.
 * The icon uses type="button" + stopPropagation so it never affects the slider.
 */
export function SliderHelpTooltip({ label, content }: SliderHelpTooltipProps) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<number | null>(null)
  const wrapperRef = useRef<HTMLSpanElement>(null)
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
          id={tooltipId}
          role="tooltip"
          onMouseEnter={clearClose}
          onMouseLeave={scheduleClose}
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-ink/10 bg-paper p-3 text-left shadow-xl"
        >
          <span className="absolute -top-1.5 right-1.5 h-3 w-3 rotate-45 border-l border-t border-ink/10 bg-paper" />

          <div className="relative space-y-2">
            {/* 1. Definition */}
            <p className="text-[13px] leading-relaxed text-ink">
              {renderRich(content.definition)}
            </p>

            {/* 2. When to use */}
            <div>
              <div className="mb-0.5 text-[11px] font-semibold tracking-wide text-maroon">
                什么时候用
              </div>
              <p className="text-[12px] leading-relaxed text-ink/80">
                {renderRich(content.useCase)}
              </p>
            </div>

            {/* 3. Comparison with the easiest-to-confuse neighbor (optional) */}
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
