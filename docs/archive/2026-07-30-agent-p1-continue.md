---
name: P1 教学路线续作交接
overview: 教学优先 P0–P1.3 已落地。下一窗口优先：① /learn/lab 上传区与黑色预览合并；② 右侧滑块/曲线 Tab 切换；再按 P1.4→P1.6 推进。引擎追加式；禁止加回已否决功能。
todos:
  - id: lab-upload-into-canvas
    content: /learn/lab 合并上传区与预览区——去掉上方独立虚线「上传照片」框，无图时在黑色画布区直接拖拽/点击上传；有图后该区域只显示预览（可保留换图入口）
    status: pending
  - id: curve-panel-tabs
    content: 按用户反馈重构 /learn/lab 右侧：顶部切换「滑块调色 | 曲线调色」，先对齐教学架构再动 HSL
    status: pending
  - id: p14-hsl
    content: P1.4 追加 HSL（8 通道×H/S/L，默认 no-op）；同步 tonalMath + verify:tonal；/learn 下可先只暴露橙/黄/蓝
    status: pending
  - id: p15-special-lessons
    content: P1.5 曲线/HSL 专项关（S 曲线=对比度、抬黑点=褪色、减黄还蓝、橙通道护肤）
    status: pending
  - id: p16-match-loop
    content: P1.6 匹配目标图闭环（并排+闪回、横竖布局、像素/直方图 diff 评分；无热力图；MVP 可用纯 10 滑块配方）
    status: pending
  - id: rgb-curve-optional
    content: （可选）RGB 分通道曲线，紧随亮度曲线之后
    status: pending
isProject: false
---

> **已归档（2026-07-31）。** 当前真相 → [`docs/CURRENT.md`](../CURRENT.md)；活跃交接 → [`docs/handoff/2026-07-31-agent-slider-mastery.md`](../handoff/2026-07-31-agent-slider-mastery.md)。

# P1 教学路线续作 · Agent 交接

> Date: 2026-07-30  
> Branch: `develop`（与 `origin/develop` 同步；最新提交含亮度曲线）  
> 上一会话停点：P1.3 亮度曲线已合并；用户对曲线 UI 布局不满意，**尚未**做 P1.4 HSL

## 必读文档（按顺序）

1. `[.cursor/rules/engine-protection.mdc](../.cursor/rules/engine-protection.mdc)` — **alwaysApply 铁律**
2. `[docs/plans/2026-07-28-teaching-first-roadmap.md](../docs/plans/2026-07-28-teaching-first-roadmap.md)` — P0–P3 主路线
3. `[docs/plans/2026-07-29-p1-implementation-steps.md](../docs/plans/2026-07-29-p1-implementation-steps.md)` — **P1 分步与停点**
4. 本文件；更早引擎交接：`[docs/handoff/2026-07-28-agent-grading-engine-lr-alignment.md](./2026-07-28-agent-grading-engine-lr-alignment.md)`

关系说明：产品重心是**教学设计优先**。引擎线性光 10 滑块已稳定；新能力只许 **追加 stage / uniform / LUT**，默认 no-op。教学走 `/learn/`*，稳定前不塞进 `/workspace`。

---



## 问题定性 / 当前卡点

用户对「亮度曲线」与 lab 布局的反馈（commit `f82d953` + 后续口头/截图，勿忽略）：

1. **曲线位置不对**：不希望滑块和曲线挤在同一栏；需要在调色栏**顶部切换**「滑轮调色 / 曲线调色」两种页面。
2. **教学架构未想清**：原先是有曲线调色的基础概念辨析，现在加上曲线的教学，那曲线教学的板块和滑轮调色板块的关系是什么，是进阶还是并列关系，入口怎么设计？以及现在网站的入口和各板块之间的功能连接地非常混乱，建议每个功能界面都只链接首页即可。
3. **上传区与预览区合并（2026-07-30）**：`/learn/lab` 当前上方有独立虚线框「上传照片」，下方另有大块黑色「先上传一张照片」占位——用户要求**合并为同一区域**。无图时：该大区域本身即可点击/拖拽上传；有图后：同一区域显示画布预览（换图可用次要控件，不要再占一整条上传条）。实现时改 `LearnLabPage` + 必要时扩展 `UploadZone`（如 `variant="canvas"` / 把 drop 目标叠在 `containerRef` 上），**不要**拆成上下两块。

注意：提交信息写「HSL 曲线」是误称；仓库里落地的是 **亮度曲线 LUT（P1.3）**，**还没有** HSL 引擎。

---



## 已完成（可视为绿）



### P0 教学地基

- [x] before/after 闪回：`BeforeAfterFlash` + `GradingCanvas.setFilterEnabled(false)`（真原图，非中性滤镜）
- [x] 直方图示波器：渐变轴、幽灵基线（依赖 `onDragStart`）、翻译句；CPU `tonalMath` 路径
- [x] `/learn/lab` 隔离验收页
- [x] 引擎响应回归：`pipeline.ts` 曝光满幅 ±3 档（±50≈±1.5）；对比/白黑/色温色调去掉 0.85–0.9 衰减



### P1 已完成切片

- [x] **P1.1** 会话持久化：`useGradingStore` + `useSessionStore`（教案/步骤/滑块；**不** persist 图片；刷新需重传）
- [x] **P1.2** 课程壳 + 四辨析关：`/learn`、`/learn/lessons/:id`；诊断图在 `public/learn/*.jpg`
- [x] **砍掉 A/B 辨认题**（用户否决）：流程 = 介绍 → 拖滑块 → 完成本关 / 下一关
- [x] **P1.3** 亮度曲线：`curve.ts` 单调三次 → 256×1 LUT；shader 追加查表；`CurvePanel` 在 lab；`verify:tonal` 含 identity / 单调性（41 checks）



### 明确不做（禁止加回）

- 影响区域伪彩色可视化
- 差异热力图（匹配闭环主路径只用并排 + 闪回）
- 直方图 ↔ 照片像素联动（TonalRangeOverlay）
- A/B 辨认题 UI

---



## 未完成（下一窗口顺序）

建议严格按 [P1 分步文档](../docs/plans/2026-07-29-p1-implementation-steps.md) + 用户最新反馈：

1. `/learn/lab` **上传∪预览合并**（todos `lab-upload-into-canvas`）— 小改、立刻改善首屏
2. **曲线 UX / 教学分区**（todos `curve-panel-tabs`）— 未验收前不要急着上 HSL
3. **P1.4 HSL**（追加式 no-op）
4. **P1.5** 曲线/HSL 专项关
5. **P1.6** 匹配目标图（MVP 纯 10 滑块配方即可）
6. P2 清晰度家族（多 pass，**禁止**塞进当前单 pass shader）
7. P3 电影风格库

时间紧时可：**lab 布局 + 曲线 Tab OK 后 → P1.6（10 滑块）先闭环「操作层」**，HSL 作 P1b。

---



## 关键路由


| Path                 | 页面                         |
| -------------------- | -------------------------- |
| `/`                  | 首页（辨析课程 / 分析 / 工作台）        |
| `/analyze`           | 上传 + AI                    |
| `/workspace`         | 工作台（未接 lab 曲线 UI）          |
| `/learn`             | 四辨析关目录                     |
| `/learn/lessons/:id` | 单关：intro → explore → done  |
| `/learn/lab`         | 实验室：直方图 + 闪回 + 滑块 + **曲线** |
| `/debug/compare`     | 引擎对照                       |


验收：`http://localhost:5173/learn/lab`（改 shader 后**硬刷新**）

---



## 关键代码地图（增量）

```
src/
  engine/
    curve.ts                 # 控制点 → 单调三次 → bakeCurveLut
    shaders/grading.ts       # 追加 uCurveLut 查表（对比度/软肩之后）
    tonalMath.ts             # GradeUniforms.curveLut 可选
    filters/gradingFilter.ts # BufferImageSource LUT + updateCurveLut
    GradingCanvas.ts         # setCurvePoints
    useGradingCanvas.ts      # 同步 store / 外部 overrides
    pipeline.ts              # 仅 10 滑块映射；EXPOSURE_STOPS_AT_100=3
  components/
    CurvePanel.tsx           # lab 曲线编辑（待改为 Tab 分区）
    HistogramPanel.tsx       # 可跟 lumaCurve
    BeforeAfterFlash.tsx
  data/lessons/              # 四关数据（无 quiz）
  pages/learn/
    LearnLabPage.tsx
    LearnIndexPage.tsx
    LessonPage.tsx
  store/
    useGradingStore.ts       # persist adjustments + lumaCurve
    useSessionStore.ts       # persist analysis / stepIndex；image 不 persist
public/learn/
  l1-sky.jpg, l2-backlight.jpg, l4-portrait.jpg, l5-cast.jpg
```

诊断图文件名必须**全小写** `.jpg`。Windows 覆盖成 `L1-sky.JPG` 时 Vite 会 404 成 HTML，图/直方图全挂。

---



## 引擎铁律（复发清单）

- 追加不修改：默认 no-op（LUT identity、新 factor=1 / amount=0）
- 改 `grading.ts` 必须同步 `tonalMath.ts` + `npm run verify:tonal`
- 提交前：`npm run lint` && `npm run verify:tonal` && `npm run build`
- GLSL ES 1.0 **无** `tanh` → 用已有 `tanhCompat`
- 禁止 RGB 加法抬阴影；影调用 luma 比缩放
- 清晰度家族 = B 组多 pass，别硬写进单 shader

---



## 用户已拍板的产品决策

- 辨认题：**删除，勿加回**
- 影响区域 / 热力图 / 像素联动：**默认不做**
- 关卡流程：介绍 → 练习（直方图+闪回）→ 完成本关
- 曲线 UI：要 **Tab 切换**，不要滑块下面再塞一块曲线（待下一窗口做）
- lab 上传：虚线「上传照片」与黑色预览占位 **合并为同一块**（待下一窗口做）

---



## 建议下一窗口开场动作

1. 读完本文件 + engine-protection + P1 分步文档
2. 先做 `/learn/lab` **上传∪画布合并**（去掉上方独立 UploadZone 条）
3. 与用户确认：「滑块页 / 曲线页」各自的教学目标一句话
4. 在 `/learn/lab` 做右侧顶部切换，曲线默认仍 identity
5. 验收：对角线无副作用；S 曲线可见变化；硬刷新后仍正常
6. 用户点头后再开 P1.4 HSL



## 常用命令

```bash
npm run dev
npm run lint
npm run verify:tonal
npm run build
```

环境变量（本地 `.env`，勿提交）：`VITE_GEMINI_API_KEY` / `VITE_KIMI_API_KEY` / `VITE_AI_PROVIDER`