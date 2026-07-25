/**
 * Prints real zod error strings so interpolation / duplicate-issue bugs
 * cannot silently ship (tsc will not catch a missing `$` in a template).
 *
 * Run: npx tsx scripts/check-schema.mts
 */
import { ZodError } from 'zod'
import { formatZodErrors, analysisReportSchema } from '../src/ai/schema.ts'

function expect(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`)
  console.log(`ok: ${msg}`)
}

// 1) Abs-limit message must interpolate the numeric constant (not the identifier).
{
  const r = analysisReportSchema.safeParse({
    oneLineDiagnosis: 'x',
    strengths: ['a'],
    issues: [{ title: 'b' }],
    direction: 'c',
    steps: [
      {
        slider: 'exposure',
        direction: 'increase',
        targetRange: { min: 95, max: 105 },
        reason: 'r',
        order: 1,
      },
      {
        slider: 'contrast',
        direction: 'increase',
        targetRange: { min: 10, max: 20 },
        reason: 'r',
        order: 2,
      },
      {
        slider: 'shadows',
        direction: 'increase',
        targetRange: { min: 10, max: 20 },
        reason: 'r',
        order: 3,
      },
      {
        slider: 'temperature',
        direction: 'decrease',
        targetRange: { min: -20, max: -8 },
        reason: 'r',
        order: 4,
      },
    ],
  })
  expect(!r.success, 'extreme range should fail')
  if (!r.success) {
    const text = formatZodErrors(r.error)
    expect(text.includes('超过 ±90'), `abs limit message interpolates 90\n${text}`)
    expect(!text.includes('TARGET_VALUE_ABS_LIMIT'), 'must not leak constant name')
  }
}

// 2) Inverted min/max: only the min<=max issue, not a negative-width issue.
{
  const r = analysisReportSchema.safeParse({
    oneLineDiagnosis: 'x',
    strengths: ['a'],
    issues: [{ title: 'b' }],
    direction: 'c',
    steps: [
      {
        slider: 'exposure',
        direction: 'increase',
        targetRange: { min: 20, max: 5 },
        reason: 'r',
        order: 1,
      },
      {
        slider: 'contrast',
        direction: 'increase',
        targetRange: { min: 10, max: 20 },
        reason: 'r',
        order: 2,
      },
      {
        slider: 'shadows',
        direction: 'increase',
        targetRange: { min: 10, max: 20 },
        reason: 'r',
        order: 3,
      },
      {
        slider: 'temperature',
        direction: 'decrease',
        targetRange: { min: -20, max: -8 },
        reason: 'r',
        order: 4,
      },
    ],
  })
  expect(!r.success, 'inverted range should fail')
  if (!r.success) {
    const text = formatZodErrors(r.error)
    expect(text.includes('必须 <= max'), `min<=max message present\n${text}`)
    expect(!text.includes('宽度'), `no redundant width error when inverted\n${text}`)
  }
}

console.log('all schema self-checks passed')
