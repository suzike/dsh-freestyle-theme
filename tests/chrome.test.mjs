import { test } from 'node:test'
import assert from 'node:assert/strict'
import { load } from './_ts-hook.mjs'

const { chromeTopFrom, DESKTOP_STRIP } = await load('chrome')

test('a browser tab reserves nothing', () => {
  // No preload, no overlay variables: the studio must stay edge-to-edge.
  assert.equal(chromeTopFrom({}), 0)
  assert.equal(chromeTopFrom({ areaHeight: -1, platform: null }), 0)
})

test('a desktop window reserves the shell strip even without the overlay variables', () => {
  // 0.6.5 shipped a UA sniff that missed the packaged app; the preload's own
  // `data-platform` is the signal that cannot be wrong.
  assert.equal(chromeTopFrom({ areaHeight: -1, platform: 'win32' }), DESKTOP_STRIP)
  assert.equal(chromeTopFrom({ areaHeight: null, platform: 'darwin' }), DESKTOP_STRIP)
})

test('the overlay variables win, because they know the real height', () => {
  assert.equal(chromeTopFrom({ areaHeight: 32, platform: 'win32' }), 32)
  assert.equal(chromeTopFrom({ areaHeight: 0, platform: 'win32' }), 0)
})

test('an explicit override wins over every signal', () => {
  assert.equal(chromeTopFrom({ forced: 48, areaHeight: 32, platform: 'win32' }), 48)
  assert.equal(chromeTopFrom({ forced: -10, areaHeight: 32 }), 0)
})
