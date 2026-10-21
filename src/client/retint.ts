/**
 * Whole-shell retint.
 *
 * Overriding only the 119 tokens we design with leaves the other ~280 shell
 * tokens at their built-in values, so the app recolours in patches. This module
 * takes the *built-in* token table from the theme service, classifies every
 * token by role (brand / state / ink / line / surface) and re-expresses its
 * colour in the drawing's axes — same lightness, our hue and chroma budget.
 *
 * The result is a complete override map: the shell, the settings dialog and
 * every panel move together, and the studio preview (which uses our own
 * palette) stays in family with them.
 *
 * @module dsh-freestyle-theme/client/retint
 */

import { CHROMA_CAP, clamp, generateTokens, switchMode, type ThemeMode, type ThemeSpec } from './palette'
import type { TokenOverrides, ThemeService } from './services'

type Role = 'brand' | 'state' | 'ink' | 'line' | 'surface'

interface Rgba {
  l: number
  c: number
  h: number
  a: number
}

/** Split a `var(--x, fallback)` reference into its name. */
function varName(value: string): string | null {
  const match = /^var\(\s*(--[a-z0-9-]+)/i.exec(value.trim())
  return match ? match[1] : null
}

/** Resolve `var()` chains against the live document, when there is one. */
function resolveValue(value: string, depth = 0): string {
  if (depth > 6 || typeof document === 'undefined') return value
  const name = varName(value)
  if (!name) return value
  const resolved = getComputedStyle(document.body).getPropertyValue(name).trim()
  if (!resolved) {
    const fallback = /,\s*([^)]+)\)$/.exec(value.trim())
    return fallback ? fallback[1].trim() : value
  }
  return resolveValue(resolved, depth + 1)
}

/** Parse the colour syntaxes the shell's palette actually uses. */
export function parseRgba(input: string): Rgba | null {
  const value = input.trim().toLowerCase()
  if (!value || value === 'transparent') return value === 'transparent' ? { l: 0, c: 0, h: 0, a: 0 } : null

  const hex = /^#([0-9a-f]{3,8})$/.exec(value)
  if (hex) {
    const raw = hex[1]
    const expand = raw.length <= 4 ? raw.split('').map((ch) => ch + ch).join('') : raw
    if (expand.length !== 6 && expand.length !== 8) return null
    const r = parseInt(expand.slice(0, 2), 16)
    const g = parseInt(expand.slice(2, 4), 16)
    const b = parseInt(expand.slice(4, 6), 16)
    const a = expand.length === 8 ? parseInt(expand.slice(6, 8), 16) / 255 : 1
    return rgbToOklch(r, g, b, a)
  }

  const rgba = /^rgba?\(([^)]+)\)$/.exec(value)
  if (rgba) {
    const parts = rgba[1].split(/[,/\s]+/).filter(Boolean)
    if (parts.length < 3) return null
    const channel = (text: string): number =>
      text.endsWith('%') ? (parseFloat(text) / 100) * 255 : parseFloat(text)
    const alpha = parts[3] === undefined ? 1 : parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])
    return rgbToOklch(channel(parts[0]), channel(parts[1]), channel(parts[2]), alpha)
  }

  const oklch = /^oklch\(([^)]+)\)$/.exec(value)
  if (oklch) {
    const parts = oklch[1].split(/[,/\s]+/).filter(Boolean).map((part) => part.replace(/%$/, ''))
    const l = parts[0]?.endsWith?.('%') ? parseFloat(parts[0]) / 100 : parseFloat(parts[0] ?? '0')
    const alpha = parts[3] === undefined ? 1 : parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])
    return { l, c: parseFloat(parts[1] ?? '0'), h: parseFloat(parts[2] ?? '0'), a: alpha }
  }
  return null
}

function rgbToOklch(r: number, g: number, b: number, a: number): Rgba {
  const to = (channel: number): number => {
    const v = clamp(channel / 255, 0, 1)
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const lr = to(r)
  const lg = to(g)
  const lb = to(b)
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  const c = Math.sqrt(A * A + B * B)
  let h = (Math.atan2(B, A) * 180) / Math.PI
  if (h < 0) h += 360
  return { l: L, c, h, a }
}

function format({ l, c, h, a }: Rgba): string {
  const L = clamp(l, 0, 1).toFixed(4)
  const C = Math.max(0, c).toFixed(4)
  const H = ((h % 360) + 360) % 360
  if (a >= 0.999) return `oklch(${L} ${C} ${H.toFixed(2)})`
  return `oklch(${L} ${C} ${H.toFixed(2)} / ${clamp(a, 0, 1).toFixed(3)})`
}

/** Which family a shell token belongs to. */
export function roleOf(token: string): Role {
  const name = token.replace(/^--dsw-(alias|specific)-/, '')
  if (/(state-|success|warn|warning|error|danger|info|business|code-diff|file-diff)/.test(name)) return 'state'
  if (/(brand|onboarding-accent|link|primary(?!-foreground)|accent)/.test(name)) return 'brand'
  if (/(label|text|foreground|icon|caption|shimmer|placeholder|tooltip-key)/.test(name)) return 'ink'
  if (/(border|stroke|hairline|divider|scrollbar|mask|skeleton)/.test(name)) return 'line'
  return 'surface'
}

/** Re-express one colour in the drawing's axes. */
export function retintColor(value: string, spec: ThemeSpec, role: Role): string | null {
  const resolved = resolveValue(value)
  const parsed = parseRgba(resolved)
  if (!parsed) return null
  const { l, c, a } = parsed
  const boost = 0.7 + clamp(spec.stateBoost ?? 0.55, 0, 1) * 0.6
  switch (role) {
    case 'brand':
      return format({ l, c: clamp(Math.max(c, spec.c1), 0, 0.37), h: spec.th, a })
    case 'state':
      return format({ l, c: clamp(c * boost, 0, CHROMA_CAP.state), h: parsed.h, a })
    case 'ink':
      return format({ l, c: clamp(Math.min(c, 0.03) + 0.002, 0, CHROMA_CAP.text), h: spec.ths, a })
    case 'line':
      return format({ l, c: clamp(Math.min(c, 0.02), 0, CHROMA_CAP.border), h: spec.ths, a })
    default:
      return format({ l, c: clamp(Math.min(c, 0.03) + (spec.sc ?? 0.008) * 0.5, 0, CHROMA_CAP.surface), h: spec.ths, a })
  }
}

interface ThemeDefinitionLike {
  id?: string
  colorScheme?: string
  tokens?: Record<string, string>
}

/** Read the built-in light/dark token tables from the theme service. */
export function baseTokenTables(theme: ThemeService | undefined): { light: Record<string, string>; dark: Record<string, string> } {
  const empty = { light: {}, dark: {} }
  const snapshot = (theme as unknown as { getTheme?: () => { themes?: ThemeDefinitionLike[] } } | undefined)?.getTheme?.()
  const themes = Array.isArray(snapshot?.themes) ? snapshot?.themes ?? [] : []
  const pick = (scheme: ThemeMode): Record<string, string> => {
    const found = themes.find((entry) => entry.colorScheme === scheme)
    return found?.tokens ?? {}
  }
  return { light: pick('light'), dark: pick('dark') }
}

/**
 * Build overrides for every token the shell knows about.
 *
 * Tokens missing from one scheme are copied from the other after retinting, so
 * a mode switch never leaves a token behind at its built-in value.
 */
export function retintAll(theme: ThemeService | undefined, spec: ThemeSpec): TokenOverrides {
  const tables = baseTokenTables(theme)
  const names = new Set([...Object.keys(tables.light), ...Object.keys(tables.dark)])
  if (names.size === 0) return {}
  const other = switchMode(spec, spec.mode === 'light' ? 'dark' : 'light')
  const overrides: TokenOverrides = {}
  for (const name of names) {
    const role = roleOf(name)
    const lightBase = tables.light[name] ?? tables.dark[name]
    const darkBase = tables.dark[name] ?? tables.light[name]
    const light = (lightBase && retintColor(lightBase, { ...spec, mode: 'light', ...axesFor(spec, 'light') }, role)) || lightBase
    const dark = (darkBase && retintColor(darkBase, { ...other, mode: 'dark', ...axesFor(other, 'dark') }, role)) || darkBase
    if (typeof light === 'string' && typeof dark === 'string') overrides[name] = { light, dark }
  }
  return overrides
}

/** Keep only the axes that matter for retinting, with the scheme's defaults. */
function axesFor(spec: ThemeSpec, mode: ThemeMode): Partial<ThemeSpec> {
  const base = switchMode(spec, mode)
  return { th: base.th, th2: base.th2, ths: base.ths, c1: base.c1, c2: base.c2, sc: base.sc, stateBoost: base.stateBoost }
}

/**
 * The override map to hand the theme service: every shell token re-tinted, with
 * the twenty-odd tokens this design owns pinned to their exact values.
 */
export function fullOverrides(theme: ThemeService | undefined, spec: ThemeSpec): TokenOverrides {
  return { ...retintAll(theme, spec), ...generateTokens(spec) }
}
