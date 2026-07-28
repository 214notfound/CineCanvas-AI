# Project Handoff

> Date: 2026-07-28  
> Session focus: 调色引擎对齐 LR 质感（线性光管线 + 验证机制）及后续修 bug（`tanh` 编译失败、提示框被任务栏挡住）  
> Related plans:
> - [`.cursor/plans/调色引擎对齐lr质感_c972a579.plan.md`](../../.cursor/plans/调色引擎对齐lr质感_c972a579.plan.md) — **本次插入的地基修复**（已基本落地）
> - [`.cursor/plans/cinecanvas_ai调色学习网站_3ddf509c.plan.md`](../../.cursor/plans/cinecanvas_ai调色学习网站_3ddf509c.plan.md) — **原产品计划**（电影风格库等仍 pending）

关系说明：本次引擎改造是**插入**原产品计划之前，不是取代。修好渲染质感后再继续电影风格库 / 首页拼贴入口。

---

## 1. 项目简介

- **项目目的**  
  CineCanvas 是一个 AI 辅助的调色学习网站原型：帮助「有一定摄影/调色直觉、想理解底层逻辑」的人，通过实操滑块学习调色，而不是只套 LR 预设。产品承诺依赖编辑器本身的渲染质量——同配方不能明显发灰、远逊于 Lightroom。

- **当前实现功能**
  - 上传照片 → 降采样（预览 ≤2000px / AI ≤1280px）
  - Gemini / Kimi 可切换：看图诊断 + 分步教案（zod 校验 / 修复重试 / 纯文字降级）
  - WebGL 工作台：10 个基础滑块实时预览 + 目标区间高亮 + StepCoach
  - 开发对照页 `/debug/compare`：灰阶图 / 会话照片 vs 上传的 LR 导出分屏比对
  - 确定性影调验证：`npm run verify:tonal`

---

## 2. 当前技术栈

- **Framework:** Vite 6 + React 18 + React Router 6  
- **Language:** TypeScript  
- **Libraries:**
  - PixiJS v8（WebGL 运行时；调色数学在自定义 GLSL fragment shader）
  - Zustand（会话 / 滑块状态）
  - Zod（AI JSON 契约校验）
  - Tailwind CSS v4（拼贴/复古杂志风主题）
- **APIs:**
  - Google Gemini（默认，`VITE_GEMINI_API_KEY`，模型见 `src/ai/config.ts`）
  - Moonshot Kimi（`VITE_KIMI_API_KEY`，Analyze 页可 A/B）
  - 切换：`VITE_AI_PROVIDER` 或分析页下拉

---

## 3. 当前项目状态

### 已完成

- [x] 项目骨架 + 拼贴风主题
- [x] PixiJS 单 shader 调色引擎（10 滑块）
- [x] 图片降采样管线
- [x] AI provider 抽象 + Gemini / Kimi + zod 校验 / 重试 / 降级
- [x] 上传区 + 分析报告卡片
- [x] 工作台 + 滑块目标区间 + StepCoach
- [x] **线性光调色管线重写**（sRGB↔linear、白平衡乘法增益、曲线式影调、基础 S 曲线、sigmoid 对比度）
- [x] `pipeline.ts` 滑块映射重调；`uContrast` 默认改为 0（amount，非旧版 multiplier 1）
- [x] `/debug/compare` 对照页 + 灰阶生成
- [x] `tonalMath.ts` + `scripts/verify-tonal.ts`（黑点锚定 / 软肩斜率 / HSV 不脱色 / 中性≠identity）
- [x] **Shader 兼容修复**：GLSL ES 1.0 无内置 `tanh` → `tanhCompat`（用 `exp`）
- [x] **滑块「?」提示框智能定位**：默认向下，视口不够自动翻到上方（通用逻辑，非写死最后几项）

### 未完成

- [ ] 电影风格库 `films.ts` + 选卡 UI（原计划 pending；`generateFilmSteps` API 已写好未接 UI）
- [ ] 首页「Select Your Film」拼贴入口（当前首页仍是双 CTA 占位）
- [ ] AI prompt / `targetRange` 在新手感下的回归（引擎改后滑块响应变了）
- [ ] 产品文案定位从「完全新手」改为「有直觉的爱好者」
- [ ] 曲线面板 / HSL 分通道（原计划二期）
- [ ] 全分辨率导出
- [ ] 与 LR 的人工分屏对照仍需用户自备固定配方导出图做目测（自动化只覆盖 CPU 侧数学）

---

## 4. 项目结构说明

```
src/
  ai/                 # Provider、prompt、zod schema、校验包装
  components/         # UploadZone、Slider*、StepCoach、AnalysisReportCard…
  data/sliderHelp.ts  # 各滑块「?」文案
  engine/             # 调色引擎核心（与 UI 解耦）
    shaders/grading.ts      # 全部 GLSL 色彩数学（唯一真相源之一）
    tonalMath.ts            # CPU 镜像，供 verify:tonal
    pipeline.ts             # Adjustments → uniforms
    filters/gradingFilter.ts
    GradingCanvas.ts / useGradingCanvas.ts / sliders.ts
  lib/                # downsample、greyscaleRamp、targetRange
  pages/              # Home、Analyze、Workspace、CompareDebug
  store/              # useSessionStore、useGradingStore
scripts/verify-tonal.ts
docs/handoff/         # 本交接目录
.cursor/plans/        # 产品计划 + 引擎对齐计划
```

路由（`src/router.tsx`）：

| Path | 页面 |
|------|------|
| `/` | Home |
| `/analyze` | 上传 + AI 分析 |
| `/workspace` | 调色工作台 |
| `/debug/compare` | 引擎对照（开发用） |

---

## 5. 核心设计决策

- **为什么 Zustand？**  
  会话（图 + 教案）与滑块值分 store，避免把高频滑块更新和 AI 会话搅在一起；引擎 hook 直接订阅 `useGradingStore`，不必整树重渲染。

- **为什么 PixiJS？**  
  只当 WebGL 运行时（纹理、resize、滤镜挂载）。**所有调色公式在单个自定义 fragment shader**，避免双 pass / ColorMatrix 穿插顺序失控。

- **为什么单 shader + 固定顺序？**  
  高光/阴影/白黑/自然饱和度不是线性矩阵能表达的；单 pass 顺序与 LR 基础面板接近，易调、易测。

- **为什么从「全程 sRGB」改成线性光？**（本次关键）  
  旧实现在 gamma 空间做曝光/`exp2`、白平衡加减、阴影加法抬黑点 → 同配方发灰。现顺序：  
  `sRGB→linear → WB增益 → 曝光 → 影调曲线(亮度比缩放) → 基础S曲线 → 对比度sigmoid → soft shoulder → linear→sRGB → vibrance/sat`。

- **为什么有 `tonalMath.ts`？**  
  Node 里跑不了 WebGL 像素断言；CPU 镜像覆盖黑点锚定、软肩斜率、色度保持、中性 profile ≠ 原图。跑：`npm run verify:tonal`。

- **为什么对比度用 `tanhCompat` 而不是 `tanh`？**  
  Pixi 这条管线按 GLSL ES 1.0 兼容编译，**没有内置 `tanh`**（ES 3.00 才有）。直接写 `tanh` 会导致整段 shader 编译失败 → 画布全黑。必须用 `exp` 自实现。

- **为什么提示框用视口测量翻转？**  
  列表顺序会变；写死「最后两项向上」会复发。用 `getBoundingClientRect` + `visualViewport` 通用判断。

---

## 6. 当前代码状态

重要组件 / 模块：

- **`src/engine/shaders/grading.ts`**  
  功能：全部调色 GLSL。  
  状态：线性光管线已落地；对比度走 `tanhCompat`；**改公式必须同步 `tonalMath.ts` + `verify-tonal`**。

- **`src/engine/tonalMath.ts`**  
  功能：shader 的 CPU 镜像 + `gradePixelLinear` 全路径。  
  状态：与 shader 应对齐；用于断言，不是运行时渲染。

- **`src/engine/pipeline.ts`**  
  功能：滑块 -100..100 → uniforms。  
  状态：`uContrast` 为 `[-1,1]` amount（0=不变）；WB/白黑有衰减系数。

- **`src/engine/filters/gradingFilter.ts`**  
  功能：Pixi Filter + uniform 默认值。  
  状态：`uContrast` 默认 **0**（旧代码曾是 1，切勿改回）。

- **`src/pages/CompareDebugPage.tsx`**  
  功能：灰阶/会话图 + LR 导出分屏。  
  状态：可用；配方按钮便于手测。

- **`src/pages/WorkspacePage.tsx` / `useGradingCanvas.ts`**  
  功能：工作台实时预览。  
  状态：正常；shader 编译失败时会全黑（先看控制台）。

- **`src/components/SliderHelpTooltip.tsx`**  
  功能：「?」说明浮层。  
  状态：**未提交改动仍在 working tree**（智能上下翻转）；合并前请 `git add` 提交。

- **`src/ai/*`**  
  功能：诊断 + 教案；不做成片打分。  
  状态：主路径可用；电影风格 prompt 已有、UI 未接；引擎手感变后 `targetRange` 需回归。

---

## 7. 已知问题 / Bug

列表：

1. **`SliderHelpTooltip` 智能定位改动可能尚未 commit**（检查 `git status`）。  
2. **HMR 后偶发仍握着旧坏 filter**：改 `grading.ts` 后若画布异常，硬刷新。曾出现 `tanh` 编译失败导致全黑。  
3. **中性滑块 ≠ 原图像素**：全 0 仍套基础 filmic S 曲线（刻意对标 Adobe Color 起点）；验收时不要当成 bug。  
4. **`softShoulder` 使线性 1.0 映射到约 0.89 再编码**：高光略压，属软肩设计；若觉得「偏闷」可调 knee/强度，但需重跑 `verify:tonal`。  
5. **自动化验证不覆盖真实 WebGL 像素 / 与 LR 像素级 diff**；LR 对照仍靠 `/debug/compare` 人工。  
6. **AI 教案区间可能偏旧手感**：引擎映射已变，未系统回归 prompt / range 宽度。  
7. **原计划产品定位文案仍偏「完全新手」**，与当前目标用户不完全一致。  
8. **无导出 / 无 Display P3 / 无 16-bit**：预览级 8-bit sRGB。

---

## 8. 下一步开发计划

按照优先级：

**P0:**
- 提交并确认 `SliderHelpTooltip` 视口翻转进仓库  
- 用 2–3 张真图 + 固定配方在 `/debug/compare` 与 LR 导出再目测一轮（阴影+40、曝光≈+0.5 等）  
- 回归 AI `targetRange`：抽几张图看教案区间是否仍可达成、手感是否过猛/过弱

**P1:**
- 落地电影风格库（`films.ts` + 选卡 → `generateFilmSteps` → 工作台）  
- 首页「Select Your Film」拼贴入口，串起功能二  
- 文案 / prompt：面向「有直觉的爱好者」，弱化「完全新手」

**P2:**
- 曲线 / HSL 进阶模式  
- 全分辨率导出  
- 模型 A/B：固定图集 + 教案合理性人工分（引擎质量与模型选型解耦）  
- 可选：把 `verify:tonal` 挂进 CI

---

## 9. 给下一位 Agent 的注意事项

避免重复踩坑。

1. **先引擎、后风格库、后模型玄学。** 「发灰」主因是数学管线，不是 Gemini/Kimi 审美。  
2. **改 `grading.ts` 必须同步 `tonalMath.ts`，并跑 `npm run verify:tonal`。** 四条硬标准：黑点锚定、正高光软肩斜率递减、拉阴影 HSV 不脱色、中性输出≈`encode(softShoulder(baseSCurve))` 且 ≠ identity。  
3. **GLSL 兼容性：** 不要用 ES 3.00-only 内置函数（如 `tanh`）。现有代码用 `texture2D` / `gl_FragColor` 风格；Pixi 可能再变换，但缺符号会整片黑。新函数先查 GLSL ES 1.0，或自写 compat。  
4. **`uContrast` 语义是 amount（0=identity），不是旧版 multiplier（1=identity）。** Filter 默认值必须是 0。  
5. **影调用亮度比缩放 `c *= newLuma/oldLuma`，禁止对 RGB 做加法抬阴影**（会抬黑点 + 脱色发灰）。  
6. **验证页：** `http://localhost:5173/debug/compare`；工作台无图时需先走分析页或注入 `useSessionStore`。  
7. **提示框定位已是通用视口逻辑**——不要再对「自然饱和度/饱和度」写特殊分支。  
8. **原产品计划里「MVP 全程 sRGB、linear 留二期」已过时**；linear 已提前做完，以引擎对齐计划与当前 `grading.ts` 为准。  
9. **提交前检查：** `npm run lint`、`npm run verify:tonal`、`npm run build`；改 shader 后浏览器硬刷新再看画布。  
10. **不要编辑 plan 文件 unless 用户要求**；本次用户曾明确要求不改 plan 本体。

### 常用命令

```bash
npm run dev
npm run lint
npm run verify:tonal
npm run build
```

### 环境变量（本地 `.env`，勿提交密钥）

- `VITE_GEMINI_API_KEY`
- `VITE_KIMI_API_KEY`
- `VITE_AI_PROVIDER`（可选：`gemini` | `kimi`）
