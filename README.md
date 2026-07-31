# CineCanvas

> 不是又一个滤镜 App，而是教有摄影直觉的人理解调色背后的「为什么」——机制、诊断、决策顺序、审美意图。

本地运行：`npm install && npm run dev` → 打开 [http://localhost:5173](http://localhost:5173)

<!-- 截图 / GIF 放这里（见文末「建议放什么视觉素材」） -->

---

## 在解决什么问题

市面上大多数「AI 调色」产品止于一键出片；用户拖完滑块，仍然说不清曝光和白色差在哪、为什么先救阴影再压对比。

产品主路径（首页唯一入口）：**显影** → **临摹** → **冲印**。细节与进度以仓库文档为准，避免多份真相：

→ **[`docs/CURRENT.md`](docs/CURRENT.md)**（当前真相）  
→ **[`docs/plans/2026-07-31-slider-mastery-plan.md`](docs/plans/2026-07-31-slider-mastery-plan.md)**（实施计划）

AI 只放在可靠位置（诊断、选库、解说）；教学质量由固定诊断图、人工校准配方、可验证渲染数学托底。

---

## 进度（摘要）

### 已实现

- **WebGL 实时调色引擎**（PixiJS v8 + 自定义 GLSL）：10 滑块线性光管线 + `verify:tonal`
- **亮度曲线**（LUT，默认 identity；教学轨暂不扩张）
- **AI 诊断 + StepCoach**（Gemini / Kimi；风格锚点卡待接）
- **`/learn/lab`**：闪回、教学直方图、滑块 + 曲线
- **四辨析关**（无小考）+ 会话持久化（滑块/教案）

### 进行中（见 CURRENT）

- 评分内核 + MatchStage + 风格审美库（临摹）
- 首页「显影 / 临摹 / 冲印」与统一调色台（实验室取代工作台入口）
- 冲印接审美库（2–3 方向）；HSL / 清晰度家族后移

---

## 技术难点与决策

### 1. 渲染质感：把「像不像 Lightroom」拆成可测标准

早期管线在 gamma 空间做曝光与阴影加法抬黑点，同配方发灰。问题不在「AI 审美」，而在色彩数学。

做法是重写成线性光单 pass，并把验收从主观观感改成可自动化的硬标准：

1. **黑场不被抬高**——提阴影不得抬绝对黑点  
2. **高光柔和滚降**——正高光区斜率随亮度递减（软肩）  
3. **阴影提亮不掉色**——影调用亮度比缩放 `c *= newLuma / oldLuma`，禁止对 RGB 做加法抬阴影  
4. **中性 ≠ identity**——全 0 仍套基础 filmic S 曲线（刻意对标「有起点的胶片感」）；真原图对比靠关滤镜，而不是假装中性滑块等于原图

Shader（`grading.ts`）与 CPU 镜像（`tonalMath.ts`）双轨同步；Node 跑不了 WebGL 像素断言时，用镜像守住回归。顺带踩过 GLSL ES 1.0 无内置 `tanh` → 整片黑屏的坑，用 `exp` 自实现 `tanhCompat`。

### 2. AI 输出可靠性：契约校验，而不是「希望模型听话」

多模态模型返回的 JSON 经常缺字段、区间越界、或夹 markdown 围栏。主路径不是「解析失败就弹错」，而是：

```
fetch → 去 fence → JSON.parse → zod 校验
  ├─ 失败 → 把 zod issue 喂回模型修复（最多 2 次）
  └─ 仍失败 → plain-text 降级建议（UI 可继续用）
```

教案每步锁定在产品真实存在的 10 个滑块枚举上，并带 `targetRange`；降级文案也约束为只引用产品内工具——避免模型编出「污点修复」这类不存在的操作。

### 3. 电影风格库：用量化锚点关住 AI，而不是让它「凭感觉编数值」

设计意图（API 已就绪，数据卡开发中）：

- 每张风格卡存人工校准的 `targetAdjustments`（与 10 滑块同枚举、同值域）
- AI 只做「当前照片状态 → 锚定目标」的差异化解释与分步解说
- 观感由确定性配方托底，模型负责适配与教学话术

这是刻意的能力边界：把生成式能力关进可控笼子，而不是把成片审美外包给一次温度随机的 completion。

### 4. 教学工具与引擎解耦

新教学能力走 `/learn/*`，稳定前不塞进 `/workspace`。直方图用 CPU `tonalMath` 算（避免 WebGL readback 不稳定），幽灵基线必须在 `pointerdown`、改值前冻结——否则第一条「对照线」已经含新滑块值，教学语义就错了。

影响区域伪彩色、差异热力图等「看起来很炫」的仪表，在实测后明确不做：拖滑块看画面 + 直方图示波器已够建立参数直觉，再叠一套伪彩色语义只会增加认知负荷。

---

## 技术栈

| 层 | 选型 |
|---|---|
| 应用 | Vite 6 · React 18 · TypeScript · React Router 6 · Tailwind CSS v4 |
| 渲染 | PixiJS v8（WebGL 运行时）+ 自定义 GLSL fragment shader |
| 状态 | Zustand（会话 / 滑块分 store；persist） |
| AI | Gemini（默认）/ Moonshot Kimi · Zod 契约 · Provider 抽象 |
| 验证 | `tonalMath` CPU 镜像 + `scripts/verify-tonal.ts` |

---

## 本地开发

```bash
npm install
cp .env.example .env   # 填入 VITE_GEMINI_API_KEY 和/或 VITE_KIMI_API_KEY
npm run dev
```

常用验收：

```bash
npm run lint
npm run verify:tonal
npm run build
```

| 路径 | 用途 |
|---|---|
| `/learn` | 四辨析关目录 |
| `/learn/lab` | 直方图 + 闪回 + 滑块 + 曲线实验室 |
| `/analyze` → `/workspace` | AI 诊断 → 分步练习 |
| `/debug/compare` | 引擎对照（灰阶 / 自备 LR 导出） |

改 shader 后请**硬刷新**浏览器——HMR 有时会握着旧的坏 filter。

---

## Roadmap

接下来会做的事（按依赖，不是愿望清单）：

1. **实验室 UX**：上传区与预览合并；右侧「滑块 / 曲线」Tab 分区  
2. **操作层闭环**：匹配目标图（并排 + 闪回 + 图像差异评分）  
3. **HSL 追加式引擎** + 专项辨析关（如「减黄还蓝」）  
4. **电影风格库**：量化风格卡 + 首页选片入口，接上已有 `generateFilmSteps`  
5. **清晰度家族**：独立多 pass 架构（清晰度 / 纹理 / 锐化），不污染当前单 pass  
6. 全分辨率导出；可选把 `verify:tonal` 挂进 CI  

---

## 建议放什么视觉素材

调色是视觉产品，README 顶部一张动图比十段文字有用。建议准备：

1. **主 GIF（约 10–15 秒，放标题正下方）**  
   `/learn/lab`：上传 → 拖曝光/阴影 → 直方图幽灵基线移动 + 翻译句更新 → 按住「对比原图」闪回。  
   一眼能看懂「这是在教参数，不是套滤镜」。

2. **静帧：工作台教案**  
   `/workspace` 一侧滑块、一侧 StepCoach / 目标区间高亮——体现 AI 诊断 → 结构化练习。

3. **静帧：辨析关**  
   `/learn/lessons/...` 介绍文案 + 只开放相关滑块——体现「机制层」不是营销口号。

4. **（可选）引擎对照**  
   `/debug/compare` 灰阶或真图分屏——给技术向读者看「渲染是认真验过的」。

截图请用真实照片，避免纯 UI 空状态；GIF 优先横图、控制台可读、不要加营销贴纸。

---

## License

Private / educational prototype — 用途以仓库设置为准。
