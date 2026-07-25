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
 * 或在 package.json 加一条：
 *   "test:ai": "vite-node scripts/test-ai.ts"
 *
 * 用法：
 *   1. 在 scripts/test-images/ 放几张测试图，文件名即用例名，建议至少放：
 *        underexposed.jpg   —— 明显欠曝
 *        warm-cast.jpg      —— 明显偏黄/偏暖
 *        normal.jpg         —— 正常曝光、没什么大问题
 *   2. 跑之前脚本会先自检 VITE_GEMINI_API_KEY 有没有被读到，读不到会直接提示，不浪费 API 调用。
 *   3. 跑完会在终端打印每张图的分析结果，并在 scripts/test-output/ 落地 JSON，
 *      方便你改了 prompt 之后跟上一次的输出做 diff 对比。
 *
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

// 示例电影风格卡，用于测试 generateFilmSteps。
// 把下面这几个值换成你 films.ts 里某张真实风格卡的 targetAdjustments 会更有意义。
const SAMPLE_FILM = {
  filmName: '示例风格-暖调低对比',
  filmId: 'sample-warm',
  targetAdjustments: Object.fromEntries(SLIDER_IDS.map((id) => [id, 0])) as Adjustments,
}
SAMPLE_FILM.targetAdjustments.temperature = 25
SAMPLE_FILM.targetAdjustments.contrast = -15
SAMPLE_FILM.targetAdjustments.shadows = 10
SAMPLE_FILM.targetAdjustments.vibrance = 12

/**
 * vite-node 下 import.meta.env 有时不如 loadEnv 稳；两者都查。
 * 额外检测 UTF-8 BOM（PowerShell Set-Content -Encoding utf8 常会写入），
 * 那是 Windows 上「.env 明明有 key 却读不到」的头号原因。
 */
function checkEnvKey() {
  const fileEnv = loadEnv('development', ROOT, 'VITE_')
  const key =
    (typeof import.meta.env?.VITE_GEMINI_API_KEY === 'string' &&
      import.meta.env.VITE_GEMINI_API_KEY) ||
    fileEnv.VITE_GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY

  if (key && key.trim()) {
    // Ensure downstream getGeminiApiKey() sees it even if import.meta.env was empty.
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      ;(import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_GEMINI_API_KEY =
        key.trim()
    }
    if (!process.env.VITE_GEMINI_API_KEY) process.env.VITE_GEMINI_API_KEY = key.trim()
    console.log(`✅ 读到 VITE_GEMINI_API_KEY（长度 ${key.trim().length}，开头 ${key.trim().slice(0, 6)}...）\n`)
    return
  }

  console.error('❌ 没读到 VITE_GEMINI_API_KEY，后面的调用大概率会全部失败。排查方向：')
  const envPath = join(ROOT, '.env')
  if (existsSync(envPath)) {
    const buf = readFileSync(envPath)
    const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf
    if (hasBom) {
      console.error('   ⚠ 检测到 .env 带 UTF-8 BOM（EF BB BF）。Vite 会把第一个变量名读歪。')
      console.error('     修复：用 VS Code 右下角把编码改成「UTF-8」保存（不要「UTF-8 with BOM」），或让我帮你重写无 BOM 的 .env。')
    } else {
      console.error('   · .env 存在且未见 BOM；请确认第一行是 VITE_GEMINI_API_KEY=...（无引号、无空格）')
    }
  } else {
    console.error('   · 项目根目录没有找到 .env（应与 package.json 同级）')
  }
  console.error('   1) .env 是否在项目根目录，和 package.json 同一层（不是 scripts/ 下）')
  console.error('   2) 编码必须是 UTF-8 无 BOM（Windows + PowerShell 重定向最容易写出 BOM）')
  console.error('   3) key 前后不要加引号：写成 VITE_GEMINI_API_KEY=xxx')
  console.error('   4) 改完 .env 后重新跑本命令即可（不必新开终端）')
  process.exit(1)
}

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
  checkEnvKey()
  mkdirSync(OUTPUT_DIR, { recursive: true })
  const images = loadTestImages()

  for (const { name, imageDataUrl } of images) {
    // 场景一：普通照片分析
    try {
      const t0 = Date.now()
      const result = await analyzePhoto({ imageDataUrl })
      const ms = Date.now() - t0
      printReport(`[分析] ${name}  (${ms}ms)`, result)
      writeFileSync(join(OUTPUT_DIR, `${name}.analyze.json`), JSON.stringify(result, null, 2))
    } catch (err) {
      console.error(`❌ [分析] ${name} 失败：`, err)
    }

    // 场景二：电影风格教案
    try {
      const t0 = Date.now()
      const result = await generateFilmSteps({
        imageDataUrl,
        filmId: SAMPLE_FILM.filmId,
        filmName: SAMPLE_FILM.filmName,
        targetAdjustments: SAMPLE_FILM.targetAdjustments,
      })
      const ms = Date.now() - t0
      printReport(`[风格:${SAMPLE_FILM.filmName}] ${name}  (${ms}ms)`, result)
      writeFileSync(join(OUTPUT_DIR, `${name}.film.json`), JSON.stringify(result, null, 2))
    } catch (err) {
      console.error(`❌ [风格] ${name} 失败：`, err)
    }
  }

  console.log(`\n\n完成。JSON 详情见 ${OUTPUT_DIR}`)
}

main()