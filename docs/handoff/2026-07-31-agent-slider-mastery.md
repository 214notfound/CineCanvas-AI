# 交接 · 2026-07-31 产品重定 + 文档归位（无功能代码）

> Date: 2026-07-31（收工）  
> Branch: `develop`  
> **Active handoff** — 旧交接在 [`docs/archive/`](../archive/)  
> 本窗口**几乎只改文档与产品决策**，未实现 M1+ 功能代码。改动多半还在 working tree，**可能未 commit**——开窗先 `git status`。

---

## 必读顺序（下一个 agent 先读这些）

1. [`.cursor/rules/engine-protection.mdc`](../../.cursor/rules/engine-protection.mdc) — 引擎铁律  
2. [`docs/CURRENT.md`](../CURRENT.md) — **唯一当前真相**（主路径 + 文档规范）  
3. [`docs/plans/2026-07-31-slider-mastery-plan.md`](../plans/2026-07-31-slider-mastery-plan.md) — **当前主计划**（工程量、CoachPack、审美库、冲印选库）  
4. 本文件  

**不要**再按旧 P1 顺序做「曲线 Tab → HSL → 专项关」。那份已被取代（文首有说明）。

**不要**只改 `C:\Users\15005\.cursor\plans\` 里的会话计划——权威副本在仓库 `docs/plans/`。改完计划必须写进仓库。

---

## 今天干了什么

### 1. 产品形态拍板（重点）

从「继续堆曲线/HSL」改为：**先把 10 滑块教学跑通**，核心指标是「用户能学会调色」。

| 入口 | 路由/流 | 定稿小字 |
|------|---------|----------|
| **显影** | `/learn/intro` → 四辨析 | 先搞懂光是怎么变成一张有情绪的照片 |
| **临摹** | `/learn/styles` | 拿一张你喜欢的电影截图，学着调出那种味道 |
| **冲印** | 上传/分析 → 统一调色台 | 上传自己的照片，从头调一遍，调成你想要的样子 |

其它已拍板：

- **首页唯一入口**；非首页**只回首页**（砍交叉跳转）  
- **实验室取代工作台**作唯一调色台；首页不出现「工作台」字样；`/workspace` 待合并或重定向（M5）  
- **辨析关不设小考**（介绍 → 自由拖 → 按钮完成）——曾误写入「关末小考」，已撤销  
- **曲线 / HSL / 清晰度**：本阶段教学轨后移；曲线可留在调色台，不单独做课  
- **临摹 = 选风格 → 临摹 → 可选迁移到自己的图**（电影/大师与仿色合并为一条流）  
- **冲印**吃同一审美库，不是让 AI 裸奔编品味  

### 2. M0 文档归位（已落地到仓库文件）

| 动作 | 结果 |
|------|------|
| 新建 | `docs/CURRENT.md` |
| 主计划入库 | `docs/plans/2026-07-31-slider-mastery-plan.md` |
| 活跃交接 | 本文件 |
| 归档 | 旧 3 份 handoff + `.cursor/plans` 两份旧计划 → `docs/archive/` |
| `.cursor/plans/` | 只留 README，指向 `docs/` |
| 旧 roadmap / P1 | 文首标「已被取代」 |
| `README.md` | 进度摘要改指 CURRENT |

`git status` 预期：大量 docs 新增/移动、README 修改；**功能源码应无业务 diff**。

### 3. 计划内设计修正（写进主计划，未写代码）

**CoachPack（§4）**

- 删掉 `opening: string`（一句总览太弱）  
- 改为 `keyTraits: string[]`：进关、拖滑块前展示的 **3～5 条调色关键点**，每张卡按片/风格**单独手写**，禁止套模板、禁止运行时 AI 生成  
- 例《爱乐之城》：高饱和 / 强对比色 / 高对比度 / 暗角  
- `when` 仍负责拖动中的风格差异化实时文案（六维信号映射）  

**暗角缺口（已知，不做引擎）**

- 10 滑块 + 6 反馈维都**没有暗角**  
- `keyTraits` 可写「暗角」作介绍；实时反馈练不到、也调不了  
- 建库选片：避开强依赖暗角，或接受「介绍有、练习无」  

**冲印选库 L4（§8.3）——改掉标签两段式**

- ~~A 诊断打标签 → B 代码标签交集 Top 2–3~~  
- **MVP（库 ≤10）**：一次 AI 调用 = 用户照片 + 全库 `name`/`blurb`/`keyTraits` → 选出 2～3 个 **合法 `styleId`**；zod 校验 id ∈ 库，非法重试  
- **删除**：`StyleTag`、`tags`、`fitWhen`、交集打分公式  
- **保留**：用户点选 → `generateFilmSteps`（recipe 锚点）→ ±15 微调护栏  
- **库 ≥20** 再考虑「粗筛 → AI 精选」  

**反固化**：recipe 是目标观感锚点，评分看画面不看滑块数；提示不点名滑块。

---

## 下一个窗口做什么

严格按主计划里程碑，**从 M1 开始写代码**：

1. **M1** `gradeImageData` + `scoreMatch` + `diffHints` + `calibrate-match`（从 `histogram.ts` 抽循环；**不碰 shader**）  
2. **M2** MatchStage：进关 `keyTraits` → 实时分 + `when`  
3. **M3** `/learn/intro`（可与 M1/M2 并行）  
4. **M4** 风格库数据 + 临摹流（内容是瓶颈；选片注意暗角）  
5. **M5** 首页三入口文案 + 统一调色台 + 导航收敛  
6. **M6** 冲印单步 AI 选库 + 教案  

停点：每里程碑等用户验收；尤其 M1/M2 阈值与 M4 内容。

---

## 注意事项（易踩坑）

1. **引擎保护区**：`grading.ts` / `tonalMath.ts` / `pipeline.ts` 追加式；本阶段评分走 CPU，预期不改 shader。若改了：同步 tonalMath + `verify:tonal` + 硬刷新。  
2. **已否决勿加回**：辨析小考、A/B 辨认题、影响区域/热力图、像素联动、曲线 Tab 优先、标签打分选库（MVP）。  
3. **文档 SSOT**：改产品决策先改 `docs/plans/2026-07-31-…` 与 `CURRENT.md`，再改代码。  
4. **commit**：今天文档变更若未提交，先与用户确认是否要 commit，再开 M1。  
5. **诊断图文件名**：`public/learn/*.jpg` 须全小写（旧坑）。  
6. **会话计划陷阱**：Cursor 可能把计划写到用户目录 `~/.cursor/plans/`——以仓库为准。

---

## 可复用代码锚点（M1 起步）

- 逐像素 CPU 调色循环：[`src/lib/histogram.ts`](../../src/lib/histogram.ts)（抽成 `gradeImageData`）  
- `gradePixelLinear`：[`src/engine/tonalMath.ts`](../../src/engine/tonalMath.ts)  
- 滑块 → uniform：[`src/engine/pipeline.ts`](../../src/engine/pipeline.ts)  
- 已有 `generateFilmSteps` + `buildFilmStylePrompt`：冲印 D 步可复用，输入改为 `StyleCard.recipe`  
- 四辨析关：[`src/pages/learn/LessonPage.tsx`](../../src/pages/learn/LessonPage.tsx)（完成仍是按钮，勿擅自加小考）

---

## 验收命令

```bash
npm run lint
npm run verify:tonal
npm run build
```

本地预览：`npm run dev` → http://localhost:5173/
