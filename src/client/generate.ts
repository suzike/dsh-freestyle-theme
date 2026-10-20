/**
 * Theme generation: from an image, or from a sentence.
 *
 * Both paths end in a `ThemeSpec`, and both run locally first. The AI path is
 * an upgrade, not a dependency: if the host has no model service the plugin
 * still produces four coherent candidates instead of an error.
 *
 * @module dsh-freestyle-theme/client/generate
 */

import {
  CHROMA_CAP,
  clamp,
  huesForHarmony,
  makeSpec,
  oklchToRgb,
  presetSpec,
  PRESETS,
  type HarmonyKey,
  type ThemeMode,
  type ThemeSpec,
} from './palette'
import { fetchGenerated } from './services'

interface Oklch {
  l: number
  c: number
  h: number
}

/** Convert sRGB (0…255) to OKLCH, via OKLab. */
export function rgbToOklch(r: number, g: number, b: number): Oklch {
  const lin = (channel: number): number => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
  }
  const lr = lin(r)
  const lg = lin(g)
  const lb = lin(b)
  const x = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const y = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const z = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  const l_ = Math.cbrt(x)
  const m_ = Math.cbrt(y)
  const s_ = Math.cbrt(z)
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  const c = Math.sqrt(A * A + B * B)
  let h = (Math.atan2(B, A) * 180) / Math.PI
  if (h < 0) h += 360
  return { l: L, c, h }
}

/** `hsl`-like tuple from a hex string, for quick arithmetic. */
function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? value.split('').map((ch) => ch + ch).join('') : value
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

/** A cluster of the image's colour distribution. */
export interface Swatch {
  hex: string
  oklch: Oklch
  weight: number
}

/**
 * K-means over OKLab, k = 5.
 *
 * OKLab is used rather than RGB because perceptual clustering is what makes the
 * extracted swatches feel like "the colours in this photo" instead of an
 * average of noise.
 */
export function quantise(pixels: Uint8ClampedArray, sampleStride = 17): Swatch[] {
  const points: Oklch[] = []
  for (let index = 0; index + 3 < pixels.length; index += 4 * sampleStride) {
    const alpha = pixels[index + 3]
    if (alpha < 128) continue
    points.push(rgbToOklch(pixels[index], pixels[index + 1], pixels[index + 2]))
  }
  if (points.length === 0) return []

  const k = Math.min(5, points.length)
  const centres: Oklch[] = []
  for (let index = 0; index < k; index++) {
    centres.push({ ...points[Math.floor(((index + 0.5) / k) * points.length)] })
  }

  for (let iteration = 0; iteration < 12; iteration++) {
    const buckets: Oklch[][] = Array.from({ length: k }, () => [])
    for (const point of points) {
      let best = 0
      let bestDistance = Infinity
      for (let index = 0; index < k; index++) {
        const centre = centres[index]
        // Hue is circular, so compare on the chroma plane with wrap-around.
        const dHue = Math.abs(
          Math.min(Math.abs(point.h - centre.h), 360 - Math.abs(point.h - centre.h)),
        )
        const distance =
          (point.l - centre.l) ** 2 +
          (point.c - centre.c) ** 2 +
          ((dHue / 180) * 0.35) ** 2
        if (distance < bestDistance) {
          bestDistance = distance
          best = index
        }
      }
      buckets[best].push(point)
    }
    for (let index = 0; index < k; index++) {
      const bucket = buckets[index]
      if (bucket.length === 0) continue
      let l = 0
      let c = 0
      let sinH = 0
      let cosH = 0
      for (const point of bucket) {
        l += point.l
        c += point.c
        sinH += Math.sin((point.h * Math.PI) / 180)
        cosH += Math.cos((point.h * Math.PI) / 180)
      }
      let h = (Math.atan2(sinH, cosH) * 180) / Math.PI
      if (h < 0) h += 360
      centres[index] = { l: l / bucket.length, c: c / bucket.length, h }
    }
  }

  // Final assignment pass: a swatch's weight is the share of pixels it owns,
  // which is what makes "dominant colour" mean something in the UI.
  const counts = new Array<number>(k).fill(0)
  for (const point of points) {
    let best = 0
    let bestDistance = Infinity
    for (let index = 0; index < k; index++) {
      const centre = centres[index]
      const dHue = Math.abs(
        Math.min(Math.abs(point.h - centre.h), 360 - Math.abs(point.h - centre.h)),
      )
      const distance =
        (point.l - centre.l) ** 2 +
        (point.c - centre.c) ** 2 +
        ((dHue / 180) * 0.35) ** 2
      if (distance < bestDistance) {
        bestDistance = distance
        best = index
      }
    }
    counts[best] += 1
  }

  return centres
    .map((centre, index) => ({
      hex: rgbToHex(...oklchToRgb(centre.l, centre.c, centre.h)),
      oklch: centre,
      weight: points.length === 0 ? 0 : counts[index] / points.length,
    }))
    // Empty clusters are an artefact of k-means with too few samples to fill
    // k buckets: they carry no colour and must not reach the UI.
    .filter((swatch) => Number.isFinite(swatch.oklch.h) && swatch.weight > 0)
    .sort((a, b) => b.weight - a.weight)
}

function rgbToHex(r: number, g: number, b: number): string {
  const part = (value: number): string => value.toString(16).padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

/** Decode a file into a small canvas and read its pixels. */
async function readPixels(file: File, size = 96): Promise<Uint8ClampedArray> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('canvas unavailable')
  // Cover-fit so we sample the subject, not letterboxing.
  const scale = Math.max(size / bitmap.width, size / bitmap.height)
  const drawWidth = bitmap.width * scale
  const drawHeight = bitmap.height * scale
  context.drawImage(bitmap, (size - drawWidth) / 2, (size - drawHeight) / 2, drawWidth, drawHeight)
  bitmap.close()
  return context.getImageData(0, 0, size, size).data
}

/**
 * Build a spec out of extracted swatches.
 *
 * The most saturated swatch becomes the brand hue; the darkest and lightest
 * decide which mode the image "wants"; the rest seed secondary, surface tint
 * and the neutral temperature.
 */
export function specFromSwatches(swatches: Swatch[], mode?: ThemeMode): ThemeSpec {
  if (swatches.length === 0) return makeSpec(210, mode ?? 'light')

  const sortedByChroma = [...swatches].sort((a, b) => b.oklch.c - a.oklch.c)
  const brand = sortedByChroma[0]
  const second = sortedByChroma[1] ?? brand
  const lums = swatches.map((swatch) => swatch.oklch.l)
  const meanL = lums.reduce((sum, value) => sum + value, 0) / lums.length
  const chosenMode: ThemeMode = mode ?? (meanL < 0.45 ? 'dark' : 'light')

  const harmony: HarmonyKey =
    Math.abs(brand.oklch.h - second.oklch.h) < 40
      ? 'analogous'
      : Math.abs(brand.oklch.h - second.oklch.h) > 140
        ? 'complementary'
        : 'split'
  const { th2, ths } = huesForHarmony(brand.oklch.h, harmony)

  return makeSpec(brand.oklch.h, chosenMode, {
    c1: clamp(brand.oklch.c * 1.15, 0.03, 0.37),
    c2: clamp(second.oklch.c, 0.02, 0.2),
    th2,
    ths,
    sc: clamp(second.oklch.c * 0.1, 0, CHROMA_CAP.surface),
    neutralTint: clamp(0.18 + meanL * 0.5, 0.1, 0.85),
    spread: clamp(0.07 + (1 - meanL) * 0.12, 0.05, 0.18),
    l2: clamp(second.oklch.l, 0.24, 0.86),
    bg: chosenMode === 'light' ? clamp(0.93 + meanL * 0.06, 0.9, 0.985) : clamp(0.1 + meanL * 0.12, 0.06, 0.26),
    tx: chosenMode === 'light' ? 0.14 : 0.955,
    stateBoost: 0.55,
  })
}

/** Extract a theme from an image file. */
export async function themeFromImage(file: File, mode?: ThemeMode): Promise<{ spec: ThemeSpec; swatches: Swatch[]; preview: string }> {
  const pixels = await readPixels(file)
  const swatches = quantise(pixels)
  const spec = specFromSwatches(swatches, mode)
  return { spec, swatches, preview: URL.createObjectURL(file) }
}

/* ── prompt → candidates ─────────────────────────────────────────────────── */

interface Mood {
  hue: number
  chroma: number
  mode: ThemeMode
  spread: number
  tint: number
  keys: string[]
}

/**
 * A tiny mood lexicon. It is deliberately bilingual and deterministic: the same
 * sentence always yields the same candidates, so users can iterate on wording
 * and see what changed.
 */
const MOODS: Mood[] = [
  { hue: 220, chroma: 0.11, mode: 'dark', spread: 0.14, tint: 0.45, keys: ['深海', '海', '蓝', '冷静', '精密', 'deep', 'sea', 'blue', 'calm', 'precise', 'ocean'] },
  { hue: 205, chroma: 0.08, mode: 'light', spread: 0.09, tint: 0.3, keys: ['天青', '清晨', '干净', 'clear', 'sky', 'morning', 'clean', 'fresh'] },
  { hue: 152, chroma: 0.09, mode: 'dark', spread: 0.12, tint: 0.4, keys: ['森林', '苔', '绿', '自然', 'forest', 'moss', 'green', 'nature', 'organic'] },
  { hue: 168, chroma: 0.075, mode: 'light', spread: 0.1, tint: 0.3, keys: ['薄荷', '雾', '青', 'mint', 'mist', 'teal', 'quiet', '安静'] },
  { hue: 36, chroma: 0.14, mode: 'light', spread: 0.1, tint: 0.6, keys: ['暖', '日落', '橙', '金', 'warm', 'sunset', 'orange', 'gold', 'amber', 'honey'] },
  { hue: 350, chroma: 0.1, mode: 'light', spread: 0.09, tint: 0.45, keys: ['樱', '粉', '柔', 'pink', 'sakura', 'blossom', 'soft', 'gentle'] },
  { hue: 292, chroma: 0.1, mode: 'dark', spread: 0.14, tint: 0.4, keys: ['紫', '暮', '夜', '神秘', 'purple', 'violet', 'twilight', 'dusk', 'night', 'mystic'] },
  { hue: 8, chroma: 0.15, mode: 'dark', spread: 0.11, tint: 0.55, keys: ['红', '熔', '烈', 'red', 'lava', 'bold', '火'] },
  { hue: 258, chroma: 0.16, mode: 'light', spread: 0.1, tint: 0.35, keys: ['钴', '宝蓝', '科技', 'cobalt', 'tech', 'electric', 'deep blue'] },
  { hue: 72, chroma: 0.08, mode: 'light', spread: 0.09, tint: 0.65, keys: ['沙', '米', '纸', 'vintage', 'sand', 'paper', 'beige', 'film', '胶片'] },
  { hue: 312, chroma: 0.13, mode: 'dark', spread: 0.12, tint: 0.5, keys: ['赛博', '霓虹', 'cyber', 'neon', 'punk', 'glow'] },
]

/** Match a sentence against the mood lexicon. */
export function moodFor(prompt: string): Mood {
  const text = prompt.toLowerCase()
  let best: Mood | null = null
  let bestScore = 0
  for (const mood of MOODS) {
    let score = 0
    for (const key of mood.keys) {
      if (text.includes(key.toLowerCase())) score += key.length
    }
    if (score > bestScore) {
      bestScore = score
      best = mood
    }
  }
  return (
    best ?? {
      hue: 210,
      chroma: 0.1,
      mode: 'light',
      spread: 0.1,
      tint: 0.35,
      keys: [],
    }
  )
}

/** Four distinct candidates for a mood. */
export function localCandidates(prompt: string, mode?: ThemeMode): ThemeSpec[] {
  const mood = moodFor(prompt)
  const base = mode ?? mood.mode
  const other: ThemeMode = base === 'light' ? 'dark' : 'light'
  const variations: Array<{ harmony: HarmonyKey; chroma: number; tint: number; spread: number; offset: number }> = [
    { harmony: 'analogous', chroma: mood.chroma, tint: mood.tint, spread: mood.spread, offset: 0 },
    { harmony: 'split', chroma: mood.chroma * 0.85, tint: mood.tint * 0.7, spread: mood.spread * 1.15, offset: -12 },
    { harmony: 'complementary', chroma: mood.chroma * 1.05, tint: mood.tint * 1.2, spread: mood.spread * 0.85, offset: 8 },
    { harmony: 'triadic', chroma: mood.chroma * 0.7, tint: mood.tint * 0.5, spread: mood.spread * 1.3, offset: 18 },
  ]
  return variations.map((variation, index) => {
    const { th2, ths } = huesForHarmony(mood.hue + variation.offset, variation.harmony)
    return makeSpec(mood.hue + variation.offset, index === 3 ? other : base, {
      th2,
      ths,
      c1: clamp(variation.chroma, 0.03, 0.3),
      c2: clamp(variation.chroma * 0.55, 0.015, 0.12),
      neutralTint: clamp(variation.tint, 0.08, 0.9),
      spread: clamp(variation.spread, 0.05, 0.19),
    })
  })
}

/** Preset-derived candidates, used as "surprise me". */
export function presetCandidates(count = 4): ThemeSpec[] {
  const pool = [...PRESETS]
  const out: ThemeSpec[] = []
  for (let index = 0; index < count && pool.length > 0; index++) {
    const pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]
    out.push(presetSpec(pick, index % 2 === 0 ? 'light' : 'dark'))
  }
  return out
}

/**
 * AI candidates, falling back to the local engine.
 *
 * The host route returns the same shape as `ThemeSpec` patches, which are run
 * through `normalize` by the caller so a hallucinated field cannot corrupt the
 * editor.
 */
export async function aiCandidates(
  prompt: string,
  count: number,
): Promise<{ specs: ThemeSpec[]; source: 'ai' | 'local' }> {
  const raw = await fetchGenerated(prompt, count)
  if (!raw || raw.length === 0) return { specs: localCandidates(prompt), source: 'local' }
  const specs: ThemeSpec[] = []
  for (const [index, candidate] of raw.entries()) {
    const mode = (candidate.mode === 'dark' ? 'dark' : 'light') as ThemeMode
    const hue = typeof candidate.th === 'number' ? candidate.th : moodFor(prompt).hue
    specs.push(
      makeSpec(hue, index % 2 === 1 && mode === 'light' ? 'light' : mode, {
        th2: typeof candidate.th2 === 'number' ? candidate.th2 : huesForHarmony(hue, 'analogous').th2,
        ths: typeof candidate.ths === 'number' ? candidate.ths : hue,
        c1: typeof candidate.c1 === 'number' ? clamp(candidate.c1, 0.02, 0.37) : 0.1,
        c2: typeof candidate.c2 === 'number' ? clamp(candidate.c2, 0.01, 0.2) : 0.06,
        neutralTint: typeof candidate.neutralTint === 'number' ? clamp(candidate.neutralTint, 0.05, 0.95) : 0.35,
        spread: typeof candidate.spread === 'number' ? clamp(candidate.spread, 0.04, 0.2) : 0.1,
        stateBoost: typeof candidate.stateBoost === 'number' ? clamp(candidate.stateBoost, 0.2, 1.2) : 0.55,
      }),
    )
  }
  return { specs, source: 'ai' }
}

/** Sample a colour for a swatch chip, safe for undefined tokens. */
export function swatchOf(palette: Record<string, string>, token: string, fallback: string): string {
  return palette[token] ?? fallback
}

/** Read a hex colour back into OKLCH, for the inspector. */
export function hexToOklch(hex: string): Oklch {
  return rgbToOklch(...hexToRgb(hex))
}
