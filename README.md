# 猫猫守夜 / Midnight Meow

后续 agent 请先读 [HANDOFF.md](HANDOFF.md) 和 [PLAN.md](PLAN.md)。**当前只做一种纸片画风，不是双画风。**

一座由代码绘制的纸片夜镇：有纸张纤维、切边厚度、层叠投影、缝线、暖窗、秋树和弯曲小路。玩法是类 Vampire Survivors 的 roguelike：选一只猫，在有界的种子地图（最多 10 × 10 屏）里跟着镜头走街串巷，守满 10 分钟到天亮。途中收集墨晶升级武器与被动，从精英掉的宝箱里进化，发现钟楼、南瓜田、石桥等地标，击退墨团群（同时最多 100 只）与追猎的 Eraser Boss。

场景没有使用背景图片、贴图素材或生成图片。纹理、纸片造型、角色与光照均由 TypeScript / Canvas 生成；离屏 Canvas 只缓存这些绘制结果。音效由 Web Audio 振荡器与生成噪声合成，没有音频文件。

## 运行

需要 Node.js、npm，以及 Python 3（仅用于原有静态服务器）。

```bash
npm install
npm run build
npm start
```

打开 <http://localhost:4173/>。直接看游戏场景：<http://localhost:4173/?start=1>。

## 当前代码

- `src/game/world-gen.ts`：有界种子世界（`WORLD` 10 × 10 屏）、区块、地标、道路、刷怪环；`sim.ts` 与渲染共用这份纯哈希数据。
- `src/game/upgrades.ts`、`enemies.ts`、`interactions.ts`：武器 / 被动与宝箱进化、敌人群（`HORDE.hardCap` 100）、精英与 Boss、南瓜灯 / 月亮灯笼 / 鱼干 / 宝箱的数据。
- `src/render/camera.ts`、`craft-world.ts`：跟随镜头、区块地面缓存、地标建筑、导航箭头。
- `src/render/paper-material.ts`、`craft-scene.ts`、`craft-cat.ts`、`craft-combat.ts`、`craft-enemies.ts`、`craft-juice.ts`：纸张材质、天空与山丘、纸片猫、墨团与弹道、敌人与预警、受击反馈与物件状态。
- `src/render/timeline.ts`、`cue-fx.ts`：进化、Boss、黎明等重点事件的蓄势 / 展开 / 爆发 / 收束节奏与表现。
- `src/render/world.ts`：层叠绘制、遮挡与黎明天色；以 2 倍内部画布呈现细纹理与轮廓。
- `src/ui/hud.ts`、`journal.ts`、`journal-geometry.ts`、`src/render/journal-ui.ts`：守夜手账风格的 HUD 与结算页。
- `src/audio/sfx.ts`：程序生成的音效与环境声。

原有像素场景代码保留在仓库内作为造型 / 布局参考，当前游戏入口只展示纸片场景，没有画风切换按钮。

## 角色与操作

开局在 Zero（男猫）和 Nicole（女猫）中二选一，局内只有选中的主角。

- **Zero**：起始武器喵线（远程直射）；留影冲刺吸引敌人；冲刺后短暂穿透速射。进化 Echo Legion：喵线满级 + 长影，然后开宝箱。
- **Nicole**：起始武器月星环（三枚月星环绕）；折月留下减速领域并获得护盾；首次濒危时触发一次额外护盾。进化 Full Moon：月星环满级 + 深折，然后开宝箱。
- WASD / 方向键移动，空格施放专属技能；Esc / P 暂停；升级时按 1 / 2 / 3 或点击选卡。标题与 HUD 上有静音按钮。手机使用摇杆与技能按钮。
- 击败敌人掉落墨晶，升级时三选一（3 个武器槽、4 个被动槽）；精英与 Boss 掉宝箱；连杀、南瓜灯、月亮灯笼和鱼干提供额外互动。
- 数值在 `src/game/characters.ts`、`upgrades.ts`、`enemies.ts`、`interactions.ts`、`world-gen.ts`，角色选择与 HUD 从同一份数据读取。

当前验证只有 `npm run build` 与 `npm test`。大地图、新 UI 与特效都没有人在真实浏览器中看过，音频没有试听，平衡只用临时机器人粗测过，约 100 只敌人时的性能未测，美术未经用户认可。随机援护猫、英文默认、部署仍待制作。

```bash
npm test
```

## 来源与记录

Zero / Nicole 的官方猫头数据来自作者自己的 [Meow Wall](https://meow-wall.vercel.app) 特别来宾，原始位置为 `zjl1985/meow-wall` 的 `src/components/mascot/mascot-art.ts`。新增身体、场景与材质在本仓库中实现。用户提供的图片仅作为美术质量参考，没有作为游戏素材导入。

最新记录见 [REVIEW-IMPROVEMENTS.md](./REVIEW-IMPROVEMENTS.md)。文档中旧的“只做像素 / 删除全部纸质”条款已由用户最新的纸片美术方向覆盖；单角色二选一和纯代码绘制要求继续保留。
