import { test } from 'node:test'
import assert from 'node:assert/strict'
import { load } from './_ts-hook.mjs'

const palette = await load('palette')
const generate = await load('generate')

/** Half pure red, half pure blue, fully opaque. */
function twoColourPixels(size = 128) {
  const pixels = new Uint8ClampedArray(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4
      const left = x < size / 2
      pixels[index] = left ? 230 : 20
      pixels[index + 1] = left ? 30 : 60
      pixels[index + 2] = left ? 40 : 220
      pixels[index + 3] = 255
    }
  }
  return pixels
}

test('OKLCH reference points land where they should', () => {
  const red = generate.rgbToOklch(255, 0, 0)
  assert.ok(Math.abs(red.h - 29) < 8, `red hue ${red.h}`)
  assert.ok(red.c > 0.2, `red chroma ${red.c}`)

  const black = generate.hexToOklch('#000000')
  assert.ok(black.l < 0.02, String(black.l))
  const white = generate.hexToOklch('#ffffff')
  assert.ok(white.l > 0.98, String(white.l))
})

test('quantise finds two clusters with honest weights', () => {
  const swatches = generate.quantise(twoColourPixels(), 1)
  assert.ok(swatches.length >= 2, `got ${swatches.length}`)
  const total = swatches.reduce((sum, swatch) => sum + swatch.weight, 0)
  assert.ok(Math.abs(total - 1) < 0.001, `weights sum to ${total}`)
  for (const swatch of swatches) {
    assert.match(swatch.hex, /^#[0-9a-f]{6}$/)
    assert.ok(swatch.weight > 0 && swatch.weight <= 1)
  }
  const hues = swatches.map((swatch) => swatch.oklch.h)
  assert.ok(hues.some((hue) => hue < 60 || hue > 340), `expected a warm/red cluster, got ${hues}`)
  assert.ok(hues.some((hue) => hue > 200 && hue < 300), `expected a blue/violet cluster, got ${hues}`)
})

test('quantise survives empty and transparent input', () => {
  assert.deepEqual(generate.quantise(new Uint8ClampedArray(0)), [])
  const transparent = new Uint8ClampedArray(64 * 4)
  assert.deepEqual(generate.quantise(transparent), [])
})

test('a spec built from an image is valid for both modes', () => {
  const swatches = generate.quantise(twoColourPixels(), 3)
  for (const mode of ['light', 'dark']) {
    const spec = generate.specFromSwatches(swatches, mode)
    assert.equal(spec.mode, mode)
    assert.ok(Number.isFinite(spec.th) && spec.th >= 0 && spec.th < 360)
    assert.ok(spec.c1 > 0 && spec.c1 <= palette.CHROMA_CAP.brand)
    assert.ok(spec.bg >= 0 && spec.bg <= 1)
    const resolved = palette.fullPalette(spec)
    assert.equal(Object.keys(resolved).length, 119)
  }
})

test('image mode follows the picture: dark image wants dark chrome', () => {
  const darkPixels = new Uint8ClampedArray(64 * 64 * 4)
  for (let index = 0; index < darkPixels.length; index += 4) {
    darkPixels[index] = 18
    darkPixels[index + 1] = 20
    darkPixels[index + 2] = 24
    darkPixels[index + 3] = 255
  }
  const spec = generate.specFromSwatches(generate.quantise(darkPixels, 1))
  assert.equal(spec.mode, 'dark')
})

test('text prompts degrade to local candidates offline', () => {
  const moods = ['温暖 日落 海滨', '冷静 极简 工业', 'asdkjqwe zxcv', '']
  for (const prompt of moods) {
    const mood = generate.moodFor(prompt)
    assert.ok(mood && typeof mood === 'object')
    const candidates = generate.localCandidates(prompt, 'light')
    assert.ok(candidates.length > 0, `no candidates for ${JSON.stringify(prompt)}`)
    for (const spec of candidates) {
      assert.ok(Number.isFinite(spec.th) && Number.isFinite(spec.bg), JSON.stringify(spec))
      assert.equal(Object.keys(palette.fullPalette(spec)).length, 119)
    }
  }
})

test('preset candidates are a fresh, duplicate-free batch', () => {
  for (let round = 0; round < 3; round++) {
    const batch = generate.presetCandidates(4).map((spec) => `${Math.round(spec.th)}/${spec.mode}`)
    assert.equal(batch.length, 4)
    assert.equal(new Set(batch).size, batch.length, batch.join(', '))
  }
})

test('swatchOf resolves a token and falls back safely', () => {
  const resolved = palette.fullPalette(palette.defaultSpec('light'))
  const value = generate.swatchOf(resolved, '--dsw-alias-brand-primary', '#123456')
  assert.notEqual(value, '')
  assert.equal(generate.swatchOf({}, '--dsw-alias-brand-primary', '#123456'), '#123456')
})
