import { ZodError } from 'zod'
import { stripJsonFences } from './parse'
import { formatZodErrors, parseAndValidateReport } from './schema'
import type { AiProvider, AnalysisReport, AnalyzeResult, FallbackAdvice } from './types'

/** Initial attempt + up to this many repair retries. */
export const MAX_REPAIR_ATTEMPTS = 2

export interface WithValidationOptions {
  provider: AiProvider
  /** First raw JSON fetch (usually analyzePhoto / generateFilmSteps). */
  fetchRaw: () => Promise<string>
  /** Image used for plain-text fallback if structured output keeps failing. */
  imageDataUrl: string
}

function toFallback(text: string): FallbackAdvice {
  return { kind: 'fallback', text }
}

function describeError(err: unknown, raw: string): string {
  if (err instanceof ZodError) return formatZodErrors(err)
  if (err instanceof SyntaxError) {
    return `- JSON 解析失败: ${err.message}\n- 原始片段: ${raw.slice(0, 280)}`
  }
  return `- ${err instanceof Error ? err.message : String(err)}`
}

/**
 * Fetch → strip fences → JSON.parse → zod validate.
 * On failure: ask the model to repair (up to MAX_REPAIR_ATTEMPTS), then
 * degrade to plain-text advice so the UI never hard-crashes on bad JSON.
 */
export async function withValidation(
  options: WithValidationOptions,
): Promise<AnalyzeResult> {
  const { provider, fetchRaw, imageDataUrl } = options

  let raw = ''
  let lastErrors = ''

  for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
    try {
      raw =
        attempt === 0
          ? await fetchRaw()
          : await provider.repairStructuredOutput({
              previousRaw: raw,
              validationErrors: lastErrors,
            })

      const cleaned = stripJsonFences(raw)
      const report: AnalysisReport = parseAndValidateReport(cleaned)
      return report
    } catch (err) {
      lastErrors = describeError(err, raw)
      if (import.meta.env.DEV) {
        console.warn(
          `[ai] validation failed (attempt ${attempt + 1}/${MAX_REPAIR_ATTEMPTS + 1})\n${lastErrors}`,
        )
      }
    }
  }

  try {
    const text = await provider.plainAdvice({ imageDataUrl })
    return toFallback(
      text ||
        '结构化分析暂时不可用。建议先检查整体曝光与白平衡，再微调对比与饱和度。',
    )
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[ai] plainAdvice fallback also failed', err)
    }
    return toFallback(
      'AI 分析暂时失败。你可以先手动调整曝光、色温，再处理高光/阴影与饱和度。',
    )
  }
}
