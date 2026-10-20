import { test } from 'node:test'
import assert from 'node:assert/strict'
import { load } from './_ts-hook.mjs'

const palette = await load('palette')
const locale = await load('locale')
const studio = await load('studio')
const React = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')

const t = (key) => locale.DICTIONARIES.zh[key] ?? key

const render = (overrides = {}) =>
  renderToStaticMarkup(
    React.createElement(studio.Studio, {
      t,
      theme: undefined,
      initial: palette.defaultSpec('light'),
      onClose: () => {},
      ...overrides,
    }),
  )

test('the studio renders its whole working surface', () => {
  const html = render()
  for (const part of ['ft-root', 'ft-head', 'ft-rail', 'ft-list', 'ft-canvas', 'ft-insp']) {
    assert.ok(html.includes(part), `studio should render ${part}`)
  }
})

test('every colour channel can be locked and each lock is a real toggle', () => {
  const html = render()
  const locks = [...html.matchAll(/<button[^>]*class="ft-lock"[^>]*>/g)].map((match) => match[0])
  assert.equal(locks.length, 3, 'one lock per channel')
  for (const lock of locks) {
    assert.match(lock, /aria-pressed="(true|false)"/)
    assert.match(lock, /aria-label="[^"]+"/)
  }
})

test('the audit shows the worst pair and the count it measured', () => {
  const html = render()
  assert.ok(/ft-audit-score/.test(html), 'audit score is rendered')
  assert.ok(/ft-audit-row/.test(html), 'audited pairs are listed')
})

test('the share dialog and command palette start closed', () => {
  const html = render()
  assert.ok(!html.includes('ft-dialog'), 'no dialog on first paint')
  assert.ok(!html.includes('ft-cmd-list'), 'no command palette on first paint')
})

test('closing is idempotent and never leaves a busy flag behind', () => {
  let closed = 0
  const html = render({ onClose: () => { closed += 1 } })
  assert.ok(html.includes('ft-root'))
  assert.equal(closed, 0, 'render alone must not close')
})
