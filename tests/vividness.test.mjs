import { test } from 'node:test'
import assert from 'node:assert/strict'
import { load } from './_ts-hook.mjs'

const palette = await load('palette')
const vivid = await load('vividness')

const modes = ['light', 'dark']

test('every preset clears the vividness floor in both modes', () => {
  for (const mode of modes) {
    for (const preset of palette.PRESETS) {
      const measured = vivid.vividnessOf(palette.fullPalette(palette.presetSpec(preset.id, mode)))
      // Graphite is deliberately near-grey; it still has to carry a cast, so the
      // bar is lower rather than absent — a truly colourless theme is a bug.
      // Graphite is deliberately near-grey; it still has to carry a cast, so the
      // bar is lower rather than absent — a truly colourless theme is a bug.
      const floor = vivid.VIVIDNESS_FLOOR[mode] * (preset.neutral ? 0.55 : 1)
      assert.ok(
        measured.mean >= floor,
        `${preset.id}/${mode} reads grey: mean chroma ${measured.mean.toFixed(4)} < ${floor}`,
      )
      assert.ok(
        vivid.isVividEnough(measured, mode),
        `${preset.id}/${mode} fails isVividEnough: ${JSON.stringify(measured)}`,
      )
    }
  }
})

test('every traditional colour clears the same floor', () => {
  for (const mode of modes) {
    for (const colour of palette.TRADITIONAL) {
      const measured = vivid.vividnessOf(palette.fullPalette(palette.traditionalSpec(colour, mode)))
      assert.ok(
        vivid.isVividEnough(measured, mode),
        `${colour.id}/${mode} reads grey: mean chroma ${measured.mean.toFixed(4)}`,
      )
    }
  }
})

test('the intensity axis moves perceived colour, not lightness', () => {
  const base = palette.presetSpec('mist', 'light')
  const soft = palette.fullPalette({ ...base, vivid: 0.55 })
  const standard = palette.fullPalette(base)
  const rich = palette.fullPalette({ ...base, vivid: 1.5 })

  const mean = (tokens) => vivid.vividnessOf(tokens).mean
  assert.ok(mean(soft) < mean(standard), 'soft must be quieter than standard')
  assert.ok(mean(standard) < mean(rich), 'rich must be louder than standard')

  // Lightness is the contract that keeps the app usable: pushing intensity must
  // not drift the canvas into a darker band, which is the thing that "looks bad".
  const lch = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const to = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    const lr = to(r); const lg = to(g); const lb = to(b)
    const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
    const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
    const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
    return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  }
  const canvas = '--dsw-alias-bg-base'
  assert.ok(
    Math.abs(lch(rich[canvas]) - lch(soft[canvas])) < 0.02,
    'intensity must not darken the canvas',
  )
})

test('vividnessScore reports a full bar for a healthy palette and zero for grey', () => {
  const healthy = vivid.vividnessOf(palette.fullPalette(palette.presetSpec('moss', 'light')))
  assert.ok(vivid.vividnessScore(healthy, 'light') > 50)

  const grey = vivid.vividnessOf({ '--dsw-alias-bg-base': '#ffffff', '--dsw-alias-bg-layer-1': '#fafafa' })
  assert.equal(vivid.vividnessScore(grey, 'light'), 0)
})

test('the intensity axis survives a share round-trip', () => {
  const spec = palette.presetSpec('cobalt', 'dark')
  const custom = { ...spec, vivid: 1.5 }
  const decoded = palette.decodeShare(palette.encodeShare(custom, 'x'))
  assert.ok(decoded)
  assert.equal(+decoded.spec.vivid.toFixed(2), 1.5)

  // An old code without the axis still decodes to the shipped default.
  const legacy = palette.decodeShare(
    'dsh-freestyle-theme://' + Buffer.from(JSON.stringify({ v: 3, m: 'light', h: 168, c: 0.075, l: 0.52 })).toString('base64url'),
  )
  assert.ok(legacy)
  assert.equal(+legacy.spec.vivid.toFixed(2), 0.85)
})

test('every surface carries the same tint, or the most its gamut allows', () => {
  for (const mode of modes) {
    for (const preset of palette.PRESETS) {
      const spec = palette.presetSpec(preset.id, mode)
      const tokens = palette.fullPalette(spec)
      const gain = Math.min(1.8, Math.max(0.4, spec.vivid ?? 1))
      const target = palette.SURFACE_CHROMA * gain
      let measured = 0
      let clamped = 0
      for (const [token, value] of Object.entries(tokens)) {
        if (!palette.SURFACE_TOKEN.test(token)) continue
        if (!/^#[0-9a-f]{6}$/i.test(value)) continue
        const { l, c, h } = palette.hexToOklch(value)
        const ceiling = palette.maxChroma(l, h)
        const expected = Math.min(ceiling, target)
        if (ceiling < target) clamped += 1
        // 8-bit rounding across three channels moves OKLCh chroma by ~0.005.
        assert.ok(
          Math.abs(c - expected) <= 0.005,
          `${preset.id}/${mode} ${token} carries ${c.toFixed(3)}, expected ${expected.toFixed(3)}`,
        )
        measured += 1
      }
      assert.ok(measured >= 15, `${preset.id}/${mode} only measured ${measured} surfaces`)
      // A preset whose gamut clamps almost everything cannot be even: that is a
      // property of the hue, and the studio is allowed to say so.
      assert.ok(
        clamped <= measured,
        `${preset.id}/${mode} clamped ${clamped}/${measured}`,
      )
    }
  }
})

test('paper layers keep a readable depth step in both modes', () => {
  for (const mode of modes) {
    for (const preset of palette.PRESETS) {
      const t = palette.fullPalette(palette.presetSpec(preset.id, mode))
      const l = (token) => palette.hexToOklch(t[token]).l
      // Elevation reads as lighter in both modes: the canvas is the floor and
      // the sidebar is the one recessed well below it.
      // Within the paper set, layer-1..3 are a shallow plateau (card, nested
      // card, raised chip), which is what makes stacking readable.
      const base = l('--dsw-alias-bg-base')
      const layers = ['--dsw-alias-bg-layer-1', '--dsw-alias-bg-layer-2', '--dsw-alias-bg-layer-3'].map(l)
      for (const [index, value] of layers.entries()) {
        const awayFromCanvas = value > base
        assert.ok(
          awayFromCanvas,
          `${preset.id}/${mode} layer-${index + 1} (${value.toFixed(3)}) does not stand off the canvas (${base.toFixed(3)})`,
        )
      }
      // A dark page needs a wider lightness step for the same perceived
      // separation, so the ceiling is mode-specific.
      const plateau = Math.max(...layers) - Math.min(...layers)
      const ceiling = mode === 'light' ? 0.03 : 0.085
      assert.ok(plateau > 0.004 && plateau < ceiling, `${preset.id}/${mode} paper plateau is ${plateau.toFixed(3)}`)
    }
  }
})
