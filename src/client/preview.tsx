/**
 * Full-fidelity preview canvas.
 *
 * This is not a mood board: every colour here is read from the candidate
 * palette through the same `--dsw-*` custom properties the real shell uses, so
 * what you see is what the app will look like. Each hot region declares the
 * tokens it depends on, which is what makes Inspect mode able to say "this
 * border is `--dsw-alias-border-l2`" instead of "some grey".
 *
 * @module dsh-freestyle-theme/client/preview
 */

import { useState, type CSSProperties, type FC } from 'react'
import { lookTokens, type Palette, type ThemeMode, type ThemeSpec } from './palette'
import type { Translate } from './locale'

/** Which skeleton the preview renders. */
export type PreviewView = 'chat' | 'list' | 'form'

/** Colour-vision deficiency simulations offered to the designer. */
export type BlindMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia' | 'achromatopsia'

/** Something the pointer is currently over. */
export interface InspectTarget {
  tokens: string[]
  label: string
  rect: DOMRect
}

export interface PreviewProps {
  spec: ThemeSpec
  palette: Palette
  /** Switch the mock app's own view when its sidebar is clicked. */
  onView?: (view: PreviewView) => void
  /** Model label shown in the mock title bar; the host supplies the real one. */
  model?: string
  view: PreviewView
  /** Render at the large canvas size. */
  large?: boolean
  blind?: BlindMode
  /** Inspect mode: hot regions report themselves. */
  inspect?: boolean
  onInspect?: (target: InspectTarget | null) => void
  /** Render the shared SVG filters; only the outermost frame should. */
  filters?: boolean
}

/** SVG filter ids for the vision simulations. */
export const BLIND_IDS: Record<Exclude<BlindMode, 'none'>, string> = {
  deuteranopia: 'ft-blind-deuteranopia',
  protanopia: 'ft-blind-protanopia',
  tritanopia: 'ft-blind-tritanopia',
  achromatopsia: 'ft-blind-achromatopsia',
}

/**
 * Colour matrices (Machado et al. 2009, severity 1.0), applied in linear RGB
 * space by the browser. Values are the published prototypes.
 */
export const VisionFilters: FC = () => (
  <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }}>
    <defs>
      <filter id={BLIND_IDS.protanopia}>
        <feColorMatrix
          type="matrix"
          values="0.152286 1.052583 -0.204868 0 0
                  0.114503 0.786281 0.099216 0 0
                  -0.003882 -0.048116 1.051998 0 0
                  0 0 0 1 0"
        />
      </filter>
      <filter id={BLIND_IDS.deuteranopia}>
        <feColorMatrix
          type="matrix"
          values="0.367322 0.860646 -0.227968 0 0
                  0.280085 0.672501 0.047413 0 0
                  -0.011820 0.042940 0.968881 0 0
                  0 0 0 1 0"
        />
      </filter>
      <filter id={BLIND_IDS.tritanopia}>
        <feColorMatrix
          type="matrix"
          values="1.255528 -0.076749 -0.178779 0 0
                  -0.078411 0.930809 0.147602 0 0
                  0.004733 0.691367 0.303900 0 0
                  0 0 0 1 0"
        />
      </filter>
      <filter id={BLIND_IDS.achromatopsia}>
        <feColorMatrix
          type="matrix"
          values="0.2126 0.7152 0.0722 0 0
                  0.2126 0.7152 0.0722 0 0
                  0.2126 0.7152 0.0722 0 0
                  0 0 0 1 0"
        />
      </filter>
    </defs>
  </svg>
)

/** CSS `filter` value for a simulation. */
export function blindFilter(blind: BlindMode): string | undefined {
  if (blind === 'none') return undefined
  return `url(#${BLIND_IDS[blind]})`
}

interface HotProps {
  tokens: string[]
  label: string
  inspect?: boolean
  onInspect?: (target: InspectTarget | null) => void
  className?: string
  style?: CSSProperties
  /** Clickable inside the mock app (nav items, toggles) when inspect is off. */
  onActivate?: () => void
  active?: boolean
  children: React.ReactNode
}

/**
 * One inspectable region.
 *
 * In inspect mode it claims the pointer; outside it, it is inert so the
 * preview cannot steal hover from the real UI.
 */
const Hot: FC<HotProps> = ({ tokens, label, inspect, onInspect, className, style, onActivate, active, children }) => {
  if (!inspect || !onInspect) {
    return (
      <div
        className={className}
        style={style}
        data-token={tokens.join(' ')}
        data-active={active ? 'true' : undefined}
        role={onActivate ? 'button' : undefined}
        tabIndex={onActivate ? 0 : undefined}
        aria-label={onActivate ? label : undefined}
        onClick={onActivate}
        onKeyDown={
          onActivate
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onActivate()
                }
              }
            : undefined
        }
      >
        {children}
      </div>
    )
  }
  return (
    <div
      className={`ft-hot ${className ?? ''}`}
      style={style}
      data-token={tokens.join(' ')}
      onPointerEnter={(event) =>
        onInspect({ tokens, label, rect: (event.currentTarget as HTMLElement).getBoundingClientRect() })
      }
      onPointerLeave={() => onInspect(null)}
    >
      {children}
    </div>
  )
}

interface FrameProps extends PreviewProps {
  t: Translate
}

/** The preview window: chrome, sidebar and the selected skeleton. */
export const PreviewFrame: FC<FrameProps> = ({ spec, palette, view, large, blind, inspect, onInspect, filters, onView, model, t }) => {
  const vars = { ...palette, ...lookTokens(spec) } as CSSProperties
  const mode: ThemeMode = spec.mode

  return (
    <div
      className="ft-pv"
      data-size={large ? 'lg' : 'sm'}
      data-mode={mode}
      data-inspect={inspect ? 'true' : undefined}
      style={{ ...vars, filter: blindFilter(blind ?? 'none') }}
    >
      {filters === false ? null : <VisionFilters />}

      {/* sidebar */}
      <div className="ft-pv-side">
        <Hot
          tokens={['--dsw-alias-brand-primary', '--dsw-alias-state-business-primary']}
          label={t('canvas.chat')}
          inspect={inspect}
          onInspect={onInspect}
          className="ft-pv-logo"
        >
          <i />
          <span>DSH</span>
        </Hot>
        <Hot
          tokens={['--dsw-specific-sidebar-nav-item-active', '--dsw-alias-brand-primary']}
          label={t('canvas.chat')}
          inspect={inspect}
          onInspect={onInspect}
          className="ft-pv-nav"
          onActivate={() => onView?.('chat')}
          active={view === 'chat'}
        >
          <i />
          <span>{t('canvas.chat')}</span>
        </Hot>
        <Hot
          tokens={['--dsw-alias-label-secondary']}
          label={t('canvas.list')}
          inspect={inspect}
          onInspect={onInspect}
          className="ft-pv-nav"
          onActivate={() => onView?.('list')}
          active={view === 'list'}
        >
          <i />
          <span>{t('canvas.list')}</span>
        </Hot>
        <Hot
          tokens={['--dsw-alias-label-secondary']}
          label={t('canvas.form')}
          inspect={inspect}
          onInspect={onInspect}
          className="ft-pv-nav"
          onActivate={() => onView?.('form')}
          active={view === 'form'}
        >
          <i />
          <span>{t('canvas.form')}</span>
        </Hot>
        <div className="ft-pv-side-foot">
          <Hot
            tokens={['--dsw-alias-brand-primary', '--dsw-alias-state-business-tertiary']}
            label={t('channel.th')}
            inspect={inspect}
            onInspect={onInspect}
            className="ft-pv-ava"
          >
            <span />
          </Hot>
          <span style={{ fontSize: 10.5, color: 'var(--dsw-alias-label-tertiary)' }}>{t('canvas.you')}</span>
        </div>
      </div>

      {/* main column */}
      <div className="ft-pv-main">
        <Hot
          tokens={['--dsw-alias-bg-layer-1', '--dsw-alias-border-l1', '--dsw-alias-label-primary']}
          label="topbar"
          inspect={inspect}
          onInspect={onInspect}
          className="ft-pv-top"
        >
          <span>useChat 竞态修复</span>
          <span className="ft-pv-pill">{model || t('canvas.model')}</span>
        </Hot>

        <div className="ft-pv-scroll">
          {view === 'chat' && <ChatBody t={t} inspect={inspect} onInspect={onInspect} />}
          {view === 'list' && <ListBody t={t} inspect={inspect} onInspect={onInspect} />}
          {view === 'form' && <FormBody t={t} inspect={inspect} onInspect={onInspect} />}
        </div>

        {view === 'chat' && (
          <Hot
            tokens={['--dsw-specific-input-major', '--dsw-alias-button-primary-fill']}
            label="composer"
            inspect={inspect}
            onInspect={onInspect}
            className="ft-pv-composer"
          >
            <input
              className="ft-pv-input"
              placeholder={t('canvas.composer')}
              aria-label={t('canvas.composer')}
              onFocus={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            />
            <button type="button" className="ft-pv-send" aria-label={t('canvas.send')} title={t('canvas.previewOnly')} aria-disabled="true">
              ↑
            </button>
          </Hot>
        )}
      </div>
    </div>
  )
}

interface BodyProps {
  t: Translate
  inspect?: boolean
  onInspect?: (target: InspectTarget | null) => void
}

const ChatBody: FC<BodyProps> = ({ t, inspect, onInspect }) => (
  <>
    <div className="ft-pv-user">
      <Hot
        tokens={['--dsw-specific-bubble', '--dsw-alias-label-primary']}
        label="bubble"
        inspect={inspect}
        onInspect={onInspect}
        className="ft-pv-bubble"
      >
        帮我把这个 useEffect 里的竞态处理掉，别引入新依赖。
      </Hot>
    </div>

    <div className="ft-pv-turn">
      <div className="ft-pv-ai">D</div>
      <div>
        <p className="ft-pv-p">
          用 <span className="ft-pv-inline">AbortController</span> 就够了，把{' '}
          <span className="ft-pv-strong">清理函数</span> 接上即可，已有的{' '}
          <a className="ft-pv-link" href="#preview" onClick={(event) => event.preventDefault()}>
            useChat
          </a>{' '}
          签名不用动。
        </p>

        <Hot
          tokens={[
            '--dsw-alias-markdown-code-block',
            '--dsw-alias-markdown-code-block-banner',
            '--dsw-alias-brand-text',
            '--dsw-alias-state-success-primary',
            '--dsw-alias-label-tertiary',
          ]}
          label="code block"
          inspect={inspect}
          onInspect={onInspect}
          className="ft-pv-code"
        >
          <div className="ft-pv-code-bar">
            <span>useChat.ts</span>
            <span style={{ marginLeft: 'auto' }}>TS</span>
          </div>
          <div className="ft-pv-code-lines">
            <div>
              <span className="ft-pv-k">const</span> ctrl = <span className="ft-pv-k">new</span>{' '}
              <span>AbortController</span>()
            </div>
            <div>
              <span className="ft-pv-k">void</span> stream(url, {'{ signal: ctrl.signal }'})
            </div>
            <div>
              <span className="ft-pv-k">return</span> () =&gt; ctrl.abort()
            </div>
            <div>
              <span className="ft-pv-c">// 卸载即取消</span>
            </div>
          </div>
        </Hot>

        <Hot
          tokens={['--dsw-alias-bg-layer-1', '--dsw-alias-border-l2', '--dsw-alias-state-business-tertiary']}
          label="tool call"
          inspect={inspect}
          onInspect={onInspect}
          className="ft-pv-tool"
        >
          <i>R</i>
          <span>read_file · src/hooks/useChat.ts</span>
          <em>24 行</em>
        </Hot>

        <Hot
          tokens={['--dsw-alias-file-diff-added-bg', '--dsw-alias-file-diff-deleted-bg', '--dsw-alias-file-diff-added-marker']}
          label="diff"
          inspect={inspect}
          onInspect={onInspect}
          className="ft-pv-diff"
        >
          <div className="del">
            <b>−</b>
            <span>useEffect(() =&gt; {'{'} stream(url) {'}'})</span>
          </div>
          <div className="add">
            <b>+</b>
            <span>const c = new AbortController()</span>
          </div>
          <div className="add">
            <b>+</b>
            <span>return () =&gt; c.abort()</span>
          </div>
        </Hot>

        <div className="ft-pv-floats">
          <Hot
            tokens={['--dsw-alias-toast-bg', '--dsw-alias-toast-label', '--dsw-alias-state-success-secondary']}
            label="toast"
            inspect={inspect}
            onInspect={onInspect}
            className="ft-pv-toast"
          >
            <i />
            <span>{t('msg.applied')}</span>
          </Hot>
          <Hot
            tokens={['--dsw-alias-tooltip-bg', '--dsw-alias-label-primary']}
            label="tooltip"
            inspect={inspect}
            onInspect={onInspect}
            className="ft-pv-tip"
          >
            ⌘K 可随时召唤命令面板
          </Hot>
        </div>
      </div>
    </div>
  </>
)

const ListBody: FC<BodyProps> = ({ t, inspect, onInspect }) => (
  <Hot
    tokens={['--dsw-alias-bg-layer-1', '--dsw-alias-label-dimmed', '--dsw-alias-bg-layer-3']}
    label="list"
    inspect={inspect}
    onInspect={onInspect}
  >
    <div className="ft-pv-list">
      {[
        [t('canvas.chat'), 'active'],
        [t('canvas.list'), 'idle'],
        [t('canvas.form'), 'done'],
        ['useChat.ts', 'idle'],
        ['theme.ts', 'done'],
        ['README.md', 'idle'],
        ['cordis.patch.yml', 'idle'],
        ['palette.ts', 'active'],
      ].map(([label, state]) => (
        <div className="ft-pv-row" key={label} data-state={state}>
          <i />
          <span>{label}</span>
          <em>{state}</em>
        </div>
      ))}
    </div>
  </Hot>
)

const FormBody: FC<BodyProps> = ({ t, inspect, onInspect }) => {
  const [motion, setMotion] = useState(true)
  const [pairing, setPairing] = useState(false)
  return (
  <div className="ft-pv-form">
    <Hot
      tokens={['--dsw-alias-bg-layer-2', '--dsw-alias-border-l2', '--dsw-alias-label-secondary']}
      label="field"
      inspect={inspect}
      onInspect={onInspect}
      className="ft-pv-field"
    >
      <span className="ft-pv-label">{t('studio.name')}</span>
      <span className="ft-pv-box">深海夜航</span>
      <span className="ft-pv-hint">显示在设置页与分享卡片上</span>
    </Hot>

    <Hot
      tokens={['--dsw-alias-settings-card-fill', '--dsw-alias-settings-card-stroke', '--dsw-alias-brand-primary', '--dsw-alias-switch-thumb']}
      label="card + switch"
      inspect={inspect}
      onInspect={onInspect}
      className="ft-pv-check ft-pv-check-row"
    >
      <span>
        <b>{t('motion.title')}</b>
        <em>{t('motion.note')}</em>
      </span>
      <button
        type="button"
        className="ft-pv-toggle"
        data-on={motion ? 'true' : 'false'}
        aria-pressed={motion}
        aria-label={t('motion.title')}
        onClick={() => setMotion((value) => !value)}
      />
    </Hot>

    <Hot
      tokens={['--dsw-alias-settings-card-fill', '--dsw-alias-settings-card-stroke', '--dsw-alias-label-secondary']}
      label="card"
      inspect={inspect}
      onInspect={onInspect}
      className="ft-pv-check ft-pv-check-row"
    >
      <span>
        <b>{t('type.pair')}</b>
        <em>{t('type.note')}</em>
      </span>
      <button
        type="button"
        className="ft-pv-toggle"
        data-on={pairing ? 'true' : 'false'}
        aria-pressed={pairing}
        aria-label={t('type.pair')}
        onClick={() => setPairing((value) => !value)}
      />
    </Hot>

    <Hot
      tokens={['--dsw-alias-state-success-primary', '--dsw-alias-state-success-tertiary', '--dsw-alias-label-secondary']}
      label="success"
      inspect={inspect}
      onInspect={onInspect}
      className="ft-pv-status ft-pv-status-ok"
    >
      <i>✓</i>
      <span>{t('msg.saved')}</span>
      <em>{t('msg.applied')}</em>
    </Hot>

    <Hot
      tokens={['--dsw-alias-state-warn-primary', '--dsw-alias-state-warn-tertiary', '--dsw-alias-label-primary']}
      label="warning"
      inspect={inspect}
      onInspect={onInspect}
      className="ft-pv-status ft-pv-status-warn"
    >
      <i>!</i>
      <span>重启 DSH 后宿主界面才会使用新令牌</span>
    </Hot>
  </div>
  )
}
