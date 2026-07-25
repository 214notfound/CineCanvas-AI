/** Read Gemini config from Vite env (browser) or process.env (Node scripts). Never log the raw key. */
export function getGeminiApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
  if (typeof key !== 'string' || key.trim().length === 0) {
    throw new Error(
      '缺少 VITE_GEMINI_API_KEY。请在项目根目录创建 .env（可参考 .env.example）并填入 Gemini API Key，然后重启 npm run dev。',
    )
  }
  return key.trim()
}

export function getGeminiModel(): string {
  const model = import.meta.env.VITE_GEMINI_MODEL || process.env.VITE_GEMINI_MODEL
  return typeof model === 'string' && model.trim() ? model.trim() : 'gemini-3.5-flash'
}
