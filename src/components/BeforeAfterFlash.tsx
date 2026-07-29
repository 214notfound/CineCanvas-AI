import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

interface BeforeAfterFlashProps {
  onShowOriginal: () => void
  onShowGraded: () => void
  disabled?: boolean
}

/**
 * Lightroom-style before/after flash control.
 * - Press & hold → momentary original
 * - Short click → latch original until clicked again
 */
export function BeforeAfterFlash({
  onShowOriginal,
  onShowGraded,
  disabled = false,
}: BeforeAfterFlashProps) {
  const [showingOriginal, setShowingOriginal] = useState(false)
  const [latched, setLatched] = useState(false)
  const holdingRef = useRef(false)
  const latchedRef = useRef(false)
  const pointerDownAtRef = useRef(0)
  // Short press → treat as click-toggle; longer → hold-release.
  const CLICK_MS = 220

  const goOriginal = useCallback(() => {
    setShowingOriginal(true)
    onShowOriginal()
  }, [onShowOriginal])

  const goGraded = useCallback(() => {
    setShowingOriginal(false)
    setLatched(false)
    latchedRef.current = false
    onShowGraded()
  }, [onShowGraded])

  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    pointerDownAtRef.current = performance.now()
    holdingRef.current = true
    goOriginal()
  }

  const handlePointerUp = () => {
    if (disabled || !holdingRef.current) return
    holdingRef.current = false
    const elapsed = performance.now() - pointerDownAtRef.current

    if (elapsed < CLICK_MS) {
      // Short press = toggle latch
      if (latchedRef.current) {
        goGraded()
      } else {
        latchedRef.current = true
        setLatched(true)
        setShowingOriginal(true)
        onShowOriginal()
      }
      return
    }

    // Long hold released → back to graded unless latched
    if (!latchedRef.current) {
      goGraded()
    }
  }

  const handlePointerCancel = () => {
    if (!holdingRef.current) return
    holdingRef.current = false
    if (!latchedRef.current) goGraded()
  }

  // If disabled mid-hold, restore graded.
  useEffect(() => {
    if (disabled && showingOriginal) {
      holdingRef.current = false
      goGraded()
    }
  }, [disabled, showingOriginal, goGraded])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
        className={[
          'select-none rounded border px-4 py-2 font-serif-sc text-sm transition-colors',
          'touch-none disabled:cursor-not-allowed disabled:opacity-40',
          showingOriginal
            ? 'border-gold bg-gold/20 text-gold'
            : 'border-paper-dim text-paper hover:bg-maroon',
        ].join(' ')}
        aria-pressed={showingOriginal}
        title="按住查看原图；短按锁定/解锁原图"
      >
        {showingOriginal ? '原图' : '对比原图'}
      </button>
      <p className="font-sans text-xs text-paper-dim">
        {latched
          ? '已锁定原图 · 再点一次恢复调后'
          : '按住查看原图 · 短按锁定'}
      </p>
    </div>
  )
}
