# dsh-freestyle-theme

<div align="center">
  <img src="docs/images/banner.svg" alt="dsh-freestyle-theme banner" width="100%" />
</div>

<p align="center">
  <a href="https://github.com/suzike/dsh-freestyle-theme/releases"><img src="https://img.shields.io/github/v/release/suzike/dsh-freestyle-theme?style=flat-square&label=version" alt="version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-BSD--3--Clause-blue.svg?style=flat-square" alt="license"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-green.svg?style=flat-square" alt="node"></a>
  <a href="https://github.com/deepseek-ai/DeepSeek-Harness"><img src="https://img.shields.io/badge/DSH-0.2.1--rc.2-4d6bfe.svg?style=flat-square" alt="dsh"></a>
</p>

**dsh-freestyle-theme** 是 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/DeepSeek-Harness) 的 Web GUI 主题插件：基于 **OKLCH 色彩模型**，提供「主题提案」与「主题设计器」两大能力，让用户**一键换肤、自由调色**。作为常驻 Web 插件热插拔安装，**跨重启持久化**。

---

## ✨ 特性

<table>
  <tr>
    <td width="50%">
      <img src="docs/images/proposer.svg" alt="主题提案" width="100%" />
      <p align="center"><b>主题提案</b> · 6 套风格预设 + 智能提案，点卡片即应用</p>
    </td>
    <td width="50%">
      <img src="docs/images/designer.svg" alt="主题设计器" width="100%" />
      <p align="center"><b>主题设计器</b> · 主色 / 副色 / 面板 三通道独立调节</p>
    </td>
  </tr>
</table>

- 🎨 **OKLCH 配色模型** — 色相 / 彩度 / 明度三通道独立可控，直觉且色彩感知均匀
- 🧭 **配色关系** — 邻近 / 互补 / 分裂互补 / 三角色 一键派生副色与面板色
- 🔒 **通道锁定** — 锁定某通道后，随机与配色关系将跳过它
- ⚡ **快速变体** — 柔和 / 鲜明 / 提亮 / 压暗 / 主副互换
- 🤖 **AI 命名** — 走宿主 `llm` + 默认模型，为配色生成主题名 / 标签 / 介绍（浏览器不接触任何模型凭据）
- 📋 **JSON 导入导出** — 主题令牌可复制、可分享、可迁移
- 🖥️ **设置面板放大** — 一键把设置弹框加宽到 1120px，显示更完整
- 🌗 **明暗自适应** — 119 个令牌明暗各一套，插件自身 UI 只用 `--dsw-alias-*` 变量
- ♻️ **持久化** — 常驻 Web 插件，重启 DeepSeek Harness 后仍然存在

---

## 📸 实际界面

> 以下为软件内真实设置页面截图（设置 → 通用 → 自由主题 → 自定义…）。

<div align="center">
  <img src="docs/images/screenshot-proposer.png" alt="主题提案 · 实际界面" width="100%" />
  <p><b>主题提案</b> · 6 套风格预设 + 8 套智能提案，点卡片即应用</p>
</div>

<div align="center">
  <img src="docs/images/screenshot-designer.png" alt="主题设计器 · 实际界面" width="100%" />
  <p><b>主题设计器</b> · 主色 / 副色 / 面板独立通道 + 实时预览 + 通道锁定 + JSON 导入导出</p>
</div>

---

## 📐 架构

<div align="center">
  <img src="docs/images/oklch-model.svg" alt="OKLCH 色彩模型" width="80%" />
</div>

每套主题由三个通道的 OKLCH 值定义，映射到 DSH 的 **119 个设计令牌**（107 个 `--dsw-alias-*`、11 个 `--dsw-specific-*`、以及 `--dsw-menu-surface-fill`），明暗两套，实现**全覆盖换肤**——背景层级、文字层级、边框、按钮、交互态、状态色、侧边栏、浮层与 tooltip 全部随主题切换。

| 通道 | 含义 | 映射到 |
|---|---|---|
| 主色 `th / c1 / l1` | 品牌强调色 | `brand-primary`、按钮、交互态 |
| 副色 `th2 / c2 / l2` | 次要强调色 | 侧边栏选中态 |
| 面板 `ths / sc / bg` | 背景表面色 | 各级背景层级 |
| 文字 `tx` | 正文墨色 | `label-primary` 等 |
| 侧边栏 `sb` | 左侧栏明度 | `sidebar-fill`（默认与主区一体） |

### 双面插件

| 面 | 入口 | 运行位置 | 职责 |
|---|---|---|---|
| Host | `lib/index.js`（`exports["."]`） | DSH 进程 | `POST /api/dsh-freestyle-theme/name`：用宿主 `llm` + `agentDefaultModel` 为令牌生成主题身份 |
| Client | `lib/client.js`（`exports["./client"]`） | 浏览器 | 设置页「自由主题」行：提案 + 设计器，全部配色计算在本地完成 |

浏览器半不直接调用任何模型服务（Web 壳并不向插件暴露 `llm`），命名请求只提交令牌与界面语言，凭据始终留在宿主进程。

---

## 🧩 遵循的 DSH 插件规范（0.2.1-rc.2）

| 规范点 | 本插件的做法 |
|---|---|
| 包清单 | `dsh.manifestVersion: 1`；`dsh.bundle.patch` 指向 `cordis.patch.yml`；`dsh.client.platform: "web"` |
| 双面入口 | `exports["."]` 为 ESM 宿主插件，`exports["./client"]` 为浏览器闭包工厂包 |
| 客户端包格式 | 产物即 `window.__ModuleLoader__.load({ id, factory })`，`id` **必须**等于包名；模块只导出具名 `name / inject / apply`（不导 default） |
| 平台模块 | 只 `require` 壳冻结模块表内的条目（见 `shared/web-platform.ts`），其余依赖全部内联；跨插件值导入由打包时的纯净性校验直接报错 |
| 设置席位 | 用 `settings.general.item`，只声明 `id` / `order`；该席位不投影 label、不给行组件传 props，行自己画标题、当前值与写入路径 |
| 主题写入 | 只经 `theme.overrideTokens(id, tokens)`，不直接改 CSS 变量，不与壳的主题切换打架 |
| 显示元数据 | 包根 `icon.svg`（`exports["./icon"]`）+ `locale/en.json` / `locale/zh.json` 的 `title` / `description`，宿主不执行插件代码即可读出 |
| i18n | UI 文案内置 `zh` / `en` 两套字典，经 `locale.register/bind` 注册；AI 命名按当前语言选择提示词 |

---

## 📦 安装

> 需要 **DSH 0.2.1-rc.2 或更新的 0.2.x**、Node `^22.19 || >=24`。

### 1. 克隆并构建

```bash
git clone https://github.com/suzike/dsh-freestyle-theme.git
cd dsh-freestyle-theme
pnpm install
pnpm build
```

构建产物：`lib/index.js`（Host 面）、`lib/client.js`（浏览器面）、`lib/types/**`（声明）、以及 `icon.svg` / `locale/*.json`。

### 2. 挂载到你的 DSH profile

在 `~/.dsh/profiles/<profile>/package.json` 里登记依赖与 bundle：

```json
{
  "dependencies": {
    "dsh-freestyle-theme": "link:../../plugins/dsh-freestyle-theme"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-freestyle-theme"
      ]
    }
  }
}
```

`cordis.patch.yml` 已由包内 `dsh.bundle.patch` 声明，**无需手工追加插件行**。然后在 profile 目录执行 `pnpm install`，或在 `node_modules` 下为该包建一个指向插件目录的 Junction。

### 3. 重启 dsh web

重启 DeepSeek Harness（或 `dsh web` 进程），刷新浏览器即可。

---

## 🚀 使用

1. 打开 **设置 → 通用 → 自由主题**，点 **「自定义…」**
2. **主题提案** 页签：点任意预设/提案卡片一键应用；「换一批」重新生成；「恢复默认」还原
3. **主题设计器** 页签：切换主色/副色/面板通道，拖色相/彩度/明度滑杆（或点色相色块），实时预览；支持通道锁定、配色关系、快速变体、AI 命名、JSON 导入导出
4. 「应用主题」提交，「恢复默认」还原

---

## 🗂️ 目录结构

```
dsh-freestyle-theme/
├── src/
│   ├── index.ts              # Host 面：/api/dsh-freestyle-theme/name 命名路由
│   └── client/
│       ├── index.tsx         # Client 面：提案 + 设计器 UI 与插件入口
│       ├── palette.ts        # OKLCH 引擎 + 119 令牌映射
│       ├── locale.ts         # zh / en 文案字典
│       └── services.ts       # 壳服务的最小本地类型声明（零跨包依赖）
├── shared/
│   ├── tsdown.client.ts      # 客户端闭包工厂打包预设
│   └── web-platform.ts       # 壳冻结模块表（必须与 DSH 版本对齐）
├── locale/                   # en.json / zh.json：插件显示名与简介
├── icon.svg                  # 插件图标（宿主直接读，不执行代码）
├── cordis.patch.yml          # 插件行注册
├── package.json              # 包声明（dsh.bundle / dsh.client / exports）
├── tsdown.config.ts          # 双产物构建配置
├── tsconfig.json             # 类型检查
├── tsconfig.build.json       # 仅发声明到 lib/types
├── docs/images/              # 可视化配图
└── README.md
```

---

## 🔧 开发

```bash
pnpm typecheck   # tsc --noEmit
pnpm build       # 声明 + 双产物
pnpm watch       # tsdown --watch
```

升级 DSH 大版本时，**先核对 `shared/web-platform.ts` 与壳的模块表是否一致**：多一个会让 `require` 返回 `undefined`，少一个则该依赖无法被 `require`。

---

## 🔢 版本管理

本项目遵循 [语义化版本 SemVer](https://semver.org/)。每个发布版本打一个 git tag：

```bash
git tag v0.2.0
git push --tags
```

版本历史见 [Releases](https://github.com/suzike/dsh-freestyle-theme/releases)。

---

## 📄 License

[BSD-3-Clause](LICENSE)
