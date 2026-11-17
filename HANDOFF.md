# Handoff：当前有效要求

更新：2026-11-17（可扩展骨架 / 纸张互动 / 纸片工具与图鉴 / 分区与新内容轮次之后）。供下一位 agent 直接继续工作。

**扩展内容前先读项目技能 [`.kiro/skills/midnight-meow-dev/SKILL.md`](.kiro/skills/midnight-meow-dev/SKILL.md)**（英文）。它说明分层与导入规则、硬性约束、验证流程，`references/` 下有加猫、加武器 / 被动 / 进化、加敌人、加物件与反应、加地标与分区、i18n、纸片工具与图鉴、测试与提交的逐步配方。

## 第一件事：不要恢复双画风

**唯一目标是参考图中的纸片 / 剪纸美术。不是“纸质和像素任选”，也不是“先做纸质，之后补像素”。** 仓库内的像素工具、旧布局代码是代码依赖，不是第二套产品画风；不要添加画风切换。

## 用户最后明确的要求

状态标注说明：“已在代码中实现”只表示代码存在、可编译、测试通过；**没有人在浏览器中看过，用户也没有认可**。

1. **先把游戏做到参赛级别**：场景、特效、互动、进化等都要有分量，不再只打磨静态画面。
2. 参考 [Snapblocks](https://www.snapblocks.site/) 的一些特效思路。它是付费 React 组件库；只按公开描述用 Canvas / CSS 重新实现思路，**不复制任何代码**。
3. **英文默认放到后面**：现在仍默认 `zh`，`en` 语言包保持完整；以后通过 i18n 切换默认语言即可。所有用户可见文字继续走 `t(locale, key)`。
4. **少做检查**：用户认为之前查得太多。验证只做 `npm run build` + `npm test`，最多一张静态截图；不做动画或录像验证。
5. 不使用图片或音频素材；场景、纹理、光影、音效全部由代码生成。
6. 只选择一名主角：Zero 是男猫，Nicole 是女猫。局内不能把未选的角色作为伙伴放出来。
7. 两只猫的技能、升级与进化必须不同，不能只换外观。
8. **场景要是能移动探索的大地图，镜头随主角移动。** 用户以 https://tibo.dog/?lang=zh-CN 的大场景体验说明目标。
   - 状态：**已在代码中实现，未在浏览器中查看，用户未认可。** 有界种子世界 10 × 10 屏、跟随镜头、14 个地标位、道路、树篱边界、区块缓存与导航箭头。
9. **UI 要有自己的设计**，不能像 Tibo Dog。Tibo Dog 只作为空间体验参考。
   - 状态：**已在代码中实现，未在浏览器中查看，用户未认可。** “守夜手账”方向，详见下文 UI 一节。
10. **猫头浅色包边**：沿猫脸实际轮廓保留极窄暖灰纸边（`src/render/craft-cat.ts`）。
    - 状态：**已在代码中修改，未截图确认，用户未认可。** 是否正是用户所指区域仍待用户确认。
11. 借鉴 https://github.com/Vincentwei1021/video-shotcraft 的蓄势、展开、爆发、收束节奏，用于进化、Boss、黎明与发牌。
    - 状态：**节奏编排已在代码中实现，没有人看过动效。** 没有安装该技能，没有录像。
12. **玩法是类 Vampire Survivors 的 roguelike（幸存者类），不需要几百只敌人。** 用户原话：“地图不需要无限，最多 100”；“我说的类似，不需要几百，就是类似这种的 roguelike 的”。
    - 理解：地图最多 10 × 10 屏（`WORLD`），同时存活敌人硬上限 100（`HORDE.hardCap`）。两个数都是数据常量。
    - 状态：**已在代码中实现，只用临时空闲机器人粗测过平衡，未真实试玩。**
13. **本轮（2026-11-17）：把游戏改成可扩展的“定义 + 钩子 + 注册表”骨架**（不改变玩法），加入确定性的纸张材质 × 元素反应系统（撕、烧、立体书），做纸片工具、种子变体与 `?gallery=1` 图鉴页，再用它们增加场景内容（分区、地标、可互动物件）；最后**把开发流程封装成项目技能放到 `.kiro` 下，必须用英文**。用户说“我不懂的，你按照最好的方式完成”。
    - 状态：**已在代码中实现（`852fd08` 到 `9eb54d4`，加本次文档提交），没有人在浏览器中看过，用户未认可。** 技能在 `.kiro/skills/midnight-meow-dev/`，`.kiro` 下的文件全部为英文；本文件、PLAN.md 与 AGENTS.md 保持中文。

## 本轮提交

`852fd08` 猫 / 武器 / 被动 / 进化 / 敌人移入注册定义与模拟事件钩子 → `8c65a1b` 每局新种子（`?seed=N` 固定）、月亮灯笼“已充满”提示只在视野附近 → `858d147` 猫、敌人、武器效果改由注册的美术层绘制 → `b6f6133` 纸张材质、元素反应、可撕物件、蔓延的火、立体书建筑 → `d75219c` 纸片工具、种子变体、`?gallery=1` → `c612855` 地标改为带布局与美术的定义 → `1e20776` 腾位时先擦掉视野外最远的普通敌人 → `9eb54d4` 分区、新地标与互动物件 → 本次文档与技能提交。

## 架构（2026-11-17 起）

```
src/engine/   与内容无关：registry.ts（createRegistry）、events.ts（createEventBus）、sprite.ts（cachedSprite，LRU 256）
src/defs/     内容定义：types.ts（全部接口）、registries.ts（空注册表 + SIM_EVENTS）、
              index.ts（注册猫 / 武器 / 被动 / 进化 / 行为 / 敌人，并按“是否生效”门控钩子）、
              world-index.ts（注册材质 / 反应 / 物件 / 地标 / 分区；world-gen 也直接导入它）、
              progression.ts（BUILD、XP）、horde.ts（HORDE、KIND_CAP、PHASE_AT、ELITE、SPAWN_TABLE、WAVES）、
              materials.ts、fire.ts（FIRE、PROP_HITS），以及每项内容一个文件或目录
src/game/     通用模拟（无 DOM、不出现猫 id 字面量）：sim.ts、props.ts（反应与火）、stats.ts（属性折叠）、
              world-gen.ts、interactions.ts、types.ts；characters.ts / upgrades.ts / enemies.ts 是保留旧导出名的外观层
src/render/   art-registry.ts（各类美术接口与注册表）、art-index.ts（唯一导入美术文件的模块）、
              paper-kit.ts、prop-kit.ts、variants.ts、craft-props.ts、craft-world.ts、gallery.ts、timeline.ts ...
src/ui/       hud.ts、upgrade-cards.ts、character-panel.ts（按 CATS 生成票根）、journal.ts、gallery-layout.ts（纯函数）
src/content/  i18n：keys.ts、en.ts、zh.ts、i18n.ts
```

- 每项内容 = 一个定义文件 + 一个美术文件（与定义放在一起）+ 各自索引里的一行注册。注册顺序是行为的一部分（刷怪表、武器步进、属性折叠依赖它），新内容追加在末尾。
- 定义的钩子通过 `SimContext` 调用模拟的工具函数；`SimContext` 不带 RNG，模拟只把步进 `Rng` 传给 `WeaponDef.step` 和 `EnemyBehaviour.steer`。
- 模拟从不导入美术；美术只读 `SimState`，不改状态、不用模拟 RNG。测试会检查 `src/engine` 不导入其他层、`src/game` 与非旧版渲染 / UI / main 里没有猫 id 字面量。
- 重构阶段用本地探针（`output/playwright/baseline-snapshot.mjs`、`baseline-long.mjs`，Git 忽略）比对固定种子与脚本输入下的快照哈希：重构提交前后逐字节一致；之后有意改变玩法或世界时（`b6f6133`、`9eb54d4`）重新录制了参考（旧参考保存为 `*-pre-feat004.txt`、`*-pre-feat006.txt`）。

## 怎么扩展

全部见技能配方，这里只列入口：

| 内容 | 定义 | 美术 | 注册 |
|---|---|---|---|
| 猫 | `src/defs/cats/<id>/{stats,def}.ts`（另需 `src/cats/meow-wall-art.ts` 的 `CAT_VARIANTS` 头像数据） | `cats/<id>/art.ts` | `defs/index.ts` 的 CATS 列表；`render/art-index.ts` 的 CAT_ART |
| 武器 / 进化武器 / 被动 | `src/defs/weapons/<id>.ts`、`passives/<id>.ts` | `<id>.art.ts` | 同上两个索引 |
| 进化规则 | `src/defs/evolutions/<id>.ts` | 用进化武器的图标 | `defs/index.ts` |
| 敌人 / 行为 | `src/defs/enemies/<id>/def.ts`、`behaviours.ts` | `enemies/<id>/art.ts` | `defs/index.ts`；刷怪规则在 `defs/horde.ts` |
| 材质 / 反应 / 物件 | `defs/materials.ts`、`defs/reactions/<id>.ts`、`defs/props/<id>/def.ts` | `props/<id>/art.ts` | `defs/world-index.ts`；`art-index.ts` |
| 地标 / 分区 | `defs/landmarks/<id>/def.ts`、`defs/biomes/<id>.ts` | `art.ts`、`<id>.art.ts` | `defs/world-index.ts`；`art-index.ts` |

新文字都要加到 `keys.ts`、`en.ts`、`zh.ts`。新的特效种类或提示要加进 `src/game/types.ts` 的 `EffectKind` / `Notice` 联合类型。

## 纸张互动（`b6f6133`、`9eb54d4`）

- 元素：`fire`、`ink`、`wind`、`cut`、`fold`。武器带元素：喵线、夜爪、月星环、落星为 cut，纸鹤为 wind，南瓜籽为 fire（爆裂时）；点亮的南瓜每次脉冲点火（`FIRE.pumpkinRadius` 64）。
- 材质：thin-paper、card、ink、cloth、wax、straw。反应表一行一个“材质 × 元素”：tear-thin-paper、tear-card、tear-cloth、gust-thin-paper、burn-thin-paper、tear-straw、gust-straw、burn-straw、gust-cloth。没有对应行就不起反应。
- 物件三态：完好、破损（低于 `damagedBelow`）、碎片（耐久为 0；烧光则为灰）。碎片不再挡路；破损时碰撞体不缩小。掉落用物件 id 的哈希：墨晶、鱼干；稻草人被撕倒必定撒出一圈 4 枚墨晶（`drops.burst`）。
- 物件的改变在整局内保留（`SimState.props` 一张紧凑表），区块卸载再加载也不会恢复。
- 火：24 单位的格子，最多 40 格同时燃烧（`FIRE.maxCells`），每 0.2 秒按易燃度蔓延，伤害格内敌人（含 Boss），烧完成灰。**火不伤猫**。蔓延用 `hash2(seed, cell, 900 + ticks)`，不用步进 RNG。
- 立体书：地标里标记 `popup` 的建筑块和树、小屋在猫靠近时像立体书一样立起（`POPUP` near 430 / far 700），只在渲染层，减少动态时直接定格。
- 音效：撕纸 `tear`、燃烧 `crackle`（节流 0.28 秒），只用合成噪声。结算页新增“撕掉的物件”“烧掉的格子”两行（现共 14 行）。

## 纸片工具与图鉴（`d75219c`）

- `src/render/paper-kit.ts`：`paperCut`（切边、厚度、叠层、缝线、折痕、磨损、接触阴影）、`paperStack`、`foldLine`、`stitchAlong`、`charEdge`、`tornEdge`、`warmGlow`。
- `src/render/prop-kit.ts`：`phasedPaint` 由一个完好画法派生破损与碎片两态；`post`。
- `src/render/variants.ts`：`variant(seed, base)` 给出种子决定的颜色、大小、倾斜、磨损、镜像，只用渲染哈希，测试确认不调用 `Math.random`。物件按世界种子另有逐个摆放的大小 / 倾斜 / 镜像。
- `?gallery=1`：纸片工坊图鉴页。按注册表列出所有猫（待机、技能）、敌人（普通、精英）、物件（完好、破损、碎片、燃烧、烧尽）、地标、分区、武器、被动，标签走 i18n，可切换语言；不启动模拟与音频。

## 分区与新内容（`c612855`、`9eb54d4`）

- 地标改为定义：`clock-tower`、`pumpkin-field`、`stone-bridge`、`graveyard`（教堂墓园）、`lantern-market`、`moon-hill`，新增 `paper-windmill`（纸风车磨坊，2 个南瓜）、`puppet-theatre`（纸偶剧场，1 盏月亮灯笼）、`wishing-well`（许愿井，纸船池塘，1 盏月亮灯笼）。共 9 种，14 个地标位，每种至少一个。
- 分区（`src/defs/biomes/`）：老城区（起始）、南瓜农田、墓园树林、灯笼水渠、月光草甸。4 × 3 网格上每格一个分区点，种子洗牌保证每种分区都出现；每个区块属于最近的分区点。分区决定装饰比例、物件组合与地面斑块（烘进区块缓存），路边物件沿道路摆放，每区块最多 14 个物件。
- 物件共 15 种：paper-fence、paper-bush、paper-grass，新增 paper-lanterns、scarecrow、haybale、paper-crate、mailbox、signpost、paper-flowers、paper-reeds、paper-mushroom、laundry-line、paper-tombstone、dead-tree。
- `makeRoom`（`src/game/sim.ts`）：需要给精英或 Boss 腾位时，先擦掉视野外最远的普通敌人；精英和 Boss 从不被擦掉。

## 一局的数字（全部是数据常量）

- 夜晚 600 秒（`STATS.sessionSeconds`），最后 30 秒为黎明。四个夜间阶段在 15% / 45% / 80%（`PHASE_AT`，`src/defs/horde.ts`）。
- 世界：`WORLD` 10 × 10 屏 = 9600 × 5400；起始庭院在北边中部；区块 480 × 540（`CHUNK`），共 20 × 10 个。
- 敌人：`HORDE.capByMinute` [12 .. 96]，**`hardCap` 100**（分裂、召唤、波次、精英都计入）。`KIND_CAP` smudge 8、crumple 14。9 个波次。
- 精英：60 秒起每 60 秒一只，到 500 秒为止（`ELITE`），掉宝箱。
- Eraser Boss：540 秒在视野外出场，420 血；离猫超过 360 时以 92 速度追猎；击败掉大宝箱。
- 构筑：3 个武器槽、4 个被动槽（`BUILD`，`src/defs/progression.ts`）。进化只在开宝箱时发生：Echo Legion = 喵线满级 + 长影；Full Moon = 月星环满级 + 深折。否则宝箱给已拥有项 +1 级（Boss 大宝箱 3 级），都满了给 snack。

## 已实现的角色差异

实际参数以 `src/defs/cats/<id>/stats.ts` 与各武器 / 被动定义为准：

| | Zero | Nicole |
|---|---|---|
| 生命 / 移速 | 4 / 126 | 6 / 96 |
| 起始武器 | 喵线：远程直射 | 月星环：三枚月星环绕，命中有间隔并轻推敌人 |
| 主动技能 | 留影冲刺：1.2 秒诱饵，3 秒冷却 | 折月：短位移、3.5 秒减速 60% 领域、4.5 秒内两次护盾，5.5 秒冷却 |
| 被动 | 冲刺后 2 秒射速加倍，可穿透命中两个目标 | 首次生命降至 2 时获得两次护盾，持续 4 秒，每局一次 |
| 专属武器 / 被动 | 夜爪；长影 | 落星；深折、月盾 |
| 进化（开宝箱） | Echo Legion：喵线满级 + 长影 | Full Moon：月星环满级 + 深折 |

Zero 的留影（包括 Echo Legion 的射击留影）是技能效果，不是常驻第二角色。

## UI 与音频（沿用上一轮）

- 守夜手账 UI：行李牌、月亮弧、灯笼串、折叠小地图（地标点颜色来自 `LandmarkArt.ink`）、烛芯技能、经验缝线、武器三角旗与被动签、宝箱纸条、Boss 橡皮血条；窗格剪纸升级卡错峰发牌；舞台幕布标题与票根选择（票根现由 `CATS` 生成）；折页暂停；手账结算页。
- 音频只用振荡器与生成噪声，首次手势后创建 AudioContext；静音保存为偏好。偏好 `{ locale, cat, muted }` 存在 `localStorage` 的 `midnight-meow-prefs`。

## 验证与证据边界

- `npm run build` 与 `npm test` 通过（130 项）。这只说明代码可编译、模拟行为符合测试。
- **没有人在真实浏览器中看过本轮任何内容**：注册美术层重绘的猫 / 敌人 / 武器效果、可撕与燃烧的物件、火、立体书折叠、分区地面、新地标、新物件、`?gallery=1` 图鉴页都没有看过；上一轮的大地图、手账 UI、动效也仍未看过。沙盒阻止 Playwright / 无头 Chromium，**本轮没有截图**。只在 Node 里用假 Canvas 上下文跑过绘制冒烟（无异常，但没检查像素）。
- **音频没有人试听过**，包括新的撕纸与燃烧声。
- **平衡只用临时空闲机器人粗测过**；空闲 Nicole 打不完 Eraser。真实试玩未做。
- **约 100 只敌人时的帧率没有测过**；没有空间哈希或对象池，区块缓存同步构建。
- **用户尚未认可美术**，不要标记美术或参赛作品完成。

## 仍未完成与已知问题

1. 真实浏览器试玩与平衡：难度曲线、武器 / 被动强度、宝箱节奏、Boss 血量（空闲 Nicole 打不完 Eraser）、音量。
2. **Boss 可以被甩开，拖到黎明仍算胜利**。是否要改还没问用户，改之前先问。
3. **进化配对的被动可能因为被动槽已满而永远拿不到**，局内没有提示。
4. 真实浏览器性能测量（约 100 只敌人、冲进未建区块时的卡顿）。
5. 用户对美术、新 UI、分区、地标、物件、火与图鉴的验收，包括猫头窄纸边；墓园树林较暗的地面上猫与墨团是否清楚、分区斑块密度与分区边缘（按区块对齐）都没判断过。
6. 结算页现在 14 行，两列布局是否放得下没检查过。
7. `ink` 与 `fold` 元素还没有来源（没有武器或敌人施加），也没有对应反应行；ink / wax 材质只有数据没有物件。
8. 物件不会再生；风车叶片按变体静止，没有风的互动；许愿井池塘与水渠斑块可以直接走过（不是水域碰撞）；路边物件较稀。
9. 旧代码遗留：`src/render/layout.ts` 里未使用的像素时代 `drawMascot` 还有 `pose.id === "nicole"` 分支；`craft-juice.ts` 里有两处针对 `"eraser-boss"` 的表现判断（冲撞震屏、伤害标签颜色）。不影响新增敌人，按“不要盲目删除”保留。
10. 图鉴里 Nicole 的“技能”格与 Zero 用同一个冲刺姿势；地标预览不画交互点上的南瓜与灯笼（它们由 `craft-juice.ts` 按模拟状态绘制）。
11. 英文默认：未切换（现默认 `zh`，`en` 完整）。
12. 部署与 Devpost 提交材料，截止 **2026-12-05 06:00（北京时间）**。没有部署或推送。
13. 随机援护猫：未制作，开始前先与用户确认。

其他小问题：支路可能穿过另一个地标的河；前景树叶与撕边画框仍是屏幕空间；卡牌文字在小屏上的 zh / en 长度未检查。

## 运行

`npm run build` 后 `npm start`；默认端口 4173（旧本地服务器可能还在运行，先检查端口）。`/?start=1` 直接进入所选角色的游戏；`?seed=N` 固定本局种子（否则每局新种子）；`/?gallery=1` 打开图鉴页。`output/playwright/` 内的截图与探针只在当前机器存在，Git 忽略。
