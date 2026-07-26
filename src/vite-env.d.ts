/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string
  readonly VITE_GEMINI_MODEL?: string
  readonly VITE_KIMI_API_KEY?: string
  readonly VITE_KIMI_MODEL?: string
  readonly VITE_KIMI_BASE_URL?: string
  /** Default provider id: gemini | kimi */
  readonly VITE_AI_PROVIDER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
