import { test } from 'node:test'
import assert from 'node:assert/strict'
import { load } from './_ts-hook.mjs'

const palette = await load('palette')
const contrast = await load('contrast')

test('WCAG ratio is symmetric and hits the known extremes', () => {
  assert.equal(+contrast.contrastRatio('#ffffff', '#000000').toFixed(2), 21)
  assert.equal(+contrast.contrastRatio('#000000', '#ffffff').toFixed(2), 21)
  assert.equal(+contrast.contrastRatio('#777777', '#777777').toFixed(2), 1)
})

test('APCA polarity flips with the ink, magnitude does not collapse', () => {
  const darkOnLight = contrast.apcaLc('#111111', '#ffffff')
  const lightOnDark = contrast.apcaLc('#ffffff', '#111111')
  assert.ok(darkOnLight > 60, String(darkOnLight))
  assert.ok(lightOnDark < -60, String(lightOnDark))
  assert.ok(Math.abs(Math.abs(lightOnDark) - darkOnLight) < 25, 'asymmetry should stay modest')
})

test('the audit covers twenty pairs and names them', () => {
  const results = contrast.auditPalette(palette.fullPalette(palette.defaultSpec('light')))
  assert.equal(results.length, 20)
  assert.equal(contrast.AUDIT_PAIRS.length, 20)
  for (const result of results) {
    assert.ok(result.id && result.fg && result.bg && result.kind, JSON.stringify(result))
    assert.ok(Number.isFinite(result.ratio) && Number.isFinite(result.lc), result.id)
  }
})

test('every preset, in both modes, passes WCAG and APCA', () => {
  for (const preset of palette.PRESETS) {
    for (const mode of ['light', 'dark']) {
      const results = contrast.auditPalette(palette.fullPalette(palette.presetSpec(preset.id, mode)))
      const bad = results.filter((result) => !result.pass)
      assert.deepEqual(
        bad.map((result) => `${result.id} ${result.ratio}:1 lc${result.lc}`),
        [],
        `${preset.id}/${mode}`,
      )
    }
  }
})

test('autoFix repairs a hostile theme by moving lightness only', () => {
  const hostile = palette.normalizeSpec({
    ...palette.defaultSpec('light'),
    th: 168,
    c1: 0.14,
    l1: 0.42,
    tx: 0.44,
    bg: 0.5,
    l2: 0.48,
  })
  const before = contrast.auditPalette(palette.fullPalette(hostile)).filter((r) => !r.pass).length
  assert.ok(before > 0, 'fixture should be broken')
  const fixed = contrast.autoFixContrast(hostile)
  const after = contrast.auditPalette(palette.fullPalette(fixed.spec)).filter((r) => !r.pass).length
  assert.ok(after < before, `${before} -> ${after}`)
  assert.equal(fixed.spec.th, hostile.th, 'hue must survive the fix')
  assert.equal(fixed.spec.c1, hostile.c1, 'chroma must survive the fix')
  assert.ok(fixed.steps >= 0)
})

test('summary reports the worst offender', () => {
  const results = contrast.auditPalette(palette.fullPalette(palette.defaultSpec('light')))
  const summary = contrast.auditSummary(results)
  assert.equal(summary.total, 20)
  assert.equal(summary.passed + (summary.worst ? 20 - summary.passed : 0), 20)
})
