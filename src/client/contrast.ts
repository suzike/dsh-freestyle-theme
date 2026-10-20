/**
 * Contrast audit for dsh-freestyle-theme.
 *
 * Two scales run side by side: WCAG 2.2 (compliance, what reviewers quote) and
 * APCA (perceived lightness contrast, what the eye actually reads). A theme
 * must clear both, so the studio can say "verified" rather than "looks fine".
 *
 * @module dsh-freestyle-theme/client/contrast
 */

import {
  CHROMA_CAP,
  clamp,
  fullPalette,
  oklchToHex,
  parseColor,
  type Palette,
  type ThemeSpec,
} from './palette'

/** What a token pair is used for; drives the thresholds. */
export type PairKind = 'body' | 'secondary' | 'large' | 'ui'

/** Which knob an automatic fix should turn. */
export type FixTarget = 'text' | 'accent' | 'surface' | 'state' | 'none'

/** One audited token pair. */
export interface PairResult {
  /** Stable id, also a locale key (`audit.<id>`). */
  id: string
  /** Foreground token. */
  fg: string
  /** Background token. */
  bg: string
  kind: PairKind
  /** WCAG 2.2 contrast ratio. */
  ratio: number
  /** APCA lightness contrast (Lc), signed. */
  lc: number
  /** WCAG threshold for this kind. */
  minRatio: number
  /** APCA threshold for this kind. */
  minLc: number
  pass: boolean
  fix: FixTarget
}

/** Thresholds per usage, from the design-system spec. */
export const THRESHOLDS: Record<PairKind, { ratio: number; lc: number }> = {
  body: { ratio: 7, lc: 75 },
  secondary: { ratio: 4.5, lc: 60 },
  large: { ratio: 3, lc: 45 },
  ui: { ratio: 3, lc: 30 },
}

interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

/** Parse a CSS colour (hex or rgb/rgba) into channels + alpha. */
export function toRgba(value: string): Rgba | null {
  const rgb = parseColor(value)
  if (!rgb) return null
  const alpha = /^rgba?\([^)]*,\s*([\d.]+)\s*\)$/i.exec(value.trim())
  return { r: rgb[0], g: rgb[1], b: rgb[2], a: alpha ? clamp(parseFloat(alpha[1]), 0, 1) : 1 }
}

const linear = (channel: number): number => {
  const value = channel / 255
  return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
}

/** WCAG relative luminance. */
export function luminance(color: Rgba): number {
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b)
}

/** WCAG 2.2 contrast ratio, 1…21. */
export function contrastRatio(fg: string, bg: string): number {
  const a = toRgba(fg)
  const b = toRgba(bg)
  if (!a || !b) return 1
  const la = luminance(a)
  const lb = luminance(b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}

/* ── APCA ────────────────────────────────────────────────────────────────── */

/** APCA screen luminance (power 2.4 approximation of sRGB). */
function apcaY(color: Rgba): number {
  const ch = (value: number): number => Math.pow(value / 255, 2.4)
  return 0.2126729 * ch(color.r) + 0.7151522 * ch(color.g) + 0.072175 * ch(color.b)
}

/**
 * APCA lightness contrast (SAPC-APCA 0.1.9 constants).
 * Sign carries polarity: positive = dark text on light background.
 */
export function apcaLc(fg: string, bg: string): number {
  const a = toRgba(fg)
  const b = toRgba(bg)
  if (!a || !b) return 0
  const blkThrs = 0.022
  const blkClmp = 1.414
  const deltaYmin = 0.0005
  const loClip = 0.1
  let txtY = apcaY(a)
  let bgY = apcaY(b)
  if (txtY < blkThrs) txtY += Math.pow(blkThrs - txtY, blkClmp)
  if (bgY < blkThrs) bgY += Math.pow(blkThrs - bgY, blkClmp)
  if (Math.abs(bgY - txtY) < deltaYmin) return 0
  if (bgY > txtY) {
    const sapc = (Math.pow(bgY, 0.56) - Math.pow(txtY, 0.57)) * 1.14
    return (sapc < loClip ? 0 : sapc - 0.027) * 100
  }
  const sapc = (Math.pow(bgY, 0.65) - Math.pow(txtY, 0.62)) * 1.14
  return (sapc > -loClip ? 0 : sapc + 0.027) * 100
}

/* ── the audit set ───────────────────────────────────────────────────────── */

interface PairDef {
  id: string
  fg: string
  bg: string
  kind: PairKind
  fix: FixTarget
}

/**
 * Twenty pairs that decide whether a theme is usable — every text-on-surface
 * family the shell actually renders, plus the chrome a user reads as "off".
 */
export const AUDIT_PAIRS: readonly PairDef[] = [
  { id: 'body.base', fg: '--dsw-alias-label-primary', bg: '--dsw-alias-bg-base', kind: 'body', fix: 'text' },
  { id: 'body.layer1', fg: '--dsw-alias-label-primary', bg: '--dsw-alias-bg-layer-1', kind: 'body', fix: 'text' },
  { id: 'body.overlay', fg: '--dsw-alias-label-primary', bg: '--dsw-alias-bg-overlay', kind: 'body', fix: 'text' },
  { id: 'body.bubble', fg: '--dsw-alias-label-primary', bg: '--dsw-specific-bubble', kind: 'body', fix: 'text' },
  { id: 'body.card', fg: '--dsw-alias-label-primary', bg: '--dsw-alias-settings-card-fill', kind: 'body', fix: 'text' },
  { id: 'secondary.base', fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-bg-base', kind: 'secondary', fix: 'text' },
  { id: 'secondary.layer2', fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-bg-layer-2', kind: 'secondary', fix: 'text' },
  { id: 'tertiary.base', fg: '--dsw-alias-label-tertiary', bg: '--dsw-alias-bg-base', kind: 'large', fix: 'text' },
  { id: 'caption.base', fg: '--dsw-alias-label-caption', bg: '--dsw-alias-bg-base', kind: 'large', fix: 'text' },
  { id: 'link.base', fg: '--dsw-alias-link', bg: '--dsw-alias-bg-base', kind: 'secondary', fix: 'accent' },
  { id: 'button.primary', fg: '--dsw-alias-label-primary-foreground', bg: '--dsw-alias-button-primary-fill', kind: 'secondary', fix: 'accent' },
  { id: 'button.contrast', fg: '--dsw-alias-label-primary-foreground', bg: '--dsw-alias-button-contrast-fill', kind: 'secondary', fix: 'accent' },
  { id: 'toast', fg: '--dsw-alias-toast-label', bg: '--dsw-alias-toast-bg', kind: 'body', fix: 'none' },
  { id: 'tooltip', fg: '--dsw-alias-toast-label', bg: '--dsw-alias-tooltip-bg', kind: 'body', fix: 'none' },
  { id: 'menu', fg: '--dsw-alias-label-primary', bg: '--dsw-menu-surface-fill', kind: 'body', fix: 'surface' },
  { id: 'state.success', fg: '--dsw-alias-state-success-primary', bg: '--dsw-alias-bg-base', kind: 'ui', fix: 'state' },
  { id: 'state.warn', fg: '--dsw-alias-state-warn-primary', bg: '--dsw-alias-bg-base', kind: 'ui', fix: 'state' },
  { id: 'state.error', fg: '--dsw-alias-state-error-primary', bg: '--dsw-alias-bg-base', kind: 'ui', fix: 'state' },
  { id: 'diff.added', fg: '--dsw-alias-file-diff-added-marker', bg: '--dsw-alias-file-diff-added-bg', kind: 'ui', fix: 'state' },
  { id: 'icon.menu', fg: '--dsw-alias-menu-icon', bg: '--dsw-alias-menu-group-header-fill', kind: 'ui', fix: 'surface' },
]

/** Run the audit over a resolved palette. */
export function auditPalette(palette: Palette): PairResult[] {
  return AUDIT_PAIRS.map((def) => {
    const fg = palette[def.fg] ?? '#000'
    const bgToken = palette[def.bg] ?? '#fff'
    // Translucent surfaces are composited over the base so the number means
    // something (a 58%-alpha menu over a light page is not "white").
    const bg = withAlphaOver(bgToken, palette['--dsw-alias-bg-base'] ?? '#ffffff')
    const ratio = +contrastRatio(fg, bg).toFixed(2)
    const lc = +Math.abs(apcaLc(fg, bg)).toFixed(1)
    const threshold = THRESHOLDS[def.kind]
    return {
      id: def.id,
      fg: def.fg,
      bg: def.bg,
      kind: def.kind,
      ratio,
      lc,
      minRatio: threshold.ratio,
      minLc: threshold.lc,
      pass: ratio >= threshold.ratio && lc >= threshold.lc,
      fix: def.fix,
    }
  })
}

/** Composite a possibly translucent colour over an opaque backdrop. */
function withAlphaOver(value: string, backdrop: string): string {
  const top = toRgba(value)
  const bottom = toRgba(backdrop)
  if (!top || !bottom) return value
  if (top.a >= 1) return value
  const mix = (a: number, b: number): number => Math.round(a * top.a + b * (1 - top.a))
  return `rgb(${mix(top.r, bottom.r)},${mix(top.g, bottom.g)},${mix(top.b, bottom.b)})`
}

/** Compact summary for the studio header. */
export function auditSummary(results: PairResult[]): { passed: number; total: number; worst: string | null } {
  const failed = results.filter((result) => !result.pass)
  const sorted = [...failed].sort((a, b) => a.ratio / a.minRatio - b.ratio / b.minRatio)
  return { passed: results.length - failed.length, total: results.length, worst: sorted[0]?.id ?? null }
}

/**
 * Walk the spec toward a fully passing audit.
 *
 * Fixes only move lightness (hue and chroma are preserved, so the user's
 * colour choice survives), and they prefer the smallest possible change:
 * text lightness first, then accents, then surfaces.
 */
export function autoFixContrast(
  spec: ThemeSpec,
  maxSteps = 60,
): { spec: ThemeSpec; results: PairResult[]; steps: number } {
  const light = spec.mode === 'light'
  const textStep = light ? -0.012 : 0.012
  const accentStep = light ? -0.012 : 0.012
  let current = { ...spec }
  let steps = 0

  for (; steps < maxSteps; steps++) {
    const results = auditPalette(fullPalette(current))
    const failing = results.filter((result) => !result.pass)
    if (failing.length === 0) break

    const targets = new Set(failing.map((result) => result.fix))
    if (targets.has('text')) {
      current = { ...current, tx: clamp(current.tx + textStep, 0.03, 0.99) }
      // Caption/tertiary follow tx, but a very light theme can still starve
      // them; compress the ladder by lifting tx further rather than clipping.
      continue
    }
    if (targets.has('accent')) {
      current = { ...current, l1: clamp(current.l1 + accentStep, 0.2, 0.95) }
      continue
    }
    if (targets.has('surface')) {
      current = { ...current, bg: clamp(current.bg - textStep * 0.6, 0.03, 0.995) }
      continue
    }
    // Only state colours left: brighten/darken them by boosting chroma is not
    // enough, so nudge the state cluster through the lightness of the base.
    const needsState = failing.some((result) => result.fix === 'state')
    if (needsState) {
      current = { ...current, bg: clamp(current.bg - textStep * 0.4, 0.03, 0.995) }
      continue
    }
    break
  }

  return { spec: current, results: auditPalette(fullPalette(current)), steps }
}

/** Pick the legible foreground for an accent-fill button. */
export function bestOnAccent(l: number, c: number, h: number): string {
  const dark = oklchToHex(0.13, CHROMA_CAP.text * 0.3, h)
  const lightHex = oklchToHex(0.97, CHROMA_CAP.text * 0.2, h)
  const fill = oklchToHex(l, c, h)
  return contrastRatio(lightHex, fill) >= contrastRatio(dark, fill) ? lightHex : dark
}
