/** Read env from Vite (browser) or process.env (Node scripts). Never log raw keys. */

function readEnv(name: string): string | undefined {
  const fromVite = (import.meta.env as Record<string, string | undefined>)[name]
  const fromProcess = typeof process !== 'undefined' ? process.env[name] : undefined
  const value = fromVite || fromProcess
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function getGeminiApiKey(): string {
  const key = readEnv('VITE_GEMINI_API_KEY')
  if (!key) {
    throw new Error(
      '缺少 VITE_GEMINI_API_KEY。请在项目根目录 .env 中配置，然后重启 npm run dev。',
    )
  }
  return key
}

export function getGeminiModel(): string {
  return readEnv('VITE_GEMINI_MODEL') ?? 'gemini-3.5-flash'
}

export function getKimiApiKey(): string {
  const key = readEnv('VITE_KIMI_API_KEY')
  if (!key) {
    throw new Error(
      '缺少 VITE_KIMI_API_KEY。请在项目根目录 .env 中配置 Moonshot/Kimi Key，然后重启 npm run dev。',
    )
  }
  return key
}

export function getKimiModel(): string {
  return readEnv('VITE_KIMI_MODEL') ?? 'kimi-k2.7-code'
}

/** China console default; override with VITE_KIMI_BASE_URL=https://api.moonshot.ai/v1 for international keys */
export function getKimiBaseUrl(): string {
  return readEnv('VITE_KIMI_BASE_URL') ?? 'https://api.moonshot.cn/v1'
}

/** Default provider when callers omit providerId. */
export function getDefaultProviderId(): string {
  return readEnv('VITE_AI_PROVIDER') ?? 'gemini'
}
