/**
 * How coloured does a palette actually look?
 *
 * The complaint this module answers is real and specific: pick a traditional
 * Chinese colour, apply it, and the app still reads grey. The cause is not the
 * picker — it is that near-white surfaces have almost no chroma room, and the
 * old caps asked for a fraction of what sRGB could give. Tinting "as much as the
 * gamut allows" is what makes a palette read; measuring it is what stops us
 * shipping another washed-out build.
 *
 * The measure is the mean OKLab chroma of the large surfaces (the ones the eye
 * spends its time on), which tracks perceived colourfulness far better than the
 * accent's chroma: one vivid button does not make a theme look tinted.
 *
 * @module dsh-freestyle-theme/client/vividness
 */

import { parseRgba } from './retint'

/** Tokens that cover most of the screen. Order is not significant. */
export const LARGE_SURFACES = [
  '--dsw-alias-bg-base',
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-alias-bg-layer-3',
  '--dsw-alias-bg-overlay',
  '--dsw-alias-bg-module-platform',
] as const

export interface Vividness {
  /** Mean chroma of the large surfaces, OKLab. */
  mean: number
  /** The least coloured large surface. */
  min: number
  /** The accent's chroma, for context only. */
  accent: number
  /** How many large surfaces were found and measured. */
  measured: number
}

/**
 * Floor below which a theme reads as grey, measured over the shipped presets.
 *
 * A light canvas can hold roughly 0.02–0.07 chroma before leaving sRGB; asking
 * for 0.014 already reads as paper rather than white, and the accents carry the
 * rest. Dark mode needs slightly more because a dark surface catches less light
 * per unit of chroma.
 */
export const VIVIDNESS_FLOOR = { light: 0.014, dark: 0.017 } as const

/** Measure the large-surface chroma of one token table. */
export function vividnessOf(tokens: Record<string, string>): Vividness {
  const values: number[] = []
  for (const name of LARGE_SURFACES) {
    const raw = tokens[name]
    if (!raw) continue
    const parsed = parseRgba(raw)
    if (parsed) values.push(parsed.c)
  }
  const accent = tokens['--dsw-alias-brand-primary']
  const accentC = accent ? parseRgba(accent)?.c ?? 0 : 0
  if (values.length === 0) return { mean: 0, min: 0, accent: accentC, measured: 0 }
  const sum = values.reduce((total, value) => total + value, 0)
  return {
    mean: sum / values.length,
    min: Math.min(...values),
    accent: accentC,
    measured: values.length,
  }
}

/** Whether a measured palette clears the floor for its mode. */
export function isVividEnough(vividness: Vividness, mode: 'light' | 'dark'): boolean {
  return vividness.measured > 0 && vividness.mean >= VIVIDNESS_FLOOR[mode]
}

/** Score at which a palette still reads grey; below it the studio warns. */
export const VIVIDNESS_FLOOR_SCORE = Math.round((1 / 2.2) * 100)

/** A 0–100 readout for the studio, so intensity is not guesswork. */
export function vividnessScore(vividness: Vividness, mode: 'light' | 'dark'): number {
  const floor = VIVIDNESS_FLOOR[mode]
  return Math.round(Math.min(1, vividness.mean / (floor * 2.2)) * 100)
}
