# 猫猫守夜 / Midnight Meow

后续 agent 请先读 [HANDOFF.md](HANDOFF.md) 和 [PLAN.md](PLAN.md)；增加或修改内容时按项目技能 [`.kiro/skills/midnight-meow-dev/SKILL.md`](.kiro/skills/midnight-meow-dev/SKILL.md)（英文）操作。**当前只做一种纸片画风，不是双画风。**

一座由代码绘制的纸片夜镇：有纸张纤维、切边厚度、层叠投影、缝线、暖窗、秋树和弯曲小路。玩法是类 Vampire Survivors 的 roguelike：选一只猫，在有界的种子地图（最多 10 × 10 屏）里跟着镜头走街串巷，守满 10 分钟到天亮。途中收集墨晶升级武器与被动，从精英掉的宝箱里进化，穿过五个分区，发现钟楼、南瓜田、石桥、纸风车磨坊等地标，击退墨团群（同时最多 100 只）与追猎的 Eraser Boss。纸做的篱笆、草丛、稻草人、草垛会被撕碎或烧掉，火会在纸草间蔓延。

场景没有使用背景图片、贴图素材或生成图片。纹理、纸片造型、角色与光照均由 TypeScript / Canvas 生成；离屏 Canvas 只缓存这些绘制结果。音效由 Web Audio 振荡器与生成噪声合成，没有音频文件。

## 运行

需要 Node.js 22+、npm，以及 Python 3（仅用于本地静态预览，Vercel 不需要 Python）。

```bash
npm ci
npm run build
npm start
```

打开 <http://localhost:4173/>。`npm run build` 先编译到 `dist/`（供测试），再生成独立发布目录 `site/`；`npm start` 只提供 `site/`，与部署内容一致。修改源码后需要重新构建，当前没有热更新。

- <http://localhost:4173/?start=1>：跳过标题，直接用保存的角色开始一局。
- `?seed=N`（例如 `/?start=1&seed=7`）：固定本局种子，便于复现。只接受 1–10 位十进制数字，范围 `0..4294967295`（含两端）；缺失、格式不合法或越界时，每局使用新种子，不会溢出回绕。
- <http://localhost:4173/?gallery=1>：纸片工坊图鉴页，列出所有已注册的猫、敌人、物件（各种状态）、地标、分区、武器与被动，不启动游戏与音频。

## 部署到 Vercel

这是纯静态站点，不需要后端、数据库、环境变量或运行时服务。仓库已包含 `vercel.json`：

| 设置 | 值 |
| --- | --- |
| Framework Preset | Other |
| Root Directory | 仓库根目录（`.`） |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `site` |
| Node.js | 22 或更高的 Vercel 支持版本 |

1. 将包含本次改动的代码提交、推送到你自己的 Git 仓库。
2. 在 Vercel 的 **Add New → Project** 中导入该仓库，使用上述设置；构建命令和输出目录由 `vercel.json` 提供，不要覆盖成 `dist`。
3. 点击 **Deploy**。部署成功后可以打开首页、`/?start=1&seed=7` 和 `/?gallery=1`。

`site/` 每次构建都会重新生成，只包含 `index.html`、`styles.css` 和当前源码对应的编译后 JS；不包含 TS 源码、source map、测试、`.agents/` 或内部文档。开发编译目录中残留的已删除模块也不会发布。`.vercelignore` 另外排除 CLI 上传时不需要的本地文件。

资源文件名没有内容哈希，因此响应头要求缓存重新验证，避免新页面配上旧 JS。站点不需要 SPA 路由回退：上述模式都是首页的查询参数，缺失资源应正常返回 404。`npm start` 只用于本地预览，不是 Vercel 的启动命令。

**当前只完成部署适配和本地构建测试，尚未创建或验证线上部署。**

## 项目结构

内容按“定义 + 钩子 + 注册表”组织：每项内容是一个定义文件加一个放在旁边的美术文件，在索引里注册一行。

- `vercel.json` / `.vercelignore`：Vercel 静态部署配置与上传排除规则。
- `scripts/build-site.mjs`：生成发布目录 `site/`，排除开发文件和过期模块。
- `src/engine/`：与内容无关的注册表、事件总线、精灵缓存。
- `src/defs/`：内容定义。`index.ts` 注册猫、武器、被动、进化、敌人行为与敌人；`world-index.ts` 注册材质、反应、物件、地标与分区；`cats/`、`weapons/`、`passives/`、`evolutions/`、`enemies/`、`reactions/`、`props/`、`landmarks/`、`biomes/` 各放一项一个文件或目录；`horde.ts`、`progression.ts`、`fire.ts` 等放数值。
- `src/game/`：通用模拟（无 DOM）。`sim.ts`、`props.ts`（材质反应与火）、`stats.ts`、`world-gen.ts`（有界种子世界、分区、地标、道路，纯哈希）、`interactions.ts`；`characters.ts`、`upgrades.ts`、`enemies.ts` 是保留旧导出名的外观层。
- `src/render/`：`art-registry.ts` / `art-index.ts`（美术注册）、`paper-kit.ts` / `prop-kit.ts` / `variants.ts`（纸片工具与种子变体）、`craft-world.ts`（区块地面缓存、地标、立体书折叠、导航箭头）、`craft-props.ts`（物件与火）、`gallery.ts`、`timeline.ts`、`world.ts` 等。
- `src/ui/`：守夜手账 HUD、升级卡、角色选择、结算页、图鉴布局。
- `src/content/`：i18n（`keys.ts`、`en.ts`、`zh.ts`）。`src/audio/sfx.ts`：程序生成的音效与环境声。
- `.kiro/`：steering、spec、hooks 与开发流程技能 `skills/midnight-meow-dev/`（加猫、加武器 / 被动 / 进化、加敌人、加物件与反应、加地标与分区、i18n、纸片工具与图鉴、测试与提交的配方）。

原有像素场景代码保留在仓库内作为造型 / 布局参考，当前游戏入口只展示纸片场景，没有画风切换按钮。

## 角色与操作

开局在 Zero（男猫）和 Nicole（女猫）中二选一，局内只有选中的主角。

- **Zero**：起始武器喵线（远程直射）；留影冲刺吸引敌人；冲刺后短暂穿透速射。进化 Echo Legion：喵线满级 + 长影，然后开宝箱。
- **Nicole**：起始武器月星环（三枚月星环绕）；折月留下减速领域并获得护盾；首次濒危时触发一次额外护盾。进化 Full Moon：月星环满级 + 深折，然后开宝箱。
- WASD / 方向键移动，空格施放专属技能；Esc / P 暂停；升级时按 1 / 2 / 3 或点击选卡。标题与 HUD 上有静音按钮。手机使用摇杆与技能按钮。
- 击败敌人掉落墨晶，升级时三选一（3 个武器槽、4 个被动槽）；精英与 Boss 掉宝箱；连杀、南瓜灯、月亮灯笼、鱼干、可撕可烧的纸物件提供额外互动。
- 数值在 `src/defs/` 的各个定义文件里（猫在 `src/defs/cats/<id>/stats.ts`），角色选择与 HUD 从同一份注册数据读取。

当前验证为 `npm run build` 与 `npm test`（149 项，包含边缘清理、种子校验、图鉴绘制和静态发布产物回归测试）。大地图、手账 UI、特效，以及本轮的注册美术层、纸物件、火、立体书折叠、分区、新地标与图鉴页，都没有人在真实浏览器中看过，也没有截图；音频没有试听，平衡只用临时机器人粗测过，约 100 只敌人时的性能未测，美术未经用户认可，参赛作品没有完成。随机援护猫、英文默认仍待制作；Vercel 配置与发布构建已就绪，实际部署尚未进行。

```bash
npm test
```

## 来源与记录

Zero / Nicole 的官方猫头数据来自作者自己的 [Meow Wall](https://meow-wall.vercel.app) 特别来宾，原始位置为 `zjl1985/meow-wall` 的 `src/components/mascot/mascot-art.ts`。新增身体、场景与材质在本仓库中实现。用户提供的图片仅作为美术质量参考，没有作为游戏素材导入。

最新记录见 [REVIEW-IMPROVEMENTS.md](./REVIEW-IMPROVEMENTS.md)。文档中旧的“只做像素 / 删除全部纸质”条款已由用户最新的纸片美术方向覆盖；单角色二选一和纯代码绘制要求继续保留。
