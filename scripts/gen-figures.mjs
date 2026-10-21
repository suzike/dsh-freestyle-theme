/**
 * Generates every README figure from one shared frame, so the set reads as a
 * family instead of seven unrelated drawings.
 *
 *   node scripts/gen-figures.mjs
 *
 * Two guards run on every figure before it is written:
 *   - every text run must fit inside the canvas and inside the box it belongs to
 *   - no two text runs may overlap (the reason the old figures looked broken)
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { load, root } from '../tests/_ts-hook.mjs'

/* ── shared frame ────────────────────────────────────────────────────────── */

const C = {
  canvas: '#0b0f14',
  panel: '#10151b',
  panel2: '#151b22',
  ink: '#e8eaed',
  dim: '#b6bdc8',
  muted: '#8b93a1',
  hair: 'rgba(255,255,255,0.10)',
  hair2: 'rgba(255,255,255,0.06)',
  accent: '#3ddc97',
  accentDim: 'rgba(61,220,151,0.14)',
  warn: '#ffb454',
  bad: '#ff6b6b',
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Courier New', monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
}

const W = 1200
const PAD = 36
const HEAD_H = 96
const FOOT_H = 46

const esc = (v) =>
  String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Rough advance width: CJK is ~1em, caps and digits are wide, lowercase narrow. */
function measure(text, size) {
  let width = 0
  for (const ch of String(text)) {
    const code = ch.codePointAt(0)
    if (code >= 0x2e80 && code <= 0x9fff) width += size
    else if (code >= 0xff00 && code <= 0xff60) width += size
    else if (code >= 0x3000 && code <= 0x303f) width += size
    else if (/[A-Z0-9#%@]/.test(ch)) width += size * 0.63
    else if (/[a-z]/.test(ch)) width += size * 0.53
    else width += size * 0.36
  }
  return width
}

function clip(text, size, maxWidth) {
  if (measure(text, size) <= maxWidth) return text
  let out = ''
  for (const ch of String(text)) {
    if (measure(out + ch, size) > maxWidth - size * 0.9) return out + '…'
    out += ch
  }
  return out
}

/** Greedy wrap, breaking between characters for CJK and at spaces for latin. */
function wrap(text, size, maxWidth) {
  const lines = []
  let line = ''
  for (const ch of String(text)) {
    const next = line + ch
    if (measure(next, size) > maxWidth && line) {
      lines.push(line)
      line = ch === ' ' ? '' : ch
      continue
    }
    line = next
  }
  if (line.trim()) lines.push(line)
  return lines
}

class Figure {
  constructor({ width = W, height, kicker, title, subtitle, source }) {
    this.width = width
    this.height = height
    this.body = []
    this.texts = []
    this.cards = []
    this.cursor = HEAD_H
    this.add(
      `<rect width="${width}" height="${height}" fill="${C.canvas}"/>` +
        `<radialGradient id="glow" cx="16%" cy="-6%" r="62%">` +
        `<stop offset="0%" stop-color="${C.accent}" stop-opacity="0.16"/>` +
        `<stop offset="55%" stop-color="${C.accent}" stop-opacity="0.04"/>` +
        `<stop offset="100%" stop-color="${C.canvas}" stop-opacity="0"/>` +
        `</radialGradient>` +
        `<rect width="${width}" height="${height}" fill="url(#glow)"/>`,
    )
    this.text(kicker.toUpperCase(), PAD, 44, { size: 10.5, mono: true, fill: C.accent, tracking: 1.6 })
    this.text(title, PAD, 84, { size: 27, weight: 600, fill: C.ink })
    if (source) {
      this.text(source, width - PAD, 44, { size: 10.5, mono: true, fill: C.muted, align: 'end' })
    }
    if (subtitle) {
      const lines = wrap(subtitle, 12.5, width - PAD * 2)
      lines.slice(0, 2).forEach((line, i) => {
        this.text(line, PAD, 110 + i * 18, { size: 12.5, fill: C.muted })
      })
      if (lines.length > 2) throw new Error(`subtitle too long: ${subtitle}`)
      this.cursor = 110 + lines.length * 18 + 18
    } else {
      this.cursor = 110 + 22
    }
  }

  add(svg) {
    this.body.push(svg)
    return this
  }

  text(raw, x, y, { size = 12, weight = 400, mono = false, fill = C.ink, align = 'start', tracking = 0, maxWidth } = {}) {
    const value = maxWidth ? clip(raw, size, maxWidth) : raw
    const width = measure(value, size) + tracking * value.length
    const left = align === 'end' ? x - width : align === 'middle' ? x - width / 2 : x
    if (left < 4 || left + width > this.width - 4) {
      throw new Error(`text out of canvas: "${value}" at x=${x} width=${width.toFixed(0)}`)
    }
    this.texts.push({ value, left, top: y - size, right: left + width, bottom: y + size * 0.34, size })
    this.add(
      `<text x="${x.toFixed(1)}" y="${y}" font-family="${mono ? C.mono : C.sans}" font-size="${size}" ` +
        `font-weight="${weight}" fill="${fill}" text-anchor="${align}"` +
        `${tracking ? ` letter-spacing="${tracking}"` : ''}>${esc(value)}</text>`,
    )
    return { left, right: left + width }
  }

  /** Paragraph inside a box: wraps, never spills, returns the next free y. */
  paragraph(raw, x, y, maxWidth, { size = 11.5, fill = C.muted, leading = 17, lines: maxLines = 4 } = {}) {
    const lines = wrap(raw, size, maxWidth).slice(0, maxLines)
    lines.forEach((line, i) => this.text(line, x, y + i * leading, { size, fill }))
    return y + lines.length * leading
  }

  card(x, y, w, h, { fill = C.panel, radius = 12, stroke = C.hair } = {}) {
    this.cards.push({ x, y, w, h })
    this.add(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" ` +
        `stroke="${stroke}" stroke-width="1"/>`,
    )
  }

  pill(x, y, label, { size = 11, fill = C.panel2, color = C.dim, padX = 10, height = 24, mono = false } = {}) {
    const w = measure(label, size) + padX * 2
    this.add(`<rect x="${x}" y="${y}" width="${w}" height="${height}" rx="${height / 2}" fill="${fill}"/>`)
    this.text(label, x + padX, y + height / 2 + size * 0.36, { size, fill: color, mono })
    return w
  }

  footer(note) {
    const y = this.height - 22
    this.add(`<rect x="${PAD}" y="${y - 26}" width="${this.width - PAD * 2}" height="1" fill="${C.hair2}"/>`)
    this.text(note, PAD, y, { size: 10.5, mono: true, fill: C.muted, maxWidth: this.width - PAD * 2 })
  }

  check() {
    // A label that starts inside a card must also end inside it.
    for (const box of this.texts) {
      const cx = (box.left + box.right) / 2
      const cy = (box.top + box.bottom) / 2
      for (const card of this.cards) {
        const inside =
          cx > card.x && cx < card.x + card.w && cy > card.y && cy < card.y + card.h
        if (!inside) continue
        if (box.left < card.x + 5 || box.right > card.x + card.w - 5) {
          throw new Error(
            `text escapes its card: "${box.value}" (${box.left.toFixed(0)}–${box.right.toFixed(0)}) ` +
              `card ${card.x.toFixed(0)}–${(card.x + card.w).toFixed(0)}`,
          )
        }
      }
    }
    for (const box of this.texts) {
      for (const other of this.texts) {
        if (box === other) continue
        const overlapX = Math.min(box.right, other.right) - Math.max(box.left, other.left)
        const overlapY = Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top)
        if (overlapX > 1.5 && overlapY > 1.5) {
          throw new Error(`text overlap: "${box.value}" ↔ "${other.value}" (${overlapX.toFixed(1)}×${overlapY.toFixed(1)}px)`)
        }
      }
    }
    return true
  }

  render() {
    this.check()
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" ` +
      `viewBox="0 0 ${this.width} ${this.height}" role="img">` +
      `<defs></defs>` +
      this.body.join('') +
      '</svg>'
    )
  }
}

const write = (name, svg) => {
  const out = join(root, 'docs', 'images', name)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, svg, 'utf8')
  console.log(`wrote ${name} (${(svg.length / 1024).toFixed(1)} kB)`)
}

/* ── data ────────────────────────────────────────────────────────────────── */

const palette = await load('palette')
const contrast = await load('contrast')
const locale = await load('locale')
const zh = locale.DICTIONARIES.zh

const MODES = ['light', 'dark']

/* ── hero ────────────────────────────────────────────────────────────────── */

function hero() {
  const f = new Figure({
    height: 430,
    kicker: 'DeepSeek Harness · theme plugin',
    title: 'FreeStyle 主题',
    subtitle: '四轴 OKLCH 引擎，为你的 DSH 调一套只属于你的皮肤 —— 119 个令牌，明暗各一套。',
    source: 'v0.5.0',
  })

  const chips = ['实时调色', '对比度体检 · 21 对', '12 预设 · 32 传统色', '分享码']
  let x = PAD
  for (const chip of chips) {
    x += f.pill(x, 176, chip, { color: C.dim }) + 8
  }

  const stats = [
    ['119', '覆盖令牌'],
    ['21', '对比度配对'],
    ['44', '色板预设'],
    ['0', '跨包依赖'],
  ]
  stats.forEach(([value, label], i) => {
    const sx = PAD + i * 132
    f.text(value, sx, 262, { size: 30, weight: 600, fill: C.ink })
    f.text(label, sx, 282, { size: 10.5, fill: C.muted, mono: true })
  })
  f.text('仅依赖 react · 明暗随宿主自适应 · 所有颜色走 --dsw-* 变量', PAD, 320, {
    size: 11,
    fill: C.muted,
    maxWidth: 520,
  })

  // right: one clean mini window + a palette strip (no tilted stack)
  const wx = 720
  const wy = 120
  const ww = 408
  const wh = 258
  f.card(wx, wy, ww, wh, { fill: '#f7faf8', stroke: 'rgba(0,0,0,0.10)', radius: 14 })
  f.add(`<rect x="${wx}" y="${wy}" width="${ww}" height="34" rx="14" fill="#eef3f0"/>`)
  f.add(`<rect x="${wx}" y="${wy + 20}" width="${ww}" height="14" fill="#eef3f0"/>`)
  const dots = ['#e2685f', '#e6b34e', '#59b87f']
  dots.forEach((color, i) => f.add(`<circle cx="${wx + 16 + i * 13}" cy="${wy + 17}" r="4" fill="${color}"/>`))
  f.add(`<rect x="${wx}" y="${wy + 34}" width="112" height="${wh - 34}" rx="0" fill="#f4f8f5"/>`)
  f.add(`<rect x="${wx + 112}" y="${wy + 34}" width="1" height="${wh - 34}" fill="rgba(0,0,0,0.07)"/>`)
  for (let i = 0; i < 4; i += 1) {
    const cy = wy + 58 + i * 26
    f.add(`<circle cx="${wx + 20}" cy="${cy}" r="4" fill="${i === 0 ? '#2f7d62' : '#c9d4cd'}" />`)
    f.add(`<rect x="${wx + 32}" y="${cy - 4}" width="${i === 0 ? 52 : 44}" height="7" rx="3.5" fill="${i === 0 ? '#2f7d62' : '#d3ddd7'}"/>`)
  }
  f.add(`<rect x="${wx + 128}" y="${wy + 52}" width="248" height="34" rx="9" fill="#ffffff" stroke="rgba(0,0,0,0.06)"/>`)
  f.add(`<rect x="${wx + 142}" y="${wy + 64}" width="180" height="8" rx="4" fill="#dbe4de"/>`)
  f.add(`<rect x="${wx + 128}" y="${wy + 96}" width="64" height="10" rx="5" fill="#c9d4cd"/>`)
  f.add(`<rect x="${wx + 128}" y="${wy + 118}" width="248" height="96" rx="10" fill="#ffffff" stroke="rgba(0,0,0,0.06)"/>`)
  ;[0, 1, 2].forEach((i) => {
    f.add(`<rect x="${wx + 142}" y="${wy + 132 + i * 20}" width="${190 - i * 46}" height="7" rx="3.5" fill="#dbe4de"/>`)
  })
  f.add(`<rect x="${wx + 300}" y="${wy + 196}" width="62" height="22" rx="11" fill="#2f7d62"/>`)
  f.add(`<rect x="${wx + 128}" y="${wy + 226}" width="248" height="26" rx="9" fill="#ffffff" stroke="rgba(0,0,0,0.06)"/>`)

  const strip = ['#2f7d62', '#7fb7a3', '#cfe3da', '#f0c26b', '#c96a5d', '#6a7fb5']
  strip.forEach((color, i) => {
    f.add(`<rect x="${wx + i * 68}" y="${wy + wh + 16}" width="60" height="34" rx="8" fill="${color}"/>`)
  })
  return f
}

/* ── studio layout ───────────────────────────────────────────────────────── */

function studioLayout() {
  const f = new Figure({
    height: 700,
    kicker: 'Studio',
    title: '一个窗口改完所有坐标',
    subtitle: '顶栏 52 · 图标轨 60 · 列表 264 · 画布自适应 · 检查器 320；4px 栅格，11–17px 字阶。',
    source: 'src/client/studio.tsx',
  })

  const x0 = PAD
  const y0 = 150
  const w = W - PAD * 2
  const h = 440
  f.card(x0, y0, w, h, { fill: C.panel, radius: 16, stroke: 'rgba(255,255,255,0.12)' })

  const rail = 60
  const list = 264
  const insp = 320
  const head = 46
  const inset = x0 + 10

  f.add(`<rect x="${inset}" y="${y0 + 10}" width="${w - 20}" height="${head}" rx="10" fill="${C.panel2}"/>`)
  f.add(`<rect x="${inset}" y="${y0 + 10}" width="${w - 20}" height="1" fill="${C.hair}"/>`)
  f.text('未命名主题', inset + 74, y0 + 32, { size: 11.5, weight: 500, fill: C.ink })
  f.text('浅色 · 168° · 21/21', inset + 74, y0 + 46, { size: 9, mono: true, fill: C.muted })
  f.add(`<circle cx="${inset + 30}" cy="${y0 + 33}" r="9" fill="${C.accent}" opacity="0.18"/>`)
  f.add(`<circle cx="${inset + 30}" cy="${y0 + 33}" r="4" fill="${C.accent}"/>`)
  f.add(`<rect x="${inset + w - 300}" y="${y0 + 22}" width="118" height="22" rx="11" fill="${C.accent}" opacity="0.18"/>`)
  f.text('应用到 DSH', inset + w - 241, y0 + 37, { size: 10, fill: C.accent, align: 'middle' })

  const bodyY = y0 + 10 + head + 10
  const bodyH = h - head - 30
  f.add(`<rect x="${inset}" y="${bodyY}" width="${rail}" height="${bodyH}" rx="10" fill="${C.panel2}"/>`)
  for (let i = 0; i < 4; i += 1) {
    const by = bodyY + 16 + i * 40
    if (i === 0) {
      f.add(`<rect x="${inset}" y="${by}" width="3" height="24" rx="1.5" fill="${C.accent}"/>`)
      f.add(`<rect x="${inset + 10}" y="${by - 4}" width="40" height="32" rx="9" fill="${C.accentDim}"/>`)
    }
    f.add(`<rect x="${inset + 22}" y="${by + 4}" width="16" height="16" rx="4" fill="${i === 0 ? C.accent : C.muted}" opacity="${i === 0 ? 0.9 : 0.5}"/>`)
  }

  const listX = inset + rail + 10
  f.add(`<rect x="${listX}" y="${bodyY}" width="${list}" height="${bodyH}" rx="10" fill="${C.panel2}"/>`)
  f.text('预设', listX + 14, bodyY + 24, { size: 10, mono: true, fill: C.muted })
  f.add(`<rect x="${listX + 12}" y="${bodyY + 34}" width="${list - 24}" height="24" rx="7" fill="${C.canvas}" stroke="${C.hair2}"/>`)
  f.text('搜索主题…', listX + 24, bodyY + 50, { size: 9.5, fill: C.muted })
  for (let i = 0; i < 4; i += 1) {
    const cardY = bodyY + 68 + i * 62
    const selected = i === 0
    f.add(
      `<rect x="${listX + 10}" y="${cardY}" width="${list - 20}" height="54" rx="9" ` +
        `fill="${selected ? 'rgba(61,220,151,0.08)' : C.panel}" stroke="${selected ? C.accent : C.hair2}"/>`,
    )
    f.add(`<rect x="${listX + 20}" y="${cardY + 10}" width="52" height="34" rx="6" fill="#0d1216"/>`)
    f.add(`<rect x="${listX + 20}" y="${cardY + 10}" width="17" height="34" rx="6" fill="rgba(255,255,255,0.06)"/>`)
    f.add(`<rect x="${listX + 42}" y="${cardY + 18}" width="22" height="4" rx="2" fill="${C.accent}" opacity="0.8"/>`)
    f.add(`<rect x="${listX + 42}" y="${cardY + 27}" width="18" height="3" rx="1.5" fill="${C.muted}" opacity="0.7"/>`)
    f.text(['雾青', '墨', '苔原', '熔岩'][i], listX + 80, cardY + 26, { size: 10, fill: C.ink })
    f.text(['168°', '250°', '150°', '35°'][i], listX + 80, cardY + 40, { size: 8.5, mono: true, fill: C.muted })
  }

  const canvasX = listX + list + 10
  const inspX = x0 + w - insp - 10
  const canvasW = inspX - canvasX - 10
  f.add(`<rect x="${canvasX}" y="${bodyY}" width="${canvasW}" height="${bodyH}" rx="10" fill="${C.canvas}"/>`)
  f.add(
    `<pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">` +
      `<circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.10)"/></pattern>`,
  )
  f.add(`<rect x="${canvasX}" y="${bodyY}" width="${canvasW}" height="${bodyH}" rx="10" fill="url(#dots)"/>`)

  const barW = Math.min(360, canvasW - 24)
  f.add(`<rect x="${canvasX + 12}" y="${bodyY + 12}" width="${barW}" height="26" rx="9" fill="${C.panel2}" stroke="${C.hair2}"/>`)
  ;['对话', '列表', '设置'].forEach((label, i) => {
    const bx = canvasX + 20 + i * 46
    if (i === 0) f.add(`<rect x="${bx - 4}" y="${bodyY + 17}" width="42" height="16" rx="6" fill="rgba(61,220,151,0.18)"/>`)
    f.text(label, bx + 17, bodyY + 28, { size: 9, fill: i === 0 ? C.accent : C.muted, align: 'middle' })
  })
  f.add(`<rect x="${canvasX + barW - 78}" y="${bodyY + 17}" width="66" height="16" rx="8" fill="${C.panel}"/>`)
  f.text('100%', canvasX + barW - 45, bodyY + 28, { size: 8.5, mono: true, fill: C.muted, align: 'middle' })

  const pvW = Math.min(430, canvasW - 60)
  const pvH = 250
  const pvX = canvasX + (canvasW - pvW) / 2
  const pvY = bodyY + 62 + (bodyH - 100 - pvH) / 2
  f.add(`<rect x="${pvX}" y="${pvY}" width="${pvW}" height="${pvH}" rx="12" fill="#f7faf8"/>`)
  f.add(`<rect x="${pvX}" y="${pvY}" width="${pvW}" height="30" rx="12" fill="#eef3f0"/>`)
  f.add(`<rect x="${pvX}" y="${pvY + 18}" width="${pvW}" height="12" fill="#eef3f0"/>`)
  f.add(`<circle cx="${pvX + 15}" cy="${pvY + 15}" r="4" fill="#2f7d62"/>`)
  f.text('useChat 竞态修复', pvX + 28, pvY + 19, { size: 8.5, fill: '#4a5a53' })
  f.add(`<rect x="${pvX}" y="${pvY + 30}" width="104" height="${pvH - 30}" fill="#f1f6f3"/>`)
  f.add(`<rect x="${pvX + 104}" y="${pvY + 30}" width="1" height="${pvH - 30}" fill="rgba(0,0,0,0.07)"/>`)
  ;['对话', '列表', '设置'].forEach((label, i) => {
    f.add(`<rect x="${pvX + 12}" y="${pvY + 52 + i * 22}" width="4" height="4" rx="2" fill="${i === 0 ? '#2f7d62' : '#c9d4cd'}"/>`)
    f.text(label, pvX + 22, pvY + 57 + i * 22, { size: 8, fill: i === 0 ? '#2f4a3f' : '#7d8b84' })
  })
  f.add(`<rect x="${pvX + 118}" y="${pvY + 46}" width="${pvW - 150}" height="24" rx="8" fill="#2f7d62"/>`)
  f.add(`<rect x="${pvX + 250}" y="${pvY + 52}" width="90" height="7" rx="3.5" fill="rgba(255,255,255,0.85)"/>`)
  f.add(`<rect x="${pvX + 118}" y="${pvY + 82}" width="${pvW - 150}" height="74" rx="8" fill="#ffffff" stroke="rgba(0,0,0,0.06)"/>`)
  ;[0, 1, 2].forEach((i) => {
    f.add(`<rect x="${pvX + 130}" y="${pvY + 94 + i * 18}" width="${pvW - 210 - i * 34}" height="6" rx="3" fill="#dbe4de"/>`)
  })
  f.add(`<rect x="${pvX + 118}" y="${pvY + 164}" width="${pvW - 150}" height="16" rx="4" fill="rgba(201,106,93,0.16)"/>`)
  f.add(`<rect x="${pvX + 118}" y="${pvY + 184}" width="${pvW - 150}" height="16" rx="4" fill="rgba(47,125,98,0.16)"/>`)
  f.add(`<rect x="${pvX + 118}" y="${pvY + 212}" width="${pvW - 150}" height="26" rx="9" fill="#ffffff" stroke="rgba(0,0,0,0.08)"/>`)
  f.text('给 DSH 发消息…', pvX + 130, pvY + 229, { size: 8, fill: '#8b9a92' })

  f.add(`<rect x="${inspX}" y="${bodyY}" width="${insp}" height="${bodyH}" rx="10" fill="${C.panel2}"/>`)
  f.text('颜色', inspX + 14, bodyY + 24, { size: 10, mono: true, fill: C.muted })
  ;['主色', '副色', '面板'].forEach((label, i) => {
    const cardY = bodyY + 36 + i * 92
    f.add(`<rect x="${inspX + 10}" y="${cardY}" width="${insp - 20}" height="82" rx="9" fill="${C.panel}" stroke="${C.hair2}"/>`)
    f.add(`<circle cx="${inspX + 24}" cy="${cardY + 16}" r="5" fill="${['#9bbddd', '#b0b3e4', '#9c9fa0'][i]}"/>`)
    f.text(label, inspX + 34, cardY + 20, { size: 9.5, fill: C.ink })
    f.text(['#9BBDDD', '#B0B3E4', '#9C9FA0'][i], inspX + insp - 16, cardY + 20, {
      size: 8,
      mono: true,
      fill: C.muted,
      align: 'end',
    })
    for (let s = 0; s < 2; s += 1) {
      f.add(`<rect x="${inspX + 18}" y="${cardY + 32 + s * 22}" width="${insp - 36}" height="3" rx="1.5" fill="rgba(255,255,255,0.10)"/>`)
      f.add(`<rect x="${inspX + 18}" y="${cardY + 31 + s * 22}" width="${74 - i * 12 + s * 20}" height="5" rx="2.5" fill="${C.accent}" opacity="0.55"/>`)
      f.add(`<circle cx="${inspX + 18 + 74 - i * 12 + s * 20}" cy="${cardY + 33.5 + s * 22}" r="4" fill="${C.ink}"/>`)
    }
  })

  // geometry callouts sit under the frame, not on top of it
  const labels = [
    ['header 52', '名称 · 明暗 · 撤销/重做 · 应用'],
    ['rail 60', '预设 / 主题库 / 传统色 / 颜色 / 生成'],
    ['list 264', '搜索 + 迷你窗口卡片'],
    ['canvas', '三视图 · 对比 · 检查 · 缩放'],
    ['inspector 320', '通道滑杆 · 排版 · 形状 · 无障碍'],
  ]
  const colW = (W - PAD * 2) / labels.length
  labels.forEach(([name, note], i) => {
    const lx = PAD + colW * i
    f.text(name, lx, y0 + h + 28, { size: 10.5, mono: true, fill: C.accent })
    f.text(note, lx, y0 + h + 46, { size: 9.5, fill: C.muted, maxWidth: colW - 12 })
  })
  f.footer('同一套令牌既画预览也驱动宿主；拖动任一滑杆，预览与界面同时变化。')
  return f
}

/* ── colour model ────────────────────────────────────────────────────────── */

function colorModel() {
  const f = new Figure({
    height: 500,
    kicker: 'Model',
    title: '四轴 + 外观轴',
    subtitle: '每个坐标都能单独调，合成后是 107 alias + 11 specific + 1 surface = 119 个可覆盖令牌。',
    source: 'theme-spec v3',
  })

  const axes = [
    ['① 品牌轴', 'th · c1 · l1', '0.37 封顶', '主色、链接、按钮、激活态', 38],
    ['② 中性轴', 'ths · sc', '0.012 封顶', '面板、卡片、边框的色温', 15],
    ['③ 明度骨架', 'bg · spread', '3 档', '页面 / 卡片 / 浮层的层级', 34],
    ['④ 状态簇', 'stateBoost', '0.16 封顶', 'success / warn / error / info', 32],
  ]
  const cardW = (W - PAD * 2 - 3 * 12) / 4
  axes.forEach(([title, keys, cap, use, tokens], i) => {
    const x = PAD + i * (cardW + 12)
    f.card(x, 158, cardW, 158)
    f.text(title, x + 16, 184, { size: 13, weight: 500 })
    f.text(keys, x + 16, 202, { size: 10, mono: true, fill: C.accent })
    f.text(`彩度上限 ${cap}`, x + 16, 222, { size: 10, fill: C.dim, maxWidth: cardW - 32 })
    const gradientStops = ['#c9a227', '#8fbf6a', '#5fbfa8', '#6f9fd8', '#9b7fd0']
    f.add(`<defs><linearGradient id="ax${i}"><stop offset="0" stop-color="${gradientStops[i]}"/>` +
      `<stop offset="1" stop-color="${C.panel2}"/></linearGradient></defs>`)
    f.add(`<rect x="${x + 16}" y="${236}" width="${cardW - 32}" height="8" rx="4" fill="url(#ax${i})"/>`)
    f.text(use, x + 16, 262, { size: 9.5, fill: C.muted, maxWidth: cardW - 32 })
    f.text(`${tokens} tokens`, x + 16, 300, { size: 9, mono: true, fill: C.muted })
  })

  f.card(PAD, 336, W - PAD * 2, 74)
  f.text('合成', PAD + 18, 362, { size: 10, mono: true, fill: C.accent })
  f.text('107 alias  +  11 specific  +  1 menu-surface-fill  =  119 令牌 × 明暗两套', PAD + 18, 386, {
    size: 12,
    fill: C.ink,
    maxWidth: 660,
  })
  f.pill(W - PAD - 18 - 176, 356, 'theme.overrideTokens()', { size: 10.5, mono: true, color: C.accent, fill: C.accentDim })

  f.card(PAD, 424, (W - PAD * 2 - 12) / 2, 44, { fill: C.panel })
  f.text('外观轴 fontPair · fontScale · radius · shadow —— 仅影响预览与导出 CSS', PAD + 16, 451, {
    size: 10,
    fill: C.dim,
    maxWidth: (W - PAD * 2 - 12) / 2 - 32,
  })
  f.card(PAD + (W - PAD * 2 - 12) / 2 + 12, 424, (W - PAD * 2 - 12) / 2, 44)
  f.text('对比度闸门 正文 7.0 / 次要 4.5 / 控件 3.0（WCAG + APCA）', PAD + (W - PAD * 2 - 12) / 2 + 28, 451, {
    size: 10,
    fill: C.dim,
    maxWidth: (W - PAD * 2 - 12) / 2 - 32,
  })
  return f
}

/* ── presets ─────────────────────────────────────────────────────────────── */

function presets() {
  const cols = 4
  const gap = 12
  const cardW = (W - PAD * 2 - gap * (cols - 1)) / cols
  const cardH = 128
  const rows = Math.ceil(palette.PRESETS.length / cols)
  const f = new Figure({
    height: 158 + rows * (cardH + gap) + 54,
    kicker: 'Presets',
    title: '十二套坐标预设',
    subtitle: '每张卡是一组坐标；点一下换整套配色，浅色与深色两张脸都已经算好。',
    source: 'src/client/palette.ts',
  })

  palette.PRESETS.forEach((preset, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const x = PAD + col * (cardW + gap)
    const y = 158 + row * (cardH + gap)
    const light = palette.presetSpec(preset, 'light')
    const dark = palette.presetSpec(preset, 'dark')
    const lp = palette.fullPalette(light)
    const dp = palette.fullPalette(dark)
    f.card(x, y, cardW, cardH)
    f.text(preset.id, x + 14, y + 24, { size: 12.5, weight: 500 })
    f.text(`${Math.round(light.th)}° · C ${light.c1.toFixed(2)}`, x + cardW - 14, y + 24, {
      size: 9,
      mono: true,
      fill: C.muted,
      align: 'end',
    })

    const rowSets = [
      ['浅', lp, ['--dsw-alias-bg-base', '--dsw-alias-bg-layer-2', '--dsw-alias-brand-primary']],
      ['深', dp, ['--dsw-alias-bg-base', '--dsw-alias-bg-layer-2', '--dsw-alias-brand-primary']],
    ]
    rowSets.forEach(([label, pal, keys], r) => {
      const ry = y + 40 + r * 26
      f.text(label, x + 14, ry + 14, { size: 8.5, mono: true, fill: C.muted })
      keys.forEach((key, i) => {
        f.add(
          `<rect x="${x + 28 + i * 34}" y="${ry}" width="30" height="20" rx="6" fill="${pal[key]}" stroke="rgba(255,255,255,0.16)"/>`,
        )
      })
    })

    f.text(`中性 ${light.neutralTint.toFixed(2)} · ${contrast.auditSummary(contrast.auditPalette(lp)).passed}/21`, x + 14, y + cardH - 12, {
      size: 9,
      mono: true,
      fill: C.muted,
      maxWidth: cardW - 28,
    })
  })
  f.footer('每行三个色块：底色 / 卡片 / 品牌；上排浅色、下排深色，同一坐标的两张脸。')
  return f
}

/* ── contrast matrix ─────────────────────────────────────────────────────── */

function contrastMatrix() {
  const pairs = contrast.AUDIT_PAIRS
  const cellW = 40
  const cellH = 26
  const leftW = 96
  const scoreW = 120
  const legendRows = Math.ceil(pairs.length / 3)
  const height = 158 + palette.PRESETS.length * cellH + 44 + legendRows * 17 + 84

  const f = new Figure({
    height,
    kicker: 'A11y',
    title: '对比度体检矩阵',
    subtitle: `12 套预设 × ${pairs.length} 组前景/背景 × 明暗两种模式；每格上半浅色、下半深色，逐项判定。`,
    source: 'src/client/contrast.ts',
  })

  const x0 = PAD
  const y0 = 166
  const gridX = x0 + leftW

  const noteEnd = f.text('每格上半 = 浅色，下半 = 深色', gridX, y0 - 24, { size: 9, fill: C.muted }).right
  const chip = (label, color, x) => {
    const w = measure(label, 9) + 22
    f.add(`<rect x="${x}" y="${y0 - 36}" width="${w}" height="17" rx="8.5" fill="${color}"/>`)
    f.text(label, x + 11, y0 - 24, { size: 9, fill: '#0b0f14' })
    return w
  }
  let lx = noteEnd + 20
  lx += chip('浅色通过', '#1f7a52', lx) + 8
  chip('深色通过', '#52e5a6', lx)

  pairs.forEach((pair, i) => {
    f.text(String(i + 1), gridX + i * cellW + cellW / 2, y0 - 4, {
      size: 8,
      mono: true,
      fill: C.muted,
      align: 'middle',
    })
  })

  palette.PRESETS.forEach((preset, row) => {
    const y = y0 + row * cellH
    f.text(preset.id, x0 + 8, y + cellH / 2 + 3.5, { size: 9.5, mono: true, fill: C.dim })
    let passed = 0
    pairs.forEach((pair, col) => {
      const x = gridX + col * cellW
      ;['light', 'dark'].forEach((mode, half) => {
        const result = contrast.auditPalette(palette.fullPalette(palette.presetSpec(preset, mode))).find(
          (item) => item.id === pair.id,
        )
        if (mode === 'dark' && result?.pass) passed += 1
        const fill = result?.pass ? (mode === 'light' ? '#0f5c3d' : '#8affc9') : mode === 'light' ? '#8c2f39' : '#ff6b6b'
        f.add(
          `<rect x="${x + 1}" y="${y + half * (cellH / 2) + 1}" width="${cellW - 2}" height="${cellH / 2 - 2}" rx="2" fill="${fill}"/>`,
        )
      })
    })
    f.text(`${passed}/${pairs.length}`, gridX + pairs.length * cellW + 16, y + cellH / 2 + 3.5, {
      size: 9,
      mono: true,
      fill: passed === pairs.length ? C.accent : C.bad,
    })
  })

  const legendY = y0 + palette.PRESETS.length * cellH + 42
  f.text('编号对应', x0, legendY, { size: 9.5, mono: true, fill: C.muted })
  const colW = (W - PAD * 2) / 3
  pairs.forEach((pair, i) => {
    const col = Math.floor(i / Math.ceil(pairs.length / 3))
    const row = i % Math.ceil(pairs.length / 3)
    f.text(`${String(i + 1).padStart(2, ' ')}  ${zh[`audit.${pair.id}`] ?? pair.id}`, x0 + col * colW, legendY + 22 + row * 17, {
      size: 9,
      fill: C.dim,
      maxWidth: colW - 16,
    })
  })
  f.footer('阈值：正文 7.0 · 次要 4.5 · 控件 3.0，同时报 WCAG 比值与 APCA Lc；右侧是深色模式下的通过数。')
  return f
}

/* ── traditional colours ─────────────────────────────────────────────────── */

function traditional() {
  const colors = palette.TRADITIONAL
  const cols = 8
  const gap = 11
  const cardW = (W - PAD * 2 - gap * (cols - 1)) / cols
  const cardH = 78
  const rows = Math.ceil(colors.length / cols)
  const f = new Figure({
    height: 158 + rows * (cardH + gap) + 40,
    kicker: 'Palette',
    title: '中国传统色 · 32',
    subtitle: '挑一个传统色作为品牌起点，副色、中性偏色与状态簇由它推导 —— 整套仍是 119 令牌。',
    source: 'src/client/palette.ts',
  })

  colors.forEach((color, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const x = PAD + col * (cardW + gap)
    const y = 158 + row * (cardH + gap)
    f.card(x, y, cardW, cardH, { fill: C.panel })
    f.add(`<rect x="${x + 10}" y="${y + 10}" width="${cardW - 20}" height="34" rx="7" fill="${color.hex}"/>`)
    f.text(zh[`trad.${color.id}`] ?? color.id, x + 10, y + 60, { size: 11, weight: 500, maxWidth: cardW - 20 })
    f.text(color.hex.toUpperCase(), x + 10, y + 72, { size: 8, mono: true, fill: C.muted })
  })
  f.footer('色值仅取色相与彩度进入品牌轴；明度由当前模式决定，因此同一色名明暗都读得清。')
  return f
}

/* ── architecture ────────────────────────────────────────────────────────── */

function architecture() {
  const f = new Figure({
    height: 610,
    kicker: 'Architecture',
    title: '一个包，两个面',
    subtitle: '宿主面负责令牌与库文件，浏览器面负责界面；两边只通过 HTTP 与 cordis 服务说话。',
    source: 'cordis.patch.yml',
  })

  const top = 168
  const panelW = 470
  const panelH = 330
  const leftX = PAD
  const rightX = W - PAD - panelW

  f.card(leftX, top, panelW, panelH, { fill: C.panel2 })
  f.text('浏览器', leftX + 18, top + 26, { size: 10, mono: true, fill: C.accent })
  f.text('lib/client.js', leftX + 18, top + 46, { size: 12, mono: true, fill: C.ink })

  const leftRows = [
    ['设置行', 'settings.general.item · order 60'],
    ['全窗工作室', '调色 / 预览 / 对比 / 检查 / 体检'],
    ['预览组件', '对话 · 列表 · 表单 · 对比滑块'],
    ['宿主服务', 'theme.overrideTokens(119)'],
  ]
  leftRows.forEach(([name, note], i) => {
    const y = top + 72 + i * 58
    f.add(`<rect x="${leftX + 18}" y="${y}" width="${panelW - 36}" height="46" rx="9" fill="${C.panel}" stroke="${C.hair2}"/>`)
    f.text(name, leftX + 32, y + 20, { size: 10.5, weight: 500 })
    f.text(note, leftX + 32, y + 36, { size: 9, fill: C.muted, maxWidth: panelW - 64 })
  })

  f.card(rightX, top, panelW, panelH, { fill: C.panel2 })
  f.text('DSH 进程', rightX + 18, top + 26, { size: 10, mono: true, fill: C.accent })
  f.text('lib/index.js', rightX + 18, top + 46, { size: 12, mono: true, fill: C.ink })
  const rightRows = [
    ['GET / PUT', '/api/dsh-freestyle-theme/themes'],
    ['POST', '/api/dsh-freestyle-theme/generate'],
    ['POST', '/api/dsh-freestyle-theme/name'],
    ['磁盘', '~/.dsh/freestyle-theme/themes.json'],
  ]
  rightRows.forEach(([method, path], i) => {
    const y = top + 72 + i * 58
    f.add(`<rect x="${rightX + 18}" y="${y}" width="${panelW - 36}" height="46" rx="9" fill="${C.panel}" stroke="${C.hair2}"/>`)
    f.text(method, rightX + 32, y + 20, { size: 9, mono: true, fill: C.accent })
    f.text(path, rightX + 32, y + 36, { size: 9, mono: true, fill: C.muted, maxWidth: panelW - 64 })
  })

  const midX = leftX + panelW
  const midW = rightX - midX
  const arrows = [
    ['PUT /themes', '保存'],
    ['候选坐标 · 命名', '生成'],
    ['HTTP 回包', '取回'],
  ]
  arrows.forEach(([label, note], i) => {
    const y = top + 86 + i * 74
    const ax = midX + 18
    const aw = midW - 36
    const rightward = i !== 2
    f.add(`<line x1="${rightward ? ax : ax + aw}" y1="${y}" x2="${rightward ? ax + aw : ax}" y2="${y}" stroke="${C.accent}" stroke-width="1.2" opacity="0.7"/>`)
    const tipX = rightward ? ax + aw : ax
    f.add(`<path d="M${tipX} ${y} l${rightward ? -7 : 7} -4 v8 z" fill="${C.accent}" opacity="0.9"/>`)
    f.text(label, midX + midW / 2, y - 8, { size: 9, mono: true, fill: C.dim, align: 'middle', maxWidth: midW - 16 })
    f.text(note, midX + midW / 2, y + 15, { size: 8.5, fill: C.muted, align: 'middle', maxWidth: midW - 16 })
  })

  f.card(leftX, top + panelH + 20, W - PAD * 2, 54, { fill: C.panel })
  f.text('119 令牌', leftX + 18, top + panelH + 44, { size: 10, mono: true, fill: C.accent })
  f.text('→ theme.overrideTokens() 一次写入，宿主所有面板同时换色；预览用同一份 palette，所见即所得。', leftX + 108, top + panelH + 44, {
    size: 10,
    fill: C.dim,
    maxWidth: W - PAD * 2 - 140,
  })
  f.footer('浏览器不读磁盘、不拿密钥；宿主只返回坐标与命名，图片不出浏览器。')
  return f
}

/* ── emit ────────────────────────────────────────────────────────────────── */

write('hero.svg', hero().render())
write('studio-layout.svg', studioLayout().render())
write('color-model.svg', colorModel().render())
write('presets.svg', presets().render())
write('contrast-matrix.svg', contrastMatrix().render())
write('traditional-colors.svg', traditional().render())
write('architecture.svg', architecture().render())
console.log('all figures passed the bounds + overlap guard')
