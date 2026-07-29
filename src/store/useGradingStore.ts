import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  cloneCurve,
  IDENTITY_CURVE,
  type CurvePoint,
} from '@/engine/curve'
import {
  type Adjustments,
  type SliderId,
  clampSlider,
  neutralAdjustments,
} from '@/engine/sliders'

interface GradingState {
  /** Current value of every slider (-100..100), keyed by slider id. */
  adjustments: Adjustments
  /** Luminance curve control points (identity = no-op). */
  lumaCurve: CurvePoint[]
  /** Set one slider, clamped to its legal domain. */
  setAdjustment: (id: SliderId, value: number) => void
  /** Replace all adjustments at once (e.g. when applying a preset). */
  setAll: (values: Adjustments) => void
  /** Replace luminance curve points. */
  setLumaCurve: (points: CurvePoint[]) => void
  /** Reset every slider back to neutral (0) and curve to identity. */
  reset: () => void
}

export const useGradingStore = create<GradingState>()(
  persist(
    (set) => ({
      adjustments: neutralAdjustments(),
      lumaCurve: cloneCurve(IDENTITY_CURVE),
      setAdjustment: (id, value) =>
        set((state) => ({
          adjustments: { ...state.adjustments, [id]: clampSlider(id, value) },
        })),
      setAll: (values) => set({ adjustments: { ...values } }),
      setLumaCurve: (points) => set({ lumaCurve: cloneCurve(points) }),
      reset: () =>
        set({
          adjustments: neutralAdjustments(),
          lumaCurve: cloneCurve(IDENTITY_CURVE),
        }),
    }),
    {
      name: 'cinecanvas-grading',
      partialize: (state) => ({
        adjustments: state.adjustments,
        lumaCurve: state.lumaCurve,
      }),
    },
  ),
)
