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

// Tokens the shell defines beyond the 119 this design owns. The retint layer
// must cover these too, otherwise the real app recolours in patches; the
// harness proves that by projecting the whole map onto <body>.
const EXTRA = {
  '--dsw-alias-border-l3': ['#e4e7e4', '#2e312e'],
  '--dsw-alias-border-l4': ['#eef0ee', '#262926'],
  '--dsw-alias-bg-skeleton': ['#0000000a', '#ffffff14'],
  '--dsw-alias-markdown-code-block': ['#f2f4f2', '#1b1e1b'],
  '--dsw-alias-markdown-inline-code': ['#eef1ee', '#22261f'],
  '--dsw-alias-button-primary-fill': ['#387761', '#72ccab'],
  '--dsw-alias-button-primary-hover': ['#2f6553', '#8ad9bd'],
  '--dsw-alias-button-ghost-active-fill': ['#e8f0ec', '#22302a'],
  '--dsw-alias-interactive-bg-hover': ['#0000000a', '#ffffff0f'],
  '--dsw-alias-interactive-bg-active': ['#00000014', '#ffffff1a'],
  '--dsw-alias-state-success-secondary': ['#1f7a52', '#6ff0b4'],
  '--dsw-alias-state-warn-secondary': ['#9a6a00', '#ffd166'],
  '--dsw-alias-state-error-secondary': ['#a4303a', '#ff9aa2'],
  '--dsw-alias-scrollbar-bg-l1': ['#0000000a', '#ffffff0a'],
  '--dsw-alias-scrollbar-hover-l1': ['#0000001f', '#ffffff1f'],
  '--dsw-alias-toast-bg': ['#101411', '#f4f7f4'],
  '--dsw-alias-tooltip-bg': ['#101411', '#f4f7f4'],
  '--dsw-alias-menu-surface-fill': ['#f8f9fa94', '#43454a73'],
  '--dsw-alias-code-diff-added': ['#0f7a3d0f', '#6ff0b414'],
  '--dsw-alias-code-diff-deleted': ['#a4303a0f', '#ff9aa214'],
  '--dsw-alias-file-diff-added-marker': ['#01a241', '#3ddc97'],
  '--dsw-alias-file-diff-deleted-marker': ['#d13a3a', '#ff7a7a'],
  '--dsw-specific-menu': ['#ffffff', '#1b1e1b'],
  '--dsw-specific-selector': ['#f2f4f2', '#242724'],
  '--dsw-specific-input-major': ['#ffffff', '#1b1e1b'],
  '--dsw-specific-tip': ['#f7f9f7', '#20231f'],
}
const base = (modeName) => {
  const pal = palette.fullPalette({ ...spec, mode: modeName })
  const table = { ...pal }
  for (const [name, pair] of Object.entries(EXTRA)) table[name] = modeName === 'light' ? pair[0] : pair[1]
  return table
}
const baseTokens = JSON.stringify({ light: base('light'), dark: base('dark') })

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
<script>window.__BASE_TOKENS__ = ${baseTokens.replace(/</g, '\u003c')}</script>
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

  // A faithful stand-in for the shell's theme service: it keeps the built-in
  // token tables and projects overrides onto <body> exactly like ui-layout does.
  const BASE = window.__BASE_TOKENS__;
  const themes = [
    { id: 'light', colorScheme: 'light', tokens: BASE.light },
    { id: 'dark', colorScheme: 'dark', tokens: BASE.dark },
  ];
  let scheme = ${JSON.stringify(mode)};
  const layers = new Map();
  const applied = [];
  const project = () => {
    for (const name of applied.splice(0)) document.body.style.removeProperty(name);
    const merged = {};
    for (const layer of [...layers.values()]) Object.assign(merged, layer);
    for (const [name, pair] of Object.entries(merged)) {
      const value = pair[scheme];
      if (typeof value === 'string') {
        document.body.style.setProperty(name, value);
        applied.push(name);
      }
    }
    document.body.dataset.scheme = scheme;
    document.body.style.background = merged['--dsw-alias-bg-base']?.[scheme] || '';
    document.body.style.color = merged['--dsw-alias-label-primary']?.[scheme] || '';
    window.__appliedCount = Object.keys(merged).length;
  };
  const themeService = {
    getTheme() {
      return { themes, active: themes.find((entry) => entry.colorScheme === scheme) };
    },
    overrideTokens(source, tokens) {
      layers.set(source, tokens);
      project();
      return () => { layers.delete(source); project(); };
    },
  };
  window.__setScheme = (next) => { scheme = next; project(); };
  const ctx = {
    effect(fn) { const d = fn(); return d; },
    get(name) {
      if (name === 'locale') return { register() {}, bind() { return t } };
      if (name === 'theme') return themeService;
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
  window.__harness = { mod, ctx, t, themeService, get applied() { return window.__appliedCount || 0 } };
})();
</script>
</html>`

mkdirSync(join(root, '.preview'), { recursive: true })
const out = join(root, '.preview', `harness-${presetId}-${mode}.html`)
writeFileSync(out, html)
console.log(out)
