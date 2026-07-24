// Single source of truth for the 10 MVP adjustment sliders.
// Shared by: the WebGL engine (pipeline), the AI output schema (zod),
// and the curated film library (targetAdjustments). Keep IDs + ranges aligned.

export type SliderId =
  | 'exposure'
  | 'contrast'
  | 'highlights'
  | 'shadows'
  | 'whites'
  | 'blacks'
  | 'temperature'
  | 'tint'
  | 'vibrance'
  | 'saturation'

export interface SliderDef {
  id: SliderId
  /** Chinese label shown in the UI. */
  label: string
  /** Short English label (Lightroom-style). */
  labelEn: string
  min: number
  max: number
  step: number
  /** One-line beginner-friendly explanation of what this control does. */
  hint: string
  /** Grouping for the panel layout. */
  group: 'light' | 'color'
}

export const SLIDERS: SliderDef[] = [
  { id: 'exposure', label: '曝光', labelEn: 'Exposure', min: -100, max: 100, step: 1, group: 'light', hint: '整体的明暗。向右更亮，向左更暗。' },
  { id: 'contrast', label: '对比度', labelEn: 'Contrast', min: -100, max: 100, step: 1, group: 'light', hint: '明暗的反差。向右更硬朗，向左更柔和。' },
  { id: 'highlights', label: '高光', labelEn: 'Highlights', min: -100, max: 100, step: 1, group: 'light', hint: '只影响画面里最亮的区域，常用来找回过曝细节。' },
  { id: 'shadows', label: '阴影', labelEn: 'Shadows', min: -100, max: 100, step: 1, group: 'light', hint: '只影响较暗的区域，向右提亮暗部让画面通透。' },
  { id: 'whites', label: '白色', labelEn: 'Whites', min: -100, max: 100, step: 1, group: 'light', hint: '设定画面最白的点，决定高光的上限。' },
  { id: 'blacks', label: '黑色', labelEn: 'Blacks', min: -100, max: 100, step: 1, group: 'light', hint: '设定画面最黑的点，决定暗部的下限。' },
  { id: 'temperature', label: '色温', labelEn: 'Temp', min: -100, max: 100, step: 1, group: 'color', hint: '冷暖倾向。向右更暖(黄)，向左更冷(蓝)。' },
  { id: 'tint', label: '色调', labelEn: 'Tint', min: -100, max: 100, step: 1, group: 'color', hint: '绿洋红倾向。向右偏洋红，向左偏绿。' },
  { id: 'vibrance', label: '自然饱和度', labelEn: 'Vibrance', min: -100, max: 100, step: 1, group: 'color', hint: '智能饱和度，优先照顾低饱和区域，肤色更自然。' },
  { id: 'saturation', label: '饱和度', labelEn: 'Saturation', min: -100, max: 100, step: 1, group: 'color', hint: '所有颜色的浓淡，一视同仁地增强或减弱。' },
]

export const SLIDER_MAP: Record<SliderId, SliderDef> = Object.fromEntries(
  SLIDERS.map((s) => [s.id, s]),
) as Record<SliderId, SliderDef>

export const SLIDER_IDS = SLIDERS.map((s) => s.id) as SliderId[]

/** A full set of adjustment values, keyed by slider id. */
export type Adjustments = Record<SliderId, number>

/** Neutral starting point: every slider at 0. */
export function neutralAdjustments(): Adjustments {
  return Object.fromEntries(SLIDER_IDS.map((id) => [id, 0])) as Adjustments
}

/** Clamp a value into a slider's legal domain. */
export function clampSlider(id: SliderId, value: number): number {
  const def = SLIDER_MAP[id]
  return Math.max(def.min, Math.min(def.max, value))
}
