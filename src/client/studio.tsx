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

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FC, type ReactNode } from 'react'
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
  HUE_STOPS,
  hueStopIndex,
  TRADITIONAL,
  traditionalSpec,
  normalizeSpec,
  oklchToHex,
  presetSpec,
  PRESETS,
  switchMode,
  type ChannelKey,
  type Palette,
  type ThemeSpec,
  type ThemeMode,
  type Tier,
} from './palette'
import { aiCandidates, localCandidates, presetCandidates, themeFromImage, type Swatch } from './generate'
import { PreviewFrame, VisionFilters, type BlindMode, type InspectTarget, type PreviewView } from './preview'
import { format, type Translate } from './locale'
import { detectChromeTop, isViewportAnchored } from './chrome'
import { fullOverrides } from './retint'
import { vividnessOf, vividnessScore } from './vividness'
import {
  API_BASE,
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
  /** Clear the applied override and its stored spec. */
  onClear?: () => void
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
    grid: <path d="M4 5h16v14H4zM4 10h16M10 10v9" />,
    brush: <path d="M4 20c3 0 4-2 4-4l6-9 4 3-6 9c-1 1-3 1-4 1zM15 5l2-2 4 3-2 2" />,
    library: <path d="M4 5h4v14H4zM10 5h4v14h-4zM16 6l3 .8-2.2 12-3-.8z" />,
    save: <path d="M5 4h11l3 3v13H5zM8 4v6h7V4M8 15h8" />,
    trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
    pencil: <path d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4" />,
    sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
    scan: <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M8 12h8" />,
    eye: <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    image: <path d="M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5" />,
    wand: <path d="M4 20L16 8M14 6l2-2M18 10l2-2M9 4l1 2M4 9l2 1" />,
    contrast: <path d="M12 3a9 9 0 1 0 0 18z" />,
    sliders: <path d="M5 4v6M5 14v6M12 4v10M12 18v2M19 4v2M19 10v10M3 12h4M10 16h4M17 8h4" />,
    search: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4.2-4.2" />,
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
  disabled?: boolean
  onChange: (value: number) => void
}

/** Slider + a draggable numeric readout (the pro shortcut). */
const Slider: FC<SliderProps> = ({ label, value, min, max, step, track, formatValue, disabled, onChange }) => {
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
          onPointerDown={disabled ? undefined : onPointerDown}
          onPointerMove={disabled ? undefined : onPointerMove}
          onPointerUp={disabled ? undefined : onPointerUp}
          onPointerCancel={disabled ? undefined : onPointerUp}
          title={disabled ? undefined : '拖拽微调 · Shift 加速'}
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
        disabled={disabled}
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
    <div className="ft-sect" data-open={open}>
      <button className="ft-sect-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="ft-chevron"><Ico name="chevron" size={13} /></span>
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
  mode: ThemeMode
  palette: Palette
  hue: number
  chroma: number
  light: number
  lightLabel: string
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
  mode,
  palette,
  hue,
  chroma,
  light,
  locked,
  maxChroma,
  lightLabel,
  onHue,
  onChroma,
  onLight,
  onLock,
}) => {
  const hex = oklchToHex(light, chroma, hue)
  // Hue chips sit on either a light or a dark field, so their own lightness has
  // to follow the mode or they wash out.
  const chipLight = mode === 'dark' ? 0.62 : 0.74
  const hueStops = HUE_STOPS.map((stop) => oklchToHex(chipLight, Math.min(chroma, 0.14), stop)).join(',')
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
          aria-label={locked ? t('a11y.locked') : t('a11y.lock')}
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
            style={{ background: oklchToHex(mode === 'dark' ? 0.66 : 0.72, 0.2, stop) }}
            onClick={() => !locked && onHue(stop)}
          />
        ))}
      </div>

      <Slider
        disabled={locked}
        label={t('axis.hue')}
        value={hue}
        min={0}
        max={360}
        step={1}
        track={`linear-gradient(90deg, ${hueStops}, ${oklchToHex(chipLight, Math.min(chroma, 0.14), 360)})`}
        formatValue={(value) => `${Math.round(value)}°`}
        onChange={(value) => !locked && onHue(value)}
      />
      <Slider
        disabled={locked}
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
        disabled={locked}
        label={lightLabel}
        value={light}
        min={0.04}
        max={0.99}
        step={0.004}
        track={`linear-gradient(90deg, ${oklchToHex(0.04, chroma, hue)}, ${oklchToHex(0.5, chroma, hue)}, ${oklchToHex(0.99, chroma, hue)})`}
        formatValue={(value) => value.toFixed(2)}
        onChange={(value) => !locked && onLight(value)}
      />
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
  t: Translate
  name: string
  subtitle?: string
  mode: ThemeMode
  light: Palette
  dark: Palette
  selected: boolean
  onSelect: () => void
  onDelete?: () => void
  onRename?: () => void
  renameLabel?: string
  armed?: boolean
  deleteLabel?: string
}

const sameLook = (a: ThemeSpec, b: ThemeSpec): boolean => {
  const near = (x: number, y: number, eps: number) => Math.abs(x - y) <= eps
  return (
    near(a.th, b.th, 0.5) &&
    near(a.c1, b.c1, 0.05) &&
    near(a.ths, b.ths, 0.05)
  )
}

const ThemeCard: FC<ThemeCardProps> = ({ t, name, subtitle, mode, light, dark, selected, armed, onSelect, onDelete, onRename, renameLabel, deleteLabel }) => {
  const shown = mode === 'dark' ? dark : light
  // A miniature window: sidebar strip, canvas, two text lines and the accent.
  const side = shown['--dsw-alias-bg-base'] ?? '#f2f2f2'
  const canvas = `color-mix(in oklab, ${shown['--dsw-alias-brand-primary'] ?? '#888'} 12%, ${shown['--dsw-alias-bg-base'] ?? '#fff'})`
  const ink = shown['--dsw-alias-label-primary'] ?? '#222'
  const accent = shown['--dsw-alias-brand-primary'] ?? '#888'
  return (
    // The card is a container, not a button: the delete control must stay a
    // separate focus stop, and a button cannot legally nest a button.
    <div className="ft-card" data-selected={selected}>
      <button type="button" className="ft-card-main" aria-pressed={selected} onClick={onSelect}>
        <span className="ft-card-sw" style={{ background: canvas }}>
          <i className="ft-card-side" style={{ background: side }}>
            <u style={{ background: accent }} />
            <u style={{ background: ink, opacity: 0.28 }} />
            <u style={{ background: ink, opacity: 0.28 }} />
          </i>
          <i className="ft-card-body">
            <b className="ft-card-bubble" style={{ background: accent, opacity: 0.18 }} />
            <b className="ft-card-line" style={{ background: ink, opacity: 0.34 }} />
            <b className="ft-card-line short" style={{ background: ink, opacity: 0.2 }} />
          </i>
        </span>
        <span className="ft-card-main-text">
          <span className="ft-card-name">{name}</span>
          {subtitle && <span className="ft-card-sub">{subtitle}</span>}
        </span>
      </button>
      {onRename && (
        <button
          type="button"
          className="ft-card-rename"
          aria-label={renameLabel ?? 'rename'}
          title={renameLabel ?? 'rename'}
          onClick={onRename}
        >
          <Ico name="pencil" size={12} />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="ft-card-del"
          data-armed={Boolean(armed)}
          aria-label={armed ? t('rail.deleteArm') : (deleteLabel ?? 'delete')}
          title={armed ? t('rail.deleteArm') : (deleteLabel ?? 'delete')}
          onClick={onDelete}
        >
          <Ico name="trash" size={12} />
        </button>
      )}
    </div>
  )
}

/* ── studio ──────────────────────────────────────────────────────────────── */

export const Studio: FC<StudioProps> = ({ t, theme, initial, onApplied, onClear, onClose }) => {
  // History and cursor live in ONE state object: committing a change that is
  // not a real edit (clicking the stop already selected) must not move the
  // cursor past the end of the stack.
  const [doc, setDoc] = useState<{ stack: ThemeSpec[]; index: number }>({ stack: [initial], index: 0 })
  const spec = doc.stack[doc.index] ?? doc.stack[doc.stack.length - 1] ?? initial

  const [name, setName] = useState(t('studio.name'))
  const [view, setView] = useState<PreviewView>('chat')
  const [zoom, setZoom] = useState(1)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  // Auto-fit keeps the whole preview visible until the user takes over zoom.
  const zoomTouched = useRef(false)
  useEffect(() => {
    const node = canvasRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      if (!width || zoomTouched.current) return
      // 720 is the wide preview's natural width; keep 44px of breathing room.
      setZoom(Math.min(1, Math.max(0.4, +((width - 44) / 720).toFixed(2))))
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const [compare, setCompare] = useState(false)
  const [blindOpen, setBlindOpen] = useState(false)
  const [split, setSplit] = useState(50)
  const [inspect, setInspect] = useState(false)
  const [hit, setHit] = useState<InspectTarget | null>(null)
  const [blind, setBlind] = useState<BlindMode>('none')
  const [railTab, setRailTab] = useState<'templates' | 'library' | 'colors'>('templates')
  const [search, setSearch] = useState('')
  const [library, setLibrary] = useState<StoredTheme[]>([])
  const [hostDown, setHostDown] = useState(false)
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [cmdQuery, setCmdQuery] = useState('')
  const [cmdIndex, setCmdIndex] = useState(0)
  const [genOpen, setGenOpen] = useState(false)
  const [genPrompt, setGenPrompt] = useState('')
  const [genBusy, setGenBusy] = useState(false)
  const [genOver, setGenOver] = useState(false)
  const [genCandidates, setGenCandidates] = useState<ThemeSpec[]>([])
  const [genChars, setGenChars] = useState<Swatch[]>([])
  const [genPreview, setGenPreview] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const [appliedSpec, setAppliedSpec] = useState<ThemeSpec | null>(null)
  const [locks, setLocks] = useState<Record<ChannelKey, boolean>>({ th: false, th2: false, ths: false })
  const [inspOpen, setInspOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 1080)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onResize = () => {
      if (window.innerWidth <= 1080) setInspOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const [armedDelete, setArmedDelete] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<StoredTheme | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const nameRef = useRef<HTMLInputElement | null>(null)
  const [modelName, setModelName] = useState('')

  useEffect(() => {
    let alive = true
    void fetch(`${API_BASE}/model`, { credentials: 'same-origin' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { model?: string } | null) => {
        if (alive && body?.model) setModelName(body.model)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  const rootRef = useRef<HTMLDivElement | null>(null)
  const previousFocus = useRef<Element | null>(null)
  const owner = useMemo(() => new OverrideOwner(theme, SOURCE_STUDIO), [theme])

  const toastTimer = useRef<number | null>(null)
  const deleteTimer = useRef<number | null>(null)
  const closingRef = useRef(false)
  const namingRef = useRef(false)
  const genBusyRef = useRef(false)
  const genSeq = useRef(0)
  const aliveRef = useRef(true)
  const genPreviewRef = useRef<string | null>(null)

  const setPreviewUrl = useCallback((next: string | null) => {
    if (genPreviewRef.current) URL.revokeObjectURL(genPreviewRef.current)
    genPreviewRef.current = next
    setGenPreview(next)
  }, [])

  /* Release everything this panel owns when it goes away. */
  useEffect(() => () => {
    aliveRef.current = false
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    if (deleteTimer.current !== null) window.clearTimeout(deleteTimer.current)
    if (genPreviewRef.current) URL.revokeObjectURL(genPreviewRef.current)
  }, [])

  const palette = useMemo(() => fullPalette(spec), [spec])
  const results = useMemo(() => auditPalette(palette), [palette])
  const summary = useMemo(() => auditSummary(results), [results])
  const vividScore = useMemo(
    () => vividnessScore(vividnessOf(palette), spec.mode),
    [palette, spec.mode],
  )
  const selectedStop = HUE_STOPS[hueStopIndex(spec.th)]
  const otherMode = spec.mode === 'light' ? 'dark' : 'light'
  const baseline = appliedSpec ?? defaultSpec(spec.mode)
  const baselinePalette = useMemo(() => fullPalette(baseline), [baseline])

  const flash = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    setToast({ text, tone })
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => {
      toastTimer.current = null
      setToast(null)
    }, 2000)
  }, [])

  /* live preview: everything, including this studio's chrome, follows the spec */
  useEffect(() => {
    owner.set(fullOverrides(theme, spec))
    return () => owner.dispose()
  }, [owner, spec])

  /* history helpers */
  const commit = useCallback((next: ThemeSpec) => {
    setDoc(({ stack, index }) => {
      const head = stack.slice(0, index + 1)
      const last = head[head.length - 1]
      if (last && JSON.stringify(last) === JSON.stringify(next)) {
        return { stack: head, index: head.length - 1 }
      }
      const grown = [...head, next].slice(-50)
      return { stack: grown, index: grown.length - 1 }
    })
  }, [])

  const patch = useCallback(
    (changes: Partial<ThemeSpec>) => commit({ ...spec, ...changes }),
    [commit, spec],
  )

  const undo = useCallback(() => setDoc(({ stack, index }) => ({ stack, index: Math.max(0, index - 1) })), [])
  const redo = useCallback(
    () => setDoc(({ stack, index }) => ({ stack, index: Math.min(stack.length - 1, index + 1) })),
    [],
  )

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
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    // Hand the page back to whatever is still applied. The parent owns that
    // override, so we only ask — the studio never registers a second source.
    const stored = readJson<Record<string, unknown>>(STORAGE_SPEC)
    if (stored) onApplied?.(normalizeSpec(stored), name)
    else onClear?.()
    window.setTimeout(() => {
      owner.dispose()
      onClose()
    }, 180)
  }, [name, onApplied, onClear, onClose, owner])

  const apply = useCallback(() => {
    const tokens = fullOverrides(theme, spec)
    const ok = Boolean(theme?.overrideTokens)
    writeJson(STORAGE_SPEC, spec)
    // The parent registers the applied override; this owner only paints the
    // studio while it is open.
    owner.set(tokens)
    setAppliedSpec(spec)
    flash(ok ? t('msg.applied') : t('err.noTheme'), ok ? 'ok' : 'error')
    onApplied?.(spec, name)
    // Commit-and-exit: leaving a full-window layer up after "apply" reads as
    // "the app is blocked". Close on the next frame so the toast is seen.
    if (ok) window.setTimeout(() => close(), 220)
  }, [close, flash, name, onApplied, owner, spec, t, theme])

  const reset = useCallback(() => {
    removeKey(STORAGE_SPEC)
    commit(defaultSpec(spec.mode))
    setAppliedSpec(null)
    onClear?.()
    flash(t('msg.reset'))
  }, [commit, flash, onClear, spec.mode, t])

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
    if (name.trim() === '') {
      flash(t('msg.nameFirst'), 'error')
      nameRef.current?.focus()
      nameRef.current?.select()
      return
    }
    const now = Date.now()
    const entry: StoredTheme = {
      id: `t${now.toString(36)}`,
      name: name.trim(),
      spec: spec as unknown as Record<string, unknown>,
      createdAt: now,
      updatedAt: now,
    }
    const stored = readJson<StoredTheme[]>(STORAGE_LIBRARY) ?? []
    const merged = [entry, ...(library.length > 0 ? library : stored)].slice(0, 60)
    setLibrary(merged)
    writeJson(STORAGE_LIBRARY, merged)
    setRailTab('library')
    setSearch('')
    void saveLibrary(merged).then((ok) => {
      if (!aliveRef.current) return
      setHostDown(!ok)
      flash(ok ? t('msg.saved') : t('err.noHost'), ok ? 'ok' : 'error')
    })
  }, [flash, library, name, spec, t])

  const renameTheme = useCallback(() => {
    const next = renameValue.trim()
    if (!renaming) return
    if (next === '') {
      flash(t('rename.empty'), 'error')
      return
    }
    const now = Date.now()
    const merged = library.map((item) =>
      item.id === renaming.id ? { ...item, name: next, updatedAt: now } : item,
    )
    setLibrary(merged)
    writeJson(STORAGE_LIBRARY, merged)
    if (renaming.name === name) setName(next)
    setRenaming(null)
    flash(t('msg.saved'), 'ok')
    void saveLibrary(merged).then((ok) => {
      if (aliveRef.current) setHostDown(!ok)
    })
  }, [flash, library, name, renameValue, renaming, saveLibrary, t])

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

  const [naming, setNaming] = useState(false)
  const askAiName = useCallback(async () => {
    if (namingRef.current) return
    namingRef.current = true
    setNaming(true)
    try {
      const result = await fetchName(spec as unknown as Record<string, unknown>, navigator.language)
      if (!aliveRef.current) return
      if (result) {
        setName(result.name)
        flash(result.name)
      } else {
        const hueName = t(`hue.${selectedStop}`)
        setName(`${hueName} · ${Math.round(spec.th)}°`)
        flash(t('err.noLlm'))
      }
    } finally {
      namingRef.current = false
      if (aliveRef.current) setNaming(false)
    }
  }, [flash, selectedStop, spec, t])

  const runImage = useCallback(
    async (file: File) => {
      if (genBusyRef.current) return
      genBusyRef.current = true
      const seq = ++genSeq.current
      setGenBusy(true)
      try {
        const { spec: next, swatches, preview } = await themeFromImage(file, spec.mode)
        if (!aliveRef.current || seq !== genSeq.current) return
        setGenCandidates([next, ...localCandidates('image', otherMode).slice(0, 3)])
        setGenChars(swatches)
        setPreviewUrl(preview)
        flash(format(t('generate.done'), { n: 4 }))
      } catch {
        if (aliveRef.current) flash(t('generate.failed'), 'error')
      } finally {
        if (seq === genSeq.current) {
          genBusyRef.current = false
          if (aliveRef.current) setGenBusy(false)
        }
      }
    },
    [flash, otherMode, setPreviewUrl, spec.mode, t],
  )

  const runPrompt = useCallback(async () => {
    if (!genPrompt.trim()) {
      flash(t('generate.empty'), 'error')
      return
    }
    if (genBusyRef.current) return
    genBusyRef.current = true
    const seq = ++genSeq.current
    setGenBusy(true)
    try {
      const { specs, source } = await aiCandidates(genPrompt, 4)
      if (!aliveRef.current || seq !== genSeq.current) return
      setGenCandidates(specs)
      if (specs.length === 0) flash(t('generate.failed'), 'error')
      else if (source === 'local') flash(t('err.noLlm'))
      else flash(format(t('generate.done'), { n: specs.length }))
    } catch {
      if (aliveRef.current) flash(t('generate.failed'), 'error')
    } finally {
      if (seq === genSeq.current) {
        genBusyRef.current = false
        if (aliveRef.current) setGenBusy(false)
      }
    }
  }, [flash, genPrompt, t])

  /* keyboard: undo/redo, command palette, zoom, save, esc */
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const meta = event.metaKey || event.ctrlKey
      const target = event.target as HTMLElement | null
      const editing = Boolean(
        target && (target.closest('input, textarea, select, [contenteditable="true"]')),
      )
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
      // Native undo inside a field is not ours to intercept.
      if (editing && (key === 'z' || key === 'a')) return
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
      const nodes = Array.from(
        rootRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((node) => node.offsetParent !== null && !node.hasAttribute('disabled'))
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
    locked: locks[channel],
    maxChroma,
    // The surface channel has no separate lightness of its own: its slider edits
    // the page background, and the label says so.
    lightLabel: channel === 'ths' ? t('color.background') : t('axis.light'),
    onHue: (value: number) => !locks[channel] && patch(channel === 'th' ? { th: value } : channel === 'th2' ? { th2: value } : { ths: value }),
    onChroma: (value: number) =>
      !locks[channel] && patch(channel === 'th' ? { c1: value } : channel === 'th2' ? { c2: value } : { sc: value }),
    onLight: (value: number) =>
      !locks[channel] &&
      patch(channel === 'th' ? { l1: value } : channel === 'th2' ? { l2: value } : { bg: value }),
    onLock: () => setLocks((current) => ({ ...current, [channel]: !current[channel] })),
  })

  const tiers: Tier[] = [0, 1, 2]

  const [chromeTop, setChromeTop] = useState(0)

  // Only a truly full-window overlay may reserve the shell's control strip; a
  // transformed ancestor would shrink the overlay into a panel, where 40px of
  // chrome would just be dead space.
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    setChromeTop(isViewportAnchored(el) ? detectChromeTop(document, window) : 0)
  }, [])

  return (
    <div
      className={`ft-root ft-studio ${closing ? 'is-closing' : ''}`}
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('plugin.title')}
      data-mode={spec.mode}
      style={{ ...(fullPalette(spec) as CSSProperties), '--ft-chrome-top': `${chromeTop}px` } as CSSProperties}
    >
      <VisionFilters />

      {/* header — in the desktop shell the first row is the window's title bar */}
      <header className="ft-head">
        <div className="ft-head-left">
          <button className="ft-btn ft-btn-icon ft-btn-ghost" aria-label={t('studio.close')} onClick={close}>
            <Ico name="close" />
          </button>
          <div className="ft-head-title">
            <input
              ref={nameRef}
              className="ft-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-label={t('studio.name')}
              spellCheck={false}
            />
            <span className="ft-head-sub">
              {t(`studio.${spec.mode}`)} · {Math.round(spec.th)}° · {summary.passed}/{summary.total}
            </span>
          </div>
        </div>

        <div className="ft-head-mid">
          <div className="ft-seg" role="group" aria-label={t('studio.light')}>
            <button aria-pressed={spec.mode === 'light'} onClick={() => commit(switchMode(spec, 'light'))}>
              <Ico name="sun" size={12} />{t('studio.light')}
            </button>
            <button aria-pressed={spec.mode === 'dark'} onClick={() => commit(switchMode(spec, 'dark'))}>
              <Ico name="moon" size={12} />{t('studio.dark')}
            </button>
          </div>
        </div>

        <div className="ft-head-right">
          <div className="ft-group">
            <button className="ft-btn ft-btn-icon ft-btn-ghost" aria-label={t('studio.undo')} title={t('studio.undo')} onClick={undo} disabled={doc.index === 0}>
              <Ico name="undo" />
            </button>
            <button className="ft-btn ft-btn-icon ft-btn-ghost" aria-label={t('studio.redo')} title={t('studio.redo')} onClick={redo} disabled={doc.index >= doc.stack.length - 1}>
              <Ico name="redo" />
            </button>
          </div>
          <span className="ft-divider-v" />
          <button className="ft-btn ft-btn-icon ft-btn-ghost" aria-label={t('rail.save')} title={t('rail.save')} onClick={saveTheme}>
            <Ico name="save" />
          </button>
          <button className="ft-btn ft-btn-icon ft-btn-ghost" aria-label={t('studio.share')} title={t('studio.share')} onClick={() => setShareOpen(true)}>
            <Ico name="share" />
          </button>
          <button className="ft-btn ft-btn-primary" onClick={apply}>
            <Ico name="check" />{t('studio.apply')}
          </button>
        </div>
      </header>

      {/* body */}
      <div className={`ft-body${inspOpen ? '' : ' no-inspector'}`}>
        {/* rail */}
        <nav className="ft-rail" aria-label={t('rail.templates')}>
          <button className="ft-rail-btn" title={t('rail.templates')} aria-pressed={railTab === 'templates'} onClick={() => setRailTab('templates')}>
            <Ico name="grid" size={18} /><span className="ft-sr">{t('rail.templates')}</span>
          </button>
          <button className="ft-rail-btn" title={t('rail.library')} aria-pressed={railTab === 'library'} onClick={() => setRailTab('library')}>
            <Ico name="library" size={18} /><span className="ft-sr">{t('rail.library')}</span>
          </button>
          <button className="ft-rail-btn" title={t('rail.colors')} aria-pressed={railTab === 'colors'} onClick={() => setRailTab('colors')}>
            <Ico name="brush" size={18} /><span className="ft-sr">{t('rail.colors')}</span>
          </button>
          <span className="ft-rail-divider" />
          <button
            className="ft-rail-btn"
            title={t('inspector.color')}
            aria-pressed={inspOpen}
            aria-expanded={inspOpen}
            aria-controls="ft-inspector"
            onClick={() => setInspOpen((value) => !value)}
          >
            <Ico name="sliders" size={18} /><span className="ft-sr">{t('inspector.color')}</span>
          </button>
          <span className="ft-rail-spacer" />
          <button className="ft-rail-btn" title={t('generate.image')} onClick={() => setGenOpen(true)}>
            <Ico name="image" size={18} /><span className="ft-sr">{t('generate.image')}</span>
          </button>
        </nav>

        {/* list */}
        <aside className="ft-list">
          <div className="ft-list-head">
            <h2>{railTab === 'templates' ? t('rail.templates') : railTab === 'colors' ? t('rail.colors') : t('rail.mine')}</h2>
            <span className="ft-list-count">
              {railTab === 'templates' ? presets.length : railTab === 'colors' ? TRADITIONAL.length : library.length}
            </span>
            <span className="ft-spacer" />
            {railTab === 'library' && (
              <button className="ft-btn ft-btn-icon ft-btn-ghost" aria-label={t('rail.save')} title={t('rail.save')} onClick={saveTheme}>
                <Ico name="save" size={13} />
              </button>
            )}
          </div>
          <div className="ft-search">
            <span className="ft-search-icon"><Ico name="search" size={12} /></span>
            <input
              className="ft-input ft-search-input"
              placeholder={t('rail.search')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label={t('rail.search')}
            />
          </div>
          <div className="ft-list-body">
            {railTab === 'templates' &&
              presets.map((preset) => {
                const lightPalette = fullPalette(presetSpec(preset, 'light'))
                const darkPalette = fullPalette(presetSpec(preset, 'dark'))
                const lightSpec = presetSpec(preset, 'light')
                return (
                  <ThemeCard
                    t={t}
                    key={preset.id}
                    name={t(`preset.${preset.id}`)}
                    subtitle={`${Math.round(lightSpec.th)}°`}
                    mode={spec.mode}
                    light={lightPalette}
                    dark={darkPalette}
                    selected={sameLook(spec, presetSpec(preset, spec.mode))}
                    onSelect={() => commit(presetSpec(preset, spec.mode))}
                  />
                )
              })}

            {railTab === 'colors' && (
              <>
                <p className="ft-list-note">{t('rail.colorsHint')}</p>
                {TRADITIONAL.filter((color) => {
                  const name = t(`trad.${color.id}`)
                  const query = search.trim().toLowerCase()
                  return !query || name.includes(query) || color.id.includes(query) || color.hex.includes(query)
                }).map((color) => {
                  const candidate = traditionalSpec(color, spec.mode, spec)
                  return (
                    <button
                      type="button"
                      key={color.id}
                      className="ft-color"
                      data-selected={sameLook(spec, candidate)}
                      aria-pressed={sameLook(spec, candidate)}
                      onClick={() => commit(candidate)}
                    >
                      <i style={{ background: color.hex }} aria-hidden="true" />
                      <span>{t(`trad.${color.id}`)}</span>
                      <em>{color.hex.toUpperCase()}</em>
                    </button>
                  )
                })}
              </>
            )}

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
                    t={t}
                    name={entry.name}
                    subtitle={new Date(entry.updatedAt).toLocaleDateString()}
                    mode={spec.mode}
                    light={fullPalette(switchModeSafe(entrySpec, 'light'))}
                    dark={fullPalette(switchModeSafe(entrySpec, 'dark'))}
                    selected={sameLook(spec, switchModeSafe(entrySpec, spec.mode))}
                    onSelect={() => commit(entrySpec)}
                    onRename={() => {
                      setRenameValue(entry.name)
                      setRenaming(entry)
                    }}
                    renameLabel={t('rail.rename')}
                    armed={armedDelete === entry.id}
                    onDelete={() => {
                      if (armedDelete !== entry.id) {
                        setArmedDelete(entry.id)
                        if (deleteTimer.current !== null) window.clearTimeout(deleteTimer.current)
                        deleteTimer.current = window.setTimeout(() => {
                          deleteTimer.current = null
                          setArmedDelete((value) => (value === entry.id ? null : value))
                        }, 3000)
                        return
                      }
                      setArmedDelete(null)
                      deleteTheme(entry.id)
                    }}
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
            <button className="ft-toggle" aria-pressed={compare} onClick={() => setCompare(!compare)}>
              <Ico name="contrast" size={13} />{t('canvas.compare')}
            </button>
            <button className="ft-toggle" aria-pressed={inspect} onClick={() => setInspect(!inspect)}>
              <Ico name="scan" size={13} />{t('canvas.inspect')}
            </button>
            <div className="ft-blind">
              <button
                className="ft-toggle"
                aria-haspopup="menu"
                aria-expanded={blindOpen}
                onClick={() => setBlindOpen((value) => !value)}
              >
                <Ico name="eye" size={13} />
                {t(`canvas.blind.${blind}`)}
                <Ico name="chevron" size={10} />
              </button>
              {blindOpen && (
                <div className="ft-menu" role="menu" aria-label={t('canvas.blind')}>
                  {(['none', 'deuteranopia', 'protanopia', 'tritanopia', 'achromatopsia'] as BlindMode[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      role="menuitemradio"
                      aria-checked={blind === item}
                      onClick={() => {
                        setBlind(item)
                        setBlindOpen(false)
                      }}
                    >
                      <span className="ft-menu-check">{blind === item ? '✓' : ''}</span>
                      {t(`canvas.blind.${item}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="ft-zoomctl">
              <button aria-label={t('canvas.zoom')} onClick={() => setZoom((value) => clamp(+(value - 0.1).toFixed(2), 0.5, 1.5))}>−</button>
              <span>{Math.round(zoom * 100)}%</span>
              <button aria-label={t('canvas.zoom')} onClick={() => setZoom((value) => clamp(+(value + 0.1).toFixed(2), 0.5, 1.5))}>+</button>
            </div>
          </div>

          <div className="ft-canvas-stage" ref={canvasRef}>
            <div className="ft-zoom">
              {compare ? (
                <div className="ft-cmp" ref={splitRef} style={{ ['--ft-split' as string]: `${split}%` } as CSSProperties}>
                  <div className="ft-zoom-inner" style={{ transform: `scale(${zoom})` }}>
                    <div className="ft-cmp-track" style={{ width: 720, height: 520 }}>
                      <div className="ft-cmp-base" aria-hidden="true">
                        <PreviewFrame t={t} spec={baseline} palette={baselinePalette} view={view} large blind={blind} filters={false} />
                      </div>
                      <div className="ft-cmp-b">
                        <PreviewFrame t={t} spec={spec} palette={palette} view={view} large blind={blind} filters={false} inspect={inspect} onInspect={setHit} onView={setView} model={modelName} />
                      </div>
                      <span className="ft-cmp-tag" style={{ left: 10 }}>{t('canvas.before')}</span>
                      <span className="ft-cmp-tag" style={{ right: 10 }}>{name}</span>
                      <div
                        className="ft-cmp-line"
                        role="separator"
                        aria-label={t('canvas.compare')}
                        aria-orientation="vertical"
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
                  <div className="ft-stage-card">
                    <PreviewFrame
                      t={t}
                      spec={spec}
                      palette={palette}
                      view={view}
                      large
                      blind={blind}
                      filters={false}
                      inspect={inspect}
                      onInspect={setHit}
                      onView={setView}
                      model={modelName}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* inspector */}
        <aside className="ft-insp" id="ft-inspector" aria-label={t('inspector.color')} hidden={!inspOpen}>
          <div className="ft-insp-body">
            <div className="ft-depth">
              <div style={{ display: 'grid', gap: 8 }}>
                <Slider
                  label={t('color.vivid')}
                  value={spec.vivid}
                  min={0.3}
                  max={1.6}
                  step={0.01}
                  formatValue={(value) => `${Math.round(value * 100)}%`}
                  onChange={(value) => patch({ vivid: value })}
                />
                <div className="ft-seg is-quick" role="group" aria-label={t('color.vivid')}>
                  {([0.55, 0.85, 1.25] as const).map((level, i) => (
                    <button key={level} aria-pressed={Math.abs(spec.vivid - level) < 0.03} onClick={() => patch({ vivid: level })}>
                      {t(`vivid.${['soft', 'standard', 'rich'][i]}`)}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1.5 }}>
                  {t('color.vividHint')}
                </div>
              </div>
            </div>
            <Section title={t('inspector.color')}>
              <Channel mode={spec.mode} {...channelProps('th', spec.th, spec.c1, spec.l1, 0.37)} />
              <Channel mode={spec.mode} {...channelProps('th2', spec.th2, spec.c2, spec.l2, 0.2)} />
              <Channel mode={spec.mode} {...channelProps('ths', spec.ths, spec.sc, 0.7, 0.03)} />

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
              role="combobox"
              aria-expanded="true"
              aria-controls="ft-cmd-list"
              aria-activedescendant={commands[cmdIndex] ? `ft-cmd-${commands[cmdIndex].id}` : undefined}
              onChange={(event) => {
                setCmdQuery(event.target.value)
                setCmdIndex(0)
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setCmdIndex((index) => (commands.length === 0 ? 0 : (index + 1) % commands.length))
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  setCmdIndex((index) => (commands.length === 0 ? 0 : (index - 1 + commands.length) % commands.length))
                } else if (event.key === 'Enter') {
                  const command = commands[cmdIndex]
                  if (!command) return
                  event.preventDefault()
                  setCmdOpen(false)
                  command.run()
                }
              }}
            />
            <div className="ft-cmd-list" id="ft-cmd-list" role="listbox">
              {commands.map((command, index) => (
                <button
                  key={command.id}
                  id={`ft-cmd-${command.id}`}
                  role="option"
                  aria-selected={index === cmdIndex}
                  data-active={index === cmdIndex}
                  className="ft-cmd-item"
                  onMouseEnter={() => setCmdIndex(index)}
                  onClick={() => {
                    setCmdOpen(false)
                    command.run()
                  }}
                >
                  <span>{command.label}</span>
                  {index === cmdIndex && <kbd>↵</kbd>}
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
              <div className="ft-btn-row">
                <button className="ft-btn ft-btn-primary" onClick={() => void copy(encodeShare(spec, name), flash, t)}>{t('share.link')}</button>
                <button className="ft-btn ft-btn-ghost" onClick={() => void copy(exportCss(spec, switchMode(spec, otherMode)), flash, t)}>{t('share.css')}</button>
                <button className="ft-btn ft-btn-ghost" onClick={() => void copy(JSON.stringify(spec, null, 2), flash, t)}>{t('share.json')}</button>
              </div>
              <div className="ft-sect-hair" />
              <div className="ft-dialog-label">{t('share.import')}</div>
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
              />
            </div>
            <div className="ft-dialog-foot">
              <button className="ft-btn ft-btn-ghost" onClick={() => setShareOpen(false)}>{t('share.done')}</button>
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
            <div className="ft-dialog-body" aria-busy={genBusy}>
              <label
                className="ft-drop"
                data-over={genOver}
                onDragOver={(event) => {
                  event.preventDefault()
                  setGenOver(true)
                }}
                onDragLeave={() => setGenOver(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setGenOver(false)
                  const file = event.dataTransfer.files?.[0]
                  if (file && file.type.startsWith('image/')) void runImage(file)
                  else flash(t('generate.noImage'), 'error')
                }}
              >
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
                        t={t}
                        key={index}
                        name={`${Math.round(candidate.th)}°`}
                        subtitle={index === 0 && genChars.length > 0 ? t('generate.image') : `${candidate.c1.toFixed(3)}`}
                        mode={candidate.mode}
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
              <button className="ft-btn ft-btn-ghost" onClick={() => setGenCandidates(presetCandidates(4))}>{t('row.shuffle')}</button>
              <button className="ft-btn ft-btn-ghost" onClick={() => setGenOpen(false)}>{t('share.done')}</button>
            </div>
          </div>
        </div>
      )}

      {/* rename dialog */}
      {renaming && (
        <div className="ft-mask" onClick={() => setRenaming(null)}>
          <div
            className="ft-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={t('rename.title')}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ft-dialog-head">
              <Ico name="pencil" size={14} />
              <h2>{t('rename.title')}</h2>
              <span className="ft-spacer" />
              <button
                className="ft-btn ft-btn-icon ft-btn-ghost"
                aria-label={t('share.done')}
                onClick={() => setRenaming(null)}
              >
                <Ico name="close" size={14} />
              </button>
            </div>
            <div className="ft-dialog-body">
              <label className="ft-dialog-label" htmlFor="ft-rename">{t('rename.name')}</label>
              <input
                id="ft-rename"
                className="ft-input"
                autoFocus
                value={renameValue}
                maxLength={48}
                onChange={(event) => setRenameValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    renameTheme()
                  }
                }}
              />
              <p className="ft-dialog-note">{t('rename.hint')}</p>
            </div>
            <div className="ft-dialog-foot">
              <button className="ft-btn ft-btn-ghost" onClick={() => setRenaming(null)}>
                {t('share.done')}
              </button>
              <button className="ft-btn ft-btn-primary" onClick={renameTheme}>
                {t('rename.save')}
              </button>
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
