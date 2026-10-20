/**
 * Dsh-freestyle-theme — browser half.
 *
 * Contributes one `settings.general.item` row that expands into a full theme
 * studio: OKLCH proposals, a channel-level designer, live light/dark previews
 * and JSON round-tripping. Every colour it applies goes through the shell's
 * `theme.overrideTokens`, so the plugin never writes CSS variables directly and
 * never fights the shell's own theme switching.
 *
 * The module default-exports a Cordis plugin; the loader hands it a client
 * context, and nothing else.
 *
 * @module dsh-freestyle-theme/client
 */

import type { Context } from '@deepseek-ai/cordis'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { NS, DICTIONARIES, type Translate } from './locale'
import {
  DEF_DARK,
  DEF_LIGHT,
  HARMONIES,
  PRESETS,
  clamp,
  defaultSpec,
  generateTokens,
  hueStopIndex,
  huesForHarmony,
  oklchToHex,
  proposalSpec,
  randomBatch,
  specToInput,
  normalizeSpec,
  switchMode,
  type ChannelKey,
  type HarmonyKey,
  type Palette,
  type Proposal,
  type ThemeSpec,
} from './palette'
import type {
  LocaleService,
  SlotsService,
  ThemeService,
  TokenOverrides,
} from './services'

/** Theme id this plugin owns inside the shell's theme registry. */
const THEME_ID = 'dsh-freestyle-theme'
/** Row id inside `settings.general.item`. */
const ROW_ID = 'dsh-freestyle-theme'
/**
 * Host naming route. The browser never talks to a model provider: the host half
 * resolves `llm` + `agentDefaultModel` and returns plain text.
 */
const NAME_ROUTE = '/api/dsh-freestyle-theme/name'
/** localStorage keys. */
const STORAGE_SPEC = 'dsh-freestyle-theme/spec'
const STORAGE_WIDE = 'dsh-freestyle-theme/wide'

// ── services ────────────────────────────────────────────────────────────────

/**
 * Read a service if the shell happens to expose it.
 *
 * Cordis services are reachable as `ctx.get(name)`; a few shells also keep a
 * plain property. Both are tried so this plugin works on either, and a missing
 * service yields `undefined` instead of aborting the whole registration — which
 * matters because an inactive `inject` would keep `apply` from ever running.
 */
function service<T>(ctx: Context, name: string): T | undefined {
  const holder = ctx as unknown as { get?: (key: string) => unknown } & Record<string, unknown>
  if (typeof holder.get === 'function') {
    try {
      const found = holder.get(name)
      if (found) return found as T
    } catch {
      // Not registered in this context; fall through to the property lookup.
    }
  }
  const direct = holder[name]
  return direct ? (direct as T) : undefined
}

/** Resolve the shell's translator, registering this plugin's dictionaries once. */
function makeTranslator(ctx: Context): Translate {
  const locale = service<LocaleService>(ctx, 'locale')
  if (locale?.bind && locale.register) {
    const shapes: Array<() => void> = [
      () => locale.register?.(NS, { zh: DICTIONARIES.zh, en: DICTIONARIES.en }),
      () => {
        locale.register?.(NS, DICTIONARIES.zh, 'zh')
        locale.register?.(NS, DICTIONARIES.en, 'en')
      },
    ]
    for (const register of shapes) {
      try {
        register()
        return locale.bind(NS)
      } catch {
        // Try the next supported registration shape.
      }
    }
  }
  const prefersChinese = typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh')
  const dictionary = (prefersChinese ? DICTIONARIES.zh : DICTIONARIES.en) as Record<string, string>
  return (key: string) => dictionary[key] ?? key
}

// ── tiny helpers ────────────────────────────────────────────────────────────

/** Read the shell's preferred mode for the initial preview. */
function preferredMode(): 'light' | 'dark' {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Immutable spec update; the cast keeps the computed-key call sites readable. */
function patch(spec: ThemeSpec, changes: Record<string, number>): ThemeSpec {
  return { ...spec, ...changes } as ThemeSpec
}

function readStoredSpec(): ThemeSpec | undefined {
  try {
    const raw = window.localStorage.getItem(STORAGE_SPEC)
    if (!raw) return undefined
    return normalizeSpec(JSON.parse(raw))
  } catch {
    return undefined
  }
}

function storeSpec(spec: ThemeSpec): void {
  try {
    window.localStorage.setItem(STORAGE_SPEC, JSON.stringify(specToInput(spec)))
  } catch {
    // Persistence is best-effort: private modes and quota errors are expected.
  }
}

function readStoredWide(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_WIDE) === '1'
  } catch {
    return false
  }
}

function formatNumber(value: number, step: number): string {
  return value.toFixed(step >= 1 ? 0 : step >= 0.01 ? 2 : 3)
}

// ── styles ──────────────────────────────────────────────────────────────────

const STYLE_ID = 'dsh-freestyle-theme/styles'

const CSS = `
.ft-root {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  border-radius: 14px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08));
  background: var(--dsw-alias-bg-layer-1, transparent);
  color: var(--dsw-alias-label-primary, inherit);
  font-size: 13px;
  line-height: 1.5;
}
.ft-root *, .ft-root *::before, .ft-root *::after { box-sizing: border-box; }
.ft-root button, .ft-root input, .ft-root textarea { font: inherit; color: inherit; }

.ft-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.ft-head__text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.ft-eyebrow {
  font-size: 11px; letter-spacing: .08em; text-transform: uppercase;
  color: var(--dsw-alias-label-tertiary, inherit); font-weight: 600;
}
.ft-title { margin: 0; font-size: 15px; font-weight: 600; letter-spacing: -.01em; }
.ft-sub { margin: 0; font-size: 12px; color: var(--dsw-alias-label-tertiary, inherit); }
.ft-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.ft-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 8px; cursor: pointer;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.12));
  background: var(--dsw-alias-button-elevated-fill, transparent);
  color: var(--dsw-alias-label-primary, inherit);
  font-size: 12px; font-weight: 500; white-space: nowrap;
  transition: background 120ms ease, border-color 120ms ease, transform 120ms ease;
}
.ft-btn:hover { background: var(--dsw-alias-button-floating-hover, var(--dsw-alias-interactive-bg-hover, transparent)); }
.ft-btn:active { transform: translateY(.5px); }
.ft-btn:disabled { opacity: .5; cursor: default; transform: none; }
.ft-btn--primary {
  border-color: transparent;
  background: var(--dsw-alias-button-primary-fill, var(--dsw-alias-brand-primary, #2f9c8f));
  color: var(--dsw-alias-label-primary-foreground, #fff);
}
.ft-btn--primary:hover { background: var(--dsw-alias-button-primary-hover, var(--dsw-alias-brand-primary, #2f9c8f)); }
.ft-btn--ghost { background: transparent; border-color: transparent; }
.ft-btn--icon { padding: 6px; }
.ft-root button:focus-visible, .ft-root input:focus-visible, .ft-root textarea:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #2f9c8f);
  outline-offset: 2px;
}

.ft-tabs {
  display: inline-flex; gap: 4px; padding: 3px; border-radius: 10px;
  background: var(--dsw-alias-bg-module-platform, rgba(0,0,0,.04));
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.06));
}
.ft-tab {
  appearance: none; border: 0; background: transparent; cursor: pointer;
  padding: 6px 14px; border-radius: 7px; font-size: 12px; font-weight: 500;
  color: var(--dsw-alias-label-secondary, inherit);
  transition: background 120ms ease, color 120ms ease, box-shadow 120ms ease;
}
.ft-tab[aria-selected='true'], .ft-tab[aria-pressed='true'] {
  background: var(--dsw-alias-button-elevated-fill, var(--dsw-alias-bg-layer-1, #fff));
  color: var(--dsw-alias-label-primary, inherit);
  box-shadow: 0 1px 2px rgba(0,0,0,.12);
}

.ft-card {
  display: flex; flex-direction: column; gap: 12px;
  padding: 14px; border-radius: 12px;
  border: 1px solid var(--dsw-alias-settings-card-stroke, var(--dsw-alias-border-l1, rgba(0,0,0,.08)));
  background: var(--dsw-alias-settings-card-fill, transparent);
}
.ft-card__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ft-card__title { font-size: 12px; font-weight: 600; letter-spacing: .01em; }
.ft-card__extra { font-size: 11px; color: var(--dsw-alias-label-tertiary, inherit); }

.ft-grid { display: grid; gap: 10px; }
.ft-grid--proposals { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
.ft-grid--presets { grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); }
.ft-grid--variants { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); }
.ft-grid--channels { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }

.ft-chip {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08));
  background: transparent; color: var(--dsw-alias-label-secondary, inherit);
  transition: border-color 120ms ease, color 120ms ease, background 120ms ease;
}
.ft-chip:hover { color: var(--dsw-alias-label-primary, inherit); border-color: var(--dsw-alias-border-l3, rgba(0,0,0,.2)); }
.ft-chip[aria-pressed='true'] {
  color: var(--dsw-alias-brand-text, var(--dsw-alias-brand-primary, inherit));
  border-color: var(--dsw-alias-brand-primary, currentColor);
  background: var(--dsw-alias-interactive-bg-hover, transparent);
}

.ft-proposal {
  display: flex; flex-direction: column; gap: 0; padding: 0; overflow: hidden;
  border-radius: 10px; cursor: pointer; text-align: left;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08));
  background: var(--dsw-alias-bg-layer-1, transparent);
  transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
}
.ft-proposal:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,.14); }
.ft-proposal[aria-pressed='true'] { border-color: var(--dsw-alias-brand-primary, currentColor); box-shadow: 0 0 0 1px var(--dsw-alias-brand-primary, transparent); }
.ft-proposal__meta { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px 10px; }
.ft-proposal__name { font-size: 12px; font-weight: 500; color: var(--dsw-alias-label-primary, inherit); }
.ft-proposal__tags { font-size: 10px; color: var(--dsw-alias-label-tertiary, inherit); }
.ft-swatches { display: flex; gap: 4px; margin-top: 4px; }
.ft-swatch { width: 12px; height: 12px; border-radius: 4px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.12); }

.ft-mini {
  position: relative; display: flex; gap: 0; height: 96px; overflow: hidden;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08));
}
.ft-mini--tall { height: 148px; border-radius: 10px; border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08)); border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08)); }
.ft-mini__side { width: 30%; padding: 8px 6px; display: flex; flex-direction: column; gap: 5px; }
.ft-mini__main { flex: 1; display: flex; flex-direction: column; gap: 6px; padding: 8px; }
.ft-mini__brand { width: 22px; height: 5px; border-radius: 3px; }
.ft-mini__nav { height: 7px; border-radius: 4px; }
.ft-mini__bar { display: flex; align-items: center; gap: 4px; padding-bottom: 5px; }
.ft-mini__dot { width: 6px; height: 6px; border-radius: 50%; }
.ft-mini__line { height: 5px; border-radius: 3px; }
.ft-mini__bubble { align-self: flex-start; width: 78%; padding: 5px; border-radius: 7px; display: flex; flex-direction: column; gap: 3px; }
.ft-mini__bubble--accent { align-self: flex-end; width: 56%; }
.ft-mini__field { margin-top: auto; height: 14px; border-radius: 6px; display: flex; align-items: center; padding: 0 4px; }

.ft-range { display: grid; grid-template-columns: 58px 1fr 50px; align-items: center; gap: 10px; }
.ft-range__label { font-size: 11px; color: var(--dsw-alias-label-secondary, inherit); }
.ft-range__value { font-size: 11px; text-align: right; font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-tertiary, inherit); }
.ft-slider { width: 100%; height: 18px; appearance: none; background: transparent; cursor: pointer; }
.ft-slider::-webkit-slider-runnable-track {
  height: 4px; border-radius: 2px; background: var(--dsw-alias-bg-layer-3, rgba(0,0,0,.12));
}
.ft-slider::-webkit-slider-thumb {
  appearance: none; width: 13px; height: 13px; margin-top: -4.5px; border-radius: 50%;
  background: var(--dsw-alias-brand-primary, #2f9c8f);
  border: 2px solid var(--dsw-alias-bg-layer-1, #fff);
  box-shadow: 0 1px 3px rgba(0,0,0,.28);
}
.ft-slider::-moz-range-track { height: 4px; border-radius: 2px; background: var(--dsw-alias-bg-layer-3, rgba(0,0,0,.12)); }
.ft-slider::-moz-range-thumb {
  width: 11px; height: 11px; border-radius: 50%;
  background: var(--dsw-alias-brand-primary, #2f9c8f); border: 2px solid var(--dsw-alias-bg-layer-1, #fff);
}

.ft-channel {
  display: flex; flex-direction: column; gap: 10px; padding: 12px;
  border-radius: 10px; border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08));
  background: var(--dsw-alias-bg-base, transparent);
}
.ft-channel__head { display: flex; align-items: center; gap: 8px; }
.ft-channel__dot { width: 14px; height: 14px; border-radius: 5px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.14); flex-shrink: 0; }
.ft-channel__name { font-size: 12px; font-weight: 600; flex: 1; }
.ft-lock {
  display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px;
  cursor: pointer; font-size: 10px; border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.12));
  background: transparent; color: var(--dsw-alias-label-tertiary, inherit);
}
.ft-lock[aria-pressed='true'] { color: var(--dsw-alias-state-warn-label, inherit); border-color: var(--dsw-alias-state-warn-primary, currentColor); }

.ft-field { display: flex; flex-direction: column; gap: 6px; }
.ft-field__label { font-size: 11px; color: var(--dsw-alias-label-secondary, inherit); }
.ft-input, .ft-textarea {
  width: 100%; padding: 7px 10px; border-radius: 8px; font-size: 12px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.12));
  background: var(--dsw-alias-bg-base, transparent);
  color: var(--dsw-alias-label-primary, inherit);
}
.ft-input::placeholder, .ft-textarea::placeholder { color: var(--dsw-alias-label-caption, inherit); }
.ft-textarea { min-height: 84px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }
.ft-field__row { display: flex; gap: 8px; align-items: center; }

.ft-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.ft-hint { font-size: 11px; color: var(--dsw-alias-label-tertiary, inherit); }
.ft-warn { display: flex; gap: 8px; align-items: flex-start; font-size: 12px; color: var(--dsw-alias-state-warn-label, inherit); }

.ft-toast {
  position: fixed; right: 24px; bottom: 24px; z-index: 60;
  padding: 9px 14px; border-radius: 10px; font-size: 12px; font-weight: 500;
  background: var(--dsw-alias-toast-bg, rgba(28,28,30,.94));
  color: var(--dsw-alias-toast-label, #fff);
  box-shadow: 0 8px 28px rgba(0,0,0,.28);
  animation: ft-rise 160ms ease-out;
}
@keyframes ft-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

.ft-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 2px 0; }
.ft-row__text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ft-row__title { font-size: 13px; font-weight: 500; }
.ft-row__desc { font-size: 12px; color: var(--dsw-alias-label-tertiary, inherit); }

/* Opt-in widening of the settings dialog, scoped to dialogs that contain this row. */
[role='dialog'][aria-modal='true']:has(.ft-wide) {
  width: min(1120px, 95vw) !important;
  max-width: min(1120px, 95vw) !important;
}

@media (prefers-reduced-motion: reduce) {
  .ft-proposal, .ft-btn, .ft-chip, .ft-tab, .ft-toast { transition: none; animation: none; }
}
`

function ensureStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
}

// ── icons ───────────────────────────────────────────────────────────────────

function Icon({ path }: { path: string }): ReactNode {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} />
    </svg>
  )
}

const ICON = {
  dice: 'M8 2.5 9.6 6l3.9.5-2.8 2.7.7 3.9L8 11.3 4.6 13l.7-3.9L2.5 6.5 6.4 6z',
  sparkle: 'M8 2v4M8 10v4M2 8h4M10 8h4',
  lock: 'M5 7V5.5a3 3 0 0 1 6 0V7M4 7h8v6H4z',
  unlock: 'M5 7V5.5a3 3 0 0 1 5.7-1.3M4 7h8v6H4z',
  widen: 'M2 8h12M4.5 5.5 2 8l2.5 2.5M11.5 5.5 14 8l-2.5 2.5',
  check: 'M3 8.5 6.2 11.5 13 4.5',
} as const

// ── primitives ──────────────────────────────────────────────────────────────

function Card(props: { title: string; extra?: ReactNode; children: ReactNode }): ReactNode {
  return (
    <section className="ft-card">
      <div className="ft-card__head">
        <span className="ft-card__title">{props.title}</span>
        {props.extra ? <span className="ft-card__extra">{props.extra}</span> : null}
      </div>
      {props.children}
    </section>
  )
}

function RangeRow(props: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}): ReactNode {
  return (
    <label className="ft-range">
      <span className="ft-range__label">{props.label}</span>
      <input
        className="ft-slider"
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
      <span className="ft-range__value">{formatNumber(props.value, props.step)}</span>
    </label>
  )
}

/** A miniature replica of the shell's chat layout, painted from a token map. */
function MiniPreview(props: { tokens: Palette; tall?: boolean }): ReactNode {
  const token = (name: string, fallback: string): string => props.tokens[name] ?? fallback
  return (
    <div
      className={`ft-mini${props.tall ? ' ft-mini--tall' : ''}`}
      style={{ background: token('--dsw-alias-bg-base', '#fff') }}
      aria-hidden="true"
    >
      <div
        className="ft-mini__side"
        style={{
          background: token('--dsw-specific-sidebar-fill', 'transparent'),
          borderRight: `1px solid ${token('--dsw-alias-border-l1', 'transparent')}`,
        }}
      >
        <div className="ft-mini__brand" style={{ background: token('--dsw-alias-brand-primary', '#2f9c8f') }} />
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="ft-mini__nav"
            style={{
              background:
                index === 0
                  ? token('--dsw-specific-sidebar-nav-item-active', token('--dsw-alias-bg-layer-2', 'transparent'))
                  : 'transparent',
            }}
          />
        ))}
      </div>
      <div className="ft-mini__main">
        <div
          className="ft-mini__bar"
          style={{ borderBottom: `1px solid ${token('--dsw-alias-border-l1', 'transparent')}` }}
        >
          <span
            className="ft-mini__dot"
            style={{ background: token('--dsw-alias-state-success-primary', '#39b36a') }}
          />
          <span
            className="ft-mini__line"
            style={{ width: 34, background: token('--dsw-alias-label-secondary', '#888') }}
          />
        </div>
        <div
          className="ft-mini__bubble"
          style={{ background: token('--dsw-specific-bubble', 'rgba(0,0,0,.05)') }}
        >
          <span
            className="ft-mini__line"
            style={{ width: '78%', background: token('--dsw-alias-label-tertiary', '#999') }}
          />
          <span
            className="ft-mini__line"
            style={{ width: '52%', background: token('--dsw-alias-label-tertiary', '#999') }}
          />
        </div>
        <div
          className="ft-mini__field"
          style={{
            background: token('--dsw-specific-input-major', token('--dsw-alias-bg-layer-1', '#f5f5f5')),
            border: `1px solid ${token('--dsw-alias-border-l2', 'transparent')}`,
          }}
        >
          <span
            className="ft-mini__line"
            style={{ width: 26, background: token('--dsw-alias-label-caption', '#aaa') }}
          />
        </div>
        <div
          className="ft-mini__bubble ft-mini__bubble--accent"
          style={{ background: token('--dsw-alias-button-primary-fill', '#2f9c8f') }}
        >
          <span
            className="ft-mini__line"
            style={{ width: '70%', background: token('--dsw-alias-label-primary-foreground', '#fff') }}
          />
        </div>
      </div>
    </div>
  )
}

/** Colour dots summarising a proposal. */
function Swatches(props: { tokens: Palette }): ReactNode {
  const names = [
    '--dsw-alias-brand-primary',
    '--dsw-specific-sidebar-nav-item-active',
    '--dsw-alias-bg-base',
    '--dsw-specific-bubble',
    '--dsw-alias-button-primary-fill',
  ]
  return (
    <div className="ft-swatches" aria-hidden="true">
      {names.map((name) => (
        <span key={name} className="ft-swatch" style={{ background: props.tokens[name] ?? 'transparent' }} />
      ))}
    </div>
  )
}

/** One proposal card: live miniature + name + swatches. */
function ProposalCard(props: {
  label: string
  tags: string
  tokens: Palette
  active: boolean
  onPick: () => void
}): ReactNode {
  return (
    <button
      type="button"
      className="ft-proposal"
      aria-pressed={props.active}
      onClick={props.onPick}
    >
      <MiniPreview tokens={props.tokens} />
      <div className="ft-proposal__meta">
        <span className="ft-proposal__name">{props.label}</span>
        <span className="ft-proposal__tags">{props.tags}</span>
        <Swatches tokens={props.tokens} />
      </div>
    </button>
  )
}

// ── suggestions ─────────────────────────────────────────────────────────────

function Suggester(props: {
  t: Translate
  mode: 'light' | 'dark'
  onMode: (mode: 'light' | 'dark') => void
  onApply: (spec: ThemeSpec) => void
  onReset: () => void
}): ReactNode {
  const { t } = props
  const [harmony, setHarmony] = useState<HarmonyKey>('analogous')
  const [batch, setBatch] = useState<Proposal[]>(() => randomBatch('analogous', 6))
  const [applied, setApplied] = useState<string>('')

  const tokensFor = useCallback(
    (proposal: Proposal): Palette => {
      const spec = proposalSpec(proposal, props.mode)
      const pair = generateTokens(spec)
      return props.mode === 'light' ? pairLight(pair) : pairDark(pair)
    },
    [props.mode],
  )

  const pick = (proposal: Proposal): void => {
    setApplied(proposal.key)
    props.onApply(proposalSpec(proposal, props.mode))
  }

  return (
    <>
      <Card
        title={t('suggest.harmony')}
        extra={
          <button type="button" className="ft-btn ft-btn--ghost" onClick={() => props.onMode(props.mode === 'light' ? 'dark' : 'light')}>
            {props.mode === 'light' ? t('suggest.modeLight') : t('suggest.modeDark')}
          </button>
        }
      >
        <div className="ft-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))' }}>
          {HARMONIES.map((key) => (
            <button
              key={key}
              type="button"
              className="ft-chip"
              aria-pressed={harmony === key}
              onClick={() => {
                setHarmony(key)
                setBatch(randomBatch(key, 6))
                setApplied('')
              }}
            >
              {t(`harmony.${key}`)}
            </button>
          ))}
        </div>
        <div className="ft-field__row">
          <button
            type="button"
            className="ft-btn"
            onClick={() => {
              setBatch(randomBatch(harmony, 6))
              setApplied('')
            }}
          >
            <Icon path={ICON.dice} />
            {t('suggest.shuffle')}
          </button>
          <button type="button" className="ft-btn ft-btn--ghost" onClick={props.onReset}>
            {t('suggest.reset')}
          </button>
        </div>
      </Card>

      <Card title={t('suggest.presets')}>
        <div className="ft-grid ft-grid--presets">
          {PRESETS.map((preset) => (
            <ProposalCard
              key={preset.key}
              label={t(preset.nameKey ?? 'plugin.title')}
              tags={`${Math.round(preset.hue)}°`}
              tokens={tokensFor(preset)}
              active={applied === preset.key}
              onPick={() => pick(preset)}
            />
          ))}
        </div>
      </Card>

      <Card title={t('suggest.batch')} extra={applied ? t('suggest.applied') : undefined}>
        <div className="ft-grid ft-grid--proposals">
          {batch.map((proposal) => (
            <ProposalCard
              key={proposal.key}
              label={t(`hue.${hueStopIndex(proposal.hue)}`)}
              tags={t(`harmony.${proposal.harmony}`)}
              tokens={tokensFor(proposal)}
              active={applied === proposal.key}
              onPick={() => pick(proposal)}
            />
          ))}
        </div>
      </Card>
    </>
  )
}

function pairLight(pair: TokenOverrides): Palette {
  const out: Palette = {}
  for (const key of Object.keys(pair)) out[key] = pair[key].light
  return out
}

function pairDark(pair: TokenOverrides): Palette {
  const out: Palette = {}
  for (const key of Object.keys(pair)) out[key] = pair[key].dark
  return out
}

// ── designer ────────────────────────────────────────────────────────────────

interface ChannelDefinition {
  key: ChannelKey
  hue: 'th' | 'th2' | 'ths'
  chroma: 'c1' | 'c2' | 'sc'
  lightness: 'l1' | 'l2' | null
  chromaMax: number
  chromaStep: number
}

const CHANNELS: readonly ChannelDefinition[] = [
  { key: 'th', hue: 'th', chroma: 'c1', lightness: 'l1', chromaMax: 0.28, chromaStep: 0.005 },
  { key: 'th2', hue: 'th2', chroma: 'c2', lightness: 'l2', chromaMax: 0.28, chromaStep: 0.005 },
  { key: 'ths', hue: 'ths', chroma: 'sc', lightness: null, chromaMax: 0.09, chromaStep: 0.002 },
]

const VARIANTS: ReadonlyArray<{ key: string; apply: (spec: ThemeSpec) => Record<string, number> }> = [
  { key: 'soft', apply: (spec) => ({ c1: clamp(spec.c1 * 0.55, 0.01, 0.28), c2: clamp(spec.c2 * 0.5, 0.01, 0.28) }) },
  { key: 'vivid', apply: (spec) => ({ c1: clamp(spec.c1 * 1.45, 0.01, 0.28), c2: clamp(spec.c2 * 1.6, 0.01, 0.28) }) },
  { key: 'bright', apply: (spec) => ({ l1: clamp(spec.l1 + 0.08, 0.3, 0.95), bg: clamp(spec.bg + 0.02, 0.04, 0.98) }) },
  { key: 'deep', apply: (spec) => ({ l1: clamp(spec.l1 - 0.1, 0.3, 0.95), bg: clamp(spec.bg - 0.03, 0.04, 0.98) }) },
  { key: 'swap', apply: (spec) => ({ th: spec.th2, th2: spec.th, c1: spec.c2, c2: spec.c1 }) },
]

function Designer(props: {
  t: Translate
  ctx: Context
  spec: ThemeSpec
  setSpec: (spec: ThemeSpec) => void
  onApply: (spec: ThemeSpec) => void
  onReset: () => void
  notify: (message: string) => void
}): ReactNode {
  const { t, spec } = props
  const locale = service<LocaleService>(props.ctx, 'locale')
  const [harmony, setHarmony] = useState<HarmonyKey>('analogous')
  const [locks, setLocks] = useState<Record<ChannelKey, boolean>>({ th: false, th2: false, ths: false })
  const [name, setName] = useState('')
  const [tags, setTags] = useState('')
  const [description, setDescription] = useState('')
  const [jsonText, setJsonText] = useState('')
  const [naming, setNaming] = useState(false)

  const currentTokens = useMemo(() => {
    const pair = generateTokens(spec)
    return spec.mode === 'light' ? pairLight(pair) : pairDark(pair)
  }, [spec])

  const setHue = (channel: ChannelDefinition, value: number): void => {
    const next = patch(spec, { [channel.hue]: value })
    if (channel.key !== 'th') {
      props.setSpec(next)
      return
    }
    const related = huesForHarmony(value, harmony)
    props.setSpec(
      patch(next, {
        ...(locks.th2 ? {} : { th2: related.th2 }),
        ...(locks.ths ? {} : { ths: related.ths }),
      }),
    )
  }

  const randomise = (): void => {
    const hue = Math.floor(Math.random() * 360)
    const picked = HARMONIES[Math.floor(Math.random() * 4)]
    const related = huesForHarmony(hue, picked)
    const base = spec.mode === 'light' ? DEF_LIGHT : DEF_DARK
    setHarmony(picked)
    props.setSpec({
      ...spec,
      th: hue,
      th2: related.th2,
      ths: related.ths,
      c1: clamp(0.08 + Math.random() * 0.16, 0.01, 0.28),
      c2: clamp(0.04 + Math.random() * 0.1, 0.01, 0.28),
      sc: clamp(0.01 + Math.random() * 0.04, 0.002, 0.09),
      l1: clamp(base.l1 + (Math.random() - 0.5) * 0.1, 0.3, 0.95),
    })
  }

  const exportJson = async (): Promise<void> => {
    setJsonText(JSON.stringify(specToInput(spec), null, 2))
    try {
      await navigator.clipboard.writeText(JSON.stringify(specToInput(spec)))
      props.notify(t('msg.copied'))
    } catch {
      // Clipboard access can be denied; the textarea still carries the payload.
    }
  }

  const importJson = (): void => {
    try {
      const parsed: unknown = JSON.parse(jsonText)
      const next = normalizeSpec(parsed)
      props.setSpec(next)
      props.onApply(next)
      props.notify(t('msg.imported'))
    } catch {
      props.notify(t('msg.importInvalid'))
    }
  }

  /**
   * Name the design through the host route. The browser shell exposes no model
   * service, so the request carries only tokens and the UI language; the host
   * half owns provider credentials. Any failure degrades to the procedural
   * label instead of leaving the field empty.
   * @returns nothing; state updates and notifies.
   */
  const nameWithAi = async (): Promise<void> => {
    if (naming) return
    const fallback = (): void => {
      setName(proceduralName(spec))
      setTags(`${t(`harmony.${harmony}`)},${t(`hue.${hueStopIndex(spec.th)}`)}`)
    }
    const language = locale?.current ?? document.documentElement.lang ?? 'zh'
    setNaming(true)
    try {
      const response = await fetch(NAME_ROUTE, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tokens: specToInput(spec), locale: language === 'en' ? 'en' : 'zh' }),
      })
      const payload = (await response.json()) as {
        ok?: boolean
        text?: string
        code?: string
      }
      if (payload.ok !== true || typeof payload.text !== 'string') {
        if (payload.code === 'no-model') {
          props.notify(t('err.noModel'))
          return
        }
        fallback()
        props.notify(t(payload.code === 'unavailable' ? 'err.noLlm' : 'msg.aiFailed'))
        return
      }
      const start = payload.text.indexOf('{')
      const end = payload.text.lastIndexOf('}')
      const parsed = start >= 0 && end > start
        ? JSON.parse(payload.text.slice(start, end + 1)) as {
          name?: unknown
          tags?: unknown
          desc?: unknown
        }
        : undefined
      const rawName = typeof parsed?.name === 'string' ? parsed.name.trim() : ''
      if (rawName.length === 0) {
        fallback()
        props.notify(t('msg.aiInvalid'))
        return
      }
      setName(rawName.slice(0, 16))
      const tagList = Array.isArray(parsed?.tags)
        ? parsed.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 5)
        : []
      setTags(tagList.map((tag) => tag.trim().slice(0, 8)).filter(Boolean).join(','))
      if (typeof parsed?.desc === 'string' && parsed.desc.trim().length > 0) {
        setDescription(parsed.desc.trim().slice(0, 72))
      }
      props.notify(t('msg.aiNamed'))
    } catch {
      fallback()
      props.notify(t('msg.aiFailed'))
    } finally {
      setNaming(false)
    }
  }

  return (
    <>
      <Card
        title={t('design.livePreview')}
        extra={
          <div className="ft-tabs" role="group" aria-label={t('design.livePreview')}>
            {(['light', 'dark'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className="ft-tab"
                aria-pressed={spec.mode === mode}
                onClick={() => props.setSpec(switchMode(spec, mode))}
              >
                {mode === 'light' ? t('design.modeLight') : t('design.modeDark')}
              </button>
            ))}
          </div>
        }
      >
        <MiniPreview tokens={currentTokens} tall />
      </Card>

      <Card
        title={t('design.start')}
        extra={
          <button type="button" className="ft-btn" onClick={randomise}>
            <Icon path={ICON.sparkle} />
            {t('design.smartRandom')}
          </button>
        }
      >
        <div className="ft-grid ft-grid--presets">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className="ft-chip"
              onClick={() => {
                const next = proposalSpec(preset, spec.mode)
                props.setSpec({ ...next, mode: spec.mode })
              }}
            >
              <span
                className="ft-swatch"
                style={{ background: oklchToHex(spec.mode === 'light' ? DEF_LIGHT.l1 : DEF_DARK.l1, 0.16, preset.hue) }}
              />
              {t(preset.nameKey ?? 'plugin.title')}
            </button>
          ))}
        </div>
        <div className="ft-field__row">
          <span className="ft-hint">{t('design.variant')}</span>
          {VARIANTS.map((variant) => (
            <button
              key={variant.key}
              type="button"
              className="ft-chip"
              onClick={() => props.setSpec(patch(spec, variant.apply(spec)))}
            >
              {t(`variant.${variant.key}`)}
            </button>
          ))}
        </div>
      </Card>

      <Card title={t('design.channels')}>
        <div className="ft-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))' }}>
          {HARMONIES.map((key) => (
            <button
              key={key}
              type="button"
              className="ft-chip"
              aria-pressed={harmony === key}
              onClick={() => setHarmony(key)}
            >
              {t(`harmony.${key}`)}
            </button>
          ))}
        </div>
        <div className="ft-grid ft-grid--channels">
          {CHANNELS.map((channel) => (
            <div key={channel.key} className="ft-channel">
              <div className="ft-channel__head">
                <span
                  className="ft-channel__dot"
                  style={{
                    background: oklchToHex(spec[channel.hue], spec[channel.chroma], channel.key === 'ths' ? 0.86 : spec[channel.lightness ?? 'l1']),
                  }}
                />
                <span className="ft-channel__name">
                  {t(`channel.${channel.key}`)} {t('design.channelSuffix')}
                </span>
                <button
                  type="button"
                  className="ft-lock"
                  aria-pressed={locks[channel.key]}
                  onClick={() => setLocks({ ...locks, [channel.key]: !locks[channel.key] })}
                >
                  <Icon path={locks[channel.key] ? ICON.lock : ICON.unlock} />
                  {locks[channel.key] ? t('design.locked') : t('design.unlocked')}
                </button>
              </div>
              <RangeRow
                label={t('design.hue')}
                value={spec[channel.hue]}
                min={0}
                max={360}
                step={1}
                onChange={(value) => setHue(channel, value)}
              />
              <RangeRow
                label={t('design.chroma')}
                value={spec[channel.chroma]}
                min={0.002}
                max={channel.chromaMax}
                step={channel.chromaStep}
                onChange={(value) => props.setSpec(patch(spec, { [channel.chroma]: value }))}
              />
              {channel.lightness ? (
                <RangeRow
                  label={t('design.lightness')}
                  value={spec[channel.lightness]}
                  min={0.3}
                  max={0.95}
                  step={0.005}
                  onChange={(value) => props.setSpec(patch(spec, { [channel.lightness as string]: value }))}
                />
              ) : null}
            </div>
          ))}
        </div>
        <RangeRow
          label={t('design.textLightness')}
          value={spec.tx}
          min={0.03}
          max={1}
          step={0.005}
          onChange={(value) => props.setSpec(patch(spec, { tx: value }))}
        />
        <RangeRow
          label={t('design.sidebarLightness')}
          value={spec.sb}
          min={0.04}
          max={0.98}
          step={0.005}
          onChange={(value) => props.setSpec(patch(spec, { sb: value }))}
        />
        <p className="ft-hint">{t('design.hint')}</p>
      </Card>

      <Card title={t('design.identity')}>
        <div className="ft-field">
          <span className="ft-field__label">{t('design.namePlaceholder')}</span>
          <div className="ft-field__row">
            <input
              className="ft-input"
              value={name}
              placeholder={t('design.namePlaceholder')}
              onChange={(event) => setName(event.target.value)}
            />
            <button type="button" className="ft-btn" onClick={() => void nameWithAi()} disabled={naming}>
              <Icon path={ICON.sparkle} />
              {naming ? t('design.naming') : t('design.aiName')}
            </button>
          </div>
        </div>
        <div className="ft-field">
          <span className="ft-field__label">{t('design.tagsPlaceholder')}</span>
          <input
            className="ft-input"
            value={tags}
            placeholder={t('design.tagsPlaceholder')}
            onChange={(event) => setTags(event.target.value)}
          />
        </div>
        <div className="ft-field">
          <span className="ft-field__label">{t('design.descPlaceholder')}</span>
          <input
            className="ft-input"
            value={description}
            placeholder={t('design.descPlaceholder')}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      </Card>

      <Card title={t('design.json')}>
        <textarea
          className="ft-textarea"
          value={jsonText}
          placeholder={t('design.jsonPlaceholder')}
          onChange={(event) => setJsonText(event.target.value)}
          spellCheck={false}
        />
        <div className="ft-field__row">
          <button type="button" className="ft-btn" onClick={() => void exportJson()}>
            {t('design.exportJson')}
          </button>
          <button type="button" className="ft-btn" onClick={importJson} disabled={!jsonText.trim()}>
            {t('design.importApply')}
          </button>
        </div>
      </Card>

      <div className="ft-foot">
        <div className="ft-field__row">
          <button type="button" className="ft-btn ft-btn--primary" onClick={() => props.onApply(spec)}>
            <Icon path={ICON.check} />
            {t('design.apply')}
          </button>
          <button type="button" className="ft-btn ft-btn--ghost" onClick={props.onReset}>
            {t('design.reset')}
          </button>
        </div>
        <span className="ft-hint">
          {spec.mode === 'light' ? t('design.modeLight') : t('design.modeDark')} · {Math.round(spec.th)}°{' '}
          {t(`harmony.${harmony}`)}
        </span>
      </div>
    </>
  )
}

/** Deterministic fallback name, used when the runtime has no LLM service. */
function proceduralName(spec: ThemeSpec): string {
  return `${hueLabelFallback(spec.th)} · ${Math.round(spec.th)}°`
}

/** Hue name without a translator, for the non-LLM fallback path. */
function hueLabelFallback(hue: number): string {
  const zh = DICTIONARIES.zh as Record<string, string>
  return zh[`hue.${hueStopIndex(hue)}`] ?? `${Math.round(hue)}°`
}

// ── panel ───────────────────────────────────────────────────────────────────

function ThemePanel(props: {
  ctx: Context
  t: Translate
  spec: ThemeSpec
  setSpec: (spec: ThemeSpec) => void
  wide: boolean
  onWide: (wide: boolean) => void
}): ReactNode {
  const { ctx, t } = props
  const [tab, setTab] = useState<'suggest' | 'design'>('suggest')
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const baseId = useId()

  const notify = useCallback((message: string): void => {
    setToast(message)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  const apply = useCallback(
    (next: ThemeSpec): void => {
      const theme = service<ThemeService>(ctx, 'theme')
      if (!theme?.overrideTokens) {
        notify(t('err.noTheme'))
        return
      }
      theme.overrideTokens(THEME_ID, generateTokens(next))
      props.setSpec(next)
      storeSpec(next)
      notify(t('msg.applied'))
    },
    [ctx, notify, props, t],
  )

  const reset = useCallback((): void => {
    apply(defaultSpec(props.spec.mode))
  }, [apply, props.spec.mode])

  return (
    <div className="ft-root">
      <header className="ft-head">
        <div className="ft-head__text">
          <span className="ft-eyebrow">Dsh-freestyle-theme</span>
          <h3 className="ft-title">{tab === 'suggest' ? t('tabs.suggest') : t('design.title')}</h3>
          <p className="ft-sub">{tab === 'suggest' ? t('suggest.sub') : t('design.sub')}</p>
        </div>
        <div className="ft-actions">
          <button
            type="button"
            className="ft-btn ft-btn--icon"
            aria-pressed={props.wide}
            aria-label={t('panel.widen')}
            title={t('panel.widenHint')}
            onClick={() => props.onWide(!props.wide)}
          >
            <Icon path={ICON.widen} />
          </button>
        </div>
      </header>

      <div className="ft-tabs" role="tablist" aria-label={t('plugin.title')}>
        {(['suggest', 'design'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`${baseId}-tab-${key}`}
            className="ft-tab"
            aria-selected={tab === key}
            aria-controls={`${baseId}-panel-${key}`}
            onClick={() => setTab(key)}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${baseId}-panel-${tab}`} aria-labelledby={`${baseId}-tab-${tab}`}>
        {tab === 'suggest' ? (
          <Suggester
            t={t}
            mode={props.spec.mode}
            onMode={(mode) => props.setSpec(switchMode(props.spec, mode))}
            onApply={apply}
            onReset={reset}
          />
        ) : (
          <Designer
            t={t}
            ctx={ctx}
            spec={props.spec}
            setSpec={props.setSpec}
            onApply={apply}
            onReset={reset}
            notify={notify}
          />
        )}
      </div>

      {toast ? (
        <div className="ft-toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
    </div>
  )
}

// ── settings row ────────────────────────────────────────────────────────────

function SettingsRow(props: { ctx: Context }): ReactNode {
  const t = useMemo(() => makeTranslator(props.ctx), [props.ctx])
  const [open, setOpen] = useState(false)
  const [wide, setWide] = useState<boolean>(() => readStoredWide())
  const [spec, setSpec] = useState<ThemeSpec>(() => readStoredSpec() ?? defaultSpec(preferredMode()))

  const setWidePersisted = useCallback((next: boolean): void => {
    setWide(next)
    try {
      window.localStorage.setItem(STORAGE_WIDE, next ? '1' : '0')
    } catch {
      // Best-effort persistence.
    }
  }, [])

  return (
    <div className={wide ? 'ft-wide' : undefined}>
      <div className="ft-row">
        <div className="ft-row__text">
          <span className="ft-row__title">{t('plugin.title')}</span>
          <span className="ft-row__desc">{t('plugin.rowDesc')}</span>
        </div>
        <button
          type="button"
          className="ft-btn"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? t('panel.collapse') : t('panel.customize')}
        </button>
      </div>
      {open ? (
        <ThemePanel ctx={props.ctx} t={t} spec={spec} setSpec={setSpec} wide={wide} onWide={setWidePersisted} />
      ) : null}
    </div>
  )
}

// ── plugin ──────────────────────────────────────────────────────────────────

/**
 * Plugin id handed to the loader and stamped on the injected style tag.
 * Named exports (not a default object) are what the shell's module table
 * consumes: it reads `apply` / `inject` / `name` off `module.exports`.
 */
const name = 'dsh-freestyle-theme'

/** The slot registry is the only service this half needs. */
const inject = ['slots']

/**
 * Mount the settings row through the `settings.general.item` seat. The seat
 * supplies `id` and `order` only and renders no label, so the row draws its own
 * header, value and write path.
 * @param ctx - client context carrying `slots`.
 */
function apply(ctx: Context): void {
  ensureStyles()
  const slots = service<SlotsService>(ctx, 'slots')
  if (!slots) return
  slots.inject('settings.general.item', () => {
    slots.register(
      { name: 'settings.general.item', id: ROW_ID, order: 60 },
      () => <SettingsRow ctx={ctx} />,
    )
  })
}

export { name, inject, apply }
