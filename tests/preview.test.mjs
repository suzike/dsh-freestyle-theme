import { test } from 'node:test'
import assert from 'node:assert/strict'
import { load } from './_ts-hook.mjs'

const palette = await load('palette')
const locale = await load('locale')
const preview = await load('preview')
const React = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')

const t = (key) => locale.DICTIONARIES.zh[key] ?? key
const spec = palette.defaultSpec('light')
const pal = palette.fullPalette(spec)

test('the preview renders real DSH tokens rather than its own colours', () => {
  const html = renderToStaticMarkup(
    React.createElement(preview.PreviewFrame, { t, spec, palette: pal, view: 'chat', large: true }),
  )
  for (const token of ['--dsw-alias-bg-base', '--dsw-alias-brand-primary', '--dsw-alias-label-primary', '--dsw-alias-markdown-code-block']) {
    assert.ok(html.includes(token), `preview must paint with ${token}`)
  }
  // The palette block itself defines hex values for the tokens; no *property*
  // may paint a raw colour. Real properties must read a token instead.
  const painted = [...html.matchAll(/(?:^|;)\s*([a-z][a-z-]*)\s*:\s*(?:#[0-9a-f]{3,8}|rgba?\()/gi)]
    .map((match) => match[1])
  assert.deepEqual(painted, [], 'preview properties must resolve through tokens')
})

test('every view and every colour-vision mode renders', () => {
  for (const view of ['chat', 'list', 'form']) {
    for (const blind of ['none', ...Object.keys(preview.BLIND_IDS)]) {
      const html = renderToStaticMarkup(
        React.createElement(preview.PreviewFrame, { t, spec, palette: pal, view, blind }),
      )
      assert.ok(html.length > 400, `${view}/${blind} should render a frame`)
      if (blind !== 'none') assert.ok(html.includes('feColorMatrix'), `${blind} ships a filter`)
    }
  }
})

test('inspect mode annotates parts with the tokens they read', () => {
  const seen = []
  const html = renderToStaticMarkup(
    React.createElement(preview.PreviewFrame, {
      t,
      spec,
      palette: pal,
      view: 'chat',
      inspect: true,
      onInspect: (hit) => seen.push(hit),
    }),
  )
  assert.ok(html.includes('data-token'), 'inspectable parts carry their token list')
  assert.equal(seen.length, 0, 'nothing is reported without a pointer')
})
