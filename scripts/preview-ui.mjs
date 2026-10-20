/**
 * Renders the studio to a standalone HTML file so the visual result can be
 * inspected (and screenshotted) without booting DSH.
 *
 *   node scripts/preview-ui.mjs [presetId] [light|dark] [view]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { load, root } from '../tests/_ts-hook.mjs'

const presetId = process.argv[2] ?? 'mist'
const mode = process.argv[3] ?? 'light'
const view = process.argv[4] ?? 'chat'

const palette = await load('palette')
const locale = await load('locale')
const studio = await load('studio')
const styles = await load('styles')
const preview = await load('preview')

const preset = palette.PRESETS.find((item) => item.id === presetId) ?? palette.PRESETS[0]
const spec = { ...palette.presetSpec(preset, mode), mode }
const tokens = palette.fullPalette(spec)
const look = palette.lookTokens(spec)

const t = (key, vars) => locale.format(locale.DICTIONARIES.zh[key] ?? key, vars)

const studioHtml = renderToStaticMarkup(
  createElement(studio.Studio, { t, theme: undefined, initial: spec, onClose: () => undefined }),
)

// A settings row in isolation, mirroring the markup index.tsx renders.
const rowHtml = `<div class="ft-root" style="padding:0"><div class="ft-row">
  <span class="ft-row-thumb" aria-hidden="true">
    <i style="background:${tokens['--dsw-alias-bg-base']}"></i>
    <i style="background:${tokens['--dsw-alias-brand-primary']}"></i>
    <i style="background:${tokens['--dsw-specific-sidebar-fill']}"></i>
    <i style="background:${tokens['--dsw-alias-bg-layer-1']}"></i>
  </span>
  <div class="ft-row-main">
    <span class="ft-row-title">FreeStyle 主题</span>
    <span class="ft-row-hint">浅色 · ${Math.round(spec.th)}° · 主色</span>
  </div>
  <span class="ft-row-actions"><button class="ft-btn ft-btn-sm">打开<span aria-hidden="true">›</span></button></span>
</div></div>`

const vars = Object.entries({ ...tokens, ...look })
  .map(([key, value]) => `${key}:${value}`)
  .join(';')

const page = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>studio preview</title>
<style>
  html, body { margin: 0; height: 100%; background: #e9ecf1; }
  body { font-family: -apple-system, "Segoe UI", sans-serif; }
  .host { position: relative; width: 1440px; height: 900px; overflow: hidden; }
  .host[data-mode='dark'] { background: #14161a; }
  .mock { position: absolute; inset: 0; }
  .mock-bar { height: 52px; background: var(--dsw-alias-bg-overlay); border-bottom: 1px solid var(--dsw-alias-border-l1); }
  .mock-card { position: absolute; left: 48px; top: 96px; width: 720px; padding: 18px; border-radius: 14px;
    background: var(--dsw-alias-settings-card-fill); border: 1px solid var(--dsw-alias-border-l1); }
  ${styles.CSS}
</style>
<div class="host" data-mode="${mode}" style="${vars}">${studioHtml}</div>
<div style="${vars};width:820px;padding:24px;background:var(--dsw-alias-bg-base)">
  <div style="font:600 13px/1.6 -apple-system,sans-serif;color:var(--dsw-alias-label-secondary);margin-bottom:10px">settings row (container query surface)</div>
  ${rowHtml}
</div>
`

const previewFrame = createElement
const gallery = `<!doctype html>
<meta charset="utf-8">
<title>gallery</title>
<style>
  body { margin: 0; background: #eef1f5; ${''} }
  .wrap { padding: 28px; display: flex; flex-direction: column; gap: 28px; }
  .cap { font: 600 12px/1.4 -apple-system, sans-serif; letter-spacing: .04em; text-transform: uppercase; color: #6b7280; }
  ${styles.CSS}
</style>
<div class="wrap" style="${vars}">
  <div>
    <div class="cap">settings row</div>
    <div class="ft-root" style="width: 760px; margin-top: 10px; background: var(--dsw-alias-bg-base); padding: 16px; border-radius: 14px">${rowHtml}</div>
  </div>
  <div>
    <div class="cap">preview · list / form</div>
    <div class="ft-root" style="display: flex; gap: 20px; margin-top: 10px">
      ${['list', 'form'].map((v) => renderToStaticMarkup(createElement(preview.PreviewFrame, { t, spec, palette: tokens, view: v, filters: false }))).join('')}
    </div>
  </div>
  <div>
    <div class="cap">dialog + command palette + toast</div>
    <div class="ft-root" style="position: relative; height: 470px; margin-top: 10px; background: var(--dsw-alias-bg-base); border-radius: 14px; overflow: hidden">
      <div class="ft-dialog" style="position: absolute; left: 40px; top: 32px">
        <div class="ft-dialog-head"><span class="ft-icon"></span>分享主题<span class="ft-spacer"></span><button class="ft-btn ft-btn-icon ft-btn-ghost">×</button></div>
        <div class="ft-dialog-body">
          <input class="ft-input" value="dsh-freestyle-theme://eyJ2IjozfQ" readonly>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="ft-btn">复制链接</button><button class="ft-btn">复制 CSS</button><button class="ft-btn">复制 JSON</button>
          </div>
          <div style="height:1px;background:var(--dsw-alias-border-l1)"></div>
          <div style="font-size:11px;color:var(--ft-ink-2)">导入</div>
          <textarea class="ft-input ft-textarea" placeholder="粘贴分享码或 JSON"></textarea>
        </div>
        <div class="ft-dialog-foot"><button class="ft-btn">关闭</button></div>
      </div>
      <div class="ft-cmd" style="position: absolute; left: 620px; top: 32px; margin-left:0">
        <input class="ft-cmd-input" placeholder="搜索命令">
        <div class="ft-cmd-list">
          <button class="ft-cmd-item" data-active="true"><span class="ft-icon">✓</span><span>应用当前主题</span><kbd>↵</kbd></button>
          <button class="ft-cmd-item"><span class="ft-icon">✓</span><span>分享</span><kbd>↵</kbd></button>
          <button class="ft-cmd-item"><span class="ft-icon">✓</span><span>导出 CSS</span><kbd>↵</kbd></button>
        </div>
      </div>
      <div class="ft-toast" style="position: absolute; left: 50%; bottom: 24px"><span class="ft-icon">✓</span>已应用到 DSH</div>
    </div>
  </div>
</div>`

const out = join(root, '.preview')
mkdirSync(out, { recursive: true })
const file = join(out, `${presetId}-${mode}-${view}.html`)
writeFileSync(file, page)
const galleryFile = join(out, `gallery-${presetId}-${mode}.html`)
writeFileSync(galleryFile, gallery)
console.log(file)
console.log(galleryFile)
