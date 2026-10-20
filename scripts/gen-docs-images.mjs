/**
 * Generate the data-driven README figures from the real engine.
 *
 * Nothing here is a mock-up: every swatch is a token value produced by
 * `fullPalette`, every audit cell is the verdict of `auditPalette`. If the
 * palette regresses, the pictures change with it.
 *
 *   node scripts/gen-docs-images.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { load, root } from '../tests/_ts-hook.mjs'

const palette = await load('palette')
const contrast = await load('contrast')

const OUT = join(root, 'docs', 'images')
await mkdir(OUT, { recursive: true })

const INK = '#e8eaed'
const MUTED = '#8b93a1'
const HAIR = 'rgba(255,255,255,0.10)'
const CANVAS = '#0b0f14'
const ACCENT = '#3ddc97'
const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,monospace"
const SANS = "Inter,'SF Pro Text','Segoe UI',system-ui,sans-serif"

const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const swatchesOf = (spec) => {
  const tokens = palette.fullPalette(spec)
  return {
    brand: tokens['--dsw-alias-brand-primary'],
    layer: tokens['--dsw-alias-bg-layer-1'],
    base: tokens['--dsw-alias-bg-base'],
    text: tokens['--dsw-alias-label-primary'],
    secondary: tokens['--dsw-alias-label-secondary'],
    border: tokens['--dsw-alias-border-l1'],
    success: tokens['--dsw-alias-state-success-primary'],
    error: tokens['--dsw-alias-state-error-primary'],
  }
}

/* ── 1. twelve presets, both modes ──────────────────────────────────────── */

function presetsFigure() {
  const cardW = 244
  const cardH = 132
  const gapX = 20
  const gapY = 20
  const padX = 44
  const padY = 74
  const cols = 4
  const rows = Math.ceil(palette.PRESETS.length / cols)
  const width = padX * 2 + cols * cardW + (cols - 1) * gapX
  const height = padY + rows * cardH + (rows - 1) * gapY + 66

  const cards = palette.PRESETS.map((preset, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const x = padX + col * (cardW + gapX)
    const y = padY + row * (cardH + gapY)
    const light = swatchesOf(palette.presetSpec(preset, 'light'))
    const dark = swatchesOf(palette.presetSpec(preset, 'dark'))
    const lightSpec = palette.presetSpec(preset, 'light')
    const darkSpec = palette.presetSpec(preset, 'dark')

    const chips = (tone, values, top) =>
      values
        .map(
          (value, chipIndex) =>
            `<rect x="${x + 14 + chipIndex * 24}" y="${y + top}" width="20" height="20" rx="6" fill="${value}" stroke="${HAIR}"/>`,
        )
        .join('')

    return `
    <g>
      <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="14" fill="#11161d" stroke="${HAIR}"/>
      <rect x="${x}" y="${y}" width="${cardW}" height="3" rx="1.5" fill="${light.brand}"/>
      <text x="${x + 14}" y="${y + 30}" font-family="${SANS}" font-size="13" font-weight="600" fill="${INK}">${esc(
        preset.id,
      )}</text>
      <text x="${x + cardW - 14}" y="${y + 30}" text-anchor="end" font-family="${MONO}" font-size="10" fill="${MUTED}">${Math.round(
        lightSpec.th,
      )}° · c${lightSpec.c1.toFixed(2)}</text>
      <text x="${x + 14}" y="${y + 50}" font-family="${MONO}" font-size="9" fill="${MUTED}">LIGHT</text>
      ${chips('light', [light.base, light.layer, light.brand, light.text, light.border], 60)}
      <text x="${x + 14}" y="${y + 100}" font-family="${MONO}" font-size="9" fill="${MUTED}">DARK</text>
      ${chips('dark', [dark.base, dark.layer, dark.brand, dark.text, dark.border], 110)}
      <text x="${x + cardW - 14}" y="${y + 120}" text-anchor="end" font-family="${MONO}" font-size="9" fill="${MUTED}">tint ${Math.round(
        lightSpec.neutralTint * 100,
      )}%</text>
    </g>`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Twelve coordinate presets in light and dark">
  <rect width="${width}" height="${height}" rx="0" fill="${CANVAS}"/>
  <g font-family="${SANS}">
    <text x="${padX}" y="40" font-size="19" font-weight="650" fill="${INK}">十二套坐标预设</text>
    <text x="${padX}" y="60" font-size="11.5" fill="${MUTED}">每套预设不是「换个色相」，而是自带中性温度、明度梯度与状态簇的一组坐标。所有色块由 palette.ts 实时生成。</text>
  </g>
  ${cards}
  <text x="${padX}" y="${height - 24}" font-family="${MONO}" font-size="9.5" fill="${MUTED}">每行：底色 / 卡片层 / 品牌 / 正文 / 边框　·　生成源：src/client/palette.ts</text>
</svg>`
}

/* ── 2. contrast matrix: 12 presets × 20 pairs × 2 modes ────────────────── */

function contrastFigure() {
  const pairs = contrast.AUDIT_PAIRS
  const presets = palette.PRESETS
  const cellW = 26
  const cellH = 26
  const padX = 168
  const padY = 92
  const width = padX + pairs.length * cellW + 44
  const height = padY + presets.length * cellH + 96

  const rows = presets
    .map((preset, row) => {
      const labelY = padY + row * cellH + 17
      const cells = pairs
        .map((pair, col) => {
          const x = padX + col * cellW
          const y = padY + row * cellH
          const lightPass = contrast
            .auditPalette(palette.fullPalette(palette.presetSpec(preset, 'light')))
            .find((result) => result.id === pair.id)?.pass
          const darkPass = contrast
            .auditPalette(palette.fullPalette(palette.presetSpec(preset, 'dark')))
            .find((result) => result.id === pair.id)?.pass
          const fillLight = lightPass ? '#1f7a52' : '#8c2f39'
          const fillDark = darkPass ? '#3ddc97' : '#ff6b6b'
          return `<g>
            <rect x="${x + 1}" y="${y + 1}" width="${cellW - 2}" height="${cellH / 2 - 2}" rx="3" fill="${fillLight}"/>
            <rect x="${x + 1}" y="${y + cellH / 2 + 1}" width="${cellW - 2}" height="${cellH / 2 - 2}" rx="3" fill="${fillDark}"/>
          </g>`
        })
        .join('')
      return `<g>
        <text x="${padX - 12}" y="${labelY}" text-anchor="end" font-family="${MONO}" font-size="10.5" fill="${INK}">${esc(
          preset.id,
        )}</text>
        ${cells}
      </g>`
    })
    .join('')

  const headers = pairs
    .map((pair, col) => {
      const x = padX + col * cellW + cellW / 2
      return `<g transform="translate(${x},${padY - 10}) rotate(-52)">
        <text text-anchor="start" font-family="${MONO}" font-size="9" fill="${MUTED}">${esc(pair.id)}</text>
      </g>`
    })
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Contrast audit matrix: 12 presets by 20 pairs, light and dark">
  <rect width="${width}" height="${height}" fill="${CANVAS}"/>
  <g font-family="${SANS}">
    <text x="44" y="40" font-size="19" font-weight="650" fill="${INK}">对比度体检矩阵</text>
    <text x="44" y="60" font-size="11.5" fill="${MUTED}">12 套预设 × 20 组前景/背景 × 明暗两套 = 480 项判定，全部由 WCAG 与 APCA 双阈值实时算出。</text>
  </g>
  <g font-family="${MONO}" font-size="9.5" fill="${MUTED}">
    <rect x="44" y="70" width="10" height="10" rx="2" fill="#1f7a52"/><text x="60" y="79">浅色通过</text>
    <rect x="132" y="70" width="10" height="10" rx="2" fill="#8c2f39"/><text x="148" y="79">浅色未过</text>
    <rect x="236" y="70" width="10" height="10" rx="2" fill="#3ddc97"/><text x="252" y="79">深色通过</text>
    <rect x="324" y="70" width="10" height="10" rx="2" fill="#ff6b6b"/><text x="340" y="79">深色未过</text>
  </g>
  ${headers}
  ${rows}
  <text x="44" y="${height - 40}" font-family="${MONO}" font-size="9.5" fill="${MUTED}">每格上半＝浅色模式，下半＝深色模式　·　生成源：src/client/contrast.ts</text>
  <text x="44" y="${height - 24}" font-family="${MONO}" font-size="9.5" fill="${MUTED}">复跑：pnpm test · node scripts/gen-docs-images.mjs</text>
</svg>`
}

await writeFile(join(OUT, 'presets.svg'), presetsFigure(), 'utf8')
await writeFile(join(OUT, 'contrast-matrix.svg'), contrastFigure(), 'utf8')
console.log('wrote docs/images/presets.svg + contrast-matrix.svg')
