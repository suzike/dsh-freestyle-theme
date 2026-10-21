import { test } from 'node:test'
import assert from 'node:assert/strict'
import { load } from './_ts-hook.mjs'

const { CSS } = await load('styles')

/** Every flat `selector { body }` pair in the sheet. */
const RULES = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
  selector: m[1].trim().replace(/\s+/g, ' '),
  body: m[2],
}))

const all = (selector) => RULES.filter((r) => r.selector === selector)
const one = (selector) => {
  const hits = all(selector)
  assert.equal(hits.length, 1, `expected one ${selector} rule, found ${hits.length}`)
  return hits[0].body
}

const px = (body, prop) => {
  const m = body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(-?[\\d.]+)px`))
  return m ? Number(m[1]) : null
}

test('the preview switch is defined once, so later rules cannot contradict it', () => {
  // 0.6.3 shipped three competing `.ft-pv-toggle` blocks: the base one painted
  // the track with the brand colour, the knob was anchored to the *right*, and
  // an "on" override then pushed it a further 11px right — off the 30px track.
  // Redefining one control in three places is what let that survive review.
  one('.ft-pv-toggle')
  one('.ft-pv-toggle::after')
  one(".ft-pv-toggle[data-on='true']")
})

test('the switch knob travels inside its own track', () => {
  const base = one('.ft-pv-toggle')
  const knob = one('.ft-pv-toggle::after')
  const onKnob = one(".ft-pv-toggle[data-on='true']::after")

  const trackW = px(base, 'width')
  const knobW = px(knob, 'width')
  const inset = px(knob, 'left')
  const shift = Number((onKnob.match(/translateX\((-?\d+(?:\.\d+)?)px\)/) || [])[1] ?? NaN)

  assert.ok(trackW > 0, 'the track needs a fixed width')
  assert.ok(knobW > 0 && inset !== null, 'the knob needs a fixed size and a left inset')
  assert.ok(Number.isFinite(shift) && shift > 0, 'the on state must translate the knob rightwards')

  const end = inset + knobW + shift
  assert.ok(end <= trackW - inset, `knob ends at ${end}px, outside the ${trackW}px track`)
})

test('the resting state cannot be mistaken for the on state', () => {
  const base = one('.ft-pv-toggle')
  const onRule = one(".ft-pv-toggle[data-on='true']")
  assert.match(onRule, /--dsw-alias-brand-primary/, 'the on state paints the track with the brand token')
  assert.ok(!/--dsw-alias-brand-primary/.test(base), 'the resting state must not already look switched on')
})
