import { create } from 'zustand'
import {
  type Adjustments,
  type SliderId,
  clampSlider,
  neutralAdjustments,
} from '@/engine/sliders'

interface GradingState {
  /** Current value of every slider (-100..100), keyed by slider id. */
  adjustments: Adjustments
  /** Set one slider, clamped to its legal domain. */
  setAdjustment: (id: SliderId, value: number) => void
  /** Replace all adjustments at once (e.g. when applying a preset). */
  setAll: (values: Adjustments) => void
  /** Reset every slider back to neutral (0). */
  reset: () => void
}

export const useGradingStore = create<GradingState>((set) => ({
  adjustments: neutralAdjustments(),
  setAdjustment: (id, value) =>
    set((state) => ({
      adjustments: { ...state.adjustments, [id]: clampSlider(id, value) },
    })),
  setAll: (values) => set({ adjustments: { ...values } }),
  reset: () => set({ adjustments: neutralAdjustments() }),
}))
