import { test } from 'node:test'
import assert from 'node:assert/strict'
import { load } from './_ts-hook.mjs'

const { CSS } = await load('styles')

/** Every flat `selector { body }` pair in the sheet, comments stripped. */
const BARE = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
const RULES = [...BARE.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
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

test('the desktop window strip is left to the shell instead of being covered', () => {
  // Electron draws the window buttons over an opaque fill of its own inside a
  // 40px strip, and the shell's own title bar shares that band. Covering it
  // collides with their text and fights a colour we cannot set, so the overlay
  // starts underneath: one declaration, no chrome row of our own.
  const shell = one('.ft-studio')
  assert.match(shell, /inset:\s*var\(--ft-chrome-top, 0px\) 0 0 0/, 'the overlay must start below the strip')
  assert.ok(!/grid-template-rows:[^;]*--ft-chrome-top/.test(shell), 'the header must not grow into the strip')

  const head = one('.ft-head')
  assert.match(head, /height:\s*52px/, 'the toolbar keeps its own height')

  assert.equal(all('.ft-chrome').length, 0, 'no element of ours may live in the shell strip')
  assert.equal(all('.ft-studio-drag').length, 0, 'dragging is the shell job, not ours')
})
