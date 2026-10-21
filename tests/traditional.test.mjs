import test from 'node:test'
import assert from 'node:assert/strict'

import { load } from './_ts-hook.mjs'

const palette = await load('palette')
const locale = await load('locale')
const zh = locale.DICTIONARIES.zh
const en = locale.DICTIONARIES.en

test('traditional palette ships 32 named colours', () => {
  const list = palette.TRADITIONAL
  assert.equal(list.length, 32)
  const ids = new Set(list.map((c) => c.id))
  const hexes = new Set(list.map((c) => c.hex.toUpperCase()))
  assert.equal(ids.size, list.length, 'ids must be unique')
  assert.equal(hexes.size, list.length, 'hexes must be unique')
  for (const colour of list) {
    assert.match(colour.hex, /^#[0-9a-f]{6}$/i)
    assert.equal(typeof zh[`trad.${colour.id}`], 'string', `missing zh name for ${colour.id}`)
    assert.equal(typeof en[`trad.${colour.id}`], 'string', `missing en name for ${colour.id}`)
  }
})

test('every traditional colour derives a valid spec in both modes', () => {
  for (const colour of palette.TRADITIONAL) {
    for (const mode of ['light', 'dark']) {
      const spec = palette.traditionalSpec(colour, mode)
      const back = palette.normalizeSpec(JSON.parse(JSON.stringify(spec)))
      assert.equal(back.mode, mode)
      assert.ok(spec.th >= 0 && spec.th < 360, `${colour.id} hue out of range`)
      assert.ok(spec.c1 > 0, `${colour.id} lost all chroma`)
      assert.ok(spec.l1 > 0.2 && spec.l1 < 0.95, `${colour.id} lightness out of range`)
    }
  }
})

test('traditional hues survive a share-code round trip', () => {
  for (const colour of palette.TRADITIONAL.slice(0, 8)) {
    const spec = palette.traditionalSpec(colour, 'dark')
    const decoded = palette.decodeShare(palette.encodeShare(spec, zh[`trad.${colour.id}`]))
    assert.ok(decoded, `${colour.id} did not decode`)
    assert.ok(Math.abs(decoded.spec.th - spec.th) < 1.5, `${colour.id} hue drifted`)
    assert.ok(Math.abs(decoded.spec.c1 - spec.c1) < 0.01, `${colour.id} chroma drifted`)
    assert.equal(decoded.name, zh[`trad.${colour.id}`])
  }
})
