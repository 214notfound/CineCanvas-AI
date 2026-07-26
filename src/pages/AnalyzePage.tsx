import { useState } from 'react'
import { Link } from 'react-router-dom'
import { analyzePhoto } from '@/ai/analyzePhoto'
import { listAiProviders } from '@/ai/provider'
import { AnalysisReportCard } from '@/components/AnalysisReportCard'
import { UploadZone } from '@/components/UploadZone'
import { useSessionStore } from '@/store/useSessionStore'

/**
 * Feature-1 entry: upload a photo → AI analysis report → enter the grading workspace.
 * Provider selector lets you A/B compare Gemini vs Kimi on the same photo.
 */
export default function AnalyzePage() {
  const image = useSessionStore((s) => s.image)
  const analysis = useSessionStore((s) => s.analysis)
  const analysisStatus = useSessionStore((s) => s.analysisStatus)
  const analysisError = useSessionStore((s) => s.analysisError)
  const providerId = useSessionStore((s) => s.providerId)
  const setProviderId = useSessionStore((s) => s.setProviderId)
  const setAnalyzing = useSessionStore((s) => s.setAnalyzing)
  const setAnalysis = useSessionStore((s) => s.setAnalysis)
  const setAnalysisError = useSessionStore((s) => s.setAnalysisError)

  const [busy, setBusy] = useState(false)
  const providers = listAiProviders()
  const active = providers.find((p) => p.id === providerId)

  async function onAnalyze() {
    if (!image) return
    setBusy(true)
    setAnalyzing()
    try {
      const result = await analyzePhoto({ imageDataUrl: image.ai.dataUrl }, providerId)
      setAnalysis(result)
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : '分析失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  const analyzing = busy || analysisStatus === 'analyzing'

  return (
    <main className="min-h-full bg-maroon-deep px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-cream text-shadow-paper sm:text-4xl">
              分析你的照片
            </h1>
            <p className="mt-2 font-serif-sc text-sm text-paper-dim sm:text-base">
              AI 会指出优缺点和调色方向，再带你一步步动手练。
            </p>
          </div>
          <Link
            to="/"
            className="shrink-0 font-serif-sc text-gold underline-offset-4 hover:underline"
          >
            ← 返回首页
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <UploadZone />

            <div className="rounded-lg bg-film/50 px-4 py-3">
              <label className="block font-serif-sc text-sm text-paper-dim">
                对比模型
                <select
                  value={providerId}
                  disabled={analyzing}
                  onChange={(e) => setProviderId(e.target.value)}
                  className="mt-1 w-full rounded border border-paper-dim/40 bg-paper px-3 py-2 font-sans text-sm text-ink disabled:opacity-50"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-1.5 font-sans text-xs text-paper-dim">
                切换模型会清空当前报告，方便你对同一张图 A/B 对比。
              </p>
            </div>

            <button
              type="button"
              disabled={!image || analyzing}
              onClick={() => void onAnalyze()}
              className="rounded-sm bg-gold px-6 py-3 font-serif-sc text-lg text-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:brightness-110"
            >
              {analyzing
                ? `正在用 ${active?.displayName ?? 'AI'} 分析…`
                : `用 ${active?.displayName ?? 'AI'} 开始分析`}
            </button>

            {analysisError && (
              <p className="font-sans text-sm text-crimson">{analysisError}</p>
            )}

            {!image && (
              <p className="font-sans text-xs text-paper-dim">
                提示：会先自动压缩预览图与送 AI 的小图，手机大图也能流畅分析。
              </p>
            )}
          </div>

          <div>
            {analyzing && (
              <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-paper-dim/40 bg-film/30 p-8 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
                <p className="mt-4 font-serif-sc text-cream">
                  {active?.displayName ?? 'AI'} 正在看图并写教案…
                </p>
                <p className="mt-1 font-sans text-xs text-paper-dim">
                  结构化校验失败时会自动重试，请稍候
                </p>
              </div>
            )}

            {!analyzing && analysis && (
              <div className="space-y-2">
                <p className="font-sans text-xs text-paper-dim">
                  本次结果来自：{active?.displayName ?? providerId}
                </p>
                <AnalysisReportCard result={analysis} />
              </div>
            )}

            {!analyzing && !analysis && (
              <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-paper-dim/40 bg-film/30 p-8 text-center">
                <p className="font-display text-xl text-cream/80">分析报告会显示在这里</p>
                <p className="mt-2 font-sans text-sm text-paper-dim">
                  上传照片后点击「开始 AI 分析」
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
