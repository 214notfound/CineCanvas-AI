import { geminiProvider } from './geminiProvider'
import type { AiProvider } from './types'

const providers: Record<string, AiProvider> = {
  gemini: geminiProvider,
}

/** Default provider id for this MVP. */
export const DEFAULT_PROVIDER_ID = 'gemini'

/**
 * Resolve an AI provider by id. Switchable so we can add Qwen / others later
 * without rewriting callers.
 */
export function getAiProvider(id: string = DEFAULT_PROVIDER_ID): AiProvider {
  const provider = providers[id]
  if (!provider) {
    throw new Error(`未知 AI provider: ${id}。可用：${Object.keys(providers).join(', ')}`)
  }
  return provider
}

export function listAiProviders(): AiProvider[] {
  return Object.values(providers)
}
