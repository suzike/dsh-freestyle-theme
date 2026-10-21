import assert from 'node:assert/strict'
import test from 'node:test'
import { load } from './_ts-hook.mjs'

const palette = await load('palette')
const retint = await load('retint')

/** A base table with names this design does NOT own, as the shell really has. */
const foreign = {
  light: {
    '--dsw-alias-chart-series-a': '#387761',
    '--dsw-alias-chart-series-b': 'rgba(56, 119, 97, 0.35)',
    '--dsw-alias-code-diff-added': '#0f7a3d14',
    '--dsw-alias-label-dimmed': '#5b615c',
    '--dsw-alias-border-l5': '#dfe3df',
    '--dsw-specific-login-input': '#ffffff',
    '--dsw-alias-state-warn-primary': '#b47200',
    '--dsw-alias-brand-primary': '#387761',
  },
  dark: {
    '--dsw-alias-chart-series-a': '#72ccab',
    '--dsw-alias-chart-series-b': 'rgba(114, 204, 171, 0.35)',
    '--dsw-alias-code-diff-added': '#6ff0b414',
    '--dsw-alias-label-dimmed': '#a8aea9',
    '--dsw-alias-border-l5': '#2a2d2a',
    '--dsw-specific-login-input': '#1b1e1b',
    '--dsw-alias-state-warn-primary': '#ffd166',
    '--dsw-alias-brand-primary': '#72ccab',
  },
}

const theme = { getTheme: () => ({ themes: [{ id: 'light', colorScheme: 'light', tokens: foreign.light }, { id: 'dark', colorScheme: 'dark', tokens: foreign.dark }] }) }

test('retint colours every foreign token, both modes', () => {
  const spec = palette.makeSpec(210, 'light', { c1: 0.12 })
  const overrides = retint.retintAll(theme, spec)
  assert.equal(Object.keys(overrides).length, Object.keys(foreign.light).length)
  for (const name of Object.keys(foreign.light)) {
    assert.ok(overrides[name]?.light, `${name} light missing`)
    assert.ok(overrides[name]?.dark, `${name} dark missing`)
  }
})

test('brand tokens take the drawing hue, states keep theirs', () => {
  const spec = palette.makeSpec(210, 'light')
  const overrides = retint.retintAll(theme, spec)
  const brand = overrides['--dsw-alias-brand-primary'].light
  assert.match(brand, /^oklch\(/)
  assert.ok(Math.abs(Number(/([\d.]+)\s*\)$/.exec(brand)?.[1]) - 210) < 0.6, brand)
  const warn = overrides['--dsw-alias-state-warn-primary'].light
  const warnHue = Number(/([\d.]+)\s*\)$/.exec(warn)?.[1])
  assert.ok(Math.abs(warnHue - 70) < 45, `state hue drifted: ${warn}`)
})

test('alpha survives the retint', () => {
  const spec = palette.makeSpec(210, 'light')
  const overrides = retint.retintAll(theme, spec)
  assert.match(overrides['--dsw-alias-code-diff-added'].light, /\/ 0\.07/)
})

test('fullOverrides is a superset of the design palette', () => {
  const spec = palette.defaultSpec('light')
  const own = palette.generateTokens(spec)
  const all = retint.fullOverrides(theme, spec)
  for (const name of Object.keys(own)) assert.deepEqual(all[name], own[name])
  assert.ok(Object.keys(all).length >= Object.keys(own).length)
})

test('missing service degrades to the design palette', () => {
  const spec = palette.defaultSpec('light')
  assert.equal(Object.keys(retint.fullOverrides(undefined, spec)).length, Object.keys(palette.generateTokens(spec)).length)
})
