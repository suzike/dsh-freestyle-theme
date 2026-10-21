/**
 * Host services, declared locally.
 *
 * The plugin must not import any `@deepseek-ai/*` runtime package: the client
 * bundle is loaded into a shared browser page, and the loader's purity gate
 * rejects cross-package imports. So the small slice of each service we use is
 * declared here structurally, and every member is optional — a missing service
 * degrades the feature instead of breaking `apply()`.
 *
 * @module dsh-freestyle-theme/client/services
 */

/** One token's light/dark pair, as the theme service expects it. */
export interface TokenPair {
  light: string
  dark: string
}

/** Override map: custom property name → light/dark pair. */
export type TokenOverrides = Record<string, TokenPair>

/** Disposal handle returned by service registration calls. */
export type Disposable = () => void

/** `theme` service — only the override API we need. */
export interface ThemeService {
  /** Replace token values owned by `source`, atomically for both modes. */
  overrideTokens?: (source: string, overrides: TokenOverrides) => Disposable
  /** Current composed snapshot — used to read the built-in token table. */
  getTheme?: () => {
    themes?: Array<{ id?: string; colorScheme?: string; tokens?: Record<string, string> }>
    active?: { colorScheme?: string; tokens?: Record<string, string> }
  }
}

/** Options accepted by `slots.register`. */
export interface SlotRegisterOptions {
  /** Presentation hint for harnesses that render a label themselves. */
  label?: string
  /** Slot name, e.g. `settings.general.item`. */
  name: string
  /** Stable row id within the slot. */
  id?: string
  /** Sort order inside the slot. */
  order?: number
}

/** `slots` service. */
export interface SlotsService {
  inject?: (name: string, callback: () => void) => Disposable
  register?: (options: SlotRegisterOptions, component: () => unknown) => Disposable
}

/** `locale` service. */
export interface LocaleService {
  register?: (ns: string, dictionaries: Record<string, Record<string, string>>, defaultLocale?: string) => Disposable
  bind?: (ns: string) => (key: string) => string
}

/** Minimal cordis context shape used by this plugin. */
export interface PluginContext {
  get?: (name: string) => unknown
  [key: string]: unknown
}

/**
 * Resolve a service by name.
 *
 * `ctx.get(name)` is the documented accessor, but a bare property also exists
 * on some harness versions; trying both keeps the plugin working across them.
 */
export function service<T>(ctx: PluginContext, name: string): T | undefined {
  const viaGet = typeof ctx.get === 'function' ? (ctx.get(name) as T | undefined) : undefined
  if (viaGet) return viaGet
  // Cordis 4 throws when an undeclared service is read as a property, so the
  // fallback must be defensive: a missing service degrades, never crashes.
  try {
    return (ctx[name] as T | undefined) ?? undefined
  } catch {
    return undefined
  }
}

/** Token override bookkeeping: one live source per feature area. */
export class OverrideOwner {
  private applied: TokenOverrides | null = null
  private disposers: Disposable[] = []

  private theme: ThemeService | undefined
  private readonly source: string

  constructor(theme: ThemeService | undefined, source: string) {
    this.theme = theme
    this.source = source
  }

  /**
   * Attach the theme service once `ctx.inject` provides it, replaying any
   * overrides that were already computed.
   */
  attach(theme: ThemeService | undefined): void {
    if (!theme) return
    this.theme = theme
    if (this.applied) this.set(this.applied)
  }

  /** Apply (or clear, with `null`) this owner's overrides. */
  set(overrides: TokenOverrides | null): boolean {
    const theme = this.theme
    if (!theme?.overrideTokens) return false
    for (const dispose of this.disposers.splice(0)) {
      try {
        dispose()
      } catch {
        /* the service is gone; nothing to release */
      }
    }
    this.applied = overrides
    if (!overrides) return true
    try {
      const dispose = theme.overrideTokens(this.source, overrides)
      if (typeof dispose === 'function') this.disposers.push(dispose)
      return true
    } catch {
      return false
    }
  }

  /** Currently applied map, if any. */
  get current(): TokenOverrides | null {
    return this.applied
  }

  /** Release everything this owner holds. */
  dispose(): void {
    for (const dispose of this.disposers.splice(0)) {
      try {
        dispose()
      } catch {
        /* ignore */
      }
    }
    this.applied = null
  }
}

/* ── host HTTP ───────────────────────────────────────────────────────────── */

/** Route prefix served by this plugin's host half. */
export const API_BASE = '/api/dsh-freestyle-theme'

/** One saved theme as the host stores it. */
export interface StoredTheme {
  id: string
  name: string
  spec: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

/** Read the shared theme library from the host. */
export async function fetchLibrary(): Promise<StoredTheme[] | null> {
  try {
    const response = await fetch(`${API_BASE}/themes`, { headers: { accept: 'application/json' } })
    if (!response.ok) return null
    const body = (await response.json()) as { themes?: StoredTheme[] }
    return Array.isArray(body.themes) ? body.themes : []
  } catch {
    return null
  }
}

/** Replace the shared theme library. Returns success. */
export async function saveLibrary(themes: StoredTheme[]): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/themes`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ themes }),
    })
    return response.ok
  } catch {
    return false
  }
}

/** Ask the host's model to turn a description into theme candidates. */
export async function fetchGenerated(
  prompt: string,
  count: number,
): Promise<Record<string, unknown>[] | null> {
  try {
    const response = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, count }),
    })
    if (!response.ok) return null
    const body = (await response.json()) as { candidates?: Record<string, unknown>[] }
    return Array.isArray(body.candidates) ? body.candidates : null
  } catch {
    return null
  }
}

/** Ask the host's model for a name/tagline for a spec. */
export async function fetchName(
  spec: Record<string, unknown>,
  locale: string,
): Promise<{ name: string; tags: string[]; description: string } | null> {
  try {
    const response = await fetch(`${API_BASE}/name`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ spec, locale }),
    })
    if (!response.ok) return null
    const body = (await response.json()) as {
      name?: string
      tags?: string[]
      description?: string
    }
    if (!body.name) return null
    return {
      name: body.name,
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 5) : [],
      description: body.description ?? '',
    }
  } catch {
    return null
  }
}

/* ── local storage ───────────────────────────────────────────────────────── */

/** Persist the applied spec so the next launch can restore it instantly. */
export const STORAGE_SPEC = 'dsh-freestyle-theme/spec'
/** Persist the studio width preference. */
export const STORAGE_WIDE = 'dsh-freestyle-theme/wide'
/** Local mirror of the theme library, used when the host route is absent. */
export const STORAGE_LIBRARY = 'dsh-freestyle-theme/library'

/** Safe `localStorage` read (returns null when unavailable or malformed). */
export function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

/** Safe `localStorage` write. */
export function writeJson(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** Safe `localStorage` removal. */
export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
