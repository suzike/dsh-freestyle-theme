/**
 * dsh-freestyle-theme — host face.
 *
 * The browser half does all palette work locally (no network, no model) and only
 * needs the host for one thing: turning a finished token set into a name, a few
 * tags and a one-line description. That call goes through the host's own `llm`
 * and `agentDefaultModel` services, so the GUI never sees a provider credential
 * and always names with the model the user already selected.
 *
 * Route: `POST /api/dsh-freestyle-theme/name`
 *   body   { tokens: unknown, locale?: 'zh' | 'en' }
 *   200    { ok: true, text } | { ok: false, code, detail? }
 *   codes  bad-request | unavailable | no-model | failed
 *
 * The response never throws a localized sentence: `code` is stable, and the
 * client renders its own text from its locale dictionary.
 *
 * @module dsh-freestyle-theme
 */
import type { Context } from '@deepseek-ai/cordis'

export const name = 'dsh-freestyle-theme'

/** `webServer` is the only host service this plugin requires at load time. */
export const inject = ['webServer']

/** Largest accepted request body; a token dump is a few KiB, never 64. */
const MAX_BODY_BYTES = 64 * 1024

/** Route path; mirrored by `NAME_ROUTE_PATH` in the client half. */
const NAME_ROUTE = '/api/dsh-freestyle-theme/name'

/**
 * Naming instruction per UI locale. Both variants demand a bare JSON object:
 * the client parses the first `{…}` it finds, and a fenced block or a preamble
 * would otherwise turn into a junk name.
 */
const SYSTEM_PROMPTS: Record<string, string> = {
  zh: '你是品牌色彩与界面主题命名专家。给定一套 OKLCH 界面主题令牌，为它生成独特、具体、有画面感的主题身份。'
    + '只输出一个 JSON 对象："{"name":"2到8个汉字的主题名","tags":["3到5个简短特征标签"],"desc":"20到50字的主题特征介绍"}。'
    + '名称不得使用"我的主题""自定义主题"这类泛称；标签分别覆盖色彩、明暗、材质与氛围，且不与名称重复；介绍要说清主副色关系与适用感受。不要输出代码块、解释或任何 JSON 之外的文字。',
  en: 'You are a brand color and interface-theme naming expert. Given a set of OKLCH interface theme tokens, produce a distinctive, concrete, evocative theme identity. '
    + 'Output only one JSON object: {"name":"2-4 word theme name","tags":["3-5 short trait tags"],"desc":"one 12-25 word sentence"}. '
    + 'Never use generic names like "My Theme" or "Custom Theme"; tags must separately cover color, lightness, material and mood without repeating the name; the description names the primary/secondary color relationship and how it feels. '
    + 'No code fence, no explanation, no text outside the JSON object.',
}

/** Minimal async-iterable request surface; avoids a node:http type dependency. */
interface RequestLike {
  readonly method?: string
  [Symbol.asyncIterator](): AsyncIterator<Uint8Array>
}

/** Minimal response surface this route owns end to end. */
interface ResponseLike {
  writeHead(status: number, headers: Record<string, string>): void
  end(body?: string): void
}

/** A route as `webServer.register` accepts it. */
interface RouteLike {
  kind: 'exact'
  path: string
  handler: (req: RequestLike, res: ResponseLike) => void | Promise<void>
}

/**
 * Local declaration of the one host service this plugin uses. The real
 * declaration ships with `@deepseek-ai/dsh-host-webserver`, which a plugin must
 * not depend on at runtime; narrowing it here keeps the package dependency-free
 * while `ctx.webServer` still type-checks.
 */
declare module '@deepseek-ai/cordis' {
  interface Context {
    /** node:http route registration owned by the host web server. */
    webServer: { register(route: RouteLike): () => void }
  }
}

/** One model selection as `agentDefaultModel.currentSelection()` reports it. */
interface ModelSelection {
  provider?: string
  model?: string
  reasoningEffort?: string
}

/** One streamed chunk from `llm.stream()`; only the fields we read are typed. */
interface LlmChunk {
  type?: string
  text?: string
  reason?: { kind?: string; failure?: { message?: string } }
}

/** The two host services naming needs, resolved dynamically. */
interface NameServices {
  llm?: { stream(options: Record<string, unknown>): AsyncIterable<LlmChunk> }
  agentDefaultModel?: { currentSelection(): ModelSelection | undefined }
}

/**
 * Send one JSON response. `no-store` keeps a naming result from being cached
 * and `no-referrer` keeps the route's URL out of any outbound referer.
 * @param res - response the route owns.
 * @param status - HTTP status code.
 * @param body - JSON-serializable payload.
 */
function writeJson(res: ResponseLike, status: number, body: unknown): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
  })
  res.end(JSON.stringify(body))
}

/**
 * Read a bounded JSON body.
 * @param req - incoming request.
 * @returns the parsed object, or undefined when the body is too large, not
 * JSON, or not an object.
 */
async function readJsonBody(req: RequestLike): Promise<Record<string, unknown> | undefined> {
  const chunks: Uint8Array[] = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.byteLength
    if (size > MAX_BODY_BYTES) return undefined
    chunks.push(chunk)
  }
  const joined = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    joined.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(joined))
    return typeof parsed === 'object' && parsed !== null
      ? parsed as Record<string, unknown>
      : undefined
  } catch {
    return undefined
  }
}

/**
 * Build the model request for one body.
 * @param selection - default model selection.
 * @param system - locale-specific naming instruction.
 * @param tokens - theme tokens, forwarded verbatim as the user turn.
 * @returns `llm.stream` options.
 */
function nameRequest(
  selection: ModelSelection & { provider: string; model: string },
  system: string,
  tokens: unknown,
): Record<string, unknown> {
  return {
    provider: selection.provider,
    model: selection.model,
    ...selection.reasoningEffort === undefined ? {} : { reasoningEffort: selection.reasoningEffort },
    system,
    messages: [{ role: 'user', content: [{ type: 'text', text: JSON.stringify(tokens ?? {}) }] }],
    temperature: 0.85,
    maxTokens: 320,
  }
}

/**
 * Drain one model stream into the assistant text.
 * @param llm - host llm service.
 * @param options - `llm.stream` options.
 * @returns the accumulated text, or a failure code and detail.
 */
async function collect(
  llm: NonNullable<NameServices['llm']>,
  options: Record<string, unknown>,
): Promise<{ text: string } | { code: 'failed'; detail?: string }> {
  let text = ''
  for await (const chunk of llm.stream(options)) {
    if (chunk.type === 'text-delta' && typeof chunk.text === 'string') {
      text += chunk.text
      continue
    }
    if (chunk.type !== 'finish') continue
    const kind = chunk.reason?.kind
    if (kind === 'error' || kind === 'aborted') {
      return { code: 'failed', detail: chunk.reason?.failure?.message ?? kind }
    }
  }
  return { text }
}

/**
 * Create the route, resolving services per request so a late-mounted model
 * service is picked up without re-registering.
 * @param ctx - plugin context.
 * @returns the route the web server dispatches to.
 */
function makeNameRoute(ctx: Context): RouteLike {
  return {
    kind: 'exact',
    path: NAME_ROUTE,
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        writeJson(res, 405, { ok: false, code: 'bad-request', detail: 'POST only' })
        return
      }
      const body = await readJsonBody(req)
      if (body === undefined) {
        writeJson(res, 400, { ok: false, code: 'bad-request', detail: 'invalid JSON body' })
        return
      }
      const services = ctx as unknown as NameServices
      const llm = services.llm
      const selection = services.agentDefaultModel?.currentSelection()
      if (llm === undefined || services.agentDefaultModel === undefined) {
        writeJson(res, 200, { ok: false, code: 'unavailable' })
        return
      }
      if (selection?.provider === undefined || selection.model === undefined) {
        writeJson(res, 200, { ok: false, code: 'no-model' })
        return
      }
      const locale = body.locale === 'en' ? 'en' : 'zh'
      const result = await collect(
        llm,
        nameRequest(
          { ...selection, provider: selection.provider, model: selection.model },
          SYSTEM_PROMPTS[locale] ?? SYSTEM_PROMPTS.zh,
          body.tokens,
        ),
      )
      if ('code' in result) {
        writeJson(res, 200, { ok: false, ...result })
        return
      }
      writeJson(res, 200, { ok: true, text: result.text })
    },
  }
}

/**
 * Register the naming route for the lifetime of this plugin.
 * @param ctx - host context; `webServer` is guaranteed by `inject`.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.webServer.register(makeNameRoute(ctx)), 'dsh-freestyle-theme: name route')
}
