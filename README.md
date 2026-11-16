# 猫猫守夜 / Midnight Meow

后续 agent 请先读 [HANDOFF.md](HANDOFF.md) 和 [PLAN.md](PLAN.md)。**当前只做一种纸片画风，不是双画风。**

一座由代码绘制的纸片小镇：有纸张纤维、切边厚度、层叠投影、缝线、暖窗、秋树和弯曲小路。**当前以用户最新确认喜好的纸片美术为方向，优先打磨静态画面。**

场景没有使用背景图片、贴图素材或生成图片。纹理、纸片造型、角色与光照均由 TypeScript / Canvas 生成；离屏 Canvas 只缓存这些绘制结果。

## 运行

需要 Node.js、npm，以及 Python 3（仅用于原有静态服务器）。

```bash
npm install
npm run build
npm start
```

打开 <http://localhost:4173/>。直接看游戏场景：<http://localhost:4173/?start=1>。

## 当前美术代码

- `src/render/paper-material.ts`：纸张纤维、切边、厚度、接触阴影、缝线和光晕。
- `src/render/craft-scene.ts`：纸片夜空、远山、树冠、转角房屋与层叠屋瓦、道路、庭院和前景。
- `src/render/craft-cat.ts`：保留 Meow Wall 官方脸部识别点的纸片角色、披风、身体与持灯。
- `src/render/craft-combat.ts`：纸片墨团与暖光弹道。
- `src/render/world.ts`：层叠绘制、遮挡、角色与场景合成；以 2 倍内部画布呈现细纹理与轮廓。

原有像素场景代码保留在仓库内作为造型 / 布局参考，当前游戏入口展示纸片场景，没有画风切换按钮。

## 角色与操作

开局在 Zero（男猫）和 Nicole（女猫）中二选一，局内只有选中的主角。

- **Zero**：喵线远程攻击；留影冲刺吸引敌人；冲刺后短暂穿透速射。
- **Nicole**：三枚月星环绕攻击；折月留下减速领域并获得护盾；首次濒危时触发一次额外护盾。
- WASD / 方向键移动，空格施放专属技能；Esc / P 暂停。手机使用摇杆与技能按钮。
- 技能数值在 `src/game/characters.ts`，角色选择与 HUD 从同一份数据读取。

以上技能在前一阶段已进入真实模拟。本轮按用户要求先做美术，没有继续进行动画或录像验证，不宣称完成整个参赛作品的最终验收。升级、随机援护、Boss、音频仍待制作。

```bash
npm test
```

## 来源与记录

Zero / Nicole 的官方猫头数据来自作者自己的 [Meow Wall](https://meow-wall.vercel.app) 特别来宾，原始位置为 `zjl1985/meow-wall` 的 `src/components/mascot/mascot-art.ts`。新增身体、场景与材质在本仓库中实现。用户提供的图片仅作为美术质量参考，没有作为游戏素材导入。

最新记录见 [REVIEW-IMPROVEMENTS.md](./REVIEW-IMPROVEMENTS.md)。文档中旧的“只做像素 / 删除全部纸质”条款已由用户最新的纸片美术方向覆盖；单角色二选一和纯代码绘制要求继续保留。
