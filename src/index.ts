/**
 * Host half.
 *
 * Three small JSON routes under `/api/dsh-freestyle-theme`: the shared theme
 * library, image-free generation from a description, and naming. Everything
 * that touches the filesystem or the model stays here; the client half never
 * gets a Node import.
 *
 * @module dsh-freestyle-theme
 */

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/** Cordis plugin name. */
export const name = 'dsh-freestyle-theme'

/** The web server is the only capability this half needs. */
export const inject = ['webServer']

const API = '/api/dsh-freestyle-theme'
const THEMES_ROUTE = `${API}/themes`
const GENERATE_ROUTE = `${API}/generate`
const NAME_ROUTE = `${API}/name`

/** Upper bounds: the library is a convenience, not a database. */
const MAX_THEMES = 120
const MAX_BODY = 128 * 1024
const MAX_LIBRARY_BYTES = 2 * 1024 * 1024
const MAX_CANDIDATES = 6
const MAX_REPLY = 40000

interface ServerResponse {
  statusCode: number
  setHeader(name: string, value: string): void
  end(chunk?: string): void
}

interface IncomingRequest {
  method?: string
  headers?: Record<string, string | string[] | undefined>
  destroy?(): void
  on(event: 'data', handler: (chunk: { length: number; toString(encoding: string): string }) => void): void
  on(event: 'end', handler: () => void): void
  on(event: 'error', handler: (error: unknown) => void): void
  on(event: 'aborted', handler: () => void): void
  on(event: 'close', handler: () => void): void
  resume?(): void
}

interface RouteLike {
  kind: 'exact'
  path: string
  handler: (request: IncomingRequest, response: ServerResponse) => void | Promise<void>
}

interface LlmChunk {
  type?: string
  text?: string
  delta?: string
  reason?: { kind?: string }
}

interface LlmService {
  stream?(request: Record<string, unknown>): AsyncIterable<LlmChunk>
}

interface Selection {
  provider?: string
  providerId?: string
  model?: string
  modelId?: string
}

interface SelectionService {
  currentSelection?(): Selection | undefined
}

interface HostContext {
  webServer: { register(route: RouteLike): () => void }
  get(name: string): unknown
  effect?(fn: () => () => void, label?: string): unknown
}

/* ── plumbing ───────────────────────────────────────────────────────────── */

function json(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  try {
    response.statusCode = status
    // A refused body leaves unread bytes on the socket; close after answering
    // so the client actually receives the 413 instead of a reset.
    if (status === 413) response.setHeader('connection', 'close')
    response.setHeader('content-type', 'application/json; charset=utf-8')
    response.setHeader('cache-control', 'no-store')
    response.setHeader('referrer-policy', 'no-referrer')
    response.setHeader('x-content-type-options', 'nosniff')
    response.end(payload)
  } catch {
    /* the client went away mid-response; nothing left to tell it */
  }
}

function header(request: IncomingRequest, key: string): string {
  const value = request.headers?.[key] ?? request.headers?.[key.toLowerCase()]
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

/**
 * Same-origin guard.
 *
 * Any page can POST here with `Content-Type: text/plain` and
 * `mode: 'no-cors'` — no preflight — and `/generate` would spend real model
 * tokens. Browsers always send `Origin` on such a request; a missing `Origin`
 * means curl or the test harness, which is fine on a loopback socket.
 */
function isLoopbackHost(value: string): boolean {
  const raw = value.trim().toLowerCase()
  if (!raw) return false
  const host = raw.startsWith('[') ? raw.slice(1, raw.indexOf(']')) : (raw.split(':')[0] ?? '')
  return host === '127.0.0.1' || host === 'localhost' || host === '::1'
}

function crossSite(request: IncomingRequest): boolean {
  const target = header(request, 'host')
  // DNS rebinding can make Origin and Host agree on an attacker-controlled
  // name that still resolves to loopback, so the Host itself must be local.
  if (!isLoopbackHost(target)) return true
  const origin = header(request, 'origin')
  if (!origin) return false
  try {
    return new URL(origin).host !== target
  } catch {
    return true
  }
}

function wrongContentType(request: IncomingRequest): boolean {
  if (request.method === 'GET') return false
  return !header(request, 'content-type').toLowerCase().startsWith('application/json')
}

/** True when the request was refused (and answered) here. */
function guard(request: IncomingRequest, response: ServerResponse): boolean {
  if (!isLoopbackHost(header(request, 'host'))) {
    json(response, 403, { ok: false, code: 'host', message: 'host must be loopback' })
    return true
  }
  if (crossSite(request)) {
    json(response, 403, { ok: false, code: 'origin', message: 'cross-origin request refused' })
    return true
  }
  if (wrongContentType(request)) {
    json(response, 415, { ok: false, code: 'content-type', message: 'expected application/json' })
    return true
  }
  return false
}

/**
 * Cross-origin and wrong-content-type requests are refused before any body is
 * read: both checks only look at headers, so a hostile page cannot even make
 * the host allocate a buffer.
 */
function guarded(
  handler: (request: IncomingRequest, response: ServerResponse) => void | Promise<void>,
): (request: IncomingRequest, response: ServerResponse) => Promise<void> {
  return async (request, response) => {
    if (guard(request, response)) return
    await handler(request, response)
  }
}

type BodyResult = { tooLarge: false; value: unknown } | { tooLarge: true }

/**
 * Read a JSON body, refusing anything larger than `MAX_BODY`.
 *
 * Bytes are collected and decoded once: decoding each chunk separately splits
 * multi-byte characters at TCP boundaries and silently replaces them with
 * U+FFFD, which JSON.parse happily accepts.
 */
function readBody(request: IncomingRequest): Promise<BodyResult> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    let size = 0
    let settled = false
    const finish = (result: BodyResult): void => {
      if (settled) return
      settled = true
      resolve(result)
    }
    request.on('data', (chunk) => {
      if (settled) return
      size += chunk.length
      if (size > MAX_BODY) {
        finish({ tooLarge: true })
        // Drain rather than destroy: the socket has to survive long enough to
        // deliver the 413 that explains the refusal.
        try {
          request.resume?.()
        } catch {
          /* already gone */
        }
        return
      }
      chunks.push(Buffer.from(chunk))
    })
    request.on('end', () => {
      if (settled) return
      if (chunks.length === 0) return finish({ tooLarge: false, value: undefined })
      try {
        finish({ tooLarge: false, value: JSON.parse(Buffer.concat(chunks).toString('utf8')) })
      } catch {
        finish({ tooLarge: false, value: undefined })
      }
    })
    request.on('error', () => finish({ tooLarge: false, value: undefined }))
    request.on('aborted', () => finish({ tooLarge: false, value: undefined }))
    request.on('close', () => finish({ tooLarge: false, value: undefined }))
  })
}

/** The library file lives next to the rest of the user's DSH state. */
function libraryPath(): string {
  const home = process.env.DSH_HOME && process.env.DSH_HOME.trim() ? process.env.DSH_HOME.trim() : join(homedir(), '.dsh')
  return join(home, 'freestyle-theme', 'themes.json')
}

interface StoredTheme {
  id: string
  name: string
  spec: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** Keep the spec a flat JSON object: drop prototype keys, cap size. */
function sanitiseSpec(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const clean: Record<string, unknown> = {}
  let kept = 0
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key) || kept >= 48) continue
    if (typeof value === 'string') clean[key] = value.slice(0, 64)
    else if (typeof value === 'number' && Number.isFinite(value)) clean[key] = value
    else if (typeof value === 'boolean') clean[key] = value
    else continue
    kept += 1
  }
  return kept > 0 ? clean : null
}

/** Accept only the fields the library understands, and coerce numbers. */
function sanitiseTheme(raw: unknown): StoredTheme | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  // Over-long values are truncated rather than dropped: a 80-character name is
  // a naming mistake, not evidence that the theme is unusable.
  const id = typeof value.id === 'string' ? value.id.trim().slice(0, 64) : ''
  const name = typeof value.name === 'string' ? value.name.trim().slice(0, 48) : ''
  if (!id || !name) return null
  const spec = sanitiseSpec(value.spec)
  if (!spec) return null
  const now = Date.now()
  const created = typeof value.createdAt === 'number' && Number.isFinite(value.createdAt) ? value.createdAt : now
  const updated = typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt) ? value.updatedAt : created
  return {
    id,
    name,
    spec,
    createdAt: created,
    updatedAt: updated,
  }
}

/* ── routes ─────────────────────────────────────────────────────────────── */

/**
 * One writer at a time.
 *
 * Two tabs saving at once used to interleave on the same temp file; the queue
 * makes the write-then-rename sequence atomic per process.
 */
let writeQueue: Promise<unknown> = Promise.resolve()

function serialised<T>(work: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(work, work)
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

/** `rename` can lose to a virus scanner or an indexer on Windows. */
async function renameWithRetry(from: string, to: string): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await rename(from, to)
      return
    } catch (error) {
      const code = (error as { code?: string }).code
      if (attempt >= 2 || (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES')) throw error
      await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)))
    }
  }
}

/** `GET`/`PUT /themes` — the shared library. */
async function themesRoute(request: IncomingRequest, response: ServerResponse): Promise<void> {
  const file = libraryPath()

  if (request.method === 'GET') {
    try {
      // The write path is bounded; the read path must be too, or a corrupted
      // or symlinked file would be loaded into memory wholesale.
      const info = await stat(file)
      if (info.size > MAX_LIBRARY_BYTES) {
        json(response, 500, { ok: false, code: 'io', message: 'library too large' })
        return
      }
      const raw = await readFile(file, 'utf8')
      const parsed = JSON.parse(raw) as { themes?: unknown[] }
      const themes = Array.isArray(parsed.themes)
        ? parsed.themes.map(sanitiseTheme).filter((theme): theme is StoredTheme => theme !== null).slice(0, MAX_THEMES)
        : []
      json(response, 200, { ok: true, themes })
    } catch (error) {
      // "No file yet" is a normal first run; anything else is a real fault and
      // must not be disguised as an empty library.
      const code = (error as { code?: string }).code
      if (code === 'ENOENT') json(response, 200, { ok: true, themes: [] })
      else json(response, 500, { ok: false, code: 'io', message: 'library unreadable' })
    }
    return
  }

  if (request.method !== 'PUT') {
    json(response, 405, { ok: false, code: 'method', message: 'use GET or PUT' })
    return
  }

  const body = await readBody(request)
  if (body.tooLarge) {
    json(response, 413, { ok: false, code: 'too-large', message: `body over ${MAX_BODY} bytes` })
    return
  }
  const payload = body.value as { themes?: unknown[] } | undefined
  if (!payload || !Array.isArray(payload.themes)) {
    json(response, 400, { ok: false, code: 'invalid', message: 'expected { themes: [] }' })
    return
  }

  const themes = payload.themes.map(sanitiseTheme).filter((theme): theme is StoredTheme => theme !== null).slice(0, MAX_THEMES)
  try {
    await serialised(async () => {
      await mkdir(dirname(file), { recursive: true })
      const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`
      try {
        await writeFile(temporary, JSON.stringify({ version: 1, themes }, null, 2), 'utf8')
        await renameWithRetry(temporary, file)
      } finally {
        await unlink(temporary).catch(() => undefined)
      }
    })
    json(response, 200, { ok: true, saved: themes.length })
  } catch {
    json(response, 500, { ok: false, code: 'io', message: 'library write failed' })
  }
}

const GENERATE_SYSTEM = `You are a colour-systems designer. Given a description, propose theme candidates for a software UI.
Reply with JSON only, no prose: {"candidates":[{...}]}.
Each candidate: {"th":hue degrees 0-360,"th2":hue,"ths":hue,"mode":"light"|"dark","c1":0.02-0.37,"c2":0.01-0.2,"sc":0-0.04,"neutralTint":0.05-0.95,"spread":0.04-0.2,"stateBoost":0.2-1.2}
Hues must follow a real colour relationship (analogous, complementary, split, or triadic). Keep chroma conservative: a professional UI accent rarely exceeds 0.16. Vary the neutral temperature between candidates so they read as different designs, not recolours.`

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

/** Accept a model's candidate and clamp it into the valid coordinate space. */
function sanitiseCandidate(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  return {
    th: clampNumber(value.th, 0, 360, 168),
    th2: clampNumber(value.th2, 0, 360, 190),
    ths: clampNumber(value.ths, 0, 360, 168),
    mode: value.mode === 'dark' ? 'dark' : 'light',
    c1: clampNumber(value.c1, 0.02, 0.37, 0.1),
    c2: clampNumber(value.c2, 0.01, 0.2, 0.06),
    sc: clampNumber(value.sc, 0, 0.04, 0.008),
    neutralTint: clampNumber(value.neutralTint, 0.05, 0.95, 0.35),
    spread: clampNumber(value.spread, 0.04, 0.2, 0.1),
    stateBoost: clampNumber(value.stateBoost, 0.2, 1.2, 0.55),
  }
}

/** Pull the first JSON object/array out of a model reply. */
function firstJson(text: string): unknown {
  const objectStart = text.indexOf('{')
  const arrayStart = text.indexOf('[')
  const start = objectStart === -1 ? arrayStart : arrayStart === -1 ? objectStart : Math.min(objectStart, arrayStart)
  if (start === -1) return null
  const open = text[start]
  const close = open === '{' ? '}' : ']'
  const end = text.lastIndexOf(close)
  if (end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

/** Run one streaming completion and return the accumulated text. */
async function complete(
  ctx: HostContext,
  system: string,
  user: string,
  maxTokens: number,
  signal: AbortSignal,
): Promise<{ text: string; code?: string }> {
  try {
    const llm = ctx.get('llm') as LlmService | undefined
    if (!llm?.stream) return { text: '', code: 'no-llm' }
    const selection = (ctx.get('agentDefaultModel') as SelectionService | undefined)?.currentSelection?.()
    const provider = selection?.provider ?? selection?.providerId
    const model = selection?.model ?? selection?.modelId
    if (!provider || !model) return { text: '', code: 'no-model' }

    let text = ''
    const stream = llm.stream({
      provider,
      model,
      system,
      messages: [{ role: 'user', content: [{ type: 'text', text: user }] }],
      temperature: 0.8,
      maxTokens,
      signal,
    })
    for await (const chunk of stream) {
      if (signal.aborted) return { text: '', code: 'aborted' }
      if (chunk.type === 'text-delta') {
        text += chunk.text ?? chunk.delta ?? ''
        if (text.length > MAX_REPLY) return { text: '', code: 'llm' }
      } else if (chunk.type === 'finish' && (chunk.reason?.kind === 'error' || chunk.reason?.kind === 'aborted')) {
        return { text: '', code: 'llm' }
      }
    }
    return { text }
  } catch {
    return { text: '', code: 'llm' }
  }
}

/** Stop spending tokens when the tab that asked closes. */
function abortOnClose(request: IncomingRequest): AbortSignal {
  const controller = new AbortController()
  const stop = (): void => controller.abort()
  request.on('aborted', stop)
  request.on('close', stop)
  request.on('error', stop)
  return controller.signal
}

/** `POST /generate` — description to candidates. */
async function generateRoute(ctx: HostContext, request: IncomingRequest, response: ServerResponse): Promise<void> {
  if (request.method !== 'POST') {
    json(response, 405, { ok: false, code: 'method', message: 'use POST' })
    return
  }
  const body = await readBody(request)
  if (body.tooLarge) {
    json(response, 413, { ok: false, code: 'too-large', message: `body over ${MAX_BODY} bytes` })
    return
  }
  const payload = body.value as { prompt?: unknown; count?: unknown } | undefined
  const prompt = typeof payload?.prompt === 'string' ? payload.prompt.trim().slice(0, 600) : ''
  if (!prompt) {
    json(response, 400, { ok: false, code: 'invalid', message: 'prompt required' })
    return
  }
  const count = Math.min(MAX_CANDIDATES, Math.max(1, Math.round(clampNumber(payload?.count, 1, MAX_CANDIDATES, 4))))

  const { text, code } = await complete(
    ctx,
    GENERATE_SYSTEM,
    JSON.stringify({ request: prompt, count, language: 'the description may be Chinese' }),
    900,
    abortOnClose(request),
  )
  if (!text) {
    json(response, 200, { ok: false, code: code ?? 'llm', candidates: [] })
    return
  }

  const parsed = firstJson(text) as { candidates?: unknown[] } | unknown[] | null
  const raw = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.candidates) ? parsed.candidates : []
  const candidates = raw
    .map(sanitiseCandidate)
    .filter((candidate): candidate is Record<string, unknown> => candidate !== null)
    .slice(0, count)
  if (candidates.length === 0) {
    json(response, 200, { ok: false, code: 'invalid', candidates: [] })
    return
  }
  json(response, 200, { ok: true, candidates })
}

const NAME_SYSTEM = `You name UI colour themes. Reply with JSON only: {"name":"…","tags":["…","…"],"description":"…"}.
The name is 2-6 words in the user's language, concrete and evocative, never "Theme 1". Tags: 3-5 short adjectives. The description is one sentence about the mood.`

/** `POST /name` — a human name for a spec. */
async function nameRoute(ctx: HostContext, request: IncomingRequest, response: ServerResponse): Promise<void> {
  if (request.method !== 'POST') {
    json(response, 405, { ok: false, code: 'method', message: 'use POST' })
    return
  }
  const body = await readBody(request)
  if (body.tooLarge) {
    json(response, 413, { ok: false, code: 'too-large', message: `body over ${MAX_BODY} bytes` })
    return
  }
  const payload = body.value as { spec?: unknown; locale?: unknown } | undefined
  if (!payload?.spec || typeof payload.spec !== 'object') {
    json(response, 400, { ok: false, code: 'invalid', message: 'spec required' })
    return
  }
  const locale = typeof payload.locale === 'string' ? payload.locale.slice(0, 20) : 'zh'

  const { text, code } = await complete(
    ctx,
    NAME_SYSTEM,
    JSON.stringify({ spec: payload.spec, language: locale.toLowerCase().startsWith('zh') ? 'Chinese' : 'English' }),
    260,
    abortOnClose(request),
  )
  if (!text) {
    json(response, 200, { ok: false, code: code ?? 'llm' })
    return
  }
  const parsed = firstJson(text) as { name?: unknown; tags?: unknown; description?: unknown } | null
  const picked = typeof parsed?.name === 'string' ? parsed.name.trim().slice(0, 32) : ''
  if (!picked) {
    json(response, 200, { ok: false, code: 'invalid' })
    return
  }
  json(response, 200, {
    ok: true,
    name: picked,
    tags: Array.isArray(parsed?.tags)
      ? parsed.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 5).map((tag) => tag.slice(0, 12))
      : [],
    description: typeof parsed?.description === 'string' ? parsed.description.slice(0, 140) : '',
  })
}

/* ── registration ───────────────────────────────────────────────────────── */

/** Wrapped so a rejected handler becomes a JSON 500, never a dead process. */
function run(work: (request: IncomingRequest, response: ServerResponse) => Promise<void>) {
  return (request: IncomingRequest, response: ServerResponse): void => {
    void work(request, response).catch(() => {
      json(response, 500, { ok: false, code: 'internal', message: 'handler failed' })
    })
  }
}

let registered: (() => void) | null = null

export function apply(ctx: HostContext): void {
  // Re-applying must not stack a second set of routes on the same paths.
  if (registered) {
    registered()
    registered = null
  }

  const routes: RouteLike[] = [
    { kind: 'exact', path: THEMES_ROUTE, handler: run(guarded(themesRoute)) },
    { kind: 'exact', path: GENERATE_ROUTE, handler: run(guarded((request, response) => generateRoute(ctx, request, response))) },
    { kind: 'exact', path: NAME_ROUTE, handler: run(guarded((request, response) => nameRoute(ctx, request, response))) },
  ]

  const register = (): (() => void) => {
    const disposers: Array<() => void> = []
    const dispose = (): void => {
      while (disposers.length > 0) {
        try {
          disposers.pop()?.()
        } catch {
          /* the server is shutting down */
        }
      }
    }
    try {
      for (const route of routes) disposers.push(ctx.webServer.register(route))
    } catch (error) {
      dispose()
      throw error
    }
    return dispose
  }

  if (typeof ctx.effect === 'function') {
    registered = register()
    ctx.effect(() => {
      const dispose = registered
      return () => {
        dispose?.()
        registered = null
      }
    }, 'dsh-freestyle-theme: routes')
  } else {
    registered = register()
  }
}
