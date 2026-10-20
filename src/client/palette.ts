/**
 * Browser-side colour engine for dsh-freestyle-theme.
 *
 * A theme is four OKLCH axes plus two "look" axes:
 *
 *   1. brand      — hue / chroma / lightness of the accent
 *   2. neutral    — how much of the brand hue the greys inherit (the axis that
 *                   separates hand-made themes from cheap ones)
 *   3. elevation  — a four-point surface ladder plus a single `spread` knob
 *   4. state      — success / warn / error chroma cluster
 *   5. typography — font pairing and scale (preview + export only)
 *   6. shape      — radius and shadow strength tiers (preview + export only)
 *
 * `fullPalette` expands one spec into every themeable token for one mode,
 * mirroring the shipped theme structure so overlays, masks and nested layers
 * keep behaving like the built-in themes. Chroma is capped per role
 * (`CHROMA_CAP`) so a user cannot accidentally make surfaces look plastic.
 *
 * @module dsh-freestyle-theme/client/palette
 */

/** Which mode a spec describes. */
export type ThemeMode = 'light' | 'dark'

/** The three colour channels the studio exposes as sliders. */
export type ChannelKey = 'th' | 'th2' | 'ths'

/** Colour relationship used to derive secondary and surface hues. */
export type HarmonyKey = 'analogous' | 'complementary' | 'split' | 'triadic' | 'random'

/** Font pairing, preview/export only. */
export type FontPair = 'sans' | 'serif' | 'rounded'

/** Shape tier, preview/export only. */
export type Tier = 0 | 1 | 2

/** One theme recipe. */
export interface ThemeSpec {
  /* ── brand axis ──────────────────────────────────────────────────────── */
  /** Brand hue, degrees. */
  th: number
  /** Brand chroma. */
  c1: number
  /** Brand lightness. */
  l1: number
  /* ── secondary channel ───────────────────────────────────────────────── */
  /** Secondary hue, degrees. */
  th2: number
  /** Secondary chroma. */
  c2: number
  /** Secondary lightness. */
  l2: number
  /* ── surface axis ────────────────────────────────────────────────────── */
  /** Surface tint hue, degrees. */
  ths: number
  /** Surface tint chroma. */
  sc: number
  /** Background lightness. */
  bg: number
  /* ── neutral temperature ─────────────────────────────────────────────── */
  /** How much tint the neutral greys inherit, 0…1. */
  neutralTint: number
  /* ── elevation ladder ────────────────────────────────────────────────── */
  /** Total contrast between the lowest and highest surface, 0.04…0.20. */
  spread: number
  /* ── state cluster ───────────────────────────────────────────────────── */
  /** State colour chroma boost, 0…1. */
  stateBoost: number
  /* ── text ────────────────────────────────────────────────────────────── */
  /** Foreground (text) lightness. */
  tx: number
  /** Sidebar lightness. */
  sb: number
  /* ── look (preview + export only) ────────────────────────────────────── */
  fontPair: FontPair
  fontScale: number
  radius: Tier
  shadow: Tier
  /** Which mode this spec describes. */
  mode: ThemeMode
}

/** Flat token map: `--dsw-*` custom property name → CSS colour. */
export type Palette = Record<string, string>

/** Per-role chroma ceilings: the guardrail that keeps palettes tasteful. */
export const CHROMA_CAP = {
  /** Brand primary: the one place a vivid colour is allowed. */
  brand: 0.37,
  /** Channel/secondary accent. */
  accent: 0.3,
  /** Plain surfaces (backgrounds, cards, bubbles). */
  surface: 0.03,
  /** Neutral chrome (borders, scrollbars, dividers). */
  neutral: 0.012,
  /** Hairlines and strokes. */
  border: 0.02,
  /** Any text colour. */
  text: 0.03,
  /** Status colours. */
  state: 0.16,
} as const

/** Clamp a number into `[min, max]`. */
export function clamp(value: number, min: number, max: number): number {
  const low = Number.isFinite(min) ? min : 0
  const high = Number.isFinite(max) ? max : 1
  const input = Number.isFinite(value) ? value : low
  return Math.max(low, Math.min(high, input))
}

const srgbEncode = (value: number): number =>
  value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055

/** Convert one OKLCH triple into 8-bit sRGB channels. */
function linearRgb(l: number, c: number, h: number): [number, number, number] {
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
  ]
}

/**
 * Reduce chroma until the colour fits sRGB.
 *
 * Clipping the channels instead would slide the hue (a vivid yellow-green
 * clipped to red), so the requested hue is preserved and only saturation gives
 * way — the colour you picked stays the colour you picked.
 */
function inGamut(l: number, c: number, h: number): boolean {
  return linearRgb(l, c, h).every((value) => value >= -0.0005 && value <= 1.0005)
}

export function gamutChroma(l: number, c: number, h: number): number {
  if (c <= 0 || inGamut(l, c, h)) return c
  let low = 0
  let high = c
  for (let step = 0; step < 14; step += 1) {
    const mid = (low + high) / 2
    if (inGamut(l, mid, h)) low = mid
    else high = mid
  }
  return low
}

export function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  return linearRgb(l, gamutChroma(l, c, h), h).map(
    (value) => Math.round(clamp(srgbEncode(value), 0, 1) * 255),
  ) as [number, number, number]
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

/** Parse `#rgb` / `#rrggbb` / `rgba(...)` into 0–255 channels. */
export function parseColor(value: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())
  if (hex) {
    const raw = hex[1]
    if (raw.length === 3) {
      return [
        parseInt(raw[0] + raw[0], 16),
        parseInt(raw[1] + raw[1], 16),
        parseInt(raw[2] + raw[2], 16),
      ]
    }
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16),
    ]
  }
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(value.trim())
  if (rgb) return [Math.round(+rgb[1]), Math.round(+rgb[2]), Math.round(+rgb[3])]
  return null
}

/** Default lightness knobs per mode. */
export const DEF_LIGHT = { l1: 0.52, l2: 0.6, bg: 0.955, tx: 0.14, sb: 0.976 } as const
/** Default lightness knobs for dark mode. */
export const DEF_DARK = { l1: 0.78, l2: 0.78, bg: 0.14, tx: 0.955, sb: 0.098 } as const

/** Look defaults. */
export const DEF_LOOK = { fontPair: 'sans' as FontPair, fontScale: 1, radius: 1 as Tier, shadow: 1 as Tier }

/** Harmony offsets, in degrees, for the secondary and surface channels. */
const HARMONY_OFFSETS: Record<Exclude<HarmonyKey, 'random'>, [number, number]> = {
  analogous: [32, -22],
  complementary: [180, 8],
  split: [150, 210],
  triadic: [120, 240],
}

/** Every harmony in UI order (the last one is the "surprise me" marker). */
export const HARMONIES: readonly HarmonyKey[] = [
  'analogous',
  'complementary',
  'split',
  'triadic',
  'random',
]

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
  const { th, th2, ths, c1, c2, sc, l1, l2, tx } = spec
  const sb = spec.sb ?? (light ? DEF_LIGHT.sb : DEF_DARK.sb)

  /** How far the elevation ladder is stretched (1 = shipped contrast). */
  const k = clamp(spec.spread ?? 0.1, 0.04, 0.2) / 0.1
  /** Neutral tint chroma carried by every grey. */
  const nC = clamp(spec.neutralTint ?? 0.35, 0, 1) * CHROMA_CAP.neutral
  /** State chroma multiplier. */
  const sMul = 0.7 + clamp(spec.stateBoost ?? 0.55, 0, 1) * 0.6

  const hex = (l: number, c: number, h: number): string => oklchToHex(l, c, h)
  const rgba = (l: number, c: number, h: number, alpha: number): string =>
    oklchToRgba(l, c, h, alpha)
  /** A surface colour: channel tint + inherited neutral tint, capped. */
  const surf = (factor: number, extra = 0): number =>
    clamp(sc * factor + nC + extra, 0, CHROMA_CAP.surface)
  /** A neutral/chrome colour (borders, scrollbars, masks). */
  const chrome = (factor: number): number => clamp(sc * factor + nC, 0, CHROMA_CAP.neutral)
  /** A text colour: a whisper of the neutral tint, never more. */
  const ink = (l: number, extra = 0): string =>
    hex(l, clamp(0.006 + nC * 0.55 + extra, 0, CHROMA_CAP.text), th)
  /** A state colour, chroma boosted/capped. */
  const st = (c: number): number => clamp(c * sMul, 0, CHROMA_CAP.state)
  /** A hairline: tinted rather than pure black/white. */
  const line = (alpha: number): string =>
    rgba(light ? 0.42 : 0.86, clamp(nC * 1.8, 0, CHROMA_CAP.border), ths, alpha)

  // Surfaces: the host keeps light cards pure white and stacks dark layers
  // upward, so the same rule is applied here — stretched by `spread`.
  const bgEff = light ? clamp(spec.bg - (k - 1) * 0.045, 0.88, 0.995) : spec.bg
  const sBase = bgEff
  // Light mode: cards stay pure white and elevation spreads downward from
  // there, so layer-2/3 differ by a hair instead of collapsing into one tone.
  const sL1 = light ? Math.min(bgEff + 0.032 * k, 0.998) : clamp(bgEff + 0.035 * k, 0.02, 0.6)
  const sL2 = light ? Math.max(0.02, sL1 - 0.006 * k) : clamp(bgEff + 0.06 * k, 0.02, 0.65)
  const sL3 = light ? Math.max(0.02, sL1 - 0.012 * k) : clamp(bgEff + 0.085 * k, 0.02, 0.7)
  const sOverlay = light
    ? Math.max(0.04, bgEff - 0.045 * k)
    : clamp(bgEff + 0.12 * k, 0.02, 0.8)
  const sMod = light ? bgEff : clamp(bgEff + 0.05 * k, 0.02, 0.6)
  const sCode = light ? Math.max(0.04, bgEff - 0.03 * k) : Math.max(0.035, bgEff - 0.03)

  // Foreground ladder.
  const i1 = tx
  // The dark ladder is tighter than the light one: on a dark page, APCA falls
  // off faster than WCAG, so tertiary keeps more of the primary's lightness.
  const i2 = light ? tx + 0.22 : tx - 0.12
  const i3 = light ? tx + 0.38 : tx - 0.18
  const i4 = light ? tx + 0.47 : tx - 0.24
  const iDim = light ? 0.9 : 0.34

  const onAccent = l1 > 0.62 ? 0.13 : 0.97
  const accentInv = light ? 0.1 : 0.97
  const accentHover = clamp(l1 + (light ? -0.07 : 0.08), 0.2, 0.95)

  const success = light ? 0.46 : 0.72
  const successSoft = light ? 0.52 : 0.66
  const danger = light ? 0.5 : 0.72
  const dangerSoft = light ? 0.55 : 0.68
  const warn = light ? 0.6 : 0.8
  const warnSoft = light ? 0.65 : 0.72

  const markdownBlock = hex(sCode, surf(0.3), ths)
  const tooltipBg = hex(light ? 0.18 : 0.32, surf(0.3), ths)

  return {
    // ── surfaces ────────────────────────────────────────────────────────────
    '--dsw-alias-bg-base': hex(sBase, surf(0.3), ths),
    '--dsw-alias-bg-layer-1': hex(sL1, surf(0.2), ths),
    '--dsw-alias-bg-layer-2': hex(sL2, surf(0.4), ths),
    '--dsw-alias-bg-layer-3': hex(sL3, surf(0.5), ths),
    '--dsw-alias-bg-overlay': hex(sOverlay, surf(0.5), ths),
    '--dsw-alias-bg-module-platform': hex(sMod, surf(0.35), ths),
    '--dsw-alias-bg-multi-select': hex(sMod, surf(0.35), ths),
    '--dsw-alias-bg-document-preview': hex(light ? 0.18 : 0.12, surf(0.25), ths),
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
    '--dsw-alias-brand-primary-invert': hex(accentInv, chrome(0.2), ths),
    '--dsw-alias-brand-primary-new-colorprimary-new-color': hex(l1, c1, th),
    '--dsw-alias-brand-text': hex(l1, c1, th),
    '--dsw-alias-link': hex(l1, c1, th),

    // ── buttons ────────────────────────────────────────────────────────────
    '--dsw-alias-button-contrast-fill': hex(light ? 0.12 : 0.95, chrome(0.1), ths),
    '--dsw-alias-button-elevated-fill': hex(sL1, surf(0.2), ths),
    '--dsw-alias-button-floating-fill': hex(sL2, surf(0.3), ths),
    '--dsw-alias-button-floating-hover': hex(sL3, surf(0.4), ths),
    '--dsw-alias-button-ghost-active-border': hex(i3, surf(0.3), ths),
    '--dsw-alias-button-ghost-active-fill': hex(light ? 0.9 : 0.28, surf(0.4), ths),
    '--dsw-alias-button-ghost-active-hover': hex(light ? 0.93 : 0.32, surf(0.4), ths),
    '--dsw-alias-button-info-fill': hex(l1, c1, th),
    '--dsw-alias-button-info-hover': hex(accentHover, c1, th),
    '--dsw-alias-button-primary-dimmed': hex(light ? 0.9 : 0.28, surf(0.4), ths),
    '--dsw-alias-button-primary-fill': hex(l1, c1, th),
    '--dsw-alias-button-primary-hover': hex(accentHover, c1, th),
    '--dsw-alias-button-tool-bar-fill-invisible': 'rgba(31,31,31,0.36)',
    '--dsw-alias-button-tool-bar-fill': 'rgba(84,85,87,0.5)',
    '--dsw-alias-button-tool-bar-hover': 'rgba(84,85,87,0.6)',

    // ── interactive states ─────────────────────────────────────────────────
    '--dsw-alias-interactive-bg-active': rgba(l1, c1, th, light ? 0.12 : 0.14),
    '--dsw-alias-interactive-bg-hover': rgba(l1, c1, th, light ? 0.07 : 0.12),
    '--dsw-alias-interactive-bg-hover-accent': rgba(l1, c1, th, light ? 0.14 : 0.22),
    '--dsw-alias-interactive-bg-hover-danger': rgba(danger, st(0.17), 25, light ? 0.08 : 0.14),
    '--dsw-alias-interactive-bg-hover-solid': hex(light ? 0.9 : 0.26, surf(0.4), ths),

    // ── labels ─────────────────────────────────────────────────────────────
    // Caption is the smallest text on the page, so it keeps the tertiary
    // contrast instead of adding a fourth, paler rung.
    '--dsw-alias-label-caption': ink(i3),
    '--dsw-alias-label-dimmed': ink(iDim, -0.002),
    '--dsw-alias-label-primary': ink(i1),
    '--dsw-alias-label-primary-bluish': ink(i1),
    '--dsw-alias-label-primary-dimmed': ink(i2),
    '--dsw-alias-label-primary-foreground': hex(onAccent, CHROMA_CAP.text * 0.3, th),
    '--dsw-alias-label-primary-inverted': ink(accentInv),
    '--dsw-alias-label-secondary': ink(i2),
    '--dsw-alias-label-tertiary': ink(i3),
    '--dsw-alias-label-shimmer': rgba(i1, clamp(0.006 + nC * 0.55, 0, CHROMA_CAP.text), th, 0.3),
    '--dsw-alias-label-deep-diving': hex(light ? 0.5 : 0.7, 0.13, 252),
    '--dsw-alias-label-deep-diving-shimmer': rgba(light ? 0.5 : 0.7, 0.13, 252, 0.32),
    '--dsw-alias-label-document-preview': hex(light ? 0.42 : 0.82, surf(0.02), ths),

    // ── markdown ───────────────────────────────────────────────────────────
    '--dsw-alias-markdown-citation': hex(light ? 0.9 : 0.28, surf(0.3), ths),
    '--dsw-alias-markdown-code-block': markdownBlock,
    '--dsw-alias-markdown-code-block-banner': hex(light ? 0.985 : 0.16, surf(0.25), ths),
    '--dsw-alias-markdown-code-segment-selected': hex(sL1, surf(0.2), ths),
    '--dsw-alias-markdown-code-segment-unselected': hex(sL2, surf(0.3), ths),
    '--dsw-alias-markdown-inline-code': hex(light ? 0.9 : 0.24, surf(0.3), ths),
    '--dsw-alias-markdown-placeholder': hex(sMod, surf(0.3), ths),
    '--dsw-alias-markdown-tag': hex(light ? 0.92 : 0.24, surf(0.3), ths),

    // ── code / file diffs ──────────────────────────────────────────────────
    '--dsw-alias-code-diff-added': rgba(success, st(0.15), 150, light ? 0.14 : 0.18),
    '--dsw-alias-code-diff-deleted': rgba(danger, st(0.17), 25, light ? 0.14 : 0.18),
    '--dsw-alias-file-diff-added-bg': hex(light ? 0.955 : 0.2, st(0.045), 150),
    '--dsw-alias-file-diff-added-gutter': hex(light ? 0.968 : 0.22, st(0.045), 150),
    '--dsw-alias-file-diff-added-marker': hex(light ? 0.6 : 0.72, st(0.15), 150),
    '--dsw-alias-file-diff-deleted-bg': hex(light ? 0.955 : 0.2, st(0.05), 25),
    '--dsw-alias-file-diff-deleted-gutter': hex(light ? 0.968 : 0.22, st(0.05), 25),
    '--dsw-alias-file-diff-deleted-marker': hex(light ? 0.58 : 0.72, st(0.16), 25),

    // ── menus & navigation ─────────────────────────────────────────────────
    '--dsw-alias-menu-group-header-fill': rgba(sL1, surf(0.2), ths, 0.94),
    '--dsw-alias-menu-icon': hex(light ? 0.38 : 0.86, surf(0.02), ths),
    '--dsw-menu-surface-fill': rgba(sL1, surf(0.25), ths, light ? 0.58 : 0.45),

    // ── onboarding ─────────────────────────────────────────────────────────
    '--dsw-alias-onboarding-accent': hex(l1, c1, th),
    '--dsw-alias-onboarding-card-fill': hex(sL2, surf(0.3), ths),
    '--dsw-alias-onboarding-checkbox-border': hex(l1, c1, th),
    '--dsw-alias-onboarding-secondary-fill': hex(sL3, surf(0.4), ths),

    // ── scrollbars ─────────────────────────────────────────────────────────
    '--dsw-alias-scrollbar-bg-l1': hex(light ? 0.78 : 0.32, chrome(0.004), ths),
    '--dsw-alias-scrollbar-bg-l2': hex(light ? 0.78 : 0.3, chrome(0.004), ths),
    '--dsw-alias-scrollbar-hover-l1': hex(light ? 0.7 : 0.38, chrome(0.004), ths),
    '--dsw-alias-scrollbar-hover-l2': hex(light ? 0.7 : 0.36, chrome(0.004), ths),

    // ── settings cards ─────────────────────────────────────────────────────
    '--dsw-alias-settings-card-fill': hex(sL2, surf(0.4), ths),
    '--dsw-alias-settings-card-stroke': line(light ? 0.16 : 0.2),

    // ── states ─────────────────────────────────────────────────────────────
    '--dsw-alias-state-business-primary': hex(l1, c1, th),
    '--dsw-alias-state-business-tertiary': rgba(l1, c1, th, light ? 0.14 : 0.22),
    '--dsw-alias-state-error-primary': hex(danger, st(0.17), 25),
    // Secondary error is the on-dark ink (toasts, banners over dark surfaces),
    // so it stays light in both modes.
    '--dsw-alias-state-error-secondary': hex(light ? 0.86 : 0.8, st(0.12), 25),
    '--dsw-alias-state-idle-primary': hex(light ? 0.72 : 0.55, chrome(0.006), ths),
    '--dsw-alias-state-success-primary': hex(success, st(0.15), 150),
    '--dsw-alias-state-success-secondary': hex(successSoft, st(0.14), 150),
    '--dsw-alias-state-success-tertiary': hex(light ? 0.95 : 0.24, st(0.05), 150),
    '--dsw-alias-state-warn-label': hex(light ? 0.55 : 0.78, st(0.14), 70),
    '--dsw-alias-state-warn-primary': hex(warn, st(0.14), 75),
    '--dsw-alias-state-warn-secondary': hex(warnSoft, st(0.14), 75),
    '--dsw-alias-state-warn-tertiary': hex(light ? 0.95 : 0.26, st(0.06), 75),

    // ── overlays ───────────────────────────────────────────────────────────
    '--dsw-alias-switch-thumb': hex(light ? 0.995 : 0.97, chrome(0.004), ths),
    '--dsw-alias-toast-bg': hex(light ? 0.22 : 0.3, surf(0.3), ths),
    '--dsw-alias-toast-label': hex(light ? 0.97 : 0.95, chrome(0.004), ths),
    '--dsw-alias-tooltip-bg': tooltipBg,
    '--dsw-alias-tooltip-key-bg': hex(light ? 0.24 : 0.37, surf(0.3), ths),
    '--dsw-alias-turn-trigger-bg': markdownBlock,
    '--dsw-alias-turn-trigger-bg-hover': hex(light ? 0.9 : 0.26, surf(0.4), ths),

    // ── specific surfaces ──────────────────────────────────────────────────
    '--dsw-specific-bubble': hex(light ? 0.93 : 0.2, surf(0.4), ths),
    '--dsw-specific-bubble-highlight': rgba(l1, c1, th, light ? 0.18 : 0.24),
    '--dsw-specific-input-major': hex(sL1, surf(0.2), ths),
    '--dsw-specific-login-input': hex(sCode, surf(0.3), ths),
    '--dsw-specific-menu': hex(sOverlay, surf(0.5), ths),
    '--dsw-specific-selector': hex(sMod, surf(0.35), ths),
    '--dsw-specific-sidebar-fill': hex(sb, surf(0.3), ths),
    // The secondary channel drives the sidebar's selected/hover rows: its hue
    // tints them and its lightness nudges their depth, so the slider is felt
    // rather than merely stored.
    '--dsw-specific-sidebar-nav-item-active': hex(
      clamp((light ? 0.88 : 0.3) + (l2 - (light ? 0.6 : 0.76)) * 0.25, 0.04, 0.98),
      clamp(c2 * 0.4 + nC, 0, CHROMA_CAP.border),
      th2,
    ),
    '--dsw-specific-sidebar-nav-item-active-accent': rgba(l1, c1, th, light ? 0.16 : 0.24),
    '--dsw-specific-sidebar-nav-item-hover': hex(
      clamp((light ? 0.93 : 0.23) + (l2 - (light ? 0.6 : 0.76)) * 0.15, 0.04, 0.99),
      clamp(c2 * 0.25 + nC, 0, CHROMA_CAP.neutral),
      th2,
    ),
    '--dsw-specific-tip': hex(light ? 0.93 : 0.22, surf(0.4), ths),
  }
}

/** Zip the light and dark palettes into the theme service's override shape. */
export function pair(light: Palette, dark: Palette): Record<string, { light: string; dark: string }> {
  const out: Record<string, { light: string; dark: string }> = {}
  for (const key of Object.keys(light)) {
    out[key] = { light: light[key], dark: dark[key] ?? light[key] }
  }
  return out
}

/** Build a fresh spec for a mode, seeded from one hue. */
export function makeSpec(
  hue: number,
  mode: ThemeMode,
  patch: Partial<ThemeSpec> = {},
): ThemeSpec {
  const base = mode === 'light' ? DEF_LIGHT : DEF_DARK
  const { th2, ths } = huesForHarmony(hue, 'analogous')
  return {
    th: hue,
    th2,
    ths,
    c1: 0.1,
    c2: 0.07,
    sc: 0.008,
    l1: base.l1,
    l2: base.l2,
    bg: base.bg,
    tx: base.tx,
    sb: base.sb,
    neutralTint: 0.35,
    spread: 0.1,
    stateBoost: 0.55,
    fontPair: DEF_LOOK.fontPair,
    fontScale: DEF_LOOK.fontScale,
    radius: DEF_LOOK.radius,
    shadow: DEF_LOOK.shadow,
    mode,
    ...patch,
  }
}

/** Default specs for each mode. */
export function defaultSpec(mode: ThemeMode): ThemeSpec {
  return makeSpec(168, mode)
}

/** Keep the colour axes and swap the mode-dependent defaults that were untouched. */
export function switchMode(spec: ThemeSpec, mode: ThemeMode): ThemeSpec {
  if (spec.mode === mode) return spec
  const base = mode === 'light' ? DEF_LIGHT : DEF_DARK
  return { ...spec, mode, l1: base.l1, l2: base.l2, bg: base.bg, tx: base.tx, sb: base.sb }
}

/** The full override map the theme service expects. */
export function generateTokens(spec: ThemeSpec): Record<string, { light: string; dark: string }> {
  const other = switchMode(spec, spec.mode === 'light' ? 'dark' : 'light')
  const current = fullPalette(spec)
  const flipped = fullPalette(other)
  return spec.mode === 'light' ? pair(current, flipped) : pair(flipped, current)
}

/** Natural-language description of a spec, for the host LLM prompt. */
export function specToInput(spec: ThemeSpec): Record<string, unknown> {
  return {
    brand: { hue: Math.round(spec.th), chroma: +spec.c1.toFixed(3), lightness: +spec.l1.toFixed(3) },
    secondary: { hue: Math.round(spec.th2), chroma: +spec.c2.toFixed(3) },
    surface: { hue: Math.round(spec.ths), chroma: +spec.sc.toFixed(4), lightness: +spec.bg.toFixed(3) },
    text: { lightness: +spec.tx.toFixed(3) },
    neutralTint: +spec.neutralTint.toFixed(2),
    spread: +spec.spread.toFixed(2),
    mode: spec.mode,
  }
}

const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const tier = (value: unknown, fallback: Tier): Tier => {
  const n = Math.round(num(value, fallback))
  return (n <= 0 ? 0 : n >= 2 ? 2 : 1) as Tier
}

const pairOf = (value: unknown, fallback: FontPair): FontPair =>
  value === 'serif' || value === 'rounded' || value === 'sans' ? value : fallback

/** Coerce untrusted JSON (import, share code, LLM output) into a safe spec. */
export function normalizeSpec(raw: unknown): ThemeSpec {
  const input = (raw ?? {}) as Record<string, unknown>
  const mode: ThemeMode = input.mode === 'dark' ? 'dark' : 'light'
  const base = defaultSpec(mode)
  const hue = (value: unknown, fallback: number): number =>
    ((Math.round(num(value, fallback)) % 360) + 360) % 360
  return {
    th: hue(input.th, base.th),
    th2: hue(input.th2, base.th2),
    ths: hue(input.ths, base.ths),
    c1: clamp(num(input.c1, base.c1), 0, CHROMA_CAP.brand),
    c2: clamp(num(input.c2, base.c2), 0, CHROMA_CAP.accent),
    sc: clamp(num(input.sc, base.sc), 0, 0.06),
    l1: clamp(num(input.l1, base.l1), 0.2, 0.95),
    l2: clamp(num(input.l2, base.l2), 0.2, 0.95),
    bg: clamp(num(input.bg, base.bg), 0.03, 0.995),
    tx: clamp(num(input.tx, base.tx), 0.03, 0.99),
    sb: clamp(num(input.sb, base.sb), 0.03, 0.995),
    neutralTint: clamp(num(input.neutralTint, base.neutralTint), 0, 1),
    spread: clamp(num(input.spread, base.spread), 0.04, 0.2),
    stateBoost: clamp(num(input.stateBoost, base.stateBoost), 0, 1),
    fontPair: pairOf(input.fontPair, base.fontPair),
    fontScale: clamp(num(input.fontScale, base.fontScale), 0.9, 1.15),
    radius: tier(input.radius, base.radius),
    shadow: tier(input.shadow, base.shadow),
    mode,
  }
}

/* ── look tokens (preview + export only) ────────────────────────────────── */

const RADIUS: readonly [string, string, string][] = [
  ['2px', '4px', '6px'],
  ['8px', '12px', '16px'],
  ['12px', '18px', '24px'],
]

const SHADOW: readonly [string, string, string][] = [
  ['none', '0 1px 1px rgba(0,0,0,.04)', '0 1px 2px rgba(0,0,0,.05)'],
  [
    '0 1px 2px rgba(0,0,0,.06)',
    '0 2px 6px rgba(0,0,0,.08)',
    '0 8px 24px rgba(0,0,0,.12)',
  ],
  [
    '0 2px 4px rgba(0,0,0,.1)',
    '0 6px 18px rgba(0,0,0,.16)',
    '0 18px 48px rgba(0,0,0,.24)',
  ],
]

/** Font stacks per pairing. */
export const FONT_STACKS: Record<FontPair, { sans: string; mono: string }> = {
  sans: {
    sans: 'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace',
  },
  serif: {
    sans: '"Iowan Old Style", "Palatino Linotype", Georgia, "Songti SC", "Noto Serif SC", serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
  rounded: {
    sans: 'ui-rounded, "SF Pro Rounded", "Nunito", "PingFang SC", "Microsoft YaHei", sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
}

/** Look variables consumed by the preview (and by the CSS export). */
export function lookTokens(spec: ThemeSpec): Record<string, string> {
  const scale = clamp(spec.fontScale, 0.9, 1.15)
  const radii = RADIUS[spec.radius] ?? RADIUS[1]
  const shadows = SHADOW[spec.shadow] ?? SHADOW[1]
  const fonts = FONT_STACKS[spec.fontPair]
  return {
    '--ft-font-sans': fonts.sans,
    '--ft-font-mono': fonts.mono,
    '--ft-font-scale': `${scale}`,
    '--ft-radius-sm': radii[0],
    '--ft-radius-md': radii[1],
    '--ft-radius-lg': radii[2],
    '--ft-shadow-sm': shadows[0],
    '--ft-shadow-md': shadows[1],
    '--ft-shadow-lg': shadows[2],
  }
}

/* ── presets ─────────────────────────────────────────────────────────────── */

/** A hand-tuned theme coordinate set (light + dark). */
export interface ThemePreset {
  /** Stable id, also the locale key suffix (`preset.<id>`). */
  id: string
  /** Light-mode patch applied on top of the default light spec. */
  light: Partial<ThemeSpec>
  /** Dark-mode patch applied on top of the default dark spec. */
  dark: Partial<ThemeSpec>
}

/**
 * Twelve complete coordinate sets rather than six hue combos: each one carries
 * its own neutral temperature, elevation spread and state cluster, which is
 * what makes a preset read as a designed theme instead of a recolour.
 */
export const PRESETS: readonly ThemePreset[] = [
  { id: 'mist', light: { th: 168, c1: 0.075, neutralTint: 0.22, spread: 0.09, stateBoost: 0.45 }, dark: { th: 168, c1: 0.07, neutralTint: 0.26, spread: 0.13, stateBoost: 0.5 } },
  { id: 'ink', light: { th: 250, c1: 0.05, sc: 0.004, neutralTint: 0.5, spread: 0.13, stateBoost: 0.4 }, dark: { th: 250, c1: 0.06, sc: 0.004, neutralTint: 0.55, spread: 0.16, stateBoost: 0.45 } },
  { id: 'tundra', light: { th: 150, c1: 0.065, neutralTint: 0.3, spread: 0.1, stateBoost: 0.5 }, dark: { th: 150, c1: 0.07, neutralTint: 0.34, spread: 0.14, stateBoost: 0.55 } },
  { id: 'lava', light: { th: 35, c1: 0.15, neutralTint: 0.55, spread: 0.1, stateBoost: 0.75 }, dark: { th: 32, c1: 0.14, neutralTint: 0.6, spread: 0.14, stateBoost: 0.8 } },
  { id: 'deepsea', light: { th: 220, c1: 0.1, sc: 0.01, neutralTint: 0.4, spread: 0.12, stateBoost: 0.5 }, dark: { th: 220, c1: 0.11, sc: 0.01, neutralTint: 0.45, spread: 0.15, stateBoost: 0.55 } },
  { id: 'film', light: { th: 60, c1: 0.055, sc: 0.014, neutralTint: 0.7, spread: 0.08, stateBoost: 0.35 }, dark: { th: 55, c1: 0.06, sc: 0.012, neutralTint: 0.75, spread: 0.12, stateBoost: 0.4 } },
  { id: 'sakura', light: { th: 350, c1: 0.1, neutralTint: 0.42, spread: 0.09, stateBoost: 0.5 }, dark: { th: 350, c1: 0.095, neutralTint: 0.46, spread: 0.13, stateBoost: 0.55 } },
  { id: 'twilight', light: { th: 300, c1: 0.095, sc: 0.008, neutralTint: 0.38, spread: 0.11, stateBoost: 0.55 }, dark: { th: 295, c1: 0.1, sc: 0.008, neutralTint: 0.42, spread: 0.15, stateBoost: 0.6 } },
  { id: 'sand', light: { th: 72, c1: 0.085, sc: 0.016, neutralTint: 0.62, spread: 0.09, stateBoost: 0.45 }, dark: { th: 68, c1: 0.08, sc: 0.014, neutralTint: 0.66, spread: 0.13, stateBoost: 0.5 } },
  { id: 'cobalt', light: { th: 258, c1: 0.16, neutralTint: 0.32, spread: 0.1, stateBoost: 0.6 }, dark: { th: 258, c1: 0.15, neutralTint: 0.36, spread: 0.14, stateBoost: 0.65 } },
  { id: 'graphite', light: { th: 0, c1: 0.008, sc: 0, neutralTint: 0.08, spread: 0.12, stateBoost: 0.5 }, dark: { th: 0, c1: 0.01, sc: 0, neutralTint: 0.1, spread: 0.16, stateBoost: 0.55 } },
  { id: 'moss', light: { th: 120, c1: 0.06, sc: 0.01, neutralTint: 0.48, spread: 0.1, stateBoost: 0.55 }, dark: { th: 120, c1: 0.065, sc: 0.01, neutralTint: 0.52, spread: 0.14, stateBoost: 0.6 } },
]

/**
 * Instantiate a preset for one mode. Accepts the preset or its id — passing an
 * id used to fall through to the defaults, which made twelve different cards
 * render as the same theme.
 */
export function presetSpec(preset: ThemePreset | string, mode: ThemeMode): ThemeSpec {
  const found = typeof preset === 'string' ? PRESETS.find((entry) => entry.id === preset) : preset
  if (!found) return defaultSpec(mode)
  const patch = mode === 'light' ? found.light : found.dark
  const spec = { ...defaultSpec(mode), ...patch }
  const { th2, ths } = huesForHarmony(spec.th, 'analogous')
  return { ...spec, th2, ths, mode }
}

/* ── sharing ─────────────────────────────────────────────────────────────── */

const b64url = {
  encode(text: string): string {
    const bytes = new TextEncoder().encode(text)
    let raw = ''
    for (const byte of bytes) raw += String.fromCharCode(byte)
    return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  },
  decode(text: string): string {
    const padded = text.replace(/-/g, '+').replace(/_/g, '/')
    const raw = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
    const bytes = new Uint8Array(raw.length)
    for (let index = 0; index < raw.length; index++) bytes[index] = raw.charCodeAt(index)
    return new TextDecoder().decode(bytes)
  },
}

/** Compact wire shape: short keys keep share codes short. */
function toWire(spec: ThemeSpec): Record<string, number | string> {
  return {
    v: 3,
    m: spec.mode,
    h: Math.round(spec.th),
    c: +spec.c1.toFixed(3),
    l: +spec.l1.toFixed(3),
    h2: Math.round(spec.th2),
    c2: +spec.c2.toFixed(3),
    l2: +spec.l2.toFixed(3),
    hs: Math.round(spec.ths),
    s: +spec.sc.toFixed(4),
    b: +spec.bg.toFixed(3),
    t: +spec.tx.toFixed(3),
    sb: +spec.sb.toFixed(3),
    n: +spec.neutralTint.toFixed(2),
    sp: +spec.spread.toFixed(2),
    st: +spec.stateBoost.toFixed(2),
    f: spec.fontPair,
    fs: +spec.fontScale.toFixed(2),
    r: spec.radius,
    sh: spec.shadow,
  }
}

function fromWire(wire: Record<string, unknown>): ThemeSpec {
  return normalizeSpec({
    mode: wire.m,
    th: wire.h,
    c1: wire.c,
    l1: wire.l,
    th2: wire.h2,
    c2: wire.c2,
    l2: wire.l2,
    ths: wire.hs,
    sc: wire.s,
    bg: wire.b,
    tx: wire.t,
    sb: wire.sb,
    neutralTint: wire.n,
    spread: wire.sp,
    stateBoost: wire.st,
    fontPair: wire.f,
    fontScale: wire.fs,
    radius: wire.r,
    shadow: wire.sh,
  })
}

/** Encode a spec into a URL-safe share code. */
export function encodeShare(spec: ThemeSpec, name?: string): string {
  const payload: Record<string, unknown> = { ...toWire(spec) }
  if (name) payload.nm = name.slice(0, 40)
  return 'dsh-freestyle-theme://' + b64url.encode(JSON.stringify(payload))
}

/** Decode a share code (or a pasted custom-scheme link) back into a spec. */
export function decodeShare(text: string): { spec: ThemeSpec; name?: string } | null {
  const raw = text
    .trim()
    .replace(/^.*[#?]theme=/i, '')
    .replace(/^dsh-freestyle-theme:\/\//i, '')
  if (!raw) return null
  try {
    const wire = JSON.parse(b64url.decode(raw)) as unknown
    if (typeof wire !== 'object' || wire === null || Array.isArray(wire)) return null
    const record = wire as Record<string, unknown>
    // A share code is only meaningful when it carries our version stamp; any
    // other object would silently normalize into the default theme.
    if (record.v !== 3 || typeof record.m !== 'string') return null
    return { spec: fromWire(record), name: typeof record.nm === 'string' ? record.nm.slice(0, 40) : undefined }
  } catch {
    return null
  }
}

/** CSS variables for a spec pair, suitable for pasting into any stylesheet. */
export function exportCss(light: ThemeSpec, dark: ThemeSpec): string {
  const toBlock = (spec: ThemeSpec, selector: string): string => {
    // Flipping `mode` alone leaves the lightness defaults of the other mode in
    // place; the exported dark block would still be near-white.
    const normalised = switchMode(spec, selector === ':root' ? 'light' : 'dark')
    const tokens = { ...fullPalette(normalised), ...lookTokens(normalised) }
    const body = Object.entries(tokens)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n')
    return `${selector} {\n${body}\n}`
  }
  return [
    '/* dsh-freestyle-theme export */',
    toBlock({ ...light, mode: 'light' }, ':root'),
    '',
    toBlock({ ...dark, mode: 'dark' }, '[data-dsh-theme="dark"]'),
    '',
  ].join('\n')
}

/* ── hue stops ───────────────────────────────────────────────────────────── */

/**
 * The 18 hue stops the studio exposes as one-click chips. They follow human
 * colour naming rather than an even grid, which is why there are gaps between
 * 60° and 120° and between 250° and 290°: those regions are where "green" and
 * "blue" lose their names.
 */
export const HUE_STOPS: readonly number[] = [
  0, 15, 30, 45, 60, 90, 120, 150, 170, 190, 210, 230, 250, 270, 290, 310, 330, 345,
]

/** Nearest hue stop index for a hue value. */
export function hueStopIndex(hue: number): number {
  const normalised = ((hue % 360) + 360) % 360
  let best = 0
  let distance = 360
  for (const [index, stop] of HUE_STOPS.entries()) {
    const delta = Math.min(Math.abs(normalised - stop), 360 - Math.abs(normalised - stop))
    if (delta < distance) {
      distance = delta
      best = index
    }
  }
  return best
}
