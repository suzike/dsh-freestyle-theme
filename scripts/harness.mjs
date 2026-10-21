/**
 * Live harness: boots the real client bundle in a browser with a fake DSH host,
 * so every screen (row / studio / dialogs / narrow layout) can be driven and
 * screenshotted exactly as shipped.
 *
 *   node scripts/harness.mjs [presetId] [light|dark]
 *
 * Output: .preview/harness-<preset>-<mode>.html  (serve .preview over http)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { load, root } from '../tests/_ts-hook.mjs'

const presetId = process.argv[2] ?? 'mist'
const mode = process.argv[3] ?? 'light'

const palette = await load('palette')
const locale = await load('locale')
const styles = await load('styles')

const preset = palette.PRESETS.find((item) => item.id === presetId) ?? palette.PRESETS[0]
const spec = { ...palette.presetSpec(preset, mode), mode }
const tokens = { ...palette.fullPalette(spec), ...palette.lookTokens(spec) }
const vars = Object.entries(tokens).map(([k, v]) => `${k}:${v}`).join(';')

const umd = (file) => readFileSync(join(root, 'node_modules', file), 'utf8')
const bundle = readFileSync(join(root, 'lib/client.js'), 'utf8')

const html = `<!doctype html>
<html lang="zh-CN" data-mode="${mode}">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>harness · ${presetId} · ${mode}</title>
<style>
:root{${vars};color-scheme:${mode};}
html,body{margin:0;height:100%;}
body{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);
  font:400 13px/1.5 -apple-system,"Segoe UI",var(--ft-font-sans),"PingFang SC",sans-serif;
  -webkit-font-smoothing:antialiased;}
#host{padding:28px 32px;max-width:880px;margin:0 auto;}
.host-title{font:600 15px/1.4 inherit;letter-spacing:-.01em;margin:0 0 4px;}
.host-sub{color:var(--dsw-alias-label-secondary);margin:0 0 18px;font-size:12px;}
.host-card{background:var(--dsw-alias-settings-card-fill);border:1px solid var(--dsw-alias-settings-card-stroke);
  border-radius:14px;padding:4px 14px;margin-bottom:10px;}
.host-line{display:flex;align-items:center;gap:12px;padding:12px 2px;font-size:13px;
  color:var(--dsw-alias-label-secondary);}
.host-line+.host-line{border-top:1px solid var(--dsw-alias-border-l1);}
.host-line b{font-weight:500;color:var(--dsw-alias-label-primary);}
.host-seg{margin-left:auto;display:flex;gap:6px;}
.host-seg span{padding:3px 10px;border-radius:7px;font-size:12px;
  background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);}
</style>
<style>${styles.CSS}</style>
<div id="host">
  <p class="host-title">设置 · 通用</p>
  <p class="host-sub">这是宿主设置页的真实排布，用于检查插件行与邻居行是否同族。</p>
  <div class="host-card">
    <div class="host-line"><b>外观</b><span class="host-seg"><span>浅色</span><span>深色</span><span>跟随系统</span></span></div>
    <div class="host-line"><b>语言</b><span>简体中文</span></div>
    <div id="row-mount"></div>
    <div class="host-line"><b>发送快捷键</b><span>Enter 发送，Shift+Enter 换行</span></div>
  </div>
</div>
<script>${umd('react/umd/react.development.js')}</script>
<script>${umd('react-dom/umd/react-dom.development.js')}</script>
<script>
window.__ModuleLoader__ = { load(def) { window.__plugin = def } };
</script>
<script>${bundle}</script>
<script>
(function () {
  // Seed the persisted spec so the panel opens in the harness mode instead of
  // falling back to the light default.
  try { localStorage.setItem('dsh-freestyle-theme/spec', ${JSON.stringify(JSON.stringify(spec))}); } catch (e) {}
  const zh = ${JSON.stringify(locale.DICTIONARIES.zh)};
  const en = ${JSON.stringify(locale.DICTIONARIES.en)};
  const dict = { ...en, ...zh };
  const t = (key, vars) => {
    const raw = dict[key] ?? key;
    if (!vars) return raw;
    return raw.replace(/\\{(\\w+)\\}/g, (_, name) => String(vars[name] ?? ''));
  };
  const jsxRuntime = {
    Fragment: React.Fragment,
    jsx: (type, props, key) => React.createElement(type, { ...props, key }),
    jsxs: (type, props, key) => React.createElement(type, { ...props, key }),
  };
  const require = (id) => {
    if (id === 'react') return React;
    if (id === 'react/jsx-runtime') return jsxRuntime;
    if (id === 'react-dom') return ReactDOM;
    if (id === 'react-dom/client') return ReactDOM;
    throw new Error('harness: unmapped module ' + id);
  };
  const mod = window.__plugin.factory(require);
  let row = null;
  const ctx = {
    effect(fn) { const d = fn(); return d; },
    get(name) {
      if (name === 'locale') return { register() {}, bind() { return t } };
      if (name === 'theme') return { overrideTokens() { return () => {} } };
      if (name === 'slots') return slots;
      return undefined;
    },
    slots: null,
  };
  const slots = {
    inject(_name, cb) { cb() },
    register(_opts, component) { row = component; return () => { row = null } },
  };
  ctx.slots = slots;
  ctx.locale = ctx.get('locale');
  ctx.theme = ctx.get('theme');
  mod.apply(ctx);
  const mount = document.getElementById('row-mount');
  ReactDOM.createRoot(mount).render(React.createElement(row));
  window.__harness = { mod, ctx, t };
})();
</script>
</html>`

mkdirSync(join(root, '.preview'), { recursive: true })
const out = join(root, '.preview', `harness-${presetId}-${mode}.html`)
writeFileSync(out, html)
console.log(out)
