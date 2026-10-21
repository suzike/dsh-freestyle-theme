/**
 * Renders docs/images/traditional-colors.svg from the same table the studio
 * uses, so the documentation can never drift from the shipped presets.
 *
 *   node scripts/gen-traditional-svg.mjs
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { load, root } from '../tests/_ts-hook.mjs'

const palette = await load('palette')
const locale = await load('locale')
const zh = locale.DICTIONARIES.zh
const colors = palette.TRADITIONAL.map((c) => ({ ...c, name: zh[`trad.${c.id}`] ?? c.id }))
if (!Array.isArray(colors) || colors.length < 24) {
  throw new Error(`expected the traditional palette, got ${colors?.length}`)
}

const COLS = 8
const CELL_W = 136
const CELL_H = 92
const PAD = 32
const HEAD = 104
const rows = Math.ceil(colors.length / COLS)
const width = PAD * 2 + CELL_W * COLS
const height = HEAD + rows * CELL_H + 56

const INK = '#e8eaed'
const MUTED = '#8b93a1'
const HAIR = 'rgba(255,255,255,0.08)'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"

const esc = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const parts = []
parts.push(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="中国传统色 ${colors.length} 色">`,
)
parts.push('<defs>')
parts.push(
  `<radialGradient id="glow" cx="18%" cy="0%" r="80%"><stop offset="0%" stop-color="#3ddc97" stop-opacity="0.18"/><stop offset="60%" stop-color="#3ddc97" stop-opacity="0.03"/><stop offset="100%" stop-color="#0b0f14" stop-opacity="0"/></radialGradient>`,
)
parts.push('</defs>')
parts.push(`<rect width="${width}" height="${height}" fill="#0b0f14"/>`)
parts.push(`<rect width="${width}" height="${height}" fill="url(#glow)"/>`)

parts.push(
  `<text x="${PAD}" y="54" font-family="${SANS}" font-size="26" font-weight="600" fill="${INK}">中国传统色</text>`,
)
parts.push(
  `<text x="${PAD + 152}" y="44" font-family="${MONO}" font-size="13" fill="#3ddc97">${colors.length}</text>`,
)
parts.push(
  `<text x="${PAD}" y="80" font-family="${SANS}" font-size="13" fill="${MUTED}">选一种传统色作为主色，其余坐标（副色、中性、明度骨架）由它推导 —— 每套仍然是 119 个令牌 + 21 组对比度校验。</text>`,
)
parts.push(
  `<text x="${width - PAD}" y="54" text-anchor="end" font-family="${MONO}" font-size="11" fill="${MUTED}">src/client/palette.ts</text>`,
)

colors.forEach((color, index) => {
  const col = index % COLS
  const row = Math.floor(index / COLS)
  const x = PAD + col * CELL_W
  const y = HEAD + row * CELL_H
  parts.push('<g>')
  parts.push(
    `<rect x="${x}" y="${y}" width="${CELL_W - 14}" height="${CELL_H - 14}" rx="12" fill="#10151b" stroke="${HAIR}"/>`,
  )
  parts.push(
    `<rect x="${x + 10}" y="${y + 10}" width="${CELL_W - 34}" height="44" rx="8" fill="${color.hex}"/>`,
  )
  parts.push(
    `<rect x="${x + 10}" y="${y + 10}" width="${CELL_W - 34}" height="44" rx="8" fill="none" stroke="rgba(0,0,0,0.22)"/>`,
  )
  parts.push(
    `<text x="${x + 12}" y="${y + 68}" font-family="${SANS}" font-size="12.5" font-weight="500" fill="${INK}">${esc(color.name)}</text>`,
  )
  parts.push(
    `<text x="${x + 12}" y="${y + 84}" font-family="${MONO}" font-size="10.5" fill="${MUTED}">${color.hex.toUpperCase()}</text>`,
  )
  parts.push('</g>')
})

parts.push(
  `<text x="${PAD}" y="${height - 22}" font-family="${MONO}" font-size="10.5" fill="${MUTED}">每个色值都会被转换到 OKLCH，品牌的色相与彩度进入四轴模型；对比度不达标的坐标由「一键修复」回调明度。</text>`,
)
parts.push('</svg>')

const out = join(root, 'docs', 'images', 'traditional-colors.svg')
writeFileSync(out, parts.join('\n'), 'utf8')
console.log(`wrote ${out} (${colors.length} colors, ${width}x${height})`)
