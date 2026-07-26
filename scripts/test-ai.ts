/**
 * 独立测试脚本：验证调色 AI prompt 的真实输出质量（绕开 UI，直接调模型）
 *
 * 放置位置：把这个文件放到你项目的 scripts/test-ai.ts
 *
 * 安装依赖（如果还没装）：
 *   npm i -D vite-node
 *
 * 运行：
 *   npx vite-node scripts/test-ai.ts
 *   npx vite-node scripts/test-ai.ts -- --provider=kimi
 *   npx vite-node scripts/test-ai.ts -- --provider=gemini
 *
 * 用法：
 *   1. 在 scripts/test-images/ 放几张测试图
 *   2. 脚本会按 --provider 检查对应的 VITE_*_API_KEY
 *   3. 结果打印到终端，并写入 scripts/test-output/
 * 本版已对齐真实签名（来自 src/ai/analyzePhoto.ts + src/ai/types.ts）：
 *   - analyzePhoto(input: { imageDataUrl: string }, providerId?: string): Promise<AnalyzeResult>
 *   - generateFilmSteps(input: { imageDataUrl, filmId, filmName, targetAdjustments }, providerId?): Promise<AnalyzeResult>
 *   - AnalyzeResult = AnalysisReport | FallbackAdvice({ kind:'fallback', text })，用 isFallbackAdvice() 判断
 */

import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, extname, basename, resolve } from 'node:path'
import { loadEnv } from 'vite'

import { analyzePhoto, generateFilmSteps } from '../src/ai/analyzePhoto'
import { SLIDER_IDS, SLIDER_MAP, type Adjustments } from '../src/engine/sliders'
import {
  TARGET_RANGE_MIN_WIDTH,
  TARGET_RANGE_MAX_WIDTH,
  TARGET_VALUE_ABS_LIMIT,
} from '../src/ai/schema'
import { isFallbackAdvice, type AnalyzeResult, type AnalysisReport } from '../src/ai/types'

const ROOT = resolve(import.meta.dirname, '..')
const IMAGES_DIR = join(import.meta.dirname, 'test-images')
const OUTPUT_DIR = join(import.meta.dirname, 'test-output')
const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

function resolveProviderId(): string {
  const arg = process.argv.find((a) => a.startsWith('--provider='))
  if (arg) return arg.slice('--provider='.length)
  const fileEnv = loadEnv('development', ROOT, 'VITE_')
  return fileEnv.VITE_AI_PROVIDER || 'gemini'
}

/**
 * vite-node 下 import.meta.env 有时不如 loadEnv 稳；两者都查。
 * 额外检测 UTF-8 BOM（PowerShell Set-Content -Encoding utf8 常会写入）。
 */
function hydrateEnv(prefix: string, names: string[]) {
  const fileEnv = loadEnv('development', ROOT, prefix)
  for (const name of names) {
    const value =
      (typeof (import.meta.env as Record<string, string | undefined>)[name] === 'string' &&
        (import.meta.env as Record<string, string | undefined>)[name]) ||
      fileEnv[name] ||
      process.env[name]
    if (value && value.trim()) {
      ;(import.meta as ImportMeta & { env: Record<string, string> }).env[name] = value.trim()
      process.env[name] = value.trim()
    }
  }
}

function checkEnvKey(providerId: string) {
  hydrateEnv('VITE_', [
    'VITE_GEMINI_API_KEY',
    'VITE_GEMINI_MODEL',
    'VITE_KIMI_API_KEY',
    'VITE_KIMI_MODEL',
    'VITE_KIMI_BASE_URL',
    'VITE_AI_PROVIDER',
  ])

  const keyName = providerId === 'kimi' ? 'VITE_KIMI_API_KEY' : 'VITE_GEMINI_API_KEY'
  const key = process.env[keyName]

  if (key && key.trim()) {
    console.log(
      `✅ provider=${providerId} 读到 ${keyName}（长度 ${key.trim().length}，开头 ${key.trim().slice(0, 6)}...）\n`,
    )
    return
  }

  console.error(`❌ 没读到 ${keyName}（当前 provider=${providerId}）。排查方向：`)
  const envPath = join(ROOT, '.env')
  if (existsSync(envPath)) {
    const buf = readFileSync(envPath)
    const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf
    if (hasBom) {
      console.error('   ⚠ 检测到 .env 带 UTF-8 BOM（EF BB BF）。Vite 会把第一个变量名读歪。')
    } else {
      console.error(`   · .env 存在；请确认有一行 ${keyName}=...（无引号）`)
    }
  } else {
    console.error('   · 项目根目录没有找到 .env')
  }
  if (providerId === 'kimi') {
    console.error('   · 国内控制台 Key 若失败，可在 .env 加：VITE_KIMI_BASE_URL=https://api.moonshot.cn/v1')
  }
  process.exit(1)
}

const SAMPLE_FILM = {
  filmName: '示例风格-暖调低对比',
  filmId: 'sample-warm',
  targetAdjustments: Object.fromEntries(SLIDER_IDS.map((id) => [id, 0])) as Adjustments,
}
SAMPLE_FILM.targetAdjustments.temperature = 25
SAMPLE_FILM.targetAdjustments.contrast = -15
SAMPLE_FILM.targetAdjustments.shadows = 10
SAMPLE_FILM.targetAdjustments.vibrance = 12

function loadTestImages(): { name: string; imageDataUrl: string }[] {
  mkdirSync(IMAGES_DIR, { recursive: true })
  const files = readdirSync(IMAGES_DIR).filter((f) => MIME[extname(f).toLowerCase()])
  if (files.length === 0) {
    console.warn(
      `⚠️  ${IMAGES_DIR} 里没有测试图，放几张 jpg/png 进去再跑（建议：欠曝、偏色、正常曝光各一张）`,
    )
  }
  return files.map((f) => {
    const buf = readFileSync(join(IMAGES_DIR, f))
    const mime = MIME[extname(f).toLowerCase()]
    const imageDataUrl = `data:${mime};base64,${buf.toString('base64')}`
    return { name: basename(f, extname(f)), imageDataUrl }
  })
}

/** 用 schema.ts 里同一套常量做二次人工核对，理论上不该触发（zod 已经校验过），
 *  但留着能第一时间发现 schema 和 prompt 不一致的情况。 */
function checkStep(step: AnalysisReport['steps'][number]): string[] {
  const problems: string[] = []
  const width = step.targetRange.max - step.targetRange.min
  if (width < TARGET_RANGE_MIN_WIDTH || width > TARGET_RANGE_MAX_WIDTH) {
    problems.push(`targetRange 宽度 ${width} 超出 ${TARGET_RANGE_MIN_WIDTH}-${TARGET_RANGE_MAX_WIDTH}`)
  }
  if (
    Math.abs(step.targetRange.min) > TARGET_VALUE_ABS_LIMIT ||
    Math.abs(step.targetRange.max) > TARGET_VALUE_ABS_LIMIT
  ) {
    problems.push(`目标值超过 ±${TARGET_VALUE_ABS_LIMIT}`)
  }
  if (step.direction === 'increase' && step.targetRange.min < 0) {
    problems.push('direction=increase 但 min<0')
  }
  if (step.direction === 'decrease' && step.targetRange.max > 0) {
    problems.push('direction=decrease 但 max>0')
  }
  return problems
}

function printReport(label: string, result: AnalyzeResult) {
  console.log(`\n${'='.repeat(60)}\n📸 ${label}\n${'='.repeat(60)}`)

  if (isFallbackAdvice(result)) {
    console.log('⚠️  降级为纯文字建议（结构化输出连续失败，值得留意 prompt/schema 是不是太严）：')
    console.log(result.text)
    return
  }

  console.log(`诊断：${result.oneLineDiagnosis}`)
  console.log(`优点：${result.strengths.join(' / ')}`)
  console.log(
    `问题：${result.issues
      .map((i) => i.title + (i.locationHint ? `（${i.locationHint}）` : ''))
      .join(' | ')}`,
  )
  console.log(`方向：${result.direction}`)
  console.log(`共 ${result.steps.length} 步：`)

  const usedSliders = new Set<string>()
  for (const step of result.steps) {
    const dup = usedSliders.has(step.slider) ? ' 🔴重复slider' : ''
    usedSliders.add(step.slider)
    const problems = checkStep(step)
    const flag = problems.length > 0 ? ` 🔴 ${problems.join('; ')}` : ' ✅'
    const label = SLIDER_MAP[step.slider]?.label ?? step.slider
    console.log(
      `  ${step.order}. ${label}(${step.slider}) ${
        step.direction === 'increase' ? '→ 向右' : '→ 向左'
      } [${step.targetRange.min}, ${step.targetRange.max}]${dup}${flag}`,
    )
    console.log(`     理由：${step.reason}`)
  }
}

async function main() {
  const providerId = resolveProviderId()
  checkEnvKey(providerId)
  mkdirSync(OUTPUT_DIR, { recursive: true })
  const images = loadTestImages()
  const outSuffix = providerId === 'gemini' ? '' : `.${providerId}`

  for (const { name, imageDataUrl } of images) {
    try {
      const t0 = Date.now()
      const result = await analyzePhoto({ imageDataUrl }, providerId)
      const ms = Date.now() - t0
      printReport(`[分析/${providerId}] ${name}  (${ms}ms)`, result)
      writeFileSync(
        join(OUTPUT_DIR, `${name}.analyze${outSuffix}.json`),
        JSON.stringify(result, null, 2),
      )
    } catch (err) {
      console.error(`❌ [分析/${providerId}] ${name} 失败：`, err)
    }

    try {
      const t0 = Date.now()
      const result = await generateFilmSteps(
        {
          imageDataUrl,
          filmId: SAMPLE_FILM.filmId,
          filmName: SAMPLE_FILM.filmName,
          targetAdjustments: SAMPLE_FILM.targetAdjustments,
        },
        providerId,
      )
      const ms = Date.now() - t0
      printReport(`[风格/${providerId}:${SAMPLE_FILM.filmName}] ${name}  (${ms}ms)`, result)
      writeFileSync(
        join(OUTPUT_DIR, `${name}.film${outSuffix}.json`),
        JSON.stringify(result, null, 2),
      )
    } catch (err) {
      console.error(`❌ [风格/${providerId}] ${name} 失败：`, err)
    }
  }

  console.log(`\n\n完成。JSON 详情见 ${OUTPUT_DIR}`)
}

main()