# 像素素材工坊：后续模型接手说明

## 0. 当前批准范围与边界

2026-11-22（Asia/Shanghai），用户批准这版生成式像素环境，并要求 commit/push、整理工坊供后续模型优化。本轮只整理预览与制作链，不再自行重画、扩展玩法或制作大型编辑器。

- **当前风格是像素，不是纸艺。** 环境允许使用用户要求生成的图像资产；旧文档的“所有美术必须代码绘制/禁止图像”对这批环境已被覆盖。
- 保持角色/武器原图与定义、移动操作、自动攻击、碰撞、地图道路走线与宽度、掉落与成长等玩法不变。
- `?seed=7` 固定的是游戏世界，不是云端图像生成。不要声称可通过固定 seed 重现本批生成，也不要声称选择了工具未暴露的模型。
- 目标稿只是风格参考，**不能当整张游戏背景**；不要复制其中角色。场景实际由透明独立物件、地表和既有场景渲染组成。
- 编译/测试通过不等于新的美术调整已获批准。后续每次改画仍需相同位置实机对照，不能只展示概念图。

## 1. 三分钟打开工坊

依赖：Node.js 22+、npm、Python 3。只运行游戏不需要 Pillow/numpy。

```sh
npm ci
npm run build
npm start
# 默认 http://localhost:4173/
```

| 入口 | 用途 |
| --- | --- |
| `/?gallery=1&assets=generated` | **优先入口**：只看全部 36 个当前编译素材，包含两栋房、树/灌木、围栏/灯、道具与地表 |
| `/?gallery=1` | 原有图鉴，顶部新增同一批素材；保留角色、敌人、武器、地标等原有内容 |
| `/?gallery=1&assets=generated&check=value` | 同一素材预览的灰度检查 |
| `/?gallery=1&assets=generated&check=gloss` | 原有技术光泽检查，不能代替美术判断 |
| `/?start=1&seed=7` | 固定世界、当前保存角色的实机开场；往南检查相邻一屏道路接缝 |

素材预览直接调用游戏使用的 `drawVillageSprite`，不是另外一套静态缩略图；标签就是可搜索的资产键/文件名（如 `barn`、`tree0`、`earth`）。缩放适配卡片，实际大小、叠放与遮挡要在游戏内检查。工坊不会启动模拟或音频。界面已有中英切换。

若默认端口已占用，勿随意停掉别人的服务，可用：

```sh
python3 -m http.server 4177 --directory site
```

`review=generated` 只是本轮对照链接标记，不是渲染风格开关。代码没有像素/纸艺切换。

## 2. 文件地图：不依赖本地临时目录

| 仓库路径 | 作用 |
| --- | --- |
| `assets/village/generated/raw/cottages.jpg` | 两栋房屋的原始生成表，未覆盖原字节 |
| `assets/village/generated/raw/nature-props.jpg` | 树、灌木、岩石、围栏、灯与树桩原表 |
| `assets/village/generated/raw/surfaces.jpg` | 草地、土路、石铺、落叶地表原表 |
| `assets/village/generated/raw/yard-details.jpg` | 南瓜、蜡烛、种植箱、柜、蕨类、盆栽原表 |
| `assets/village/generated/reference-target.jpg` | 当时提供的整屏生成目标稿，仅作风格参考，不参与像素编译 |
| `assets/village/generated/GENERATION_REQUESTS.json` | **实际四次**资产生成请求的完整提示词、比例、原输出文件名与本地参考路径 |
| `assets/village/generated/PROVENANCE.json` | 原表/参考/atlas SHA256、裁切参数、处理清单、工具与模型能力边界 |
| `scripts/prepare-generated-village.py` | **当前唯一制作入口**：离线提取/透明化/调色/编译，路径均相对仓库 |
| `scripts/requirements-art.txt` | 本检查点实际使用的 Pillow/numpy 版本 |
| `assets/village/generated/*.png` | 处理后的独立透明素材/可重复地表与 `atlas.png` |
| `assets/village/manifest.json` | 当前 atlas 各裁片的 `[file,x,y,w,h,ax,ay]`，由脚本生成，不手改 |
| `src/render/village-pixels.ts` | 游戏实际使用的颜色表和索引行，同步数据，无图片加载竞态 |
| `src/render/village-art.ts` | 像素行绘制、缓存、脚点、装饰分发、地表相位 |
| `src/render/road-art.ts` | 路网并集的绘制边缘与全局相位；不定义模拟道路 |
| `src/render/pixel-decor-bounds.ts` | 缓存/剔除/遮挡共用的包围盒 |
| `src/render/homestead-layout.ts` | 既有两栋房的落点、门前步道与菜地布局 |
| `src/ui/gallery-layout.ts`、`src/render/gallery.ts` | 工坊条目/布局与真实素材绘制 |
| `tests/village-assets.test.mjs`、`tests/village-road.test.mjs`、`tests/gallery.test.mjs` | 来源、透明度、可衔接地表、路网/预览回归 |

部署构建只输出 `site/` 的 HTML/CSS/JS、明确许可的字体和素材来源说明；游戏像素数据随 JS 输出。原始 JPG/参考图和制作 PNG 留在仓库供优化，不会被构建脚本无差别发布。

### 当前来源 vs 被替换旧来源

`assets/village/SOURCE.txt` 顶部说明**现用生成资产**，下面保留被替换 Ninja Adventure 包的来源/CC0 授权。CC0 只适用于旧包，不代表对新生成图作了 CC0 声明。

旧 PNG、`adaptations.json` 和 `scene-retouch.png` 保留用于历史核对。原旧 manifest 在 `assets/village/legacy/manifest.json`；`scripts/prepare-village-assets.py` 是**停用历史脚本**，只输出到 `assets/village/legacy/village-pixels.ts`，不会覆盖当前游戏数据。不要拿旧包给现用生成素材补写来源，也不要用旧脚本代替本节入口。

## 3. 两种“重现”不要混淆

### A. 可离线复现：从已入仓原图处理到游戏数据

建议用独立 Python 环境，勿把环境目录或服务产物提交：

```sh
python3 -m venv .venv-art
. .venv-art/bin/activate
python3 -m pip install -r scripts/requirements-art.txt
npm run art:prepare
# 等价于 python3 scripts/prepare-generated-village.py
npm run build
npm test
```

依赖版本是本检查点实际运行版本；若未来换版本导致量化输出有差异，应记录版本、检查 diff 并重新验收，不能默认为同一张图。`npm run build` 不会偷偷调用模型或修改原始图；生成像素数据已入仓，普通构建无需 Python 图像库。

### B. 不保证可重现：再次请求云端重画

本批工具为 `cursor.studio.GenerateImage`，成功调用 **4 次**（不计此前由父级生成目标稿的那次）。当时接口只提供 description、参考路径、比例和文件名，没有暴露模型或 seed 选择。保存原图才是精确重现处理结果的基础。

四次实际请求见 `GENERATION_REQUESTS.json`，其参考路径已改为仓库文件。目标稿本身是父级此前生成结果，**此前那次的提示词/模型/seed 未在本批记录，不补造**。新模型使用这些请求可以延续风格，但不能保证云端返回逐像素一致，也不应擅自再次生成或消耗付费服务。

## 4. 当前处理配方（以脚本为准）

1. **保留原表**：四个 `raw/*.jpg` 不作原地保存或滤镜处理；出处与 SHA256 写入 provenance。
2. **定位独立物件**：脚本 `spec` 记录每个物件的来源、裁切框、目标逻辑宽度和可选横向脚点。裁切框使用 **1024×576 规范坐标**，实际 JPG 为 1280×720 时先按宽高比例换算；不能直接当真实像素坐标剪。
3. **透明化**：按洋红色域清除非纯色/JPEG 压缩溢色；保留最大四连通轮廓并取 alpha 包围盒。再次清除采样后的游离碎点。Alpha 只有 0/255，围栏孔隙保持透明。
4. **统一像素尺度**：物件使用最近邻缩放，运行时 `VILLAGE_PIXEL=2`（每个逻辑像素占两个世界单位）；不锐化旧素材，不用粗几何代替已生成的细节。受游戏物件比例限制，原表仍比运行时素材更大。
5. **地表衔接**：从地表四象限向内裁去边缘，缩为 128×128 逻辑像素。相对两边在 14 像素窄带作对称 crossfade，边界像素一致；不是把整张有角色的图铺背景。量化后仍检查首尾行/列一致。
6. **调色**：对全部物件和地表做最多 224 色的共享中位切分量化（无 dithering）。透明区域不参与洋红底色训练；当前有效不透明颜色为 199。没有叠加锐化滤镜或把旧包重新滤一遍。
7. **衍生片**：`pebble` 来自同批生成岩石，`herb1` 复用同批盆栽；`soil00`～`soil22` 取同批 earth 并制作透明方向边缘；`grass0`～`grass4` 是同批 meadow 小裁片。
8. **编译**：保存独立 PNG、atlas、manifest、provenance，再编译到 `village-pixels.ts`。索引 0 表示透明，运行时按同色水平段绘制并缓存；无需异步加载图片，兼容 worker、离线和 Node 测试。

当前 36 个条目全部可在工坊查看，不代表都已独立布置到开场：例如 `pine`、`paving`、`forest` 是可用的同批补充；主草地使用 `meadow`，道路使用 `earth`。旧 `grass0`～`grass4` 名称/API 保留作兼容，主地表不靠随机小贴片填满。

## 5. 后续替换规则：不破坏场景和玩法

- 优先替换 `raw/` 对应生成表并更新请求记录，再修改脚本 `spec`/地表裁切；**不要手改生成的 TS、atlas 或 manifest**。保留真实原图，来源不是“某最强模型”这样的推测。
- 保持资产键稳定：`barn` 是蓝灰屋顶、`cottage` 是红瓦房。新增键会自动进入工坊，但游戏内是否采用仍由装饰分发/布局控制。
- **脚点**：`ax,ay` 单位是裁片逻辑像素。竖向物件以脚底为 Y 排序基准（通常 `ay=height`）；房屋以门槛/踏步点为基准，不按屋顶中心定位。草地/土块等平面 tile 用 `(0,0)`，不能套用树的脚点。
- 目前房屋在原布局点 `(x+23*s,y+29*s)` 对齐原门前步道；脚点比例分别在脚本 `spec`，不要通过挪地图或增加隐形碰撞迁就美术。
- 若改变轮廓大小，须同步检查 `pixel-decor-bounds.ts`，它同时影响缓存分配、视口剔除和遮挡；不要只扩大透明缓存冒充有效美术包围盒。
- 保持独立透明 sprite、原有 Y 排序和角色前后遮挡机制；禁止把整屏目标稿作为背景，也不要带入目标稿的猫、武器或 UI。
- 地表与道路使用**绝对世界坐标相位**，包括负坐标与 chunk 边界。不要每个 chunk 从纹理 `(0,0)` 重新铺。
- 道路绘制必须按道路并集的外侧露出草边：各 capsule 的最小 SDF 只给并集覆盖关系，重叠时不一定是外边界距离。当前对覆盖内部边用有限 2-unit 栅格外部距离查询；单段露出边保留解析精度。不要重新画出内部草缝，也不要填掉右侧两条路之间**真实存在**的草隙。
- 不改 `src/game/world-gen.ts`、模拟 footprint、碰撞、角色/武器定义或随机序列。渲染不消费模拟 RNG。
- 手机普通提示已收入 HUD 内单行，危险提示允许换行；保留本轮 `styles.css` 修复。

## 6. 每次改动后的验收

```sh
npm run art:prepare
npm run build
npm test
# 检查是否只更新了预期素材/来源/生成文件
git diff --check
git status --short
```

可重复运行 `npm run art:prepare`，对比 `src/render/village-pixels.ts` 和 `assets/village/generated/atlas.png` 的 SHA256 应相同。新增生成表时同步更新来源与请求记录，来源测试会检查原图哈希、alpha、脚点、地表边缘和 atlas 裁切。

浏览器检查至少包括：

1. `/?gallery=1&assets=generated` 全部素材真实可见，尤其房屋、树、围栏和灯；再看 `check=value`。
2. `/?start=1&seed=7` 开场同位置前后对比，确认不是缓存/旧构建；同时看房屋比例、脚点与门路衔接。
3. 往南走一屏，检查路网内部无伪草缝、真实并行路间隙仍存在、地表跨 chunk 不跳相位。
4. 桌面和手机比例，检查 HUD、遮挡及镜头裁切。静态图不能证明触控、性能或整局玩法已测。

## 7. 本检查点验收与明确遗留

用户已批准现版继续交付。父级本轮已检查桌面 **1920×1072** 与手机比例 **393×852** 的实机画面，可交付；这是该版本的视觉记录，不自动覆盖未来改画。工坊整理前自动测试为 479 项通过；增加同源预览与实际绘制回归后，本次提交前 `npm run build`、`npm test`（481 项通过，0 失败）和 `git diff --check` 均通过。

后续模型优先清单（本轮不继续改审美）：

- 开场屋顶和菜地边缘的后续修正在第 9 节。更窄竖屏以角色附近的视野取景，房屋外侧仍可能位于视野外。
- 纹理重复感、物件比例和统一像素密度可进一步精修，不要退回低细节粗几何。
- 真机触屏、碰撞手测、完整一局、动画/音频听测和实际手机帧时尚未完成；不能用截图或 Node 测试代替。
- 当前工坊是最小可用的同源素材预览与可复现制作链，不是编辑器、地图编辑器或云端生成服务。

## 8. 提交与发布纪律

`dist/`、`site/`、`node_modules/`、`.venv-art/`、临时截图/日志不入仓。应提交原始生成表、参考/请求/来源、制作脚本、处理素材与当前编译像素，以及必要测试和交接文档。

用户本次最新明确指令是将已验收的像素环境和工坊正常合入并推送 **`origin/main`**；此前 `refactor/pixel-stacking` 是历史承载分支，不再是本次交付目标。合入前须检查远端历史关系并保留 main 现有提交；禁止 force、覆盖远端新提交或擅自部署。这是本次发布范围记录，不是后续推送的永久授权。普通 GitHub push 可能触发仓库既有自动化；本轮不手工执行部署，也不把 push 当成线上部署成功的证据。

## 9. 开场取景与土草边缘复核

以 `15d176d` 为基线。静止 90 个固定步后，旧版桌面跟随镜头切掉两边屋顶上缘。新镜头在开场给屋顶留空，玩家走向南边路口时平滑恢复跟随。门槛、步道走线和房屋脚点沿用现有位置。竖屏继续使用原有视野尺寸和像素比例。

菜地现以原轮廓在 2 单位网格上采样同批 `earth`。边缘四单位内用压暗的土色和小片露草过渡，形状在靠近斜边时也能保留。`soil00` 到 `soil22` 可在工坊查看。道路边缘同时读取世界 X、Y，消除了只随行变化的草边取样。道路与菜地共享相同的绘制网格及绝对相位，现有道路并集和真实草隙均有回归测试。

南边路口的桌面截图还暴露了被路面盖住半截的花盆。静态烘焙现在以每个装饰的完整像素轮廓预留路边空间，直接略过会被盖住的摆位。

在 Chromium 检查了 `?start=1&seed=7`，桌面 1280×720 和竖屏 393×852 均记录静止 90 步以及向南走 180 步的画面。`output/pixel-asset-review/homestead-{baseline,final}-{desktop,phone}-{start,south}.png` 可直接对照。竖屏另以触摸事件拖动摇杆并松手，镜头向南移动，摇杆正确归中。工坊的 36 项素材通过明度和光泽预览，完整图鉴的光泽违规与页面错误均为零，127 项物件和地标边界检查通过。

`npm run build`、`npm test`（483 项）和 `git diff --check` 通过。两只猫在两个种子下的 48 个固定输入快照与上一版一致。隔离目录用 Pillow 13.0.0 和 NumPy 2.3.5 执行 `npm run art:prepare`，生成的 atlas 和 TypeScript 文件与入仓版本逐字节一致。实际 iPhone Safari 帧时间尚未测量。本轮修正保存在本地提交。
