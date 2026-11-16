# 猫猫守夜 / Midnight Meow

打开网页就能玩的纸质 + 像素双画风守夜灰盒。这是架构和可玩原型，还不是完整的五分钟一局。

作品对外名：《猫猫守夜》。仓库名仍是 `zero-kiroween`。设计说明见 [PLAN.md](./PLAN.md)（v0.7）。

## 怎么运行

需要 Node（用自带的 TypeScript 编译器）和 Python 3（只用来起一个静态文件服务）。没有运行时依赖，也不使用打包器或游戏引擎。

```bash
cd zero-kiroween
npm install
npx tsc && python3 -m http.server 4173
```

然后打开 <http://localhost:4173/>。

运行测试（Node 自带的测试运行器）：

```bash
npx tsc && node --test tests/*.test.mjs
```

`package.json` 的 `dependencies` 是空的。`devDependencies` 里只有 `typescript`。

## How to run

This is a static ES-module site. The only installed tool is the TypeScript compiler. There is no bundler, no game engine, and no runtime npm packages.

```bash
cd zero-kiroween
npm install
npx tsc && python3 -m http.server 4173
```

Open <http://localhost:4173/>.

Tests:

```bash
npx tsc && node --test tests/*.test.mjs
```

`dependencies` in package.json must stay empty. `devDependencies` may contain only `typescript`.

## 操作

- 移动：WASD 或方向键
- 冲刺「留影」：空格（留下 1.2 秒猫影，吸引附近墨团）
- 自动攻击「喵线」：对准最近的威胁
- 暂停：Esc 或 P
- 画风与语言可在标题页和暂停里切换；切换不会重置位置、生命或计时
- 触屏：左侧摇杆，右侧冲刺

默认界面语言是简体中文。

## 这个灰盒做了什么

- 输入 → 固定步长模拟 → 事件 → 按当前画风渲染，模拟与画风分开
- Zero 可操作；Nicole 的数据可渲染，标题页可见，局内作为不操控的同伴
- 两种画风都从同一套 32 格猫头数据画出来，不是贴图
- 纸质风用炭笔轮廓、浅填色和运行时生成的纸纹；像素风整数倍放大并关闭平滑
- 一场可玩的守夜：移动、喵线、留影、一只墨团、一处可补墨的未完成笔迹、基础 HUD

刻意留到后面的：完整五分钟节奏、升级卡、随机援护、Boss、Kiro、完整动画与声音、制作手册。

## 数据来源

Zero 与 Nicole 的调色、花纹和配件几何来自作者自己的 [Meow Wall](https://meow-wall.vercel.app) 特别来宾（仓库 `zjl1985/meow-wall` 中的 `mascot-art.ts`）。渲染器是为本游戏新写的。这里没有 Fabel CONSULTING 品牌，也不使用也不复刻 tibo.dog 的代码、素材或文案。tibo.dog 只作为「打开即玩、自写循环」的体验参考。

纸纹与彩笔颗粒在运行时用 Canvas 噪点和一个自建的 SVG 滤镜生成，不依赖外部图片。
