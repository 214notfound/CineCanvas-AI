import type { SliderId } from '@/engine/sliders'
import { SLIDER_IDS, SLIDER_MAP } from '@/engine/sliders'
import { MIN_GRADING_STEPS } from './schema'

/** Quoted string enums so the model cannot mistake them for bare identifiers. */
const SLIDER_LIST = SLIDER_IDS.map((id) => `"${id}"`).join(', ')

/**
 * Explicit value→visual mapping for every slider.
 * Critical for bidirectional controls (temperature / tint) so "increase"
 * always means "slider number goes up", matching the WebGL engine.
 */
function sliderDirectionSemantics(): string {
  return SLIDER_IDS.map((id) => {
    const s = SLIDER_MAP[id]
    const meaning: Record<SliderId, string> = {
      exposure: '数值越大越亮，越小越暗',
      contrast: '数值越大反差越强（更硬），越小越平（更柔）',
      highlights: '数值越大高光区域越亮，越小则压暗高光（找回过曝细节）',
      shadows: '数值越大暗部越亮（提亮阴影），越小则暗部更暗',
      whites: '数值越大白点上限越高（更敞亮），越小则压低最亮点',
      blacks: '数值越大黑点下限越高（暗部更灰），越小则黑点更黑（更扎实）',
      temperature: '数值越大越暖（偏黄），越小越冷（偏蓝）',
      tint: '数值越大越偏品红/洋红，越小越偏绿',
      vibrance: '数值越大低饱和区域越鲜艳（保护肤色），越小则越寡淡',
      saturation: '数值越大所有颜色越浓，越小则越接近灰',
    }
    return `- ${s.label}(${id})：${meaning[id]}`
  }).join('\n')
}

/**
 * Shared JSON contract description injected into every analysis prompt.
 * Soft wording here is enforced as hard checks in schema.ts / withValidation.
 */
export function analysisJsonContract(): string {
  return `你必须只输出一个合法 JSON 对象（不要 markdown 代码块、不要前后解释），字段如下：
{
  "oneLineDiagnosis": string,          // 一句直击痛点的诊断
  "strengths": string[],               // 1–2 条优点，先肯定
  "issues": [ { "title": string, "locationHint"?: string } ],  // 1–3 条，只挑最影响观感的
  "direction": string,                 // 整体调色方向一句话
  "steps": [
    {
      "slider": string,                // 必须是以下字符串之一：${SLIDER_LIST}
      "direction": "increase" | "decrease",  // increase=滑块数值变大(向右)，decrease=变小(向左)
      "targetRange": { "min": number, "max": number },  // 均在 -100..100，min <= max，宽度 8–25
      "reason": string,                // 给小白的原因，具体、可操作
      "order": number                  // 从 1 开始的教学顺序
    }
  ]
}

滑块数值的方向语义（务必遵守，不要搞反）：
${sliderDirectionSemantics()}

约束：
- issues 建议 1–3 条，只挑最影响观感的，不要列碎问题把新手吓到
- steps 建议 4–7 步，按教学逻辑排序（通常先曝光/白平衡，再对比与局部明暗，最后饱和度）
- 每个 step 的 slider 不得重复
- targetRange 宽度必须在 8–25（含），让初学者有明确目标区间
- 目标值避免极端到 ±100；一般落在 -90..90
- 若 direction 为 "increase"，targetRange 应在正方向（min >= 0）；若为 "decrease"，应在负方向（max <= 0）——教案默认从中性 0 起步
- 文案使用简体中文，语气像耐心的调色老师，直击痛点、避免空话`
}

export function buildAnalyzePhotoPrompt(): string {
  return `你是一位面向完全新手的摄影调色教练。请分析这张照片的曝光、对比、白平衡与色彩问题，并给出可在 Lightroom 式基础面板上手动完成的分步教案。

目标用户不会调色逻辑，所以：诊断要具体，步骤要告诉他“调哪个滑块、往哪边拖、为什么”。

${analysisJsonContract()}`
}

export function buildFilmStylePrompt(input: {
  filmName: string
  filmId: string
  targetAdjustments: Record<SliderId, number>
}): string {
  const targets = SLIDER_IDS.map(
    (id) => `  "${id}": ${input.targetAdjustments[id]}`,
  ).join(',\n')

  return `你是一位面向完全新手的摄影调色教练。用户想把这张照片调成电影风格「${input.filmName}」（id: ${input.filmId}）。

该风格的量化目标滑块值（中性起点为 0，单位 -100..100）是：
{
${targets}
}

请结合【当前这张照片】的实际状况微调这些目标（例如照片本就偏暖，就减少色温增量），然后输出分步教案：每一步只调一个滑块，解释为什么，并给出 targetRange。

${analysisJsonContract()}

额外要求：
- oneLineDiagnosis / strengths / issues / direction 要围绕“现状 vs 该电影风格”来写
- steps 的 targetRange 应围绕微调后的目标值，而不是凭空编造
- 若微调后某滑块目标为负，对应 step 的 direction 必须是 "decrease"；为正则是 "increase"
- 若某滑块微调后目标就是 0（无需调整），跳过该滑块，不要为它编造一个 step
- 不要为了凑步数而添加目标为 0 的无效步骤；只输出真正需要调整的滑块（至少 ${MIN_GRADING_STEPS} 步——风格卡数据本身会保证有足够多的非零目标）`
}

/** Prompt used when asking the model to fix invalid JSON (no image needed). */
export function buildRepairPrompt(previousRaw: string, validationErrors: string): string {
  return `你之前输出的 JSON 未通过校验。请只输出修正后的完整合法 JSON 对象（不要 markdown 代码块、不要解释）。

校验错误：
${validationErrors}

你之前的输出：
${previousRaw}

${analysisJsonContract()}`
}

/** Plain-text fallback when structured output keeps failing. */
export function buildPlainAdvicePrompt(): string {
  return `你是一位面向完全新手的摄影调色教练。请用简体中文写 3–5 句具体、可操作的调色建议（曝光/白平衡/对比/色彩），直击这张照片的问题。不要输出 JSON，不要用 markdown 代码块。`
}
