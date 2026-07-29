import type { Adjustments, SliderId } from '@/engine/sliders'
import { neutralAdjustments } from '@/engine/sliders'

/** One rendered choice in an A/B(/C) quiz, from a hidden recipe. */
export interface LessonQuizOption {
  id: string
  /** Partial adjustments merged onto neutral (the "answer recipe"). */
  recipe: Partial<Adjustments>
  /** Revealed after the learner answers (or on complete). */
  revealLabel: string
}

export interface LessonQuizQuestion {
  id: string
  prompt: string
  correctOptionId: string
}

export interface LessonQuiz {
  intro: string
  options: LessonQuizOption[]
  questions: LessonQuizQuestion[]
}

export interface LessonDef {
  id: string
  order: number
  title: string
  /** Short card blurb on the /learn index. */
  blurb: string
  /** One sentence: where the params look alike vs differ. */
  compareLine: string
  /** Diagnostic illustration under public/. */
  imageSrc: string
  /** Only these sliders are interactive in the explore phase. */
  allowedSliders: SliderId[]
  practiceHint: string
  quiz: LessonQuiz
  nextId: string | null
}

export function mergeRecipe(partial: Partial<Adjustments>): Adjustments {
  return { ...neutralAdjustments(), ...partial }
}
