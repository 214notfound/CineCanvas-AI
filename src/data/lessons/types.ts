import type { SliderId } from '@/engine/sliders'

export interface LessonDef {
  id: string
  order: number
  title: string
  /** Short card blurb on the /learn index. */
  blurb: string
  /** One sentence: where the params look alike vs differ. */
  compareLine: string
  /** Diagnostic photo under public/learn/. */
  imageSrc: string
  /** Only these sliders are interactive in the explore phase. */
  allowedSliders: SliderId[]
  practiceHint: string
  nextId: string | null
}
