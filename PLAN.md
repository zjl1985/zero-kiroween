# 猫猫守夜当前执行方案

当前工作以 [HANDOFF.md](HANDOFF.md) 的待办为准。游戏基线在 `main`，本轮接手重点是整局试玩、真机性能和音效验收。

## 已确定的玩法

- 一局选 Zero 或 Nicole 中的一只猫，靠移动与自动攻击守十分钟。键盘和摇杆按屏幕方向移动。保留两猫各自的起始武器、被动、专属装备和开箱进化。
- Zero 的进化为 Echo Legion，Nicole 的进化为 Full Moon。开箱时按现有进化规则结算。击败 Eraser 并活到天亮才胜利。
- 梗猫是 14 套可解锁服装，穿在选中的猫身上，并触发各自的自动效果。独立的援护猫需要用户另行确认。

## 已确定的画面和工程边界

- 一个固定视角，2:1 等距像素与 HD-2D 夜景。当前规格见 [docs/iso-art-spec.md](docs/iso-art-spec.md)。保持平坦地形、世界碰撞和水域规则。
- 角色以 [官方头像与认可的全身设定图](assets/characters/generated/SOURCE.md) 为准。实战用原分辨率透明裁片直接绘制。升级卡用 [22 个道具图标](assets/upgrades/generated/SOURCE.md)，武器和被动有不同的文字、颜色和边框标识。
- 数值与玩法在 `src/defs/` 和 `src/game/`。渲染读取模拟状态，保持固定步长与种子结果。中英文字走 `t()`。
- 开发和验证沿用 [midnight-meow-dev](.kiro/skills/midnight-meow-dev/SKILL.md)。涉及发布时以当轮用户授权为准。

旧版过程记录可在 Git 历史中查看。
