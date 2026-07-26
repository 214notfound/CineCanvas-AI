import { geminiProvider } from './geminiProvider'
import { kimiProvider } from './kimiProvider'
import { getDefaultProviderId } from './config'
import type { AiProvider } from './types'

const providers: Record<string, AiProvider> = {
  gemini: geminiProvider,
  kimi: kimiProvider,
}

/**
 * Resolve an AI provider by id. Omit id to use VITE_AI_PROVIDER (default gemini).
 */
export function getAiProvider(id?: string): AiProvider {
  const resolved = id ?? getDefaultProviderId()
  const provider = providers[resolved]
  if (!provider) {
    throw new Error(
      `未知 AI provider: ${resolved}。可用：${Object.keys(providers).join(', ')}`,
    )
  }
  return provider
}

export function listAiProviders(): AiProvider[] {
  return Object.values(providers)
}

export { getDefaultProviderId }
