/**
 * Host half: the three routes, driven end to end against a temporary
 * `DSH_HOME`. Nothing here needs DSH running — the handlers only touch
 * `webServer.register`, `ctx.get`, and the filesystem.
 */

import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

import { load } from './_ts-hook.mjs'

const host = await load('../src/index.ts')

/* ── harness ─────────────────────────────────────────────────────────────── */

function fakeRequest(method, body, options = {}) {
  const request = new EventEmitter()
  request.method = method
  request.headers = {
    host: '127.0.0.1:60880',
    'content-type': 'application/json',
    ...(options.headers ?? {}),
  }
  request.destroyed = false
  request.destroy = () => {
    request.destroyed = true
  }
  request.resumed = false
  request.resume = () => {
    request.resumed = true
  }
  setImmediate(() => {
    if (options.chunks) {
      for (const chunk of options.chunks) request.emit('data', chunk)
    } else if (body !== undefined) {
      const text = typeof body === 'string' ? body : JSON.stringify(body)
      request.emit('data', Buffer.from(text))
    }
    if (!request.destroyed) request.emit('end')
  })
  return request
}

function fakeResponse() {
  const headers = new Map()
  let payload = ''
  let status = 0
  let settle
  const done = new Promise((resolve) => {
    settle = resolve
  })
  return {
    done,
    get status() {
      return status
    },
    get headers() {
      return headers
    },
    get body() {
      return payload ? JSON.parse(payload) : undefined
    },
    get raw() {
      return payload
    },
    set statusCode(value) {
      status = value
    },
    get statusCode() {
      return status
    },
    setHeader(name, value) {
      headers.set(name.toLowerCase(), value)
    },
    end(chunk) {
      payload = chunk ?? ''
      settle()
    },
  }
}

async function call(route, method, body, options) {
  const response = fakeResponse()
  const request = fakeRequest(method, body, options)
  route.handler(request, response)
  await response.done
  response.request = request
  return response
}

function fakeContext(options = {}) {
  const routes = []
  return {
    routes,
    ctx: {
      webServer: {
        register(route) {
          routes.push(route)
          return () => {
            const index = routes.indexOf(route)
            if (index >= 0) routes.splice(index, 1)
          }
        },
      },
      get(name) {
        return options.services?.[name]
      },
      effect(register) {
        const dispose = register()
        routes.disposed = dispose
      },
    },
  }
}

let home = ''
let route = {}

before(async () => {
  home = await mkdtemp(join(tmpdir(), 'fs-theme-'))
  process.env.DSH_HOME = home

  const { ctx, routes } = fakeContext()
  host.apply(ctx)
  assert.equal(routes.length, 3, 'three routes registered')
  route = Object.fromEntries(routes.map((entry) => [entry.path, entry]))
})

after(async () => {
  delete process.env.DSH_HOME
  await rm(home, { recursive: true, force: true })
})

/* ── library ─────────────────────────────────────────────────────────────── */

const theme = (id, name, extra = {}) => ({
  id,
  name,
  spec: { th: 168, mode: 'light' },
  createdAt: 1,
  updatedAt: 1,
  ...extra,
})

test('routes are exact and under the plugin namespace', () => {
  for (const path of Object.keys(route)) {
    assert.match(path, /^\/api\/dsh-freestyle-theme\//)
    assert.equal(route[path].kind, 'exact')
  }
})

test('GET on a cold library returns an empty list, not an error', async () => {
  const response = await call(route['/api/dsh-freestyle-theme/themes'], 'GET')
  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { ok: true, themes: [] })
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('PUT persists, GET reads back, and no temp file is left behind', async () => {
  const put = await call(route['/api/dsh-freestyle-theme/themes'], 'PUT', {
    themes: [theme('a', 'Aurora'), theme('b', 'Basalt')],
  })
  assert.equal(put.status, 200)
  assert.deepEqual(put.body, { ok: true, saved: 2 })

  const get = await call(route['/api/dsh-freestyle-theme/themes'], 'GET')
  assert.deepEqual(
    get.body.themes.map((entry) => entry.id),
    ['a', 'b'],
  )

  const directory = join(home, 'freestyle-theme')
  const files = await readdir(directory)
  assert.deepEqual(files, ['themes.json'], 'atomic write leaves only the target file')

  const stored = JSON.parse(await readFile(join(directory, 'themes.json'), 'utf8'))
  assert.equal(stored.version, 1)
})

test('PUT drops malformed entries and truncates over-long ones', async () => {
  const validSpec = { th: 168, c1: 0.1, l1: 0.5, th2: 200, c2: 0.1, l2: 0.6, ths: 176, sc: 0.03, bg: 0.95, neutralTint: 0.2, spread: 0.1, stateBoost: 1, tx: 0.14, sb: 0.97, fontPair: 'sans', fontScale: 1, radius: 1, shadow: 1, mode: 'light' }
  const put = await call(route['/api/dsh-freestyle-theme/themes'], 'PUT', {
    themes: [
      theme('good', 'Good'),
      { id: '', name: 'no id', spec: {} },
      { id: 'x'.repeat(65), name: 'long id', spec: validSpec },
      { id: 'y', name: '', spec: {} },
      { id: 'z', name: 'no spec' },
      'nope',
      null,
    ],
  })
  assert.equal(put.status, 200)
  // `good` and the 65-char id survive (truncated); empty id, empty name,
  // missing spec, a string and null are dropped — one bad row never fails
  // the whole save.
  assert.deepEqual(put.body, { ok: true, saved: 2 })
})

test('PUT clamps the entry count and the name length', async () => {
  const many = Array.from({ length: 200 }, (_, index) => theme(`t${index}`, 'n'.repeat(80)))
  const put = await call(route['/api/dsh-freestyle-theme/themes'], 'PUT', { themes: many })
  assert.equal(put.body.saved, 120)

  const get = await call(route['/api/dsh-freestyle-theme/themes'], 'GET')
  assert.equal(get.body.themes.length, 120)
  assert.equal(get.body.themes[0].name.length, 48)
})

test('PUT rejects a body that is not {themes: []}', async () => {
  assert.equal((await call(route['/api/dsh-freestyle-theme/themes'], 'PUT', { nope: 1 })).status, 400)
  assert.equal((await call(route['/api/dsh-freestyle-theme/themes'], 'PUT', 'not json')).status, 400)
})

test('PUT rejects an oversized body and lets the 413 out', async () => {
  const huge = { themes: [], padding: 'x'.repeat(140 * 1024) }
  const response = await call(route['/api/dsh-freestyle-theme/themes'], 'PUT', huge)
  assert.equal(response.status, 413)
  assert.equal(response.body.code, 'too-large')
  // Draining beats destroying: a destroyed socket can never deliver the 413.
  assert.equal(response.request.destroyed, false, 'the socket is drained, not destroyed')
  assert.equal(response.request.resumed, true, 'the rest of the body is drained')
  assert.equal(response.headers.get('connection'), 'close', 'the refused stream is closed after answering')
})

test('a body split mid-character still decodes as UTF-8', async () => {
  const text = JSON.stringify({ themes: [theme('zh', '雾林深处')] })
  const bytes = Buffer.from(text, 'utf8')
  const cut = bytes.indexOf(Buffer.from('雾', 'utf8')) + 1
  const chunks = [bytes.subarray(0, cut), bytes.subarray(cut)]
  const put = await call(route['/api/dsh-freestyle-theme/themes'], 'PUT', undefined, { chunks })
  assert.equal(put.body.ok, true)
  const get = await call(route['/api/dsh-freestyle-theme/themes'], 'GET')
  assert.equal(get.body.themes[0].name, '雾林深处')
})

test('two overlapping saves cannot corrupt the library', async () => {
  const [first, second] = await Promise.all([
    call(route['/api/dsh-freestyle-theme/themes'], 'PUT', { themes: [theme('a1', 'A1'), theme('a2', 'A2')] }),
    call(route['/api/dsh-freestyle-theme/themes'], 'PUT', { themes: [theme('b1', 'B1')] }),
  ])
  assert.equal(first.body.ok, true)
  assert.equal(second.body.ok, true)

  const stored = JSON.parse(await readFile(join(home, 'freestyle-theme', 'themes.json'), 'utf8'))
  assert.ok(Array.isArray(stored.themes), 'the file is still valid JSON')
  assert.ok(['B1'].includes(stored.themes[0].name) || stored.themes[0].name.startsWith('A'))

  const files = await readdir(join(home, 'freestyle-theme'))
  assert.deepEqual(files, ['themes.json'], 'no temp file survives either writer')
})

test('a rebinding host is refused even when origin agrees with it', async () => {
  // Origin and Host matching is not enough: rebinding makes both the attacker's
  // name, so the Host must be loopback on its own.
  const rebound = await call(route['/api/dsh-freestyle-theme/generate'], 'POST', { prompt: 'x' }, {
    headers: { host: 'evil.example:60880', origin: 'http://evil.example:60880' },
  })
  assert.equal(rebound.status, 403)
  assert.equal(rebound.body.code, 'host')
  assert.equal(rebound.body.message, 'host must be loopback')
})

test('cross-origin and non-JSON callers are refused', async () => {
  const cross = await call(route['/api/dsh-freestyle-theme/generate'], 'POST', { prompt: 'x' }, {
    headers: { origin: 'https://evil.example' },
  })
  assert.equal(cross.status, 403)
  assert.equal(cross.body.code, 'origin')

  const plain = await call(route['/api/dsh-freestyle-theme/generate'], 'POST', { prompt: 'x' }, {
    headers: { 'content-type': 'text/plain' },
  })
  assert.equal(plain.status, 415)
  assert.equal(plain.body.code, 'content-type')

  const sameOrigin = await call(route['/api/dsh-freestyle-theme/themes'], 'GET', undefined, {
    headers: { origin: 'http://127.0.0.1:60880' },
  })
  assert.equal(sameOrigin.status, 200)
})

test('other methods get 405 with an explicit code', async () => {
  const response = await call(route['/api/dsh-freestyle-theme/themes'], 'DELETE')
  assert.equal(response.status, 405)
  assert.equal(response.body.code, 'method')
})

test('a corrupt library file reports a fault instead of pretending to be empty', async () => {
  const file = join(home, 'freestyle-theme', 'themes.json')
  const { writeFile } = await import('node:fs/promises')
  await writeFile(file, '{{{', 'utf8')
  const response = await call(route['/api/dsh-freestyle-theme/themes'], 'GET')
  assert.equal(response.status, 500)
  assert.deepEqual(response.body, { ok: false, code: 'io', message: 'library unreadable' })
})

/* ── model routes ────────────────────────────────────────────────────────── */

test('generate without an llm service reports no-llm instead of throwing', async () => {
  const response = await call(route['/api/dsh-freestyle-theme/generate'], 'POST', { prompt: 'warm sand' })
  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { ok: false, code: 'no-llm', candidates: [] })
})

test('generate rejects an empty prompt', async () => {
  const response = await call(route['/api/dsh-freestyle-theme/generate'], 'POST', { prompt: '   ' })
  assert.equal(response.status, 400)
})

test('generate parses, clamps and slices model candidates', async () => {
  const stream = async function* () {
    yield { type: 'text-delta', text: '{"candidates":[' }
    yield {
      type: 'text-delta',
      text: '{"th":999,"th2":-40,"mode":"dark","c1":5,"c2":0,"sc":9},',
    }
    yield { type: 'text-delta', text: '{"th":40,"mode":"light"},{"th":1},{"th":2}]}' }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
  const { ctx, routes } = fakeContext({
    services: {
      llm: { stream: () => stream() },
      agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) },
    },
  })
  host.apply(ctx)
  const target = routes.find((entry) => entry.path.endsWith('/generate'))

  const response = await call(target, 'POST', { prompt: 'deep sea', count: 3 })
  assert.equal(response.body.ok, true)
  assert.equal(response.body.candidates.length, 3)
  assert.equal(response.body.candidates[0].th, 360, 'hue clamped to range')
  assert.equal(response.body.candidates[0].th2, 0)
  assert.equal(response.body.candidates[0].c1, 0.37)
  assert.equal(response.body.candidates[0].mode, 'dark')
})

test('generate surfaces a model finish failure as an error code', async () => {
  const stream = async function* () {
    yield { type: 'text-delta', text: '{"candidates":[' }
    yield { type: 'finish', reason: { kind: 'error' } }
  }
  const { ctx, routes } = fakeContext({
    services: {
      llm: { stream: () => stream() },
      agentDefaultModel: { currentSelection: () => ({ providerId: 'p', modelId: 'm' }) },
    },
  })
  host.apply(ctx)
  const target = routes.find((entry) => entry.path.endsWith('/generate'))
  const response = await call(target, 'POST', { prompt: 'x' })
  assert.deepEqual(response.body, { ok: false, code: 'llm', candidates: [] })
})

test('generate reports no-model when the selection is empty', async () => {
  const { ctx, routes } = fakeContext({
    services: { llm: { stream: async function* () {} }, agentDefaultModel: { currentSelection: () => undefined } },
  })
  host.apply(ctx)
  const target = routes.find((entry) => entry.path.endsWith('/generate'))
  assert.equal((await call(target, 'POST', { prompt: 'x' })).body.code, 'no-model')
})

test('name parses a reply into name, tags and description', async () => {
  const stream = async function* () {
    yield { type: 'text-delta', text: 'sure: {"name":"Tidal Glass","tags":["calm","cool","a","b","c","d"],' }
    yield { type: 'text-delta', text: '"description":"Cool and quiet."}' }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
  const { ctx, routes } = fakeContext({
    services: {
      llm: { stream: () => stream() },
      agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) },
    },
  })
  host.apply(ctx)
  const target = routes.find((entry) => entry.path.endsWith('/name'))
  const response = await call(target, 'POST', { spec: { th: 220 }, locale: 'en-US' })

  assert.deepEqual(response.body, {
    ok: true,
    name: 'Tidal Glass',
    tags: ['calm', 'cool', 'a', 'b', 'c'],
    description: 'Cool and quiet.',
  })
})

test('name refuses a reply without a usable name', async () => {
  const stream = async function* () {
    yield { type: 'text-delta', text: '{"name":"   "}' }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
  const { ctx, routes } = fakeContext({
    services: {
      llm: { stream: () => stream() },
      agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) },
    },
  })
  host.apply(ctx)
  const target = routes.find((entry) => entry.path.endsWith('/name'))
  assert.deepEqual((await call(target, 'POST', { spec: { th: 1 } })).body, { ok: false, code: 'invalid' })
})
