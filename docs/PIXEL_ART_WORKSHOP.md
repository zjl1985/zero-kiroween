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

按用户规则，Python 优先通过 uv 运行，标准命令是：

```sh
uv run --with pillow==13.0.0 --with numpy==2.5.5 python scripts/prepare-generated-village.py
```

**仅限本沙箱的变通做法**：2026-11-22 细节轮所在的沙箱没有网络，`~/.cache/uv` 只读，上面的命令无法解析依赖。当时改用 uv 缓存里已解包的同版本 Pillow 13.0.0 / numpy 2.5.5 离线运行（路径属于这台机器，其他环境请用标准命令）：

```sh
export UV_CACHE_DIR=/tmp/kiro-uv-cache
export PYTHONPATH=/Users/zero/.cache/uv/archive-v0/39bL2HQoFyE8VZjf:/Users/zero/.cache/uv/archive-v0/7V5iKnEOkEZRAxK4
uv run --no-project --offline --python /Users/zero/.local/share/uv/python/cpython-3.12.12-macos-aarch64-none/bin/python3 python scripts/prepare-generated-village.py </dev/null
```

不要不带脚本参数调用 uv 的 python，否则会打开交互解释器挂住终端。连续两次运行的输出逐像素、逐字节一致；但这里的 Pillow 使用 zlib-ng，PNG 字节与别处生成的旧提交不同，解码后的像素相同。重新生成时所有 PNG 字节都可能变化，这不是像素改动。

**2026-11-23 美术重做工具（sprite-stacking 切片器）**：`scripts/iso-art/vendor/views_to_slices.py` 原样复制自 [danielwh2/sprite-stacking](https://github.com/danielwh2/sprite-stacking)（MIT，`LICENSE` 在同目录），把四张正交像素视图雕刻成体素切片条。本沙箱里 `~/.cache/uv` 不可写，必须把 uv 缓存指向仓库内被忽略的目录（这样能联网解析依赖）：

```sh
UV_CACHE_DIR=output/tools/uv-cache uv run --with pillow --with numpy python scripts/iso-art/vendor/views_to_slices.py --help
```

**2026-11-23 体素场景烘焙（FEAT-003）**：`scripts/iso-art/models.py` 用体素原语（盒、圆柱、椭球叶团、山墙/复折屋顶、圆锥、枝条）或 ASCII 三视图雕刻（`carve_views`，即 views_to_slices.py 的视觉外壳思路）建模；`voxel.py` 以固定 45°/2:1 角度逐像素光线投射烘焙（1 体素 = 2 x 2 世界单位、1 像素高），按面/法线分阶上色、缝隙 AO、亮边、深度轮廓、单像素 sel-out 外描边、发光锚点和 Bayer 抖动硬阴影；`build.py` 输出 `src/render/iso/gen/scenery-pixels.ts`（调色板索引 + 游程编码，两次运行字节一致）和 `output/iso-art/sheets/*.png` 接触表。院子占地等输入先用 `npm run build && node scripts/iso-art/dump-inputs.mjs` 写入 `scripts/iso-art/inputs.json`，再运行 `PYTHONDONTWRITEBYTECODE=1 UV_CACHE_DIR=output/tools/uv-cache uv run --with pillow --with numpy python scripts/iso-art/build.py`。

2026-11-23 实测此命令可用；备用的 `~/.local/bin/python3 scripts/iso-art/vendor/views_to_slices.py --help`（Pillow 12.3 + NumPy 2.5.1）也可用。离线渲染真实游戏画面用 `node output/tools/frame-shot.mjs --preset start-zero`（`@napi-rs/canvas` 只装在被忽略的 `output/tools/`，不是项目依赖），输出 PNG 后直接查看，不启动浏览器。

### B. 不保证可重现：再次请求云端重画

本批工具为 `cursor.studio.GenerateImage`，成功调用 **4 次**（不计此前由父级生成目标稿的那次）。当时接口只提供 description、参考路径、比例和文件名，没有暴露模型或 seed 选择。保存原图才是精确重现处理结果的基础。

四次实际请求见 `GENERATION_REQUESTS.json`，其参考路径已改为仓库文件。目标稿本身是父级此前生成结果，**此前那次的提示词/模型/seed 未在本批记录，不补造**。新模型使用这些请求可以延续风格，但不能保证云端返回逐像素一致，也不应擅自再次生成或消耗付费服务。

## 4. 当前处理配方（以脚本为准）

1. **保留原表**：四个 `raw/*.jpg` 不作原地保存或滤镜处理；出处与 SHA256 写入 provenance。
2. **定位独立物件**：脚本 `spec` 记录每个物件的来源、裁切框、目标逻辑宽度和可选横向脚点。裁切框使用 **1024×576 规范坐标**，实际 JPG 为 1280×720 时先按宽高比例换算；不能直接当真实像素坐标剪。
3. **透明化**：按洋红色域清除非纯色/JPEG 压缩溢色；保留最大四连通轮廓并取 alpha 包围盒。Alpha 只有 0/255，围栏孔隙保持透明。
4. **统一像素尺度（面积缩小）**：不再用最近邻缩放。每个逻辑像素取其覆盖源像素中非洋红部分的平均色，再与最接近的真实源色各占 50% 混合；覆盖率不低于 50% 才不透明，缩小后再保留最大四连通块。只平均非洋红像素，因此不会混入溢色（测试检查所有物件边缘无偏粉像素）。运行时 `VILLAGE_PIXEL=2`（每个逻辑像素占两个世界单位）。不加噪点、不加 dithering，也不用粗几何代替已生成的细节。
5. **选择性描边（sel-out）**：每个独立物件外轮廓的 1 像素内边，按自身色相加深（饱和度 ×1.25、明度 ×0.62），不是纯黑，也不扩大包围盒，让物件在深色草地上读得出轮廓。
6. **地表衔接**：从地表四象限向内裁去边缘，缩为 128×128 逻辑像素。每个轴在 24 像素边带内与错开半周期的副本按 smoothstep 权重混合（副本自身的中线接缝权重为 0），再做环绕的低频亮度拉平，最后令相对两边严格相等。外 14 像素边带与内部的平均亮度差在 4% 以内（有测试），`earth` 不再每 256 世界单位出现暗网格。量化后仍检查首尾行/列一致。不是把整张有角色的图铺背景。
7. **调色**：对全部物件和地表做最多 224 色的共享中位切分量化（无 dithering）。透明区域不参与洋红底色训练；当前有效不透明颜色为 188。
8. **衍生片**：`pebble` 直接从同批岩石源缩小；`herb1` 是独立条目，裁取同批盆栽在陶盆上沿以上的叶丛（17×12，底部中心脚点），**不再复用整只盆栽**，菜地里不会出现花盆。`soil00`～`soil22` 取同批 earth 的九个不同偏移，带断续浅垄沟、各开放边 1～3 像素不规则缺口和 1 像素暗边；`grass0`～`grass4` 取 meadow 的五个不同偏移。这些 tile 仍保留供测试与工坊使用；游戏里的菜地已改为下文的运行时绘制。
9. **编译**：保存独立 PNG、atlas、manifest、provenance，再编译到 `village-pixels.ts`。索引 0 表示透明，运行时按同色水平段绘制并缓存；无需异步加载图片，兼容 worker、离线和 Node 测试。`PROVENANCE.json` 的 `processing` 清单由脚本写出，与以上步骤一致。

运行时地表与阴影（`src/render/village-art.ts`，不改模拟）：

- **菜地**：`drawVillageSoil` 按 `pixel-yard-garden.ts` 的 `plotDistance`（到原多边形的有符号距离）逐逻辑像素取 `earth` 的绝对世界相位，边缘是 2～4 逻辑像素的不规则草边加 1 像素暗边；所有土像素都在原轮廓内，footprint 不变，不再按 32 单位格子拼 tile。数值在 `VILLAGE_GROUND`。
- **草地**：底层仍是 256 单位周期的 `meadow`，再以 4 单位块的低频噪声选择两层错相位（其中一层镜像）覆盖。结果只依赖绝对世界坐标，跨 chunk 与负坐标一致。
- **接地阴影**：房屋、树、灌木、岩石、围栏、灯、南瓜、蜡烛及院子道具下画扁平的阶梯椭圆半透明阴影（2 单位栅格，无模糊、无渐变），宽度取自物件底部不透明行，全部落在 `PIXEL_DECOR_BOUNDS` 内。平面 tile 没有阴影。工坊（`?gallery=1&assets=generated`）**刻意只显示原始素材，不带阴影**。

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
# 或用 uv：uv run --with pillow==13.0.0 --with numpy==2.5.5 python scripts/prepare-generated-village.py
# 无网络沙箱用第 3 节的离线 uv 变通命令
npm run build
npm test
# 检查是否只更新了预期素材/来源/生成文件
git diff --check
git status --short
```

可重复运行 `npm run art:prepare`（或第 3 节的 uv 命令），对比 `src/render/village-pixels.ts` 和 `assets/village/generated/atlas.png` 的 SHA256 应相同。新增生成表时同步更新来源与请求记录，来源测试会检查原图哈希、alpha、脚点、地表边缘亮度、偏粉边缘、sel-out、`herb1`≠`pot`、衍生 tile 偏移和 atlas 裁切；`tests/village-ground.test.mjs` 检查菜地只画在轮廓内且跟随 earth 相位、草地跨 chunk 一致且不是单纯 256 周期、阴影只给立体物件并在包围盒内。

不开浏览器时，可用离线复核图（`output/pixel-asset-review/`，不入仓）：`review_assets.py <tag>` 输出全部素材 2×/4× 拼图；`render-ground.mjs <dist> <out> [x0 y0 zoom]` 用已编译的 `dist/` 模块在 Node 里光栅化地面；`count-runs.mjs` 统计一个 chunk 的 fillRect 次数。它们是测试布局，不等于真实开场画面，也不能代替浏览器检查。

浏览器检查至少包括：

1. `/?gallery=1&assets=generated` 全部素材真实可见，尤其房屋、树、围栏和灯；再看 `check=value`。
2. `/?start=1&seed=7` 开场同位置前后对比，确认不是缓存/旧构建；同时看房屋比例、脚点与门路衔接。
3. 往南走一屏，检查路网内部无伪草缝、真实并行路间隙仍存在、地表跨 chunk 不跳相位。
4. 桌面和手机比例，检查 HUD、遮挡及镜头裁切。静态图不能证明触控、性能或整局玩法已测。

## 7. 本检查点验收与明确遗留

用户已批准现版继续交付。父级本轮已检查桌面 **1920×1072** 与手机比例 **393×852** 的实机画面，可交付；这是该版本的视觉记录，不自动覆盖未来改画。工坊整理前自动测试为 479 项通过；增加同源预览与实际绘制回归后，本次提交前 `npm run build`、`npm test`（481 项通过，0 失败）和 `git diff --check` 均通过。

后续模型优先清单：

- 房屋屋顶上缘仍有镜头/画面裁切问题，优化时先明确背景布局与可视范围，不移动玩法边界。
- 菜地硬边、32 单位格子、草地 256 单位重复、`earth` 暗网格和缺少接地阴影：**已在代码中处理**（`166af56`、`aa6eba6`），但只看过离线复核图，**未在浏览器中查看，也未经用户认可**。
- 离线复核中仍可见：`herb1` 在院子比例下略像砖块；`paving` 的 24 像素边带内有轻微重影；草地大范围缩放时仍有微弱规律感。
- 物件比例和统一像素密度可进一步精修，不要退回低细节粗几何。
- 真机触屏、碰撞手测、完整一局、动画/音频听测和实际手机（含 iPhone）帧时尚未完成；不能用截图或 Node 测试代替。
- 当前工坊是最小可用的同源素材预览与可复现制作链，不是编辑器、地图编辑器或云端生成服务。

### 2026-11-22 素材细节轮（本地，未推送）

只用已入仓的四张原表，没有新的生成调用。`166af56` 改制作脚本（面积缩小、sel-out、`herb1` 叶丛、地表边带、衍生 tile 偏移，188 色）；`aa6eba6` 改运行时（菜地、草地错相位、接地阴影）。验证：`npm run build`、`npm test` 488 项全部通过（起点 `15d176d` 为 481 项），`git diff --check` 通过；制作脚本连续两次输出哈希一致。没有打开浏览器，没有测 iPhone 或浏览器性能，美术未经用户认可，没有推送或部署。用户自查可运行 `node output/playwright/open-work-shot.cjs`，或打开 `/?gallery=1&assets=generated` 与 `/?start=1&seed=7`。

## 8. 提交与发布纪律

`dist/`、`site/`、`node_modules/`、`.venv-art/`、临时截图/日志不入仓。应提交原始生成表、参考/请求/来源、制作脚本、处理素材与当前编译像素，以及必要测试和交接文档。

用户本次最新明确指令是将已验收的像素环境和工坊正常合入并推送 **`origin/main`**；此前 `refactor/pixel-stacking` 是历史承载分支，不再是本次交付目标。合入前须检查远端历史关系并保留 main 现有提交；禁止 force、覆盖远端新提交或擅自部署。这是本次发布范围记录，不是后续推送的永久授权。普通 GitHub push 可能触发仓库既有自动化；本轮不手工执行部署，也不把 push 当成线上部署成功的证据。
