import { getAiProvider } from './provider'
import { withValidation } from './withValidation'
import type {
  AnalyzePhotoInput,
  AnalyzeResult,
  GenerateFilmStepsInput,
} from './types'

/** Feature 1: analyze a photo → structured lesson (or plain-text fallback). */
export async function analyzePhoto(
  input: AnalyzePhotoInput,
  providerId?: string,
): Promise<AnalyzeResult> {
  const provider = getAiProvider(providerId)
  return withValidation({
    provider,
    imageDataUrl: input.imageDataUrl,
    fetchRaw: () => provider.analyzePhoto(input),
  })
}

/** Feature 2: generate a film-style lesson (or plain-text fallback). */
export async function generateFilmSteps(
  input: GenerateFilmStepsInput,
  providerId?: string,
): Promise<AnalyzeResult> {
  const provider = getAiProvider(providerId)
  return withValidation({
    provider,
    imageDataUrl: input.imageDataUrl,
    fetchRaw: () => provider.generateFilmSteps(input),
  })
}
