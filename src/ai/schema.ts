import { z } from 'zod'
import { SLIDER_IDS, type SliderId } from '../engine/sliders'
import type { AnalysisReport, GradingStep } from './types'

/** Soft prompt rules that become hard checks here. */
export const TARGET_RANGE_MIN_WIDTH = 8
export const TARGET_RANGE_MAX_WIDTH = 25
export const TARGET_VALUE_ABS_LIMIT = 90
/** Must stay in sync with analysisReportSchema steps.min — film cards need ≥ this many non-zero targets. */
export const MIN_GRADING_STEPS = 4
export const MAX_GRADING_STEPS = 7

const sliderIdSchema = z.enum(SLIDER_IDS as [SliderId, ...SliderId[]])

const targetRangeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
  })
  .superRefine((range, ctx) => {
    if (range.min > range.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `targetRange.min (${range.min}) 必须 <= max (${range.max})`,
      })
      // Don't also emit a confusing negative-width error when the range is inverted.
      return
    }

    const width = range.max - range.min
    if (width < TARGET_RANGE_MIN_WIDTH || width > TARGET_RANGE_MAX_WIDTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `targetRange 宽度 ${width} 必须在 ${TARGET_RANGE_MIN_WIDTH}–${TARGET_RANGE_MAX_WIDTH} 之间`,
      })
    }
    if (Math.abs(range.min) > TARGET_VALUE_ABS_LIMIT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `targetRange.min=${range.min} 超过 ±${TARGET_VALUE_ABS_LIMIT}，避免极端值`,
      })
    }
    if (Math.abs(range.max) > TARGET_VALUE_ABS_LIMIT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `targetRange.max=${range.max} 超过 ±${TARGET_VALUE_ABS_LIMIT}，避免极端值`,
      })
    }
  })

const gradingStepSchema = z
  .object({
    slider: sliderIdSchema,
    direction: z.enum(['increase', 'decrease']),
    targetRange: targetRangeSchema,
    reason: z.string().min(1),
    order: z.number().int().positive(),
  })
  .superRefine((step, ctx) => {
    // From neutral 0: increase → non-negative band; decrease → non-positive band.
    if (step.direction === 'increase' && step.targetRange.min < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `slider=${step.slider} 的 direction=increase 时 targetRange.min 应 >= 0（从中性 0 向右拖）`,
      })
    }
    if (step.direction === 'decrease' && step.targetRange.max > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `slider=${step.slider} 的 direction=decrease 时 targetRange.max 应 <= 0（从中性 0 向左拖）`,
      })
    }
  })

export const analysisReportSchema = z
  .object({
    oneLineDiagnosis: z.string().min(1),
    strengths: z.array(z.string().min(1)).min(1).max(2),
    issues: z
      .array(
        z.object({
          title: z.string().min(1),
          locationHint: z.string().min(1).optional(),
        }),
      )
      .min(1)
      .max(3),
    direction: z.string().min(1),
    steps: z.array(gradingStepSchema).min(MIN_GRADING_STEPS).max(MAX_GRADING_STEPS),
  })
  .superRefine((report, ctx) => {
    const sliders = report.steps.map((s) => s.slider)
    const dup = sliders.filter((id, i) => sliders.indexOf(id) !== i)
    if (dup.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `steps 中 slider 重复：${[...new Set(dup)].join(', ')}`,
      })
    }

    const orders = [...report.steps.map((s) => s.order)].sort((a, b) => a - b)
    const expected = report.steps.map((_, i) => i + 1)
    if (orders.join(',') !== expected.join(',')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `steps.order 必须是 1..${report.steps.length} 的连续编号，实际为 [${orders.join(', ')}]`,
      })
    }
  })

export type ParsedAnalysisReport = z.infer<typeof analysisReportSchema>

/** Format zod issues into a compact string the model can fix against. */
export function formatZodErrors(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.join('.') : '(root)'
      return `- ${path}: ${issue.message}`
    })
    .join('\n')
}

/** Parse + validate raw model text into AnalysisReport. Throws ZodError or SyntaxError. */
export function parseAndValidateReport(raw: string): AnalysisReport {
  const data: unknown = JSON.parse(raw)
  const parsed = analysisReportSchema.parse(data)
  // Normalize step order ascending for consumers.
  const steps: GradingStep[] = [...parsed.steps].sort((a, b) => a.order - b.order)
  return { ...parsed, steps }
}
