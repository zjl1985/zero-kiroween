# 猫猫守夜交接

状态：**已完成**。当前基线为 `main` 的 `c699024`，已推送至 GitHub 并同步 Vercel 部署。[线上试玩](https://zero-kiroween.vercel.app/) · [GitHub 提交](https://github.com/zjl1985/zero-kiroween/commit/c699024f7d07ad6163382180a749819e38bf06bf)

## 最终交付状态

- **角色与升级卡**：Zero 与 Nicole 采用原分辨率透明图集裁片（[角色素材说明](assets/characters/generated/SOURCE.md)），升级界面采用 22 枚独立道具图集（[道具素材说明](assets/upgrades/generated/SOURCE.md)）。
- **怪物与战斗反馈**：全部 8 种怪物（含 Eraser Boss）已升级为原分辨率像素图集裁片（[怪物素材说明](assets/enemies/generated/SOURCE.md)），包含精英双层呼吸金环与环绕光点、蓄力前摇提示及击杀像素碎屑。
- **场景丰富度**：5 个区域已加入无缝地表贴花、物件接地过渡裙及无碰撞微场景聚落装饰（蜡烛与南瓜接入 HD-2D 光照缓冲）。
- **验证**：`npm test`（含 `npm run build`）全套 657 项测试全部通过，无剩余待办。

## 本地运行

需要 Node.js 22+，缺依赖时运行 `npm ci`。启动后打开 [本地试玩](http://localhost:4173/?seed=7)。

```sh
npm run build
npm start
```
