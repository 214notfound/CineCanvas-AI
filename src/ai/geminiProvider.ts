import {
  buildAnalyzePhotoPrompt,
  buildFilmStylePrompt,
  buildPlainAdvicePrompt,
  buildRepairPrompt,
} from './prompts'
import { getGeminiApiKey, getGeminiModel } from './config'
import { parseDataUrl, stripJsonFences } from './parse'
import type {
  AiProvider,
  AnalyzePhotoInput,
  GenerateFilmStepsInput,
} from './types'

interface GeminiPart {
  text?: string
  inline_data?: { mime_type: string; data: string }
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
  error?: { message?: string; status?: string; code?: number }
}

async function callGemini(
  parts: GeminiPart[],
  options: { json: boolean } = { json: true },
): Promise<string> {
  const apiKey = getGeminiApiKey()
  const model = getGeminiModel()
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: options.json ? 0.4 : 0.5,
        ...(options.json ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  })

  const raw = (await res.json()) as GeminiResponse

  if (!res.ok || raw.error) {
    const msg = raw.error?.message ?? `HTTP ${res.status}`
    throw new Error(`Gemini 调用失败：${msg}`)
  }

  const text = raw.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('')
    .trim()

  if (!text) {
    const reason = raw.candidates?.[0]?.finishReason ?? 'unknown'
    throw new Error(`Gemini 返回为空（finishReason=${reason}）`)
  }

  return options.json ? stripJsonFences(text) : text.trim()
}

function imagePart(imageDataUrl: string): GeminiPart {
  const { mimeType, data } = parseDataUrl(imageDataUrl)
  return { inline_data: { mime_type: mimeType, data } }
}

export const geminiProvider: AiProvider = {
  id: 'gemini',
  displayName: 'Gemini 3.5 Flash',

  async analyzePhoto(input: AnalyzePhotoInput): Promise<string> {
    return callGemini([
      { text: buildAnalyzePhotoPrompt() },
      imagePart(input.imageDataUrl),
    ])
  },

  async generateFilmSteps(input: GenerateFilmStepsInput): Promise<string> {
    return callGemini([
      {
        text: buildFilmStylePrompt({
          filmName: input.filmName,
          filmId: input.filmId,
          targetAdjustments: input.targetAdjustments,
        }),
      },
      imagePart(input.imageDataUrl),
    ])
  },

  async repairStructuredOutput(input): Promise<string> {
    return callGemini([
      { text: buildRepairPrompt(input.previousRaw, input.validationErrors) },
    ])
  },

  async plainAdvice(input): Promise<string> {
    return callGemini(
      [{ text: buildPlainAdvicePrompt() }, imagePart(input.imageDataUrl)],
      { json: false },
    )
  },
}
