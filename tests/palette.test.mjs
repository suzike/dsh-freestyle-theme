import { test } from 'node:test'
import assert from 'node:assert/strict'
import { load } from './_ts-hook.mjs'

const palette = await load('palette')

test('119 tokens, every one with a light and dark value', () => {
  const tokens = palette.generateTokens(palette.defaultSpec('light'))
  assert.equal(Object.keys(tokens).length, 119)
  for (const [name, pair] of Object.entries(tokens)) {
    assert.match(name, /^--dsw-/, name)
    assert.equal(typeof pair.light, 'string', name)
    assert.equal(typeof pair.dark, 'string', name)
    assert.ok(pair.light.length > 0 && pair.dark.length > 0, name)
  }
})

test('fullPalette resolves all 119 names to usable CSS values', () => {
  const resolved = palette.fullPalette(palette.defaultSpec('dark'))
  assert.equal(Object.keys(resolved).length, 119)
  for (const [name, value] of Object.entries(resolved)) {
    assert.match(value, /^(#|rgb|hsl|oklch|color-mix)/, `${name} = ${value}`)
  }
})

test('each mode has three distinguishable surface levels, never pure black', () => {
  const light = palette.fullPalette(palette.defaultSpec('light'))
  const dark = palette.fullPalette(palette.defaultSpec('dark'))
  const l = (paletteMap, token) => paletteMap[token]
  // Light: cards are the brightest surface and the layers below them step down
  // very slightly; the point is that they do not collapse into one tone.
  assert.equal(new Set(['--dsw-alias-bg-layer-1', '--dsw-alias-bg-layer-2', '--dsw-alias-bg-layer-3'].map((token) => l(light, token))).size, 3)
  assert.equal(new Set(['--dsw-alias-bg-layer-1', '--dsw-alias-bg-layer-2', '--dsw-alias-bg-layer-3'].map((token) => l(dark, token))).size, 3)
  for (const token of ['--dsw-alias-bg-base', '--dsw-alias-bg-layer-1', '--dsw-alias-bg-layer-3']) {
    const rgb = palette.parseColor(dark[token])
    assert.ok(rgb && rgb[0] > 0, `${token} must not be pure black`)
  }
})

test('twelve presets, each distinct in hue or posture', () => {
  assert.equal(palette.PRESETS.length, 12)
  const seen = new Set()
  for (const preset of palette.PRESETS) {
    assert.ok(preset.id, 'preset needs an id')
    const spec = palette.presetSpec(preset.id, 'light')
    const key = [Math.round(spec.th), spec.l1, spec.bg, spec.stateBoost].join('/')
    assert.ok(!seen.has(key), `preset ${preset.id} duplicates another preset`)
    seen.add(key)
  }
})

test('harmony returns two usable, distinct hues', () => {
  for (const harmony of palette.HARMONIES) {
    const { th2, ths } = palette.huesForHarmony(168, harmony)
    for (const hue of [th2, ths]) {
      assert.ok(Number.isFinite(hue) && hue >= 0 && hue < 360, `${harmony} produced ${hue}`)
    }
    assert.notEqual(Math.round(th2), Math.round(ths), `${harmony} produced equal secondary hues`)
  }
})

test('share codes round-trip losslessly for every preset', () => {
  for (const preset of palette.PRESETS) {
    for (const mode of ['light', 'dark']) {
      const spec = palette.presetSpec(preset.id, mode)
      const code = palette.encodeShare(spec, 'demo')
      const decoded = palette.decodeShare(`https://example.com/#theme=${code}`)
      assert.ok(decoded, `${preset.id}/${mode} failed to decode`)
      assert.equal(decoded.name, 'demo')
      const a = palette.normalizeSpec(decoded.spec)
      const b = palette.normalizeSpec(spec)
      assert.deepEqual(a, b, `${preset.id}/${mode} lost information`)
    }
  }
})

test('garbage never becomes a theme', () => {
  for (const input of ['', '   ', 'not base64', 'e30', 'eyJ2Ijo5OSwiaCI6Im5hbiJ9']) {
    const decoded = palette.decodeShare(input)
    if (decoded) {
      const spec = palette.normalizeSpec(decoded.spec)
      assert.ok(Number.isFinite(spec.th) && Number.isFinite(spec.l1), `accepted ${JSON.stringify(input)}`)
    }
  }
})

test('normalizeSpec clamps hostile input', () => {
  const spec = palette.normalizeSpec({
    th: 720,
    th2: -90,
    l1: 9,
    c1: 99,
    bg: -4,
    tx: 42,
    radius: 99,
    shadow: -3,
    fontScale: 100,
    mode: 'neon',
  })
  assert.ok(spec.th >= 0 && spec.th < 360, String(spec.th))
  assert.ok(spec.l1 >= 0 && spec.l1 <= 1, String(spec.l1))
  assert.ok(spec.c1 <= palette.CHROMA_CAP.brand, String(spec.c1))
  assert.ok(spec.bg >= 0 && spec.bg <= 1, String(spec.bg))
  assert.ok(spec.radius <= 2, String(spec.radius))
  assert.ok(spec.shadow >= 0, String(spec.shadow))
  assert.ok(spec.fontScale <= 1.15, String(spec.fontScale))
  assert.equal(spec.mode, 'light')
})

test('CSS export carries both modes and the look axes', () => {
  const css = palette.exportCss(palette.defaultSpec('light'), { ...palette.defaultSpec('light'), mode: 'dark' })
  assert.match(css, /:root \{/)
  assert.match(css, /\[data-dsh-theme="dark"\] \{/)
  assert.ok((css.match(/--dsw-/g) || []).length >= 238)
  for (const token of ['--ft-font-sans', '--ft-radius-lg', '--ft-shadow-sm']) {
    assert.ok(css.includes(token), `missing ${token}`)
  }
})
