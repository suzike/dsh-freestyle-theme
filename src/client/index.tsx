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
import { DICTIONARIES, format, type Translate } from './locale'
import { defaultSpec, fullPalette, generateTokens, normalizeSpec, type ThemeSpec } from './palette'
import {
  OverrideOwner,
  readJson,
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
 * Build a translator. `locale.register(ns, dicts)` is the documented shape;
 * older harnesses take `(ns, locale, dict)`, so both are attempted and a bare
 * dictionary fallback keeps the panel readable if neither exists.
 */
function makeTranslator(ctx: PluginContext): Translate {
  const locale = service<LocaleService>(ctx, 'locale')
  const preferZh = (navigator.language || 'zh').toLowerCase().startsWith('zh')
  let bound: (key: string, vars?: Record<string, string | number>) => string = (key) => key

  try {
    locale?.register?.(name, DICTIONARIES)
  } catch {
    /* registration is best-effort */
  }
  try {
    const candidate = locale?.bind?.(name)
    if (typeof candidate === 'function') bound = candidate as typeof bound
  } catch {
    /* fall through to the local dictionary */
  }

  return (key, vars) => {
    const raw = bound(key, vars) ?? key
    if (raw !== key) return format(raw, vars)
    const dictionary = preferZh ? DICTIONARIES.zh : DICTIONARIES.en
    return format(dictionary[key] ?? DICTIONARIES.zh[key] ?? key, vars)
  }
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

  const palette = useMemo(() => fullPalette(spec), [spec])

  /* Apply the stored theme once the panel mounts. */
  useEffect(() => {
    const stored = readJson<Record<string, unknown>>(STORAGE_SPEC)
    if (!stored) return
    const next = normalizeSpec(stored)
    owner.set(generateTokens(next))
    setSpec(next)
    setApplied(true)
    return () => owner.dispose()
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
      setSpec(next)
      setApplied(true)
      writeJson(STORAGE_SPEC, next)
      window.dispatchEvent(
        new CustomEvent(APPLIED_EVENT, {
          detail: { spec: next as unknown as Record<string, unknown>, name: themeName },
        }),
      )
    },
    [],
  )

  const swatches = [
    palette['--dsw-alias-bg-base'],
    palette['--dsw-alias-brand-primary'],
    palette['--dsw-specific-sidebar-fill'],
    palette['--dsw-alias-bg-layer-1'],
  ]

  const summary = `${spec.mode === 'light' ? t('studio.light') : t('studio.dark')} · ${Math.round(spec.th)}° · ${t('color.primary')}`

  return (
    <div className="ft-row">
      <div className="ft-row-main">
        <span className="ft-row-thumb" aria-hidden="true">
          {swatches.map((color, index) => (
            <i key={index} style={{ background: color ?? 'transparent' }} />
          ))}
        </span>
        <span style={{ display: 'grid', gap: 1, minWidth: 0 }}>
          <span className="ft-row-title">{t('plugin.title')}</span>
          <span className="ft-row-hint">{summary}</span>
        </span>
      </div>

      <span className="ft-row-actions">
        <button className="ft-btn ft-btn-sm" onClick={() => setOpen(true)}>
          {applied ? t('row.applied') : t('row.open')}
        </button>
      </span>

      {open && (
        <Studio
          t={t}
          theme={theme}
          initial={spec}
          onApplied={onApplied}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

/** Cordis-style apply. */
export function apply(ctx: PluginContext): void {
  const t = makeTranslator(ctx)
  const theme = service<ThemeService>(ctx, 'theme')
  const owner = new OverrideOwner(theme, 'dsh-freestyle-theme')

  if (typeof ctx.effect === 'function') {
    ctx.effect(() => ensureStyles(), 'dsh-freestyle-theme: styles')
    ctx.effect(() => () => owner.dispose(), 'dsh-freestyle-theme: overrides')
  } else {
    ensureStyles()
  }

  const slots = service<SlotsService>(ctx, 'slots')
  if (!slots?.inject || !slots.register) return
  const register = slots.register.bind(slots)

  slots.inject('settings.general.item', () => {
    register(
      { name: 'settings.general.item', id: ROW_ID, order: 60, label: 'Dsh-freestyle-theme' },
      () => <SettingsRow ctx={ctx} t={t} theme={theme} owner={owner} />,
    )
  })
}
