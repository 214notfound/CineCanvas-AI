import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getDefaultProviderId } from '@/ai/config'
import type { AnalyzeResult } from '@/ai/types'
import type { ProcessedImage } from '@/lib/downsample'

export type AnalysisStatus = 'idle' | 'analyzing' | 'ready' | 'error'

interface SessionState {
  /** Current uploaded + preprocessed image, or null before upload. */
  image: ProcessedImage | null
  /** Latest AI result (structured report or plain-text fallback). */
  analysis: AnalyzeResult | null
  analysisStatus: AnalysisStatus
  analysisError: string | null
  /** Which provider produced / will produce the analysis (for A/B compare). */
  providerId: string
  /** 0-based index into AnalysisReport.steps (driven by StepCoach). */
  currentStepIndex: number

  setImage: (image: ProcessedImage | null) => void
  clearImage: () => void
  setProviderId: (id: string) => void
  setAnalysis: (analysis: AnalyzeResult) => void
  setAnalyzing: () => void
  setAnalysisError: (message: string) => void
  clearAnalysis: () => void
  setCurrentStepIndex: (index: number) => void
}

/** Fields safe to put in localStorage (no blob: image URLs). */
type SessionPersisted = Pick<
  SessionState,
  | 'analysis'
  | 'analysisStatus'
  | 'analysisError'
  | 'providerId'
  | 'currentStepIndex'
>

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      image: null,
      analysis: null,
      analysisStatus: 'idle',
      analysisError: null,
      providerId: getDefaultProviderId(),
      currentStepIndex: 0,

      setImage: (image) => {
        const prev = get().image
        if (prev && prev.preview.url !== image?.preview.url) {
          URL.revokeObjectURL(prev.preview.url)
        }
        // Replacing an existing photo starts a new lesson. Attaching the first
        // image after a refresh (prev === null) keeps persisted analysis.
        if (prev != null) {
          set({
            image,
            analysis: null,
            analysisStatus: 'idle',
            analysisError: null,
            currentStepIndex: 0,
          })
        } else {
          set({ image })
        }
      },

      clearImage: () => {
        const prev = get().image
        if (prev) URL.revokeObjectURL(prev.preview.url)
        set({
          image: null,
          analysis: null,
          analysisStatus: 'idle',
          analysisError: null,
          currentStepIndex: 0,
        })
      },

      setProviderId: (id) =>
        set({
          providerId: id,
          analysis: null,
          analysisStatus: 'idle',
          analysisError: null,
          currentStepIndex: 0,
        }),

      setAnalyzing: () =>
        set({
          analysisStatus: 'analyzing',
          analysisError: null,
          analysis: null,
          currentStepIndex: 0,
        }),

      setAnalysis: (analysis) =>
        set({
          analysis,
          analysisStatus: 'ready',
          analysisError: null,
          currentStepIndex: 0,
        }),

      setAnalysisError: (message) =>
        set({
          analysisStatus: 'error',
          analysisError: message,
          analysis: null,
        }),

      clearAnalysis: () =>
        set({
          analysis: null,
          analysisStatus: 'idle',
          analysisError: null,
          currentStepIndex: 0,
        }),

      setCurrentStepIndex: (index) => set({ currentStepIndex: index }),
    }),
    {
      name: 'cinecanvas-session',
      partialize: (state): SessionPersisted => ({
        analysis: state.analysis,
        // Never persist mid-flight analyzing — refresh would leave a stuck UI.
        analysisStatus:
          state.analysisStatus === 'analyzing' ? 'idle' : state.analysisStatus,
        analysisError: state.analysisError,
        providerId: state.providerId,
        currentStepIndex: state.currentStepIndex,
      }),
    },
  ),
)
