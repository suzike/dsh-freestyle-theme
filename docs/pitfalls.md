# 踩坑台账

按「会让线上直接坏掉」的严重度排，写的是现象、根因、改法，以及现在锁住它的测试。

## 一、Cordis 4 客户端插件：三个能让整个前端起不来的坑

宿主 DSH `0.2.1-rc.2`，cordis `~4.0.5`。三条都是 0.6.3 一次性踩到的，第二条最阴。

### 1. `apply()` 里裸读服务

现象：重启后 DSH 完全起不来，关掉所有插件才能启动；控制台是 `dsh-freestyle-theme: failed to activate` 与
`cannot get property "locale" without inject`——插件激活失败会把整条 web boot 拖挂，不是一个孤立报错。

根因：`ctx.theme` / `ctx.locale` 在服务就绪前是没有的，cordis 4 直接抛。

改法：把依赖声明出来，再在整个 `apply` 外面兜一层。

```ts
ctx.inject(['theme', 'locale'], (ctx) => { /* 这里才读服务 */ })
// service() 里的属性兜底也要 try/catch；apply 整体 try/catch 只 console.warn
```

### 2. `slots.inject` 放进嵌套作用域 → 静默不生效

现象：启动恢复后设置页里根本没有「FreeStyle 主题」这一行，没有任何报错，`__fstDebug` 里 `injected` / `theme` / `locale` 全是 `true`。

根因：`slots.inject(name, () => slots.register(...))` 依赖订阅发生在哪个 cordis 作用域里；写进 `ctx.inject(...)` 的回调里，注册就不会被采纳。

改法：注册写回插件自身的 `apply` 作用域，主题改成渲染时按需取（不要提前捕获）。

### 3. `ctx.effect` 的语义是「立即执行」

`ctx.effect(cb)` 会**马上**调用 `cb`，把返回值当 disposer。所以 `ctx.effect(() => dispose)` 会在注册之前就把东西销毁掉。

改法：要清理就监听 `ctx.on('dispose', cb)`。

---

## 二、桌面壳那 40px 不属于插件

现象：桌面端工作室右上角的撤销/保存/分享被最小化/最大化/关闭压住；左上角贴着窗口边缘。我们先后用两版去「占用」这条，结果变成新问题：自己画的「配色工作室」和宿主标题栏文字**叠字**，右上角那块系统画的**实心填充**（`titleBarOverlay.color`，不透明）跟我们半透明头部**撞色**。

根因：Electron `titleBarOverlay` 在 Windows 上是 40px，由系统画在页面内容**之上**，同时承载宿主自己的标题栏文字与一个不能改色的不透明底。任何覆盖都必然撞其中一样。

改法（0.6.7）：不让，改为下移。

```css
.ft-studio {
  position: fixed;
  inset: var(--ft-chrome-top, 0px) 0 0 0; /* 该带完整让给宿主 */
}
```

检测顺序（`src/client/chrome.ts`）：显式覆盖 → `env(titlebar-area-height)` → `html[data-platform]` → 0。

- `env()` 探针必须用**同一选择器**跑两个不同兜底值再比对。写 `env(titlebar-area-height, -1px)` 是非法值，浏览器直接丢弃整条声明，看起来永远像「没有覆盖层」。
- 打包版把 UA 改了，`navigator.userAgent` 里没有 `Electron`——靠 UA 认桌面壳一定失败。可靠信号是 preload 的 `markDocumentPlatform()` 写的 `html[data-platform]`，网页端从不设置它。

---

## 三、样式：多个模板字符串拼一张表，同一选择器会被定义三次

现象：预览里的「动效」开关，开与关长得一模一样，圆钮还跑出轨道外。

根因：`src/client/styles.ts` 是若干模板字符串拼出来的大 CSS，`.ft-pv-toggle` 有三份定义（轨道品牌色 / 圆钮钉右侧 / 开启态再推 11px），后一份默默覆盖前一份。

改法：改样式前先 `grep -n "选择器"` 确认只有一份；`tests/styles.test.mjs` 锁死「唯一性 / 圆钮不出轨道 / 关闭态不得像开启态 / 浮层 inset 必须用 `--ft-chrome-top`」。

---

## 四、验证：真实 GUI 进不去，就自己搭一个

真实 GUI 要 session token，Playwright 打 `http://127.0.0.1:<port>` 只会拿到 `401`。做法是**自包含 harness**：

1. `scripts/harness.mjs` 用真实构建产物 `lib/client.js` + 最小 fake ctx（`theme` / `locale` / `slots`）渲染成单页；
2. `python -m http.server` 起静态服务，Playwright 截图 + `evaluate` 取几何（`top` / `height` / 是否越界）；
3. 要验「桌面端才存在」的条件，就在页面上再叠一条模拟壳条（固定 40px + 右侧不透明块 + 假按钮）。0.6.7 就是靠这个确认「工作室 top = 40、头部 52px、无元素进入该带」。

边界：模拟条只证几何，颜色与观感最终仍要用户在真实桌面端确认——0.6.5 就是「harness 看着对、真机不对」。

---

## 五、发版闭环

```bash
pnpm typecheck && node --test "tests/*.test.mjs" && pnpm check:tokens
pnpm build
# bump package.json + CHANGELOG
git -c http.proxy=http://127.0.0.1:7897 push origin main   # 直连 github.com:443 会超时
git tag -a vX.Y.Z && git -c http.proxy=... push origin vX.Y.Z
gh release create vX.Y.Z                                    # gh 与 api.github.com 直连可用
cp package.json lib locale icon ~/.dsh/plugins/dsh-freestyle-theme/ && sha1sum 比对 lib/client.js
```

两条纪律：

- 用户可见的每个修复单独发版，不要攒。
- 同一个 bug 被用户打回两次，说明**方案**错了，换方案而不是叠补丁（0.6.5/0.6.6/0.6.7 就是这么走的）。
