# Handoff — 当前有效要求

更新：2026-11-16（参赛级玩法轮次之后）。供下一位 agent 直接继续工作。

## 第一件事：不要恢复双画风

**唯一目标是参考图中的纸片 / 剪纸美术。不是“纸质和像素任选”，也不是“先做纸质，之后补像素”。** 仓库内的像素工具、旧布局代码是代码依赖，不是第二套产品画风；不要添加画风切换。

## 用户最后明确的要求

1. **先把游戏做到参赛级别**：场景、特效、互动、进化等都要有分量，不再只打磨静态画面。
2. 参考 [Snapblocks](https://www.snapblocks.site/) 的一些特效思路。它是付费 React 组件库；只按公开描述用 Canvas / CSS 重新实现思路，**不复制任何代码**。
3. **英文默认放到后面**：现在仍默认 `zh`，`en` 语言包保持完整；以后通过 i18n 切换默认语言即可。所有用户可见文字继续走 `t(locale, key)`。
4. **少做检查**：用户认为之前查得太多。验证只做 `npm run build` + `npm test`，最多一张静态截图；不做动画或录像验证。
5. 不使用图片或音频素材；场景、纹理、光影、音效全部由代码生成。
6. 只选择一名主角：Zero 是男猫，Nicole 是女猫。局内不能把未选的角色作为伙伴放出来。
7. 两只猫的技能、升级与进化必须不同，不能只换外观。

## 当前代码与入口

提交序列：`80910a0` 纸片场景与角色 → `d47aca6` 升级与进化 → `45202d4` 敌人种类与 Eraser Boss → `8735a2a` / `604f3c8` / `36eca29` 手感、黎明、庭院互动、程序音频与 UI 特效 → 本次文档提交。

### 模拟（`src/game/`，无 DOM）

- `characters.ts`：两只猫的基础参数（见下表）。
- `upgrades.ts`：全部升级卡与经验曲线。5 张通用卡（vitality、swift、magnet、focus、scholar）、Zero 专属 5 张（bolt-power、quick-draw、split-bolt、pierce、long-shadow）、Nicole 专属 5 张（extra-star、wide-orbit、star-weight、deep-fold、moon-shield），填充卡 snack（回 1 心）。进化：Zero 的 **Echo Legion**（quick-draw 2 级 + long-shadow 2 级解锁，留影自行射击并在消失时爆裂），Nicole 的 **Full Moon**（extra-star 2 级 + star-weight 2 级解锁，+2 月星并周期性月光脉冲）。数值在 `UPGRADE_VALUES`、`XP`，`playerStats(state)` 计算派生属性，`rollChoices` 抽 3 张卡且可进化时进化卡占第一位。
- `enemies.ts`：敌人种类与刷怪表。ink-blob、paper-bat（俯冲）、crumple（死亡分裂成 2 个小团）、smudge（停在射程外投掷有预警的墨滴并留下减速水洼）、eraser-boss（90 血，234 秒即 78% 进度出场，横扫 / 召唤 / 冲撞三种带预警攻击）。`SPAWN_TABLE`、`WAVES`（固定时点小波次）、`ENEMY_CAP = 18`、`BOSS` 都在这里。
- `interactions.ts`：庭院互动物件。3 个南瓜灯（触碰点亮 6 秒灼烧并推开墨团，14 秒充能）、月亮灯笼（位于 LAMPS[3]，40 秒充满，触碰后全场眩晕 2.4 秒，对 Boss 0.9 秒）、鱼干（35 秒起随机出现，回 1 心，使用模拟 RNG）。
- `sim.ts`：刷怪、四个夜间阶段、战斗、经验碎片掉落与拾取、升级暂停（`pendingChoice` 期间时间冻结，`chooseUpgrade(state, i)`）、Boss 行为、连杀（`STATS.streakWindow` 2.6 秒，每 10 连杀奖励经验）、阶段提示（Boss / 进化横幅不会被技能、鱼干等普通提示覆盖）、胜负。Zero 进化后在回声未消失时再次冲刺，旧回声也会爆开。
- `types.ts`：`SimState`、共享 `STATS`、`EFFECT_LIFE`。`input.ts`：WASD / 方向键、空格技能、Esc / P 暂停（选卡界面也可暂停，恢复后回到同一手牌；切到后台同样暂停并关闭环境音）、1 / 2 / 3 选卡。

### 渲染（`src/render/`）

- `paper-material.ts`、`craft-scene.ts`、`craft-cat.ts`、`craft-combat.ts`、`combat-fx.ts`：纸张材质、夜间小镇、纸片猫、墨团与弹道、技能效果。
- `craft-enemies.ts`：各敌人造型、会追视并眨眼的纸片眼睛、水洼 / 落点 / Boss 虚线预警、敌方投射物与击败效果。
- `craft-juice.ts`：镜头震动、受击闪白、眩晕星、伤害数字、纸屑溶解、升级 / 进化 / 连杀纸片爆发、碎片拖尾、南瓜与月亮灯笼状态、鱼干。
- `upgrade-icons.ts`：升级卡图标。`world.ts`：分层合成与遮挡；最后 30 秒月亮下沉、地平线变暖、路灯变暗（黎明）。

### UI 与音频

- `src/ui/upgrade-cards.ts`：扇形手牌的升级卡；`hud.ts`：经验条、等级、已拥有卡、连杀徽章、Boss 血条；`ink.ts`：逐词显现文字；`character-panel.ts`、`touch.ts`。
- `src/audio/sfx.ts`：只用振荡器与生成噪声的 Web Audio 音效和环境声（风、低音、蟋蟀）；首次 pointerdown / keydown 后创建 AudioContext。标题与 HUD 有静音按钮，保存为偏好 `muted`。
- 偏好 `{ locale, cat, muted }` 存在 `localStorage` 的 `midnight-meow-prefs`。

### 参考 Snapblocks 的效果（按公开描述重做，未复制代码）

Petal Dissolve（击败纸屑溶解）、Crumple Reveal（crumple 展开再撕成两半）、Tear Ticket（结算票根沿齿孔撕下）、Fan Deck / Fan Carousel（升级卡扇形展开，聚焦卡抬起）、Ink Reveal（标题标语与 Boss 名逐词 / 逐字显现）、Trail Pamphlet / Pleated Strip（暂停面板与 Boss 横幅折页展开）、Eye Button（敌人眼睛）、Glowcap / Lumen（最后阶段与胜利时月亮翻成太阳）、Magnetic Button（开始按钮向指针倾斜）。全部尊重 `prefers-reduced-motion`；减少动态时不震屏。

## 已实现的角色差异

实际参数以 `src/game/characters.ts` 为准：

| | Zero | Nicole |
|---|---|---|
| 生命 / 移速 | 4 / 126 | 6 / 96 |
| 自动攻击 | 喵线远程直射 | 三枚月星环绕，命中有间隔并轻推敌人 |
| 主动技能 | 留影冲刺：1.2 秒诱饵，3 秒冷却 | 折月：短位移、3.5 秒减速 60% 领域、4.5 秒内两次护盾，5.5 秒冷却 |
| 被动 | 冲刺后 2 秒射速加倍，可穿透命中两个目标 | 首次生命降至 2 时获得两次护盾，持续 4 秒，每局一次 |
| 专属升级 / 进化 | 弹道伤害、射速、分叉、穿透、长影 → Echo Legion | 月星数量、轨道、重量、深折、护盾 → Full Moon |

Zero 的留影（包括 Echo Legion 的射击留影）是技能效果，不是常驻第二角色。

## 验证与证据边界

- `npm run build` 与 `npm test` 通过（51 项）。这只说明代码可编译、模拟行为符合测试。
- **还没有人在真实浏览器中看过新的敌人、特效、UI 动效**：本机沙盒阻止 playwright 打开浏览器。**音频也没有人试听过**，音量平衡未知。
- **用户尚未认可美术**，不要标记美术或参赛作品完成。

## 仍未完成

1. 用户对美术（对照纸片夜间小镇参考图）的验收。
2. 随机援护猫：未制作。
3. 英文默认：未切换（现默认 `zh`，`en` 完整）。
4. 真实浏览器试玩与数值平衡（难度曲线、升级强度、Boss 血量、音量）。
5. 部署与 Devpost 提交材料，截止 **2026-12-05 06:00（北京时间）**。没有部署或推送。

## 运行

`npm run build` 后 `npm start`；默认端口 4173。`/?start=1` 直接进入所选角色的游戏。旧本地服务器可能还在运行，先检查端口再启动。`output/playwright/` 内的旧截图只在当前机器存在，Git 忽略，早于本轮玩法改动。
