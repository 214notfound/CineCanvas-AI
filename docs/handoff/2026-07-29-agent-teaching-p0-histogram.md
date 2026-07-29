# Project Handoff

> Date: 2026-07-29  
> Session focus: 教学优先路线落地——P0 教学地基（before/after 闪回 + 直方图示波器化重构）；引擎保护区规则；砍掉像素联动与差异热力图  
> Related plans:
> - [`docs/plans/2026-07-28-teaching-first-roadmap.md`](../plans/2026-07-28-teaching-first-roadmap.md) — **当前主路线（P0–P3）**
> - [`.cursor/rules/engine-protection.mdc`](../../.cursor/rules/engine-protection.mdc) — **引擎追加式铁律（alwaysApply）**
> - [`.cursor/plans/cinecanvas_ai调色学习网站_3ddf509c.plan.md`](../../.cursor/plans/cinecanvas_ai调色学习网站_3ddf509c.plan.md) — 原产品计划（电影风格库仍 pending）
> - 上一份引擎交接：[`2026-07-28-agent-grading-engine-lr-alignment.md`](./2026-07-28-agent-grading-engine-lr-alignment.md)

关系说明：产品重心已从「AI 教案 + 拖滑块」转向**教学设计优先**。引擎线性光管线已稳定，本会话在其上**追加**教学工具，未改 `grading.ts` / `tonalMath.ts` / `pipeline.ts` 数学。

---

## 1. 项目简介

- **项目目的**  
  CineCanvas：面向「有摄影/审美基础、但不会调风格、不懂参数含义」的新手，用 AI 辅助 + 实操建立三层调色能力（机制 → 操作 → 品味）。教学质量由确定性策划内容保证；AI 只做诊断 / 解说 / 风格适配。

- **当前实现功能**
  - 上传 → 降采样 → Gemini/Kimi 分析 + 分步教案 → `/workspace` 滑块练习
  - 线性光 10 滑块引擎 + `verify:tonal`
  - **`/learn/lab` 对比实验室（P0 隔离验收页）**：上传 + 实时预览 + before/after 闪回 + 教学化直方图
  - `/debug/compare` 引擎对照页

---

## 2. 当前技术栈

与上一份 handoff 相同：Vite 6 + React 18 + React Router 6 + TypeScript + PixiJS v8 + Zustand + Zod + Tailwind v4；AI 为 Gemini / Kimi。

新增约定：

- 教学功能走 `src/pages/learn/*`，共享引擎，**不碰 `/workspace` 主路径**直到稳定。
- 引擎改动受 `.cursor/rules/engine-protection.mdc` 约束（alwaysApply）。

---

## 3. 当前项目状态

### 已完成（相对上一份 handoff 新增 / 确认）

- [x] 引擎线性光管线 + `verify:tonal`（见上一份 handoff）
- [x] **引擎保护规则** `.cursor/rules/engine-protection.mdc`
- [x] **教学路线文档** `docs/plans/2026-07-28-teaching-first-roadmap.md`
- [x] **P0.1 before/after 闪回**：`BeforeAfterFlash` + `GradingCanvas.setFilterEnabled`（关滤镜看真原图，不碰 shader）
- [x] **P0.2a 直方图示波器化**：自解释渐变轴、常驻大白话、「?」展开、幽灵基线、带方向的实时翻译句、一行文字诊断
- [x] 隔离页 `/learn/lab`（`LearnLabPage`）
- [x] `Slider` / `SliderPanel` 增加 `onDragStart`（幽灵基线在 pointerdown、改值前冻结）
- [x] 直方图用 **CPU `tonalMath.gradePixelLinear`** 算（不用 WebGL readback；曾踩过 extract/blob 坑）
- [x] **明确不做**直方图↔照片像素联动（TonalRangeOverlay）——已写入 roadmap
- [x] **明确不做（默认；非主路径）**差异热力图——额外认知负荷；匹配闭环主路径只用并排 + 闪回

### 未完成（P0 剩余 + 后续）

**P0 剩余：**

- [ ] 影响区域可视化（shader 亮度遮罩伪彩色叠加）
- [ ] 引擎响应幅度回归（`pipeline.ts`：曝光 ±50 仍偏弱，映射约 ±1.5 档）

**P1+（见 roadmap）：**

- [ ] 曲线 LUT + HSL（A 组，追加式 no-op 默认）
- [ ] 第一层辨析关卡 1/2/4/5；匹配目标图闭环（并排 + 闪回；无热力图）
- [ ] 会话持久化（zustand persist，刷新丢图）
- [ ] P2 清晰度家族（多 pass，勿硬塞单 shader）
- [ ] P3 电影风格库 + 首页选卡
- [ ] AI `targetRange` / 降级文案回归（勿引用产品里没有的工具）

---

## 4. 项目结构说明（增量）

```
src/
  components/
    BeforeAfterFlash.tsx    # 按住看原图 / 短按锁定
    HistogramPanel.tsx      # 教学直方图（示波器）
    Slider.tsx / SliderPanel.tsx  # 新增 onDragStart
  lib/
    histogram.ts            # 采样、computeGradedHistogram、翻译/诊断文案、幽灵 clone
  pages/
    learn/LearnLabPage.tsx  # P0 验收页
  engine/
    GradingCanvas.ts        # setFilterEnabled + sampleImageData（后者直方图未用）
    useGradingCanvas.ts     # { containerRef, showOriginal, showGraded, sampleImageData, imageEpoch }
docs/
  plans/2026-07-28-teaching-first-roadmap.md
.cursor/rules/engine-protection.mdc
```

路由：

| Path | 页面 |
|------|------|
| `/` | Home |
| `/analyze` | 上传 + AI 分析 |
| `/workspace` | 调色工作台（教学流未接 lab 新组件） |
| `/learn/lab` | **P0 对比实验室** |
| `/debug/compare` | 引擎对照 |

---

## 5. 核心设计决策（本会话）

- **为什么教学工具不进 `/workspace`？**  
  物理隔离：lab 崩了不影响主路径；稳定后再合并。

- **为什么 before/after 用关滤镜而不是中性 uniforms？**  
  中性滑块仍套基础 filmic S 曲线 ≠ 真原图。`setFilterEnabled(false)` 才是用户理解的「原图」。

- **为什么直方图是「示波器」不是「诊断仪」？**  
  初版只有「黑/中间调/白」+ 一行术语，小白看不懂 = 零教学价值。现角色：让用户**看见**滑块如何移动明暗分布（渐变轴 + 幽灵基线 + 整句翻译）。

- **为什么直方图走 CPU tonalMath，不走 WebGL extract？**  
  Pixi `extract` / 画布 readback 在本环境不稳定（曾出现 ready 但 canvas 全空）。`gradePixelLinear` 与 shader 对齐，且已有 `verify:tonal`。降采样源图 `loadHistogramSource` 用 `fetch(blobUrl)→createImageBitmap`（勿对 blob: 设 `crossOrigin`）。

- **为什么幽灵基线要 `onDragStart`？**  
  若只在 `onChange` 冻结，第一次采样已含新滑块值。必须在 pointerdown、改值前 `ghostEpoch++` 并 `cloneHistogram`。

- **为什么砍掉像素联动？**  
  拖滑块已能看画面变化 + 文字翻译足够建立关联；遮罩缩放易错位、ROI 低、做了难删。roadmap 记为**不做**，禁止「暂缓/二期」。

- **为什么砍掉差异热力图？**  
  伪彩色又是一套要学的仪表语言，叠在滑块+直方图之上增加认知负荷；闪回叠放几乎零新概念就能找差异。评分可用后台像素/直方图 diff，**不必**热力图 UI。记为**默认不做；非主路径**——除非产品点名，不要加回。

---

## 6. 当前代码状态

- **`src/pages/learn/LearnLabPage.tsx`**  
  功能：上传、预览、直方图、before/after、滑块；`ghostEpoch` 驱动幽灵冻结。  
  状态：可用；验收入口。

- **`src/components/HistogramPanel.tsx`**  
  功能：示波器 UI（渐变轴、「?」、幽灵、翻译句、文字诊断）。  
  状态：已落地；用户反馈「P0.2 很好」。

- **`src/lib/histogram.ts`**  
  功能：`computeGradedHistogram`、`describeSliderMotion`、`diagnoseHistogram`、`cloneHistogram`、`highlightForSlider`。  
  状态：文案与教学绑定；改翻译优先改这里。

- **`src/components/BeforeAfterFlash.tsx`**  
  功能：按住原图 / 短按锁定。  
  状态：可用。

- **`src/engine/GradingCanvas.ts` / `useGradingCanvas.ts`**  
  功能：预览 + 闪回 API；`sampleImageData` 仍在但直方图主路径未依赖。  
  状态：hook 返回对象（非裸 ref）；`WorkspacePage` / `CompareDebugPage` 已解构 `containerRef`。

- **引擎三件套**  
  本会话**未改**数学；仍以上一份 handoff 为准。

---

## 7. 已知问题 / Bug

1. **引擎响应仍偏弱**：曝光 ±50 变化不够「示教级」；P0 仍有「响应回归」任务。  
2. **刷新丢会话**：zustand 未 persist；换图/刷新 blob URL 会变。  
3. **AI 降级文案**曾引用不存在的「色彩分级/污点修复」——改 prompt 时只写产品内真实功能。  
4. **HMR + shader**：改 `grading.ts` 后硬刷新（旧坑仍在）。  
5. **中性 ≠ 原图**：基础 S 曲线刻意存在；before/after 已用关滤镜规避误解。  
6. **仓库里有 `.tools/cloudflared.exe`**（体积大）：注意勿误提交到不该去的远程策略；gitignore 视团队要求。  
7. **working tree**：若本地还有未提交文件，以 `git status` 为准（直方图相关已有 commit `b030720`）。

---

## 8. 下一步开发计划

**P0 剩余（建议按此顺序）：**

1. 引擎响应回归（`pipeline.ts` 映射强度，目标 ±50 明显但不过火；跑 `verify:tonal`）  
2. 影响区域可视化（追加 overlay / 可选 debug uniform，**默认 no-op**，勿改现有 10 项数学）

**然后进 P1：** 曲线 + HSL（A 组追加）→ 辨析关卡 → 匹配目标图闭环（并排 + 闪回）→ 会话持久化。

**不要做：**  
- TonalRangeOverlay / 直方图区段→照片像素高亮（已否决）  
- 差异热力图主路径 UI（默认不做；非主路径）

---

## 9. 给下一位 Agent 的注意事项

1. **先读** `docs/plans/2026-07-28-teaching-first-roadmap.md` 与 `.cursor/rules/engine-protection.mdc`。  
2. **追加不修改**引擎三件套；改 `grading.ts` 必须同步 `tonalMath.ts` + `npm run verify:tonal`。  
3. **新教学功能继续放 `/learn/*`**，稳定前别塞进 `/workspace`。  
4. **直方图角色是示波器**：改 UI 时保留渐变轴 / 幽灵 / 整句翻译；不要退回术语小字。  
5. **像素联动、差异热力图均已否决（默认不做；非主路径）**——不要重新提案 unless 用户主动要求。匹配闭环只用并排 + 闪回。  
6. **验收页：** `http://localhost:5173/learn/lab`（dev 挂了就 `npm run dev`；曾出现 5173 进程死掉导致无法打开）。  
7. **幽灵基线**依赖 `onDragStart`→`ghostEpoch`；不要改回只在 `onChange` 采样。  
8. **提交前三连：** `npm run lint` && `npm run verify:tonal` && `npm run build`。  
9. **不要编辑用户未要求的 plan 文件**；roadmap / handoff 用户点名时再改。  
10. 引擎深坑（`tanh`、`uContrast`、禁止 RGB 加法抬阴影）见上一份 handoff §9 与 engine-protection 规则。

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

### 建议验收路径（给人 / 下一 agent）

1. `npm run dev` → 打开 `/learn/lab`  
2. 上传照片 → 拖曝光，看幽灵淡线 vs 彩色山 + 翻译句  
3. 点直方图「?」确认自解释文案  
4. 按住「对比原图」确认真原图（非中性滤镜）  
5. 确认 `/workspace` 仍可正常打开（仅 hook 解构变更）
