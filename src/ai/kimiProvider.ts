import {
  buildAnalyzePhotoPrompt,
  buildFilmStylePrompt,
  buildPlainAdvicePrompt,
  buildRepairPrompt,
} from './prompts'
import { getKimiApiKey, getKimiBaseUrl, getKimiModel } from './config'
import { stripJsonFences } from './parse'
import type {
  AiProvider,
  AnalyzePhotoInput,
  GenerateFilmStepsInput,
} from './types'

type KimiContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

interface KimiChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null
      reasoning_content?: string | null
    }
    finish_reason?: string
  }>
  error?: { message?: string; type?: string; code?: string | number }
}

/**
 * Kimi K2.7 Code forces thinking + fixed sampling params.
 * Do NOT send custom temperature / top_p — the API rejects non-default values.
 */
async function callKimi(
  content: KimiContentPart[],
  options: { json: boolean } = { json: true },
): Promise<string> {
  const apiKey = getKimiApiKey()
  const model = getKimiModel()
  const baseUrl = getKimiBaseUrl().replace(/\/$/, '')
  const url = `${baseUrl}/chat/completions`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      // K2.7-Code requires thinking enabled; disabling throws.
      thinking: { type: 'enabled' },
      ...(options.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  const raw = (await res.json()) as KimiChatResponse

  if (!res.ok || raw.error) {
    const msg = raw.error?.message ?? `HTTP ${res.status}`
    throw new Error(`Kimi 调用失败：${msg}`)
  }

  const text = raw.choices?.[0]?.message?.content?.trim() ?? ''
  if (!text) {
    const reason = raw.choices?.[0]?.finish_reason ?? 'unknown'
    throw new Error(`Kimi 返回为空（finish_reason=${reason}）`)
  }

  return options.json ? stripJsonFences(text) : text
}

function multimodal(prompt: string, imageDataUrl: string): KimiContentPart[] {
  return [
    { type: 'text', text: prompt },
    { type: 'image_url', image_url: { url: imageDataUrl } },
  ]
}

export const kimiProvider: AiProvider = {
  id: 'kimi',
  displayName: 'Kimi K2.7 Code',

  async analyzePhoto(input: AnalyzePhotoInput): Promise<string> {
    return callKimi(multimodal(buildAnalyzePhotoPrompt(), input.imageDataUrl))
  },

  async generateFilmSteps(input: GenerateFilmStepsInput): Promise<string> {
    return callKimi(
      multimodal(
        buildFilmStylePrompt({
          filmName: input.filmName,
          filmId: input.filmId,
          targetAdjustments: input.targetAdjustments,
        }),
        input.imageDataUrl,
      ),
    )
  },

  async repairStructuredOutput(input): Promise<string> {
    return callKimi([
      {
        type: 'text',
        text: buildRepairPrompt(input.previousRaw, input.validationErrors),
      },
    ])
  },

  async plainAdvice(input): Promise<string> {
    return callKimi(multimodal(buildPlainAdvicePrompt(), input.imageDataUrl), {
      json: false,
    })
  },
}
