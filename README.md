# RetroFC — 怀旧游戏合集

复古像素风格的网页游戏合集，包含网站版和 Chrome 扩展版。

## 项目结构

```
├── bawang/       # 网站版（部署到 Vercel）
└── Chrome-BA/    # Chrome 浏览器扩展（本地加载使用）
```

## 内置游戏

🎮 2048 | 贪吃蛇 | 扫雷 | 推箱子 | 打砖块 | 数独 | Wordle | 连连看 | 记忆翻牌 | 打地鼠 | 沙粒下落 | 像素画板 | 架子鼓 | 接球 | 射击 | 堆叠塔 | FC 红白机模拟器

## 网站版 (bawang)

在线体验怀旧游戏，支持移动端触控操作。

**Vercel 部署：**

1. Fork 本仓库
2. 在 [Vercel](https://vercel.com) 导入项目
3. Root Directory 设置为 `bawang`
4. 部署完成即可访问

## Chrome 扩展 (Chrome-BA)

浏览器扩展版本，随时点击图标即可开玩。

**安装方式：**

1. 下载本仓库（[Download ZIP](https://github.com/yuzechang/game/archive/refs/heads/main.zip)）
2. 解压后打开 Chrome，进入 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」，选择 `Chrome-BA` 文件夹
5. 工具栏出现 RetroFC 图标，点击即可游玩

## 技术栈

- 纯前端实现（HTML + CSS + JavaScript）
- 内置 NES 模拟器（jsnes）
- 虚拟摇杆（nipplejs）
- Chrome Extension Manifest V3
