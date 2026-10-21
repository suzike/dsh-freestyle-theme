/**
 * Client entry: one settings row, one full-window studio.
 *
 * The row stays deliberately light — three swatches, the theme name and a
 * launch affordance — so the settings list keeps its rhythm. Everything else
 * happens in the studio, which paints over the shell at `inset: 0`.
 *
 * @module dsh-freestyle-theme/client
 */

import { useCallback, useEffect, useMemo, useState, type FC } from 'react'
import { createPortal } from 'react-dom'
import { DICTIONARIES, format, type Translate } from './locale'
import { defaultSpec, fullPalette, normalizeSpec, type ThemeSpec } from './palette'
import { fullOverrides } from './retint'
import { auditPalette, auditSummary } from './contrast'
import {
  OverrideOwner,
  readJson,
  removeKey,
  service,
  STORAGE_SPEC,
  writeJson,
  type LocaleService,
  type PluginContext,
  type SlotsService,
  type ThemeService,
} from './services'
import { Studio } from './studio'
import { CSS, STYLE_ID } from './styles'

/** Package name, also the client module id. */
export const name = 'dsh-freestyle-theme'

/** Slots are the only service the shell must have for this plugin to load. */
export const inject = ['slots']

/** Fired after Apply so other rows (and this one) can refresh their summary. */
const APPLIED_EVENT = 'dsh-freestyle-theme/applied'
const ROW_ID = 'dsh-freestyle-theme'

/** Inject the stylesheet once; returns a disposer for `ctx.effect`. */
function ensureStyles(): () => void {
  if (typeof document === 'undefined') return () => undefined
  if (document.getElementById(STYLE_ID)) return () => undefined
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
  return () => {
    style.remove()
  }
}

/**
 * Build a translator.
 *
 * The `locale` service is optional: when the host exposes it we bind its
 * bundle, otherwise the shipped dictionary renders the row. `bind` is called
 * later, from inside `ctx.inject`, because a plugin may not read a service it
 * has not declared.
 */
function createTranslator(): { t: Translate; bind: (locale: LocaleService | undefined) => void } {
  const preferZh = (navigator.language || 'zh').toLowerCase().startsWith('zh')
  let bound: (key: string, vars?: Record<string, string | number>) => string = (key) => key

  const t: Translate = (key, vars) => {
    const raw = bound(key, vars) ?? key
    if (raw !== key) return format(raw, vars)
    const dictionary = preferZh ? DICTIONARIES.zh : DICTIONARIES.en
    return format(dictionary[key] ?? DICTIONARIES.zh[key] ?? key, vars)
  }

  const bind = (locale: LocaleService | undefined): void => {
    if (!locale) return
    try {
      locale.register?.(name, DICTIONARIES)
    } catch {
      /* registration is best-effort */
    }
    try {
      const candidate = locale.bind?.(name)
      if (typeof candidate === 'function') bound = candidate as typeof bound
    } catch {
      /* fall through to the local dictionary */
    }
  }

  return { t, bind }
}

interface RowProps {
  ctx: PluginContext
  t: Translate
  theme: ThemeService | undefined
  owner: OverrideOwner
}

/** The `settings.general.item` row. */
const SettingsRow: FC<RowProps> = ({ ctx, t, theme, owner }) => {
  const [spec, setSpec] = useState(() => {
    const stored = readJson<Record<string, unknown>>(STORAGE_SPEC)
    return stored ? normalizeSpec(stored) : defaultSpec('light')
  })
  const [open, setOpen] = useState(false)
  const [applied, setApplied] = useState(() => readJson<Record<string, unknown>>(STORAGE_SPEC) !== null)
  const [appliedName, setAppliedName] = useState('')

  const palette = useMemo(() => fullPalette(spec), [spec])

  /* Apply the stored theme once the panel mounts. */
  useEffect(() => {
    const stored = readJson<Record<string, unknown>>(STORAGE_SPEC)
    if (!stored) return
    const next = normalizeSpec(stored)
    owner.set(fullOverrides(theme, next))
    setSpec(next)
    setApplied(true)
    // No cleanup here: this override belongs to `apply()` and must survive the
    // settings page being unmounted or the row remounting.
  }, [owner])

  /* Keep every row instance in sync after Apply. */
  useEffect(() => {
    const onApplied = (event: Event): void => {
      const detail = (event as CustomEvent<{ spec?: Record<string, unknown> }>).detail
      if (!detail?.spec) return
      setSpec(normalizeSpec(detail.spec))
      setApplied(true)
    }
    window.addEventListener(APPLIED_EVENT, onApplied as EventListener)
    return () => window.removeEventListener(APPLIED_EVENT, onApplied as EventListener)
  }, [])

  const onApplied = useCallback(
    (next: ThemeSpec, themeName: string) => {
      owner.set(fullOverrides(theme, next))
      setSpec(next)
      setApplied(true)
      setAppliedName(themeName)
      writeJson(STORAGE_SPEC, next)
      window.dispatchEvent(
        new CustomEvent(APPLIED_EVENT, {
          detail: { spec: next as unknown as Record<string, unknown>, name: themeName },
        }),
      )
    },
    [owner],
  )

  const onClear = useCallback(() => {
    owner.set(null)
    removeKey(STORAGE_SPEC)
    setSpec(defaultSpec('light'))
    setApplied(false)
    setAppliedName('')
  }, [owner])

  const thumb = {
    side: palette['--dsw-specific-sidebar-fill'],
    card: palette['--dsw-alias-bg-layer-1'],
    line: palette['--dsw-alias-label-primary'],
    dot: palette['--dsw-alias-brand-primary'],
  }

  const score = auditSummary(auditPalette(palette))
  const summary = `${spec.mode === 'light' ? t('studio.light') : t('studio.dark')} · ${Math.round(spec.th)}° · ${score.passed}/${score.total}`

  return (
    <div className="ft-row">
      <span className="ft-row-thumb" aria-hidden="true">
        <i className="ft-thumb-side" style={{ background: thumb.side }} />
        <i className="ft-thumb-card" style={{ background: thumb.card }} />
        <i className="ft-thumb-line" style={{ background: thumb.line }} />
        <i className="ft-thumb-line-2" style={{ background: thumb.line }} />
        <i className="ft-thumb-dot" style={{ background: thumb.dot }} />
      </span>

      <div className="ft-row-main">
        <span className="ft-row-title">{t('plugin.title')}</span>
        <span className="ft-row-hint">{summary}</span>
      </div>

      <span className="ft-row-actions">
        <button
          className={applied ? 'ft-row-action is-on' : 'ft-row-action'}
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
        >
          {applied ? t('row.applied', { name: appliedName || t('plugin.title') }) : t('row.open')}
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path
              d="M4.5 2.5 8 6l-3.5 3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </span>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <Studio
            t={t}
            theme={theme}
            initial={spec}
            onApplied={onApplied}
            onClear={onClear}
            onClose={() => setOpen(false)}
          />,
          portalHost(),
        )}
    </div>
  )
}

/**
 * Where the studio mounts.
 *
 * A portalled node outside the host settings dialog loses every keystroke to
 * the dialog's focus trap, so prefer the dialog element itself: it escapes the
 * row's stacking context without leaving the modal subtree.
 */
function portalHost(): HTMLElement {
  const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]')
  return dialog ?? document.body
}

const SLOT_NAME = 'settings.general.item'
/** Bounded retries while the settings slot factory declares itself. */
const MAX_ROW_ATTEMPTS = 40
const ROW_RETRY_MS = 250

/** Report a non-fatal failure without ever breaking the host's boot. */
function reportFailure(stage: string, error: unknown): void {
  try {
    console.warn(`[dsh-freestyle-theme] ${stage} failed; the row degrades, the shell keeps booting`, error)
  } catch {
    /* console is best-effort */
  }
}

/**
 * Declare the settings row.
 *
 * `slots.inject` throws while a slot factory is still unregistered, which is
 * normal for a plugin loaded with `immediately: true` — the settings UI has
 * not declared `settings.general.item` on the first tick. Retrying a bounded
 * number of times turns that race into a slightly late row instead of a
 * failed entry that aborts the entire web boot.
 */
function mountSettingsRow(slots: SlotsService, render: () => unknown): void {
  const register = slots.register?.bind(slots)
  const inject = slots.inject?.bind(slots)
  if (!register || !inject) return

  let attempts = 0
  const attempt = (): void => {
    try {
      inject(SLOT_NAME, () => {
        try {
          register({ name: SLOT_NAME, id: ROW_ID, order: 60 }, render)
        } catch (error) {
          reportFailure('slot register', error)
        }
      })
    } catch (error) {
      attempts += 1
      if (attempts < MAX_ROW_ATTEMPTS) {
        setTimeout(attempt, ROW_RETRY_MS)
        return
      }
      reportFailure('slot inject', error)
    }
  }

  attempt()
}

/** Inject the studio stylesheet and wire disposal. */
function attachStyles(ctx: PluginContext, owner: OverrideOwner): void {
  if (typeof ctx.effect === 'function') {
    ctx.effect(() => ensureStyles(), 'dsh-freestyle-theme: styles')
    ctx.effect(() => () => owner.dispose(), 'dsh-freestyle-theme: overrides')
  } else {
    ensureStyles()
  }
}

/** Re-apply the persisted spec against a now-available theme service. */
function restoreTheme(theme: ThemeService | undefined, owner: OverrideOwner): void {
  const stored = readJson<Record<string, unknown>>(STORAGE_SPEC)
  if (!stored) return
  try {
    owner.set(fullOverrides(theme, normalizeSpec(stored)))
  } catch (error) {
    reportFailure('theme restore', error)
  }
}

/**
 * Cordis-style apply.
 *
 * Only `slots` is a hard dependency. `theme` and `locale` are consumed through
 * `ctx.inject`, so this entry activates even before either service exists —
 * reading an undeclared service throws in cordis 4 and used to abort the whole
 * web boot.
 */
export function apply(ctx: PluginContext): void {
  try {
    const { t, bind } = createTranslator()
    const owner = new OverrideOwner(undefined, 'dsh-freestyle-theme')
    attachStyles(ctx, owner)

    const slots = service<SlotsService>(ctx, 'slots')
    // Register the settings row right here: the slot ledger is claimed later by
    // `ui-settings-general`, so `slots.inject` must be called from the plugin's
    // own apply scope. Registering from inside a service-injected child scope
    // silently never fires.
    const readTheme = (): ThemeService | undefined => {
      try {
        return (ctx as any).get?.('theme') as ThemeService | undefined
      } catch {
        return undefined
      }
    }
    const mount = (): void => {
      if (!slots) return
      mountSettingsRow(slots, () => <SettingsRow ctx={ctx} t={t} theme={readTheme()} owner={owner} />)
    }
    // The row must register from apply's own scope; see mountSettingsRow().
    mount()

    const inject = (ctx as { inject?: (names: string[], cb: (scope: Record<string, unknown>) => void) => unknown }).inject
    if (typeof inject === 'function') {
      inject.call(ctx, ['theme', 'locale'], (scope) => {
        try {
          const theme = scope.theme as ThemeService | undefined
          bind(scope.locale as LocaleService | undefined)
          owner.attach(theme)
          restoreTheme(theme, owner)
        } catch (error) {
          reportFailure('service binding', error)
        }
      })
    } else {
      // Older harnesses allow direct reads; keep the plugin usable there.
      const theme = service<ThemeService>(ctx, 'theme')
      bind(service<LocaleService>(ctx, 'locale'))
      owner.attach(theme)
      restoreTheme(theme, owner)
    }
  } catch (error) {
    // A UI plugin must never abort the host's boot.
    reportFailure('apply', error)
  }
}
