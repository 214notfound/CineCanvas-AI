import type { Adjustments, SliderId } from '@/engine/sliders'

/** One grading step in a hands-on lesson plan. */
export interface GradingStep {
  /** Which of the 10 MVP sliders to adjust. */
  slider: SliderId
  /** Suggested direction for the beginner. */
  direction: 'increase' | 'decrease'
  /** Inclusive target range the learner should drag into. */
  targetRange: { min: number; max: number }
  /** Beginner-friendly reason for this step. */
  reason: string
  /** 1-based teaching order. */
  order: number
}

/** Structured photo analysis + lesson plan returned by the AI. */
export interface AnalysisReport {
  /** One-sentence blunt diagnosis. */
  oneLineDiagnosis: string
  /** 1–2 strengths (affirm first). */
  strengths: string[]
  /** Concrete issues with optional location hints. */
  issues: Array<{ title: string; locationHint?: string }>
  /** Overall grading direction in one sentence. */
  direction: string
  /** Ordered hands-on steps. */
  steps: GradingStep[]
}

/** Fallback when structured output fails after retries. */
export interface FallbackAdvice {
  kind: 'fallback'
  text: string
}

export type AnalyzeResult = AnalysisReport | FallbackAdvice

export function isFallbackAdvice(r: AnalyzeResult): r is FallbackAdvice {
  return (r as FallbackAdvice).kind === 'fallback'
}

/** Input for free-form photo analysis (feature 1). */
export interface AnalyzePhotoInput {
  /** JPEG/PNG data URL (already downsampled for AI). */
  imageDataUrl: string
}

/** Input for film-style lesson generation (feature 2). */
export interface GenerateFilmStepsInput {
  imageDataUrl: string
  filmId: string
  filmName: string
  /** Quantized target adjustments from films.ts (same units as sliders). */
  targetAdjustments: Adjustments
}

/**
 * Pluggable vision-model backend.
 * Structured parsing / validation / retry live in withValidation.
 */
export interface AiProvider {
  readonly id: string
  readonly displayName: string
  /** Analyze a photo and return a structured lesson plan as JSON text. */
  analyzePhoto(input: AnalyzePhotoInput): Promise<string>
  /** Generate a "move toward this film look" lesson as JSON text. */
  generateFilmSteps(input: GenerateFilmStepsInput): Promise<string>
  /** Ask the model to fix invalid JSON given previous output + validation errors. */
  repairStructuredOutput(input: {
    previousRaw: string
    validationErrors: string
  }): Promise<string>
  /** Plain-text advice when structured output keeps failing. */
  plainAdvice(input: { imageDataUrl: string }): Promise<string>
}
