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

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
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
const MAX_CANDIDATES = 6

interface ServerResponse {
  statusCode: number
  setHeader(name: string, value: string): void
  end(chunk?: string): void
}

interface IncomingRequest {
  method?: string
  on(event: 'data', handler: (chunk: { length: number; toString(encoding: string): string }) => void): void
  on(event: 'end', handler: () => void): void
  on(event: 'error', handler: (error: unknown) => void): void
  on(event: 'aborted', handler: () => void): void
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
  response.statusCode = status
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.setHeader('cache-control', 'no-store')
  response.setHeader('referrer-policy', 'no-referrer')
  response.setHeader('x-content-type-options', 'nosniff')
  response.end(payload)
}

/** Read a JSON body, refusing anything larger than `MAX_BODY`. */
function readBody(request: IncomingRequest): Promise<unknown> {
  return new Promise((resolve) => {
    let size = 0
    let aborted = false
    const chunks: string[] = []
    request.on('data', (chunk) => {
      if (aborted) return
      size += chunk.length
      if (size > MAX_BODY) {
        aborted = true
        resolve(undefined)
        return
      }
      chunks.push(chunk.toString('utf8'))
    })
    request.on('end', () => {
      if (aborted) return
      if (chunks.length === 0) {
        resolve(undefined)
        return
      }
      try {
        resolve(JSON.parse(chunks.join('')))
      } catch {
        resolve(undefined)
      }
    })
    request.on('error', () => resolve(undefined))
    request.on('aborted', () => resolve(undefined))
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

/** Accept only the fields the library understands, and coerce numbers. */
function sanitiseTheme(raw: unknown): StoredTheme | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  // Over-long values are truncated rather than dropped: a 80-character name is
  // a naming mistake, not evidence that the theme is unusable.
  const id = typeof value.id === 'string' ? value.id.trim().slice(0, 64) : ''
  const name = typeof value.name === 'string' ? value.name.trim().slice(0, 48) : ''
  if (!id || !name) return null
  if (!value.spec || typeof value.spec !== 'object') return null
  const now = Date.now()
  const created = typeof value.createdAt === 'number' && Number.isFinite(value.createdAt) ? value.createdAt : now
  const updated = typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt) ? value.updatedAt : created
  return {
    id,
    name,
    spec: value.spec as Record<string, unknown>,
    createdAt: created,
    updatedAt: updated,
  }
}

/* ── routes ─────────────────────────────────────────────────────────────── */

/** `GET`/`PUT /themes` — the shared library. */
async function themesRoute(request: IncomingRequest, response: ServerResponse): Promise<void> {
  const file = libraryPath()

  if (request.method === 'GET') {
    try {
      const raw = await readFile(file, 'utf8')
      const parsed = JSON.parse(raw) as { themes?: unknown[] }
      const themes = Array.isArray(parsed.themes)
        ? parsed.themes.map(sanitiseTheme).filter((theme): theme is StoredTheme => theme !== null).slice(0, MAX_THEMES)
        : []
      json(response, 200, { ok: true, themes })
    } catch {
      json(response, 200, { ok: true, themes: [] })
    }
    return
  }

  if (request.method !== 'PUT') {
    json(response, 405, { ok: false, code: 'method', message: 'use GET or PUT' })
    return
  }

  const body = (await readBody(request)) as { themes?: unknown[] } | undefined
  if (!body || !Array.isArray(body.themes)) {
    json(response, 400, { ok: false, code: 'invalid', message: 'expected { themes: [] }' })
    return
  }

  const themes = body.themes.map(sanitiseTheme).filter((theme): theme is StoredTheme => theme !== null).slice(0, MAX_THEMES)
  try {
    await mkdir(dirname(file), { recursive: true })
    const temporary = `${file}.${process.pid}.tmp`
    await writeFile(temporary, JSON.stringify({ version: 1, themes }, null, 2), 'utf8')
    await rename(temporary, file)
    json(response, 200, { ok: true, saved: themes.length })
  } catch (error) {
    json(response, 500, { ok: false, code: 'io', message: error instanceof Error ? error.message : 'write failed' })
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
): Promise<{ text: string; code?: string }> {
  const llm = ctx.get('llm') as LlmService | undefined
  if (!llm?.stream) return { text: '', code: 'no-llm' }
  const selection = (ctx.get('agentDefaultModel') as SelectionService | undefined)?.currentSelection?.()
  const provider = selection?.provider ?? selection?.providerId
  const model = selection?.model ?? selection?.modelId
  if (!provider || !model) return { text: '', code: 'no-model' }

  let text = ''
  try {
    const stream = llm.stream({
      provider,
      model,
      system,
      messages: [{ role: 'user', content: [{ type: 'text', text: user }] }],
      temperature: 0.8,
      maxTokens,
    })
    for await (const chunk of stream) {
      if (chunk.type === 'text-delta') text += chunk.text ?? chunk.delta ?? ''
      else if (chunk.type === 'finish' && (chunk.reason?.kind === 'error' || chunk.reason?.kind === 'aborted')) {
        return { text: '', code: 'llm' }
      }
    }
    return { text }
  } catch {
    return { text: '', code: 'llm' }
  }
}

/** `POST /generate` — description to candidates. */
async function generateRoute(ctx: HostContext, request: IncomingRequest, response: ServerResponse): Promise<void> {
  if (request.method !== 'POST') {
    json(response, 405, { ok: false, code: 'method', message: 'use POST' })
    return
  }
  const body = (await readBody(request)) as { prompt?: unknown; count?: unknown } | undefined
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim().slice(0, 600) : ''
  if (!prompt) {
    json(response, 400, { ok: false, code: 'invalid', message: 'prompt required' })
    return
  }
  const count = Math.min(MAX_CANDIDATES, Math.max(1, Math.round(clampNumber(body?.count, 1, MAX_CANDIDATES, 4))))

  const { text, code } = await complete(
    ctx,
    GENERATE_SYSTEM,
    JSON.stringify({ request: prompt, count, language: 'the description may be Chinese' }),
    900,
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
  const body = (await readBody(request)) as { spec?: unknown; locale?: unknown } | undefined
  if (!body?.spec || typeof body.spec !== 'object') {
    json(response, 400, { ok: false, code: 'invalid', message: 'spec required' })
    return
  }
  const locale = typeof body.locale === 'string' ? body.locale.slice(0, 20) : 'zh'

  const { text, code } = await complete(
    ctx,
    NAME_SYSTEM,
    JSON.stringify({ spec: body.spec, language: locale.toLowerCase().startsWith('zh') ? 'Chinese' : 'English' }),
    260,
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

export function apply(ctx: HostContext): void {
  const routes: RouteLike[] = [
    { kind: 'exact', path: THEMES_ROUTE, handler: (request, response) => void themesRoute(request, response) },
    { kind: 'exact', path: GENERATE_ROUTE, handler: (request, response) => void generateRoute(ctx, request, response) },
    { kind: 'exact', path: NAME_ROUTE, handler: (request, response) => void nameRoute(ctx, request, response) },
  ]

  const register = (): (() => void) => {
    const disposers = routes.map((route) => ctx.webServer.register(route))
    return () => {
      for (const dispose of disposers) {
        try {
          dispose()
        } catch {
          /* the server is shutting down */
        }
      }
    }
  }

  if (typeof ctx.effect === 'function') ctx.effect(register, 'dsh-freestyle-theme: routes')
  else register()
}
