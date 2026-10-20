/**
 * Browser-side colour engine for Dsh-freestyle-theme.
 *
 * A theme is described by three OKLCH channels (primary / secondary / surface)
 * plus the mode-neutral lightness knobs. `fullPalette` expands one spec into a
 * complete `--dsw-alias-*` / `--dsw-specific-*` / `--dsw-menu-surface-fill`
 * token map for one mode, structurally mirroring the host theme so overlays,
 * masks and nested layers keep behaving like the built-in themes.
 *
 * @module dsh-freestyle-theme/client/palette
 */

/** The three independent colour channels a theme exposes. */
export type ChannelKey = 'th' | 'th2' | 'ths'

/** Colour relationship used to derive secondary and surface hues. */
export type HarmonyKey = 'analogous' | 'complementary' | 'split' | 'triadic' | 'random'

/** One theme recipe in OKLCH terms. */
export interface ThemeSpec {
  /** Primary hue, degrees. */
  th: number
  /** Secondary hue, degrees. */
  th2: number
  /** Surface tint hue, degrees. */
  ths: number
  /** Primary chroma. */
  c1: number
  /** Secondary chroma. */
  c2: number
  /** Surface tint chroma. */
  sc: number
  /** Primary lightness. */
  l1: number
  /** Secondary lightness. */
  l2: number
  /** Background lightness. */
  bg: number
  /** Foreground (text) lightness. */
  tx: number
  /** Sidebar lightness. */
  sb: number
  /** Which mode this spec describes. */
  mode: 'light' | 'dark'
}

/** Flat token map: `--dsw-*` custom property name → CSS colour. */
export type Palette = Record<string, string>

/** One theme proposal shown in the suggester. */
export interface Proposal {
  key: string
  hue: number
  harmony: HarmonyKey
  /** Locale key for a hand-tuned name; generated proposals omit it. */
  nameKey?: string
}

/** Clamp a number into `[min, max]`. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

const srgbEncode = (value: number): number =>
  value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055

/** Convert one OKLCH triple into 8-bit sRGB channels. */
export function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  const rad = (h * Math.PI) / 180
  const a = c * Math.cos(rad)
  const b = c * Math.sin(rad)
  const ll = Math.pow(l + 0.3963377774 * a + 0.2158037573 * b, 3)
  const mm = Math.pow(l - 0.1055613458 * a - 0.0638541728 * b, 3)
  const ss = Math.pow(l - 0.0894841775 * a - 1.291485548 * b, 3)
  return [
    4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss,
    -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss,
    -0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss,
  ].map((value) => Math.round(clamp(srgbEncode(value), 0, 1) * 255)) as [number, number, number]
}

/** OKLCH → `#rrggbb`. */
export function oklchToHex(l: number, c: number, h: number): string {
  return (
    '#' +
    oklchToRgb(l, c, h)
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('')
  )
}

/** OKLCH → `rgba(...)`, for translucency-bearing tokens. */
export function oklchToRgba(l: number, c: number, h: number, alpha: number): string {
  const [r, g, b] = oklchToRgb(l, c, h)
  return `rgba(${r},${g},${b},${alpha})`
}

/** Default lightness knobs per mode. */
export const DEF_LIGHT = { l1: 0.52, l2: 0.60, bg: 0.955, tx: 0.14, sb: 0.976 } as const
/** Default lightness knobs for dark mode. */
export const DEF_DARK = { l1: 0.76, l2: 0.76, bg: 0.14, tx: 0.955, sb: 0.098 } as const

/** Harmony offsets, in degrees, for the secondary and surface channels. */
const HARMONY_OFFSETS: Record<Exclude<HarmonyKey, 'random'>, [number, number]> = {
  analogous: [32, -22],
  complementary: [180, 8],
  split: [150, 210],
  triadic: [120, 240],
}

/** Every harmony in UI order (the last one is the "surprise me" marker). */
export const HARMONIES: readonly HarmonyKey[] = ['analogous', 'complementary', 'split', 'triadic', 'random']

/** Derive the secondary and surface hues from the primary hue. */
export function huesForHarmony(primary: number, harmony: HarmonyKey): { th2: number; ths: number } {
  const hue = ((Math.round(primary) % 360) + 360) % 360
  const key: Exclude<HarmonyKey, 'random'> = harmony === 'random' ? 'analogous' : harmony
  const [offset2, offsetS] = HARMONY_OFFSETS[key]
  return { th2: (hue + offset2) % 360, ths: (hue + offsetS + 360) % 360 }
}

/**
 * Expand one spec into every themeable token for its mode.
 *
 * Coverage follows the shipped theme exactly: all `--dsw-alias-*` tokens, the
 * `--dsw-specific-*` surface family, and `--dsw-menu-surface-fill` (which is a
 * top-level token, not an alias). Static primitives, radii, typography, focus
 * rings and elevation stay untouched — those are structure, not colour.
 */
export function fullPalette(spec: ThemeSpec): Palette {
  const light = spec.mode === 'light'
  const { th, th2, ths, c1, c2, sc, l1, l2, bg, tx } = spec
  const sb = spec.sb ?? (light ? DEF_LIGHT.sb : DEF_DARK.sb)

  const hex = (l: number, c: number, h: number): string => oklchToHex(l, c, h)
  const rgba = (l: number, c: number, h: number, alpha: number): string => oklchToRgba(l, c, h, alpha)

  // Surfaces: the host keeps light cards pure white and stacks dark layers
  // upward, so the same rule is applied here.
  const sBase = bg
  const sL1 = light ? Math.min(bg + 0.032, 0.996) : bg + 0.035
  const sL2 = light ? sL1 : bg + 0.06
  const sL3 = light ? sL1 : bg + 0.085
  const sOverlay = light ? Math.max(0.04, bg - 0.045) : bg + 0.12
  const sMod = light ? bg : bg + 0.05
  const sCode = light ? Math.max(0.04, bg - 0.03) : Math.max(0.035, bg - 0.03)

  // Foreground ladder.
  const i1 = tx
  const i2 = light ? tx + 0.22 : tx - 0.2
  const i3 = light ? tx + 0.38 : tx - 0.3
  const i4 = light ? tx + 0.5 : tx - 0.4
  const iDim = light ? 0.9 : 0.34

  const onAccent = l1 > 0.62 ? 0.13 : 0.97
  const accentInv = light ? 0.1 : 0.97
  const accentHover = clamp(l1 + (light ? -0.07 : 0.08), 0.2, 0.95)
  const line = (alpha: number): string => (light ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`)

  const success = light ? 0.46 : 0.72
  const successSoft = light ? 0.52 : 0.66
  const danger = light ? 0.5 : 0.72
  const dangerSoft = light ? 0.55 : 0.68
  const warn = light ? 0.6 : 0.8
  const warnSoft = light ? 0.65 : 0.72

  const markdownBlock = hex(sCode, sc * 0.3, ths)
  const tooltipBg = hex(light ? 0.18 : 0.32, sc * 0.3, ths)

  return {
    // ── surfaces ────────────────────────────────────────────────────────────
    '--dsw-alias-bg-base': hex(sBase, sc * 0.3, ths),
    '--dsw-alias-bg-layer-1': hex(sL1, sc * 0.2, ths),
    '--dsw-alias-bg-layer-2': hex(sL2, sc * 0.4, ths),
    '--dsw-alias-bg-layer-3': hex(sL3, sc * 0.5, ths),
    '--dsw-alias-bg-overlay': hex(sOverlay, sc * 0.5, ths),
    '--dsw-alias-bg-module-platform': hex(sMod, sc * 0.35, ths),
    '--dsw-alias-bg-multi-select': hex(sMod, sc * 0.35, ths),
    '--dsw-alias-bg-document-preview': hex(light ? 0.18 : 0.12, sc * 0.25, ths),
    '--dsw-alias-bg-document-selection': rgba(l1, c1, th, light ? 0.4 : 0.34),
    '--dsw-alias-bg-mask-1': `rgba(0,0,0,${light ? 0.24 : 0.5})`,
    '--dsw-alias-bg-mask-2': `rgba(0,0,0,${light ? 0.12 : 0.2})`,
    '--dsw-alias-bg-mask-3': 'rgba(0,0,0,0.48)',
    '--dsw-alias-bg-mask-photo': 'rgba(0,0,0,0.88)',
    '--dsw-alias-bg-mask-drop': rgba(light ? 0.98 : 0.1, 0, ths, 0.7),
    '--dsw-alias-bg-skeleton': light ? 'rgba(0,0,0,0.045)' : 'rgba(255,255,255,0.07)',

    // ── borders & separators ───────────────────────────────────────────────
    '--dsw-alias-border-inverted': light ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0.06)',
    '--dsw-alias-border-inverted2': light ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0.08)',
    '--dsw-alias-border-l1': line(light ? 0.05 : 0.06),
    '--dsw-alias-border-l2': line(light ? 0.1 : 0.12),
    '--dsw-alias-border-l2-darkmode-thin': line(light ? 0.1 : 0.06),
    '--dsw-alias-border-l3': line(light ? 0.12 : 0.16),
    '--dsw-alias-border-l4': line(light ? 0.16 : 0.2),

    // ── brand ──────────────────────────────────────────────────────────────
    '--dsw-alias-brand-primary': hex(l1, c1, th),
    '--dsw-alias-brand-primary-invert': hex(accentInv, sc * 0.2, ths),
    '--dsw-alias-brand-primary-new-colorprimary-new-color': hex(l1, c1, th),
    '--dsw-alias-brand-text': hex(l1, c1, th),
    '--dsw-alias-link': hex(l1, c1, th),

    // ── buttons ────────────────────────────────────────────────────────────
    '--dsw-alias-button-contrast-fill': hex(light ? 0.12 : 0.95, sc * 0.1, ths),
    '--dsw-alias-button-elevated-fill': hex(sL1, sc * 0.2, ths),
    '--dsw-alias-button-floating-fill': hex(sL2, sc * 0.3, ths),
    '--dsw-alias-button-floating-hover': hex(sL3, sc * 0.4, ths),
    '--dsw-alias-button-ghost-active-border': hex(i3, sc * 0.3, ths),
    '--dsw-alias-button-ghost-active-fill': hex(light ? 0.9 : 0.28, sc * 0.4, ths),
    '--dsw-alias-button-ghost-active-hover': hex(light ? 0.93 : 0.32, sc * 0.4, ths),
    '--dsw-alias-button-info-fill': hex(l1, c1, th),
    '--dsw-alias-button-info-hover': hex(accentHover, c1, th),
    '--dsw-alias-button-primary-dimmed': hex(light ? 0.9 : 0.28, sc * 0.4, ths),
    '--dsw-alias-button-primary-fill': hex(l1, c1, th),
    '--dsw-alias-button-primary-hover': hex(accentHover, c1, th),
    '--dsw-alias-button-tool-bar-fill-invisible': 'rgba(31,31,31,0.36)',
    '--dsw-alias-button-tool-bar-fill': 'rgba(84,85,87,0.5)',
    '--dsw-alias-button-tool-bar-hover': 'rgba(84,85,87,0.6)',

    // ── interactive states ─────────────────────────────────────────────────
    '--dsw-alias-interactive-bg-active': rgba(l1, c1, th, light ? 0.12 : 0.14),
    '--dsw-alias-interactive-bg-hover': rgba(l1, c1, th, light ? 0.07 : 0.12),
    '--dsw-alias-interactive-bg-hover-accent': rgba(l1, c1, th, light ? 0.14 : 0.22),
    '--dsw-alias-interactive-bg-hover-danger': rgba(danger, 0.17, 25, light ? 0.08 : 0.14),
    '--dsw-alias-interactive-bg-hover-solid': hex(light ? 0.9 : 0.26, sc * 0.4, ths),

    // ── labels ─────────────────────────────────────────────────────────────
    '--dsw-alias-label-caption': hex(i4, 0.006, th),
    '--dsw-alias-label-dimmed': hex(iDim, 0.004, ths),
    '--dsw-alias-label-primary': hex(i1, 0.008, th),
    '--dsw-alias-label-primary-bluish': hex(i1, 0.008, th),
    '--dsw-alias-label-primary-dimmed': hex(i2, 0.007, th),
    '--dsw-alias-label-primary-foreground': hex(onAccent, 0.01, th),
    '--dsw-alias-label-primary-inverted': hex(accentInv, 0.008, ths),
    '--dsw-alias-label-secondary': hex(i2, 0.007, th),
    '--dsw-alias-label-tertiary': hex(i3, 0.006, th),
    '--dsw-alias-label-shimmer': rgba(i1, 0.006, th, 0.3),
    '--dsw-alias-label-deep-diving': hex(light ? 0.5 : 0.7, 0.13, 252),
    '--dsw-alias-label-deep-diving-shimmer': rgba(light ? 0.5 : 0.7, 0.13, 252, 0.32),
    '--dsw-alias-label-document-preview': hex(light ? 0.42 : 0.82, 0.02, ths),

    // ── markdown ───────────────────────────────────────────────────────────
    '--dsw-alias-markdown-citation': hex(light ? 0.9 : 0.28, sc * 0.3, ths),
    '--dsw-alias-markdown-code-block': markdownBlock,
    '--dsw-alias-markdown-code-block-banner': hex(light ? 0.985 : 0.16, sc * 0.25, ths),
    '--dsw-alias-markdown-code-segment-selected': hex(sL1, sc * 0.2, ths),
    '--dsw-alias-markdown-code-segment-unselected': hex(sL2, sc * 0.3, ths),
    '--dsw-alias-markdown-inline-code': hex(light ? 0.9 : 0.24, sc * 0.3, ths),
    '--dsw-alias-markdown-placeholder': hex(sMod, sc * 0.3, ths),
    '--dsw-alias-markdown-tag': hex(light ? 0.92 : 0.24, sc * 0.3, ths),

    // ── code / file diffs ──────────────────────────────────────────────────
    '--dsw-alias-code-diff-added': rgba(success, 0.15, 150, light ? 0.14 : 0.18),
    '--dsw-alias-code-diff-deleted': rgba(danger, 0.17, 25, light ? 0.14 : 0.18),
    '--dsw-alias-file-diff-added-bg': hex(light ? 0.955 : 0.2, 0.04, 150),
    '--dsw-alias-file-diff-added-gutter': hex(light ? 0.968 : 0.22, 0.04, 150),
    '--dsw-alias-file-diff-added-marker': hex(light ? 0.6 : 0.72, 0.15, 150),
    '--dsw-alias-file-diff-deleted-bg': hex(light ? 0.955 : 0.2, 0.045, 25),
    '--dsw-alias-file-diff-deleted-gutter': hex(light ? 0.968 : 0.22, 0.045, 25),
    '--dsw-alias-file-diff-deleted-marker': hex(light ? 0.58 : 0.72, 0.16, 25),

    // ── menus & navigation ─────────────────────────────────────────────────
    '--dsw-alias-menu-group-header-fill': rgba(sL1, sc * 0.2, ths, 0.94),
    '--dsw-alias-menu-icon': hex(light ? 0.38 : 0.86, 0.02, ths),
    '--dsw-menu-surface-fill': rgba(sL1, sc * 0.25, ths, light ? 0.58 : 0.45),

    // ── onboarding ─────────────────────────────────────────────────────────
    '--dsw-alias-onboarding-accent': hex(l1, c1, th),
    '--dsw-alias-onboarding-card-fill': hex(sL2, sc * 0.3, ths),
    '--dsw-alias-onboarding-checkbox-border': hex(l1, c1, th),
    '--dsw-alias-onboarding-secondary-fill': hex(sL3, sc * 0.4, ths),

    // ── scrollbars ─────────────────────────────────────────────────────────
    '--dsw-alias-scrollbar-bg-l1': hex(light ? 0.78 : 0.32, 0.004, ths),
    '--dsw-alias-scrollbar-bg-l2': hex(light ? 0.78 : 0.3, 0.004, ths),
    '--dsw-alias-scrollbar-hover-l1': hex(light ? 0.7 : 0.38, 0.004, ths),
    '--dsw-alias-scrollbar-hover-l2': hex(light ? 0.7 : 0.36, 0.004, ths),

    // ── settings cards ─────────────────────────────────────────────────────
    '--dsw-alias-settings-card-fill': hex(sL2, sc * 0.4, ths),
    '--dsw-alias-settings-card-stroke': line(light ? 0.16 : 0.2),

    // ── states ─────────────────────────────────────────────────────────────
    '--dsw-alias-state-business-primary': hex(l1, c1, th),
    '--dsw-alias-state-business-tertiary': rgba(l1, c1, th, light ? 0.14 : 0.22),
    '--dsw-alias-state-error-primary': hex(danger, 0.17, 25),
    '--dsw-alias-state-error-secondary': hex(dangerSoft, 0.16, 25),
    '--dsw-alias-state-idle-primary': hex(light ? 0.72 : 0.55, 0.006, ths),
    '--dsw-alias-state-success-primary': hex(success, 0.15, 150),
    '--dsw-alias-state-success-secondary': hex(successSoft, 0.14, 150),
    '--dsw-alias-state-success-tertiary': hex(light ? 0.95 : 0.24, 0.05, 150),
    '--dsw-alias-state-warn-label': hex(light ? 0.55 : 0.78, 0.14, 70),
    '--dsw-alias-state-warn-primary': hex(warn, 0.14, 75),
    '--dsw-alias-state-warn-secondary': hex(warnSoft, 0.14, 75),
    '--dsw-alias-state-warn-tertiary': hex(light ? 0.95 : 0.26, 0.06, 75),

    // ── overlays ───────────────────────────────────────────────────────────
    '--dsw-alias-switch-thumb': hex(light ? 0.995 : 0.97, 0.004, ths),
    '--dsw-alias-toast-bg': hex(light ? 0.22 : 0.3, sc * 0.3, ths),
    '--dsw-alias-toast-label': hex(light ? 0.97 : 0.95, 0.004, ths),
    '--dsw-alias-tooltip-bg': tooltipBg,
    '--dsw-alias-tooltip-key-bg': hex(light ? 0.24 : 0.37, sc * 0.3, ths),
    '--dsw-alias-turn-trigger-bg': markdownBlock,
    '--dsw-alias-turn-trigger-bg-hover': hex(light ? 0.9 : 0.26, sc * 0.4, ths),

    // ── specific surfaces ──────────────────────────────────────────────────
    '--dsw-specific-bubble': hex(light ? 0.93 : 0.2, sc * 0.4, ths),
    '--dsw-specific-bubble-highlight': rgba(l1, c1, th, light ? 0.18 : 0.24),
    '--dsw-specific-input-major': hex(sL1, sc * 0.2, ths),
    '--dsw-specific-login-input': hex(sCode, sc * 0.3, ths),
    '--dsw-specific-menu': hex(sOverlay, sc * 0.5, ths),
    '--dsw-specific-selector': hex(sMod, sc * 0.35, ths),
    '--dsw-specific-sidebar-fill': hex(sb, sc * 0.3, ths),
    // The secondary channel drives the sidebar's selected/hover rows: its hue
    // tints them and its lightness nudges their depth, so the slider is felt
    // rather than merely stored.
    '--dsw-specific-sidebar-nav-item-active': hex(
      clamp((light ? 0.88 : 0.3) + (l2 - (light ? 0.6 : 0.76)) * 0.25, 0.04, 0.98),
      c2 * 0.4,
      th2,
    ),
    '--dsw-specific-sidebar-nav-item-active-accent': rgba(l1, c1, th, light ? 0.16 : 0.24),
    '--dsw-specific-sidebar-nav-item-hover': hex(
      clamp((light ? 0.93 : 0.23) + (l2 - (light ? 0.6 : 0.76)) * 0.15, 0.04, 0.99),
      c2 * 0.25,
      th2,
    ),
    '--dsw-specific-tip': hex(light ? 0.93 : 0.22, sc * 0.4, ths),
  }
}

/** Zip the light and dark palettes into the theme service's override shape. */
export function pair(light: Palette, dark: Palette): Record<string, { light: string; dark: string }> {
  const tokens: Record<string, { light: string; dark: string }> = {}
  for (const key of Object.keys(light)) tokens[key] = { light: light[key], dark: dark[key] ?? light[key] }
  return tokens
}

/** A fresh spec for the given mode. */
export function defaultSpec(mode: 'light' | 'dark'): ThemeSpec {
  const base = mode === 'light' ? DEF_LIGHT : DEF_DARK
  return {
    th: 168,
    th2: 200,
    ths: 176,
    c1: 0.16,
    c2: 0.14,
    sc: 0.03,
    l1: base.l1,
    l2: base.l2,
    bg: base.bg,
    tx: base.tx,
    sb: base.sb,
    mode,
  }
}

/** Same colours, the other mode's lightness ladder. */
export function switchMode(spec: ThemeSpec, mode: 'light' | 'dark'): ThemeSpec {
  const base = mode === 'light' ? DEF_LIGHT : DEF_DARK
  return { ...spec, l1: base.l1, l2: base.l2, bg: base.bg, tx: base.tx, sb: base.sb, mode }
}

/** Build the full light+dark override set for a spec (the other mode is derived). */
export function generateTokens(spec: ThemeSpec): Record<string, { light: string; dark: string }> {
  const otherMode: 'light' | 'dark' = spec.mode === 'light' ? 'dark' : 'light'
  const otherBase = otherMode === 'light' ? DEF_LIGHT : DEF_DARK
  const other: ThemeSpec = {
    ...spec,
    l1: otherBase.l1,
    l2: otherBase.l2,
    bg: otherBase.bg,
    tx: otherBase.tx,
    sb: otherBase.sb,
    mode: otherMode,
  }
  const current = fullPalette(spec)
  const counterpart = fullPalette(other)
  return spec.mode === 'light' ? pair(current, counterpart) : pair(counterpart, current)
}

/** The shareable JSON shape (round-ticks), versioned for forward compatibility. */
export function specToInput(spec: ThemeSpec): Record<string, unknown> {
  return {
    version: 4,
    th: Math.round(spec.th),
    th2: Math.round(spec.th2),
    ths: Math.round(spec.ths),
    c1: Number(spec.c1.toFixed(3)),
    c2: Number(spec.c2.toFixed(3)),
    sc: Number(spec.sc.toFixed(3)),
    l1: Number(spec.l1.toFixed(2)),
    l2: Number(spec.l2.toFixed(2)),
    bg: Number(spec.bg.toFixed(2)),
    tx: Number(spec.tx.toFixed(2)),
    sb: Number(spec.sb.toFixed(2)),
    mode: spec.mode,
  }
}

/** Coerce untrusted JSON (file, textarea, localStorage) into a valid spec. */
export function normalizeSpec(raw: unknown): ThemeSpec {
  const input = (raw ?? {}) as Record<string, unknown>
  const num = (value: unknown, fallback: number, min: number, max: number): number =>
    clamp(Number.isFinite(Number(value)) ? Number(value) : fallback, min, max)
  const mode: 'light' | 'dark' = input.mode === 'light' ? 'light' : 'dark'
  const base = mode === 'light' ? DEF_LIGHT : DEF_DARK
  return {
    th: num(input.th, 168, 0, 360),
    th2: num(input.th2, 200, 0, 360),
    ths: num(input.ths, 176, 0, 360),
    c1: num(input.c1, 0.16, 0.01, 0.28),
    c2: num(input.c2, 0.14, 0.01, 0.28),
    sc: num(input.sc, 0.03, 0.002, 0.09),
    l1: num(input.l1, base.l1, 0.3, 0.95),
    l2: num(input.l2, base.l2, 0.05, 0.97),
    bg: num(input.bg, base.bg, 0.04, 0.98),
    tx: num(input.tx, base.tx, 0.03, 1),
    sb: num(input.sb, base.sb, 0.04, 0.98),
    mode,
  }
}

/** Hue bands the locale names (`hue.N`), one per 20° with hand-picked edges. */
export const HUE_STOPS: readonly number[] = [0, 15, 30, 45, 60, 90, 120, 150, 170, 190, 210, 230, 250, 270, 290, 310, 330, 345]

/** Index into the `hue.N` locale keys for a given hue. */
export function hueStopIndex(hue: number): number {
  let best = 0
  let bestDistance = Number.POSITIVE_INFINITY
  HUE_STOPS.forEach((stop, index) => {
    const distance = Math.abs(hue - stop)
    if (distance < bestDistance) {
      bestDistance = distance
      best = index
    }
  })
  return best
}

/** Build one proposal from a hue + harmony. */
export function makeProposal(hue: number, harmony: HarmonyKey, nameKey?: string): Proposal {
  return {
    key: `${hue}|${harmony}|${Math.random().toString(36).slice(2, 7)}`,
    hue: Math.round(hue),
    harmony,
    nameKey,
  }
}

/** Resolve a proposal into the spec used for its swatches and tokens. */
export function proposalSpec(proposal: Proposal, mode: 'light' | 'dark'): ThemeSpec {
  const related = huesForHarmony(proposal.hue, proposal.harmony)
  const base = mode === 'light' ? DEF_LIGHT : DEF_DARK
  return {
    th: proposal.hue,
    th2: related.th2,
    ths: related.ths,
    c1: 0.165,
    c2: 0.05,
    sc: 0.03,
    l1: base.l1,
    l2: base.l2,
    bg: base.bg,
    tx: base.tx,
    sb: base.sb,
    mode,
  }
}

/** The hand-tuned starting points, in display order. */
export const PRESETS: readonly Proposal[] = [
  makeProposal(168, 'analogous', 'preset.aurora'),
  makeProposal(72, 'analogous', 'preset.warmSand'),
  makeProposal(300, 'triadic', 'preset.twilight'),
  makeProposal(350, 'analogous', 'preset.sakura'),
  makeProposal(220, 'analogous', 'preset.deepSea'),
  makeProposal(35, 'complementary', 'preset.lava'),
]

/** A fresh suggestion batch; `random` honours the caller's harmony choice. */
export function randomBatch(harmony: HarmonyKey, count: number): Proposal[] {
  const out: Proposal[] = []
  for (let index = 0; index < count; index++) {
    const hue = Math.floor(Math.random() * 360)
    const pick: HarmonyKey =
      harmony === 'random' ? HARMONIES[Math.floor(Math.random() * 4)] : harmony
    out.push(makeProposal(hue, pick))
  }
  return out
}
