/**
 * The studio: a full-window theme editor.
 *
 * Layout follows docs/design-system.md — a 56px header, an icon rail, a library
 * column, the canvas, and a 320px inspector. The canvas is the product: a
 * 1:1 replica of the shell, with a compare slider, vision simulation and token
 * inspection, because a palette is only credible once it is seen in context.
 *
 * @module dsh-freestyle-theme/client/studio
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FC, type ReactNode } from 'react'
import {
  autoFixContrast,
  auditPalette,
  auditSummary,
  type PairResult,
} from './contrast'
import {
  clamp,
  decodeShare,
  defaultSpec,
  encodeShare,
  exportCss,
  fullPalette,
  generateTokens,
  HUE_STOPS,
  hueStopIndex,
  normalizeSpec,
  oklchToHex,
  presetSpec,
  PRESETS,
  type ChannelKey,
  type Palette,
  type ThemeSpec,
  type Tier,
} from './palette'
import { aiCandidates, localCandidates, presetCandidates, themeFromImage, type Swatch } from './generate'
import { PreviewFrame, VisionFilters, type BlindMode, type InspectTarget, type PreviewView } from './preview'
import { format, type Translate } from './locale'
import {
  fetchLibrary,
  fetchName,
  OverrideOwner,
  readJson,
  removeKey,
  saveLibrary,
  STORAGE_LIBRARY,
  STORAGE_SPEC,
  writeJson,
  type StoredTheme,
  type ThemeService,
} from './services'

/** Override sources: one for the applied theme, one for the live preview. */
export const SOURCE_APPLIED = 'dsh-freestyle-theme'
export const SOURCE_STUDIO = 'dsh-freestyle-theme/studio'

export interface StudioProps {
  t: Translate
  theme: ThemeService | undefined
  initial: ThemeSpec
  /** Called after Apply, so the settings row can refresh its summary. */
  onApplied?: (spec: ThemeSpec, name: string) => void
  onClose: () => void
}

interface IconProps {
  name: string
  size?: number
}

/** 16px stroke icons, tinted by `currentColor`. */
const Ico: FC<IconProps> = ({ name, size = 16 }) => {
  const paths: Record<string, ReactNode> = {
    undo: <path d="M4 9h8a4 4 0 0 1 0 8H8M4 9l3-3M4 9l3 3" />,
    redo: <path d="M20 9h-8a4 4 0 0 0 0 8h4M20 9l-3-3M20 9l-3 3" />,
    close: <path d="M5 5l14 14M19 5L5 19" />,
    share: <path d="M12 4v10M8 7l4-3 4 3M6 14v5h12v-5" />,
    check: <path d="M4 12l5 5L20 6" />,
    lock: <path d="M6 10h12v10H6zM9 10V7a3 3 0 0 1 6 0v3" />,
    unlock: <path d="M6 10h12v10H6zM9 10V7a3 3 0 0 1 5.8-1" />,
    chevron: <path d="M9 6l6 6-6 6" />,
    sun: <path d="M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />,
    moon: <path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z" />,
    grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
    library: <path d="M4 5h4v14H4zM10 5h4v14h-4zM16 6l3 .8-2.2 12-3-.8z" />,
    save: <path d="M5 4h11l3 3v13H5zM8 4v6h7V4M8 15h8" />,
    trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
    sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
    scan: <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M8 12h8" />,
    eye: <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    image: <path d="M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5" />,
    wand: <path d="M4 20L16 8M14 6l2-2M18 10l2-2M9 4l1 2M4 9l2 1" />,
    contrast: <path d="M12 3a9 9 0 1 0 0 18z" />,
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.check}
    </svg>
  )
}

/* ── small controls ──────────────────────────────────────────────────────── */

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  track?: string
  formatValue?: (value: number) => string
  onChange: (value: number) => void
}

/** Slider + a draggable numeric readout (the pro shortcut). */
const Slider: FC<SliderProps> = ({ label, value, min, max, step, track, formatValue, onChange }) => {
  const dragRef = useRef<{ startX: number; startValue: number } | null>(null)

  const onPointerDown = (event: React.PointerEvent<HTMLSpanElement>): void => {
    dragRef.current = { startX: event.clientX, startValue: value }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: React.PointerEvent<HTMLSpanElement>): void => {
    const drag = dragRef.current
    if (!drag) return
    const scale = event.shiftKey ? 10 : 1
    const delta = ((event.clientX - drag.startX) / 120) * (max - min) * scale
    onChange(clamp(+(drag.startValue + delta).toFixed(4), min, max))
  }
  const onPointerUp = (): void => {
    dragRef.current = null
  }

  return (
    <div className="ft-slider">
      <div className="ft-slider-top">
        <span>{label}</span>
        <span
          className="ft-slider-val"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          title="拖拽微调 · Shift 加速"
        >
          {formatValue ? formatValue(value) : value.toFixed(3)}
        </span>
      </div>
      <input
        className="ft-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ ['--ft-track' as string]: track } as CSSProperties}
        aria-label={label}
      />
    </div>
  )
}

interface SectionProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  extra?: ReactNode
}

const Section: FC<SectionProps> = ({ title, children, defaultOpen = true, extra }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="ft-sect">
      <button className="ft-sect-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Ico name="chevron" size={13} />
        <span>{title}</span>
        <span className="ft-spacer" />
        {extra}
      </button>
      {open && <div className="ft-sect-body">{children}</div>}
    </div>
  )
}

interface SwatchProps {
  palette: Palette
  token: string
  size?: number
}

const SwatchChip: FC<SwatchProps> = ({ palette, token, size = 20 }) => (
  <span
    className="ft-swatch"
    style={{ background: palette[token] ?? 'transparent', width: size, height: size }}
    title={token}
  />
)

/* ── channel row ─────────────────────────────────────────────────────────── */

interface ChannelProps {
  t: Translate
  title: string
  palette: Palette
  hue: number
  chroma: number
  light: number
  locked: boolean
  maxChroma: number
  onHue: (value: number) => void
  onChroma: (value: number) => void
  onLight: (value: number) => void
  onLock: () => void
}

const Channel: FC<ChannelProps> = ({
  t,
  title,
  palette,
  hue,
  chroma,
  light,
  locked,
  maxChroma,
  onHue,
  onChroma,
  onLight,
  onLock,
}) => {
  const hex = oklchToHex(light, chroma, hue)
  const hueStops = HUE_STOPS.map((stop) => oklchToHex(0.72, Math.min(chroma, 0.14), stop)).join(',')
  const activeStop = HUE_STOPS[hueStopIndex(hue)]

  return (
    <div className="ft-chan">
      <div className="ft-chan-head">
        <span className="ft-chan-sw" style={{ background: hex }} />
        <span>{title}</span>
        <span className="ft-chan-hex">{hex}</span>
        <button
          className="ft-lock"
          aria-pressed={locked}
          aria-label={locked ? t('a11y.locked') : t('canvas.inspect')}
          onClick={onLock}
        >
          <Ico name={locked ? 'lock' : 'unlock'} size={12} />
        </button>
      </div>

      <div className="ft-hues">
        {HUE_STOPS.map((stop) => (
          <button
            key={stop}
            aria-pressed={stop === activeStop}
            aria-label={`${t('axis.hue')} ${stop}`}
            style={{ background: oklchToHex(0.7, Math.min(chroma, 0.16), stop) }}
            onClick={() => !locked && onHue(stop)}
          />
        ))}
      </div>

      <Slider
        label={t('axis.hue')}
        value={hue}
        min={0}
        max={360}
        step={1}
        track={`linear-gradient(90deg, ${hueStops}, ${HUE_STOPS[0] ? oklchToHex(0.72, Math.min(chroma, 0.14), 360) : ''})`}
        formatValue={(value) => `${Math.round(value)}°`}
        onChange={(value) => !locked && onHue(value)}
      />
      <Slider
        label={t('axis.chroma')}
        value={chroma}
        min={0}
        max={maxChroma}
        step={0.002}
        track={`linear-gradient(90deg, ${oklchToHex(light, 0, hue)}, ${oklchToHex(light, maxChroma, hue)})`}
        formatValue={(value) => value.toFixed(3)}
        onChange={(value) => !locked && onChroma(value)}
      />
      <Slider
        label={t('axis.light')}
        value={light}
        min={0.04}
        max={0.99}
        step={0.004}
        track={`linear-gradient(90deg, ${oklchToHex(0.04, chroma, hue)}, ${oklchToHex(0.5, chroma, hue)}, ${oklchToHex(0.99, chroma, hue)})`}
        formatValue={(value) => value.toFixed(2)}
        onChange={(value) => !locked && onLight(value)}
      />
      <div className="ft-swatches" style={{ marginTop: 4 }}>
        <SwatchChip palette={palette} token="--dsw-alias-bg-base" />
        <SwatchChip palette={palette} token="--dsw-alias-bg-layer-1" />
        <SwatchChip palette={palette} token="--dsw-alias-bg-layer-2" />
        <SwatchChip palette={palette} token="--dsw-alias-bg-overlay" />
        <SwatchChip palette={palette} token="--dsw-alias-border-l2" />
        <SwatchChip palette={palette} token="--dsw-alias-label-secondary" />
        <SwatchChip palette={palette} token="--dsw-alias-brand-primary" />
      </div>
    </div>
  )
}

/* ── audit rows ──────────────────────────────────────────────────────────── */

const AuditRow: FC<{ t: Translate; result: PairResult }> = ({ t, result }) => (
  <div className="ft-audit-row" data-pass={result.pass} title={`${result.fg} on ${result.bg}`}>
    <span
      className="ft-audit-dot"
      style={{
        background: result.pass
          ? 'var(--dsw-alias-state-success-primary, #16a34a)'
          : 'var(--dsw-alias-state-error-primary, #dc2626)',
      }}
    />
    <span>{t(`audit.${result.id}`)}</span>
    <span className="ft-audit-num">
      <b>{result.ratio.toFixed(1)}</b> / {result.minRatio} · {result.lc.toFixed(0)}/{result.minLc} Lc
    </span>
  </div>
)

/* ── theme card ──────────────────────────────────────────────────────────── */

interface ThemeCardProps {
  name: string
  subtitle?: string
  light: Palette
  dark: Palette
  selected: boolean
  onSelect: () => void
  onDelete?: () => void
  deleteLabel?: string
}

const ThemeCard: FC<ThemeCardProps> = ({ name, subtitle, light, dark, selected, onSelect, onDelete, deleteLabel }) => {
  const l = light['--dsw-alias-bg-base'] ?? '#fff'
  const d = dark['--dsw-alias-bg-base'] ?? '#111'
  const accent = light['--dsw-alias-brand-primary'] ?? '#888'
  return (
    <div className="ft-card" role="button" tabIndex={0} aria-selected={selected} onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <span className="ft-card-sw">
        <i style={{ background: l }} />
        <i style={{ background: d }} />
        <i style={{ background: accent }} />
        <i style={{ background: light['--dsw-specific-sidebar-fill'] ?? l }} />
      </span>
      <span className="ft-card-main">
        <span className="ft-card-name">{name}</span>
        {subtitle && <span className="ft-card-sub">{subtitle}</span>}
      </span>
      {onDelete && (
        <button
          className="ft-card-del"
          aria-label={deleteLabel ?? 'delete'}
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
        >
          <Ico name="trash" size={12} />
        </button>
      )}
    </div>
  )
}

/* ── studio ──────────────────────────────────────────────────────────────── */

export const Studio: FC<StudioProps> = ({ t, theme, initial, onApplied, onClose }) => {
  const [history, setHistory] = useState<ThemeSpec[]>([initial])
  const [cursor, setCursor] = useState(0)
  const spec = history[cursor]

  const [name, setName] = useState(t('studio.name'))
  const [view, setView] = useState<PreviewView>('chat')
  const [zoom, setZoom] = useState(1)
  const [compare, setCompare] = useState(false)
  const [split, setSplit] = useState(50)
  const [inspect, setInspect] = useState(false)
  const [hit, setHit] = useState<InspectTarget | null>(null)
  const [blind, setBlind] = useState<BlindMode>('none')
  const [railTab, setRailTab] = useState<'templates' | 'library'>('templates')
  const [search, setSearch] = useState('')
  const [library, setLibrary] = useState<StoredTheme[]>([])
  const [hostDown, setHostDown] = useState(false)
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [cmdQuery, setCmdQuery] = useState('')
  const [genOpen, setGenOpen] = useState(false)
  const [genPrompt, setGenPrompt] = useState('')
  const [genBusy, setGenBusy] = useState(false)
  const [genCandidates, setGenCandidates] = useState<ThemeSpec[]>([])
  const [genChars, setGenChars] = useState<Swatch[]>([])
  const [genPreview, setGenPreview] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const [appliedSpec, setAppliedSpec] = useState<ThemeSpec | null>(null)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const previousFocus = useRef<Element | null>(null)
  const owner = useMemo(() => new OverrideOwner(theme, SOURCE_STUDIO), [theme])

  const palette = useMemo(() => fullPalette(spec), [spec])
  const results = useMemo(() => auditPalette(palette), [palette])
  const summary = useMemo(() => auditSummary(results), [results])
  const selectedStop = HUE_STOPS[hueStopIndex(spec.th)]
  const otherMode = spec.mode === 'light' ? 'dark' : 'light'
  const baseline = appliedSpec ?? defaultSpec(spec.mode)
  const baselinePalette = useMemo(() => fullPalette(baseline), [baseline])

  const flash = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    setToast({ text, tone })
    window.setTimeout(() => setToast(null), 2000)
  }, [])

  /* live preview: everything, including this studio's chrome, follows the spec */
  useEffect(() => {
    owner.set(generateTokens(spec))
    return () => owner.dispose()
  }, [owner, spec])

  /* history helpers */
  const commit = useCallback(
    (next: ThemeSpec) => {
      setHistory((current) => {
        const head = current.slice(0, cursor + 1)
        const last = head[head.length - 1]
        if (last && JSON.stringify(last) === JSON.stringify(next)) return head
        return [...head, next].slice(-50)
      })
      setCursor((value) => Math.min(value + 1, 49))
    },
    [cursor],
  )

  const patch = useCallback(
    (changes: Partial<ThemeSpec>) => commit({ ...spec, ...changes }),
    [commit, spec],
  )

  const undo = useCallback(() => setCursor((value) => Math.max(0, value - 1)), [])
  const redo = useCallback(() => setCursor((value) => Math.min(history.length - 1, value + 1)), [history.length])

  /* restore library */
  useEffect(() => {
    let alive = true
    const local = readJson<StoredTheme[]>(STORAGE_LIBRARY) ?? []
    setLibrary(local)
    void fetchLibrary().then((remote) => {
      if (!alive) return
      if (remote === null) setHostDown(true)
      else if (remote.length > 0) setLibrary(remote)
    })
    return () => {
      alive = false
    }
  }, [])

  /* stored applied spec, for the compare baseline */
  useEffect(() => {
    const stored = readJson<Record<string, unknown>>(STORAGE_SPEC)
    if (stored) setAppliedSpec(normalizeSpec(stored))
  }, [])

  /* focus management */
  useEffect(() => {
    previousFocus.current = document.activeElement
    const timer = window.setTimeout(() => {
      const first = rootRef.current?.querySelector<HTMLElement>(
        '.ft-head button, .ft-name, .ft-head input',
      )
      first?.focus()
    }, 30)
    return () => {
      window.clearTimeout(timer)
      const back = previousFocus.current as HTMLElement | null
      back?.focus?.()
    }
  }, [])

  const close = useCallback(() => {
    setClosing(true)
    // Restore whatever was applied before the studio opened; without this the
    // preview would outlive the panel.
    const stored = readJson<Record<string, unknown>>(STORAGE_SPEC)
    const appliedOwner = new OverrideOwner(theme, SOURCE_APPLIED)
    appliedOwner.set(stored ? generateTokens(normalizeSpec(stored)) : null)
    window.setTimeout(() => {
      owner.dispose()
      onClose()
    }, 170)
  }, [onClose, owner, theme])

  const apply = useCallback(() => {
    const tokens = generateTokens(spec)
    const appliedOwner = new OverrideOwner(theme, SOURCE_APPLIED)
    const ok = appliedOwner.set(tokens)
    writeJson(STORAGE_SPEC, spec)
    // The studio owner would otherwise be disposed with the panel; keep the
    // preview source as the live owner when the theme service rotates it.
    owner.set(tokens)
    setAppliedSpec(spec)
    flash(ok ? t('msg.applied') : t('err.noTheme'), ok ? 'ok' : 'error')
    onApplied?.(spec, name)
  }, [flash, name, onApplied, owner, spec, t, theme])

  const reset = useCallback(() => {
    removeKey(STORAGE_SPEC)
    commit(defaultSpec(spec.mode))
    flash(t('msg.reset'))
  }, [commit, flash, spec.mode, t])

  const fixContrast = useCallback(() => {
    const fixed = autoFixContrast(spec)
    commit(fixed.spec)
    const after = auditSummary(fixed.results)
    flash(
      after.passed === after.total ? format(t('a11y.fixed'), { n: fixed.steps }) : t('a11y.best'),
      after.passed === after.total ? 'ok' : 'error',
    )
  }, [commit, flash, spec, t])

  const saveTheme = useCallback(() => {
    const now = Date.now()
    const entry: StoredTheme = {
      id: `t${now.toString(36)}`,
      name: name.trim() || t('studio.name'),
      spec: spec as unknown as Record<string, unknown>,
      createdAt: now,
      updatedAt: now,
    }
    const next = [entry, ...library].slice(0, 60)
    setLibrary(next)
    writeJson(STORAGE_LIBRARY, next)
    void saveLibrary(next).then((ok) => {
      setHostDown(!ok)
      flash(ok ? t('msg.saved') : t('err.noHost'), ok ? 'ok' : 'error')
    })
  }, [flash, library, name, spec, t])

  const deleteTheme = useCallback(
    (id: string) => {
      const next = library.filter((entry) => entry.id !== id)
      setLibrary(next)
      writeJson(STORAGE_LIBRARY, next)
      void saveLibrary(next)
      flash(t('msg.deleted'))
    },
    [flash, library, t],
  )

  const shuffle = useCallback(() => {
    commit(presetCandidates(1)[0])
    flash(t('row.shuffle'))
  }, [commit, flash, t])

  const askAiName = useCallback(async () => {
    const result = await fetchName(spec as unknown as Record<string, unknown>, navigator.language)
    if (result) {
      setName(result.name)
      flash(result.name)
    } else {
      const hueName = t(`hue.${selectedStop}`)
      setName(`${hueName} · ${Math.round(spec.th)}°`)
      flash(t('err.noLlm'))
    }
  }, [flash, selectedStop, spec, t])

  const runImage = useCallback(
    async (file: File) => {
      setGenBusy(true)
      try {
        const { spec: next, swatches, preview } = await themeFromImage(file, spec.mode)
        setGenCandidates([next, ...localCandidates('image', otherMode).slice(0, 3)])
        setGenChars(swatches)
        setGenPreview(preview)
        flash(format(t('generate.done'), { n: 4 }))
      } catch {
        flash(t('generate.failed'), 'error')
      } finally {
        setGenBusy(false)
      }
    },
    [flash, otherMode, spec.mode, t],
  )

  const runPrompt = useCallback(async () => {
    if (!genPrompt.trim()) {
      flash(t('generate.empty'), 'error')
      return
    }
    setGenBusy(true)
    try {
      const { specs, source } = await aiCandidates(genPrompt, 4)
      setGenCandidates(specs)
      if (specs.length === 0) flash(t('generate.failed'), 'error')
      else if (source === 'local') flash(t('err.noLlm'))
      else flash(format(t('generate.done'), { n: specs.length }))
    } catch {
      flash(t('generate.failed'), 'error')
    } finally {
      setGenBusy(false)
    }
  }, [flash, genPrompt, t])

  /* keyboard: undo/redo, command palette, zoom, save, esc */
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const meta = event.metaKey || event.ctrlKey
      if (event.key === 'Escape') {
        if (cmdOpen) {
          setCmdOpen(false)
          return
        }
        if (shareOpen || genOpen) {
          setShareOpen(false)
          setGenOpen(false)
          return
        }
        event.preventDefault()
        close()
        return
      }
      if (!meta) return
      const key = event.key.toLowerCase()
      if (key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (key === 'k') {
        event.preventDefault()
        setCmdOpen(true)
      } else if (key === 's') {
        event.preventDefault()
        saveTheme()
      } else if (key === '=' || key === '+') {
        event.preventDefault()
        setZoom((value) => clamp(+(value + 0.1).toFixed(2), 0.5, 1.5))
      } else if (key === '-') {
        event.preventDefault()
        setZoom((value) => clamp(+(value - 0.1).toFixed(2), 0.5, 1.5))
      } else if (key === '0') {
        event.preventDefault()
        setZoom(1)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [close, cmdOpen, genOpen, redo, saveTheme, shareOpen, undo])

  /* focus trap */
  useEffect(() => {
    const onTab = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab' || !rootRef.current) return
      const nodes = rootRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
      )
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
    }
    window.addEventListener('keydown', onTab, true)
    return () => window.removeEventListener('keydown', onTab, true)
  }, [])

  /* compare split drag */
  const splitRef = useRef<HTMLDivElement | null>(null)
  const dragging = useRef(false)
  useEffect(() => {
    const move = (event: PointerEvent): void => {
      if (!dragging.current || !splitRef.current) return
      const rect = splitRef.current.getBoundingClientRect()
      setSplit(clamp(((event.clientX - rect.left) / rect.width) * 100, 3, 97))
    }
    const up = (): void => {
      dragging.current = false
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [])

  const presets = useMemo(
    () => PRESETS.filter((preset) => t(`preset.${preset.id}`).toLowerCase().includes(search.toLowerCase())),
    [search, t],
  )
  const mine = useMemo(
    () => library.filter((entry) => (entry.name ?? '').toLowerCase().includes(search.toLowerCase())),
    [library, search],
  )

  const commands = useMemo(
    () =>
      [
        { id: 'apply', label: t('studio.apply'), run: apply },
        { id: 'save', label: t('rail.save'), run: saveTheme },
        { id: 'shuffle', label: t('row.shuffle'), run: shuffle },
        { id: 'fix', label: t('a11y.fix'), run: fixContrast },
        { id: 'compare', label: t('canvas.compare'), run: () => setCompare(!compare) },
        { id: 'inspect', label: t('canvas.inspect'), run: () => setInspect(!inspect) },
        { id: 'share', label: t('studio.share'), run: () => setShareOpen(true) },
        { id: 'generate', label: t('generate.title'), run: () => setGenOpen(true) },
        { id: 'ai-name', label: t('generate.ai'), run: () => void askAiName() },
        { id: 'reset', label: t('msg.reset'), run: reset },
      ].filter((command) => command.label.toLowerCase().includes(cmdQuery.toLowerCase())),
    [
      apply,
      askAiName,
      cmdQuery,
      compare,
      fixContrast,
      inspect,
      reset,
      saveTheme,
      shuffle,
      t,
    ],
  )

  const channelProps = (channel: ChannelKey, hue: number, chroma: number, light: number, maxChroma: number) => ({
    t,
    title: t(`channel.${channel}`),
    palette,
    hue,
    chroma,
    light,
    locked: false,
    maxChroma,
    onHue: (value: number) => patch(channel === 'th' ? { th: value } : channel === 'th2' ? { th2: value } : { ths: value }),
    onChroma: (value: number) =>
      patch(channel === 'th' ? { c1: value } : channel === 'th2' ? { c2: value } : { sc: value }),
    onLight: (value: number) =>
      patch(channel === 'th' ? { l1: value } : channel === 'th2' ? { l2: value } : {}),
    onLock: () => undefined,
  })

  const tiers: Tier[] = [0, 1, 2]

  return (
    <div className={`ft-root ft-studio ${closing ? 'is-closing' : ''}`} ref={rootRef} role="dialog" aria-modal="true" aria-label={t('plugin.title')}>
      <VisionFilters />

      {/* header */}
      <header className="ft-head">
        <div className="ft-head-left">
          <button className="ft-btn ft-btn-icon ft-btn-ghost" aria-label={t('studio.close')} onClick={close}>
            <Ico name="close" />
          </button>
          <input
            className="ft-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label={t('studio.name')}
            spellCheck={false}
          />
          <span className={summary.passed === summary.total ? 'ft-badge ft-badge-ok' : 'ft-badge ft-badge-warn'}>
            {summary.passed === summary.total ? <Ico name="check" size={11} /> : <Ico name="contrast" size={11} />}
            {format(t('a11y.pass'), { pass: summary.passed, total: summary.total })}
          </span>
        </div>

        <div className="ft-head-mid">
          <button className="ft-btn ft-btn-icon ft-btn-ghost" aria-label={t('studio.light')} title={t('studio.light')}
            disabled={spec.mode === 'light'} onClick={() => patch({ mode: 'light' })}>
            <Ico name="sun" />
          </button>
          <div className="ft-seg" role="group" aria-label={t('studio.light')}>
            <button aria-pressed={spec.mode === 'light'} onClick={() => patch({ mode: 'light' })}>{t('studio.light')}</button>
            <button aria-pressed={spec.mode === 'dark'} onClick={() => patch({ mode: 'dark' })}>{t('studio.dark')}</button>
          </div>
          <button className="ft-btn ft-btn-icon ft-btn-ghost" aria-label={t('studio.dark')} title={t('studio.dark')}
            disabled={spec.mode === 'dark'} onClick={() => patch({ mode: 'dark' })}>
            <Ico name="moon" />
          </button>
          <span style={{ width: 6 }} />
          <button className="ft-btn ft-btn-icon ft-btn-ghost" aria-label={t('studio.undo')} onClick={undo} disabled={cursor === 0}>
            <Ico name="undo" />
          </button>
          <button className="ft-btn ft-btn-icon ft-btn-ghost" aria-label={t('studio.redo')} onClick={redo} disabled={cursor >= history.length - 1}>
            <Ico name="redo" />
          </button>
        </div>

        <div className="ft-head-right">
          <span style={{ fontSize: 10.5, color: 'var(--dsw-alias-label-tertiary)' }}>{t('studio.hint')}</span>
          <button className="ft-btn" onClick={() => setGenOpen(true)}>
            <Ico name="wand" />{t('generate.title')}
          </button>
          <button className="ft-btn ft-btn-icon" aria-label={t('studio.share')} onClick={() => setShareOpen(true)}>
            <Ico name="share" />
          </button>
          <button className="ft-btn ft-btn-primary" onClick={apply}>
            <Ico name="check" />{t('studio.apply')}
          </button>
        </div>
      </header>

      {/* body */}
      <div className={`ft-body ${railTab === 'library' ? '' : ''}`}>
        {/* rail */}
        <nav className="ft-rail" aria-label={t('rail.templates')}>
          <button className="ft-rail-btn" aria-pressed={railTab === 'templates'} onClick={() => setRailTab('templates')}>
            <Ico name="grid" /><span>{t('rail.templates')}</span>
          </button>
          <button className="ft-rail-btn" aria-pressed={railTab === 'library'} onClick={() => setRailTab('library')}>
            <Ico name="library" /><span>{t('rail.library')}</span>
          </button>
          <button className="ft-rail-btn" aria-pressed={inspect} onClick={() => setInspect(!inspect)}>
            <Ico name="scan" /><span>{t('canvas.inspect')}</span>
          </button>
          <button className="ft-rail-btn" aria-pressed={compare} onClick={() => setCompare(!compare)}>
            <Ico name="contrast" /><span>{t('canvas.compare')}</span>
          </button>
          <span className="ft-rail-spacer" />
          <button className="ft-rail-btn" onClick={() => setGenOpen(true)}>
            <Ico name="image" /><span>{t('generate.image')}</span>
          </button>
        </nav>

        {/* list */}
        <aside className="ft-list">
          <div className="ft-list-head">
            <h2>{railTab === 'templates' ? t('rail.templates') : t('rail.mine')}</h2>
            <span className="ft-list-count">{railTab === 'templates' ? PRESETS.length : library.length}</span>
            <span className="ft-spacer" style={{ flex: 1 }} />
            {railTab === 'library' && (
              <button className="ft-btn ft-btn-sm" onClick={saveTheme}>
                <Ico name="save" size={12} />{t('rail.save')}
              </button>
            )}
          </div>
          <div style={{ padding: '6px 8px 4px' }}>
            <input className="ft-input" placeholder={t('rail.search')} value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          {railTab === 'library' && hostDown && (
            <div style={{ padding: '0 10px 6px', fontSize: 10.5, lineHeight: 1.4, color: 'var(--dsw-alias-state-warn-label, #b45309)' }}>
              {t('err.noHost')}
            </div>
          )}
          <div className="ft-list-body">
            {railTab === 'templates' &&
              presets.map((preset) => {
                const lightPalette = fullPalette(presetSpec(preset, 'light'))
                const darkPalette = fullPalette(presetSpec(preset, 'dark'))
                const lightSpec = presetSpec(preset, 'light')
                return (
                  <ThemeCard
                    key={preset.id}
                    name={t(`preset.${preset.id}`)}
                    subtitle={`${Math.round(lightSpec.th)}° · ${t('channel.ths')}`}
                    light={lightPalette}
                    dark={darkPalette}
                    selected={hueStopIndex(spec.th) === hueStopIndex(lightSpec.th) && Math.abs(spec.c1 - lightSpec.c1) < 0.004}
                    onSelect={() => commit(presetSpec(preset, spec.mode))}
                  />
                )
              })}

            {railTab === 'library' && mine.length === 0 && (
              <div className="ft-list-empty">
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('rail.empty')}</div>
                <div>{t('rail.emptyHint')}</div>
              </div>
            )}

            {railTab === 'library' &&
              mine.map((entry) => {
                const entrySpec = normalizeSpec(entry.spec)
                return (
                  <ThemeCard
                    key={entry.id}
                    name={entry.name}
                    subtitle={new Date(entry.updatedAt).toLocaleDateString()}
                    light={fullPalette(switchModeSafe(entrySpec, 'light'))}
                    dark={fullPalette(switchModeSafe(entrySpec, 'dark'))}
                    selected={false}
                    onSelect={() => commit(entrySpec)}
                    onDelete={() => deleteTheme(entry.id)}
                    deleteLabel={t('rail.delete')}
                  />
                )
              })}
          </div>
        </aside>

        {/* canvas */}
        <main className="ft-canvas">
          <div className="ft-canvas-bar">
            <div className="ft-seg" role="group">
              {(['chat', 'list', 'form'] as PreviewView[]).map((item) => (
                <button key={item} aria-pressed={view === item} onClick={() => setView(item)}>
                  {t(`canvas.${item}`)}
                </button>
              ))}
            </div>
            <span className="ft-spacer" />
            <button className="ft-chip" aria-pressed={compare} onClick={() => setCompare(!compare)}>
              {t('canvas.compare')}: {compare ? `${Math.round(split)}%` : t('canvas.off')}
            </button>
            <button className="ft-chip" aria-pressed={inspect} onClick={() => setInspect(!inspect)}>
              <Ico name="scan" size={12} />{t('canvas.inspect')}
            </button>
            <select
              className="ft-chip"
              aria-label={t('canvas.blind')}
              value={blind}
              onChange={(event) => setBlind(event.target.value as BlindMode)}
              style={{ paddingRight: 4 }}
            >
              {(['none', 'deuteranopia', 'protanopia', 'tritanopia', 'achromatopsia'] as BlindMode[]).map((item) => (
                <option key={item} value={item}>{t(`canvas.blind.${item}`)}</option>
              ))}
            </select>
            <span style={{ width: 1, height: 18, background: 'var(--dsw-alias-border-l2)' }} />
            <button className="ft-btn ft-btn-icon ft-btn-ghost" aria-label={t('canvas.zoom')} onClick={() => setZoom((value) => clamp(+(value - 0.1).toFixed(2), 0.5, 1.5))}>−</button>
            <span style={{ fontSize: 11, color: 'var(--dsw-alias-label-secondary)', width: 34, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button className="ft-btn ft-btn-icon ft-btn-ghost" aria-label={t('canvas.zoom')} onClick={() => setZoom((value) => clamp(+(value + 0.1).toFixed(2), 0.5, 1.5))}>+</button>
          </div>

          <div className="ft-canvas-stage">
            <div className="ft-zoom">
              {compare ? (
                <div className="ft-cmp" ref={splitRef} style={{ ['--ft-split' as string]: `${split}%` } as CSSProperties}>
                  <div className="ft-zoom-inner" style={{ transform: `scale(${zoom})` }}>
                    <div className="ft-cmp-track" style={{ width: 720, height: 520 }}>
                      <div className="ft-cmp-base" aria-hidden="true">
                        <PreviewFrame t={t} spec={baseline} palette={baselinePalette} view={view} large blind={blind} />
                      </div>
                      <div className="ft-cmp-b">
                        <PreviewFrame t={t} spec={spec} palette={palette} view={view} large blind={blind} inspect={inspect} onInspect={setHit} />
                      </div>
                      <span className="ft-cmp-tag" style={{ left: 10 }}>{t('msg.reset')}</span>
                      <span className="ft-cmp-tag" style={{ right: 10 }}>{name}</span>
                      <div
                        className="ft-cmp-line"
                        role="separator"
                        aria-valuenow={Math.round(split)}
                        aria-valuemin={3}
                        aria-valuemax={97}
                        tabIndex={0}
                        onPointerDown={(event) => {
                          dragging.current = true
                          ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
                        }}
                        onKeyDown={(event) => {
                          const step = event.shiftKey ? 10 : 2
                          if (event.key === 'ArrowLeft') setSplit((value) => clamp(value - step, 3, 97))
                          if (event.key === 'ArrowRight') setSplit((value) => clamp(value + step, 3, 97))
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ft-zoom-inner" style={{ transform: `scale(${zoom})` }}>
                  <PreviewFrame
                    t={t}
                    spec={spec}
                    palette={palette}
                    view={view}
                    large
                    blind={blind}
                    inspect={inspect}
                    onInspect={setHit}
                  />
                </div>
              )}
            </div>
          </div>
        </main>

        {/* inspector */}
        <aside className="ft-insp" aria-label={t('inspector.color')}>
          <div className="ft-insp-body">
            <Section title={t('inspector.color')}>
              <Channel {...channelProps('th', spec.th, spec.c1, spec.l1, 0.37)} />
              <Channel {...channelProps('th2', spec.th2, spec.c2, spec.l2, 0.2)} />
              <Channel {...channelProps('ths', spec.ths, spec.sc, 0.7, 0.03)} />

              <Slider
                label={t('color.neutral')}
                value={spec.neutralTint}
                min={0}
                max={1}
                step={0.01}
                track={`linear-gradient(90deg, #9ca3af, ${oklchToHex(0.7, 0.031, spec.ths)})`}
                formatValue={(value) => value.toFixed(2)}
                onChange={(value) => patch({ neutralTint: value })}
              />
              <Slider
                label={t('color.contrast')}
                value={spec.spread}
                min={0.04}
                max={0.2}
                step={0.004}
                formatValue={(value) => value.toFixed(3)}
                onChange={(value) => patch({ spread: value })}
              />
              <Slider
                label={t('color.state')}
                value={spec.stateBoost}
                min={0.2}
                max={1.2}
                step={0.02}
                formatValue={(value) => `${value.toFixed(2)}×`}
                onChange={(value) => patch({ stateBoost: value })}
              />
              <Slider
                label={t('color.text')}
                value={spec.tx}
                min={0.03}
                max={0.99}
                step={0.004}
                track={`linear-gradient(90deg, #111, #f5f5f5)`}
                formatValue={(value) => value.toFixed(2)}
                onChange={(value) => patch({ tx: value })}
              />
              <Slider
                label={t('color.sidebar')}
                value={spec.sb}
                min={0.03}
                max={0.99}
                step={0.004}
                track={`linear-gradient(90deg, #111, #f5f5f5)`}
                formatValue={(value) => value.toFixed(2)}
                onChange={(value) => patch({ sb: value })}
              />

              <button className="ft-btn ft-btn-sm" onClick={shuffle}>
                <Ico name="sparkle" size={12} />{t('row.shuffle')}
              </button>
            </Section>

            <Section title={t('inspector.type')} defaultOpen={false}>
              <div className="ft-seg" role="group">
                {(['sans', 'serif', 'rounded'] as const).map((pair) => (
                  <button key={pair} aria-pressed={spec.fontPair === pair} onClick={() => patch({ fontPair: pair })}>
                    {t(`type.${pair}`)}
                  </button>
                ))}
              </div>
              <Slider
                label={t('type.scale')}
                value={spec.fontScale}
                min={0.9}
                max={1.15}
                step={0.01}
                formatValue={(value) => `${Math.round(value * 100)}%`}
                onChange={(value) => patch({ fontScale: value })}
              />
              <div style={{ fontSize: 10.5, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1.5 }}>{t('type.note')}</div>
            </Section>

            <Section title={t('inspector.shape')} defaultOpen={false}>
              <div style={{ display: 'grid', gap: 6 }}>
                <div className="ft-slider-top"><span>{t('shape.radius')}</span></div>
                <div className="ft-seg" role="group">
                  {tiers.map((tier) => (
                    <button key={tier} aria-pressed={spec.radius === tier} onClick={() => patch({ radius: tier })}>
                      {t(`tier.${tier}`)}
                    </button>
                  ))}
                </div>
                <div className="ft-slider-top"><span>{t('shape.shadow')}</span></div>
                <div className="ft-seg" role="group">
                  {tiers.map((tier) => (
                    <button key={tier} aria-pressed={spec.shadow === tier} onClick={() => patch({ shadow: tier })}>
                      {t(`tier.${tier}`)}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            <Section
              title={t('inspector.a11y')}
              extra={
                <span className={summary.passed === summary.total ? 'ft-badge ft-badge-ok' : 'ft-badge ft-badge-warn'}>
                  {summary.passed}/{summary.total}
                </span>
              }
            >
              <div className="ft-audit-head">
                <span className="ft-audit-score">
                  {format(t('a11y.pass'), { pass: summary.passed, total: summary.total })}
                </span>
                <button className="ft-btn ft-btn-sm" onClick={fixContrast}>
                  <Ico name="contrast" size={12} />{t('a11y.fix')}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 10.5, color: 'var(--dsw-alias-label-tertiary)' }}>
                <span>{t('a11y.wcag')} · 4.5:1 / 3:1</span>
                <span>{t('a11y.apca')} · Lc 60 / 45 / 30</span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--dsw-alias-label-tertiary)' }}>{t('a11y.locked')}</div>
              {summary.passed === summary.total && (
                <div style={{ fontSize: 10.5, color: 'var(--dsw-alias-state-success-primary, #16a34a)' }}>{t('a11y.fine')}</div>
              )}
              <div className="ft-audit-list">
                {results.map((result) => (
                  <AuditRow key={result.id} t={t} result={result} />
                ))}
              </div>
              {hit && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 10.5, color: 'var(--dsw-alias-label-tertiary)' }}>{t('a11y.element')}</div>
                  {hit.tokens.map((token) => (
                    <div key={token} style={{ fontSize: 10.5, fontFamily: 'ui-monospace, Menlo, monospace' }}>{token}</div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </aside>
      </div>

      {/* commands */}
      {cmdOpen && (
        <>
          <div className="ft-mask" style={{ background: 'transparent' }} onClick={() => setCmdOpen(false)} />
          <div className="ft-cmd" role="dialog" aria-modal="true" aria-label={t('studio.hint')}>
            <input
              className="ft-cmd-input"
              autoFocus
              placeholder={t('rail.search')}
              value={cmdQuery}
              onChange={(event) => setCmdQuery(event.target.value)}
            />
            <div className="ft-cmd-list">
              {commands.map((command) => (
                <button
                  key={command.id}
                  className="ft-cmd-item"
                  onClick={() => {
                    setCmdOpen(false)
                    command.run()
                  }}
                >
                  <Ico name="check" size={12} />
                  <span>{command.label}</span>
                  <kbd>↵</kbd>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* share */}
      {shareOpen && (
        <div className="ft-mask" onClick={() => setShareOpen(false)}>
          <div className="ft-dialog" role="dialog" aria-modal="true" aria-label={t('share.title')} onClick={(event) => event.stopPropagation()}>
            <div className="ft-dialog-head">
              <Ico name="share" size={14} />{t('share.title')}
              <span style={{ flex: 1 }} />
              <button className="ft-btn ft-btn-icon ft-btn-ghost" aria-label={t('studio.close')} onClick={() => setShareOpen(false)}>
                <Ico name="close" size={14} />
              </button>
            </div>
            <div className="ft-dialog-body">
              <input className="ft-input" readOnly value={encodeShare(spec, name)} onFocus={(event) => event.currentTarget.select()} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="ft-btn" onClick={() => void copy(encodeShare(spec, name), flash, t)}>{t('share.link')}</button>
                <button className="ft-btn" onClick={() => void copy(exportCss(spec, { ...spec, mode: otherMode }), flash, t)}>{t('share.css')}</button>
                <button className="ft-btn" onClick={() => void copy(JSON.stringify(spec, null, 2), flash, t)}>{t('share.json')}</button>
              </div>
              <div style={{ height: 1, background: 'var(--dsw-alias-border-l1)' }} />
              <div style={{ fontSize: 11, color: 'var(--dsw-alias-label-secondary)' }}>{t('share.import')}</div>
              <textarea
                className="ft-input ft-textarea"
                placeholder={t('share.importHint')}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return
                  const value = (event.target as HTMLTextAreaElement).value
                  const decoded = decodeShare(value)
                  if (decoded) {
                    commit(decoded.spec)
                    if (decoded.name) setName(decoded.name)
                    setShareOpen(false)
                    flash(t('share.imported'))
                  } else {
                    flash(t('share.invalid'), 'error')
                  }
                }}
                onBlur={(event) => {
                  const value = event.target.value.trim()
                  if (!value) return
                  const decoded = decodeShare(value)
                  if (decoded) {
                    commit(decoded.spec)
                    if (decoded.name) setName(decoded.name)
                    flash(t('share.imported'))
                  }
                }}
              />
            </div>
            <div className="ft-dialog-foot">
              <button className="ft-btn" onClick={() => setShareOpen(false)}>{t('studio.close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* generation */}
      {genOpen && (
        <div className="ft-mask" onClick={() => setGenOpen(false)}>
          <div className="ft-dialog" role="dialog" aria-modal="true" aria-label={t('generate.title')} onClick={(event) => event.stopPropagation()}>
            <div className="ft-dialog-head">
              <Ico name="wand" size={14} />{t('generate.title')}
              <span style={{ flex: 1 }} />
              <button className="ft-btn ft-btn-icon ft-btn-ghost" aria-label={t('studio.close')} onClick={() => setGenOpen(false)}>
                <Ico name="close" size={14} />
              </button>
            </div>
            <div className="ft-dialog-body">
              <label className="ft-drop" data-over={false}>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void runImage(file)
                  }}
                />
                {genPreview ? <img src={genPreview} alt="" /> : <Ico name="image" size={20} />}
                <span>{t('generate.imageHint')}</span>
              </label>

              {genChars.length > 0 && (
                <div className="ft-swatches">
                  {genChars.map((swatch, index) => (
                    <span key={`${swatch.hex}-${index}`} className="ft-swatch" style={{ background: swatch.hex, width: 26, height: 26 }} title={swatch.hex} />
                  ))}
                </div>
              )}

              <div className="ft-gen">
                <input
                  className="ft-input"
                  placeholder={t('generate.promptHint')}
                  value={genPrompt}
                  onChange={(event) => setGenPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void runPrompt()
                  }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="ft-btn ft-btn-primary" disabled={genBusy} onClick={() => void runPrompt()}>
                    <Ico name="sparkle" size={12} />{genBusy ? t('generate.running') : t('generate.run')}
                  </button>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 10.5, color: 'var(--dsw-alias-label-tertiary)', alignSelf: 'center' }}>{t('generate.local')}</span>
                </div>
              </div>

              {genCandidates.length > 0 && (
                <div className="ft-proposals">
                  {genCandidates.map((candidate, index) => {
                    const light = fullPalette({ ...candidate, mode: 'light' })
                    const dark = fullPalette({ ...candidate, mode: 'dark' })
                    return (
                      <ThemeCard
                        key={index}
                        name={`${Math.round(candidate.th)}°`}
                        subtitle={index === 0 && genChars.length > 0 ? t('generate.image') : `${candidate.c1.toFixed(3)}`}
                        light={light}
                        dark={dark}
                        selected={false}
                        onSelect={() => {
                          commit(candidate)
                          setGenOpen(false)
                        }}
                      />
                    )
                  })}
                </div>
              )}
            </div>
            <div className="ft-dialog-foot">
              <button className="ft-btn" onClick={() => setGenCandidates(presetCandidates(4))}>{t('row.shuffle')}</button>
              <button className="ft-btn" onClick={() => setGenOpen(false)}>{t('studio.close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* inspect tooltip */}
      {inspect && hit && (
        <div
          className="ft-inspect-tip"
          style={{
            left: clamp(hit.rect.left, 8, window.innerWidth - 280),
            top: clamp(hit.rect.top - 44, 8, window.innerHeight - 60),
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{hit.label}</div>
          {hit.tokens.slice(0, 4).map((token) => (
            <div key={token}><code>{token}</code></div>
          ))}
        </div>
      )}

      {toast && (
        <div className="ft-toast" data-tone={toast.tone === 'error' ? 'error' : 'ok'} role="status">
          <Ico name={toast.tone === 'error' ? 'close' : 'check'} size={13} />
          {toast.text}
        </div>
      )}
    </div>
  )
}

/** Local mode switch that tolerates a malformed stored spec. */
function switchModeSafe(spec: ThemeSpec, mode: 'light' | 'dark'): ThemeSpec {
  const base = mode === 'light' ? { bg: 0.955, tx: 0.14, sb: 0.976, l1: 0.52, l2: 0.6 } : { bg: 0.14, tx: 0.955, sb: 0.098, l1: 0.76, l2: 0.76 }
  return { ...spec, ...base, mode }
}

/** Clipboard write with a toast. */
async function copy(text: string, flash: (text: string, tone?: 'ok' | 'error') => void, t: Translate): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    flash(t('share.copied'))
  } catch {
    flash(t('msg.error'), 'error')
  }
}
