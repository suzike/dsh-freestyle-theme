/**
 * Visual system for the FreeStyle theme studio.
 *
 * Every surface colour is derived from the host's own `--dsw-*` tokens so the
 * studio follows whatever skin the user runs. Layout, rhythm and motion are
 * independent of the palette: 4px grid, 11/12/13/15/17 type scale, three
 * elevation steps, and a 120/180/240/320ms motion ladder.
 */

export const STYLE_ID = 'dsh-freestyle-theme/styles'

export const CSS = `
/* ---------------------------------------------------------------- tokens */
.ft-root {
  --ft-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text",
    "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif;
  --ft-mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;

  --ft-t1: 120ms;
  --ft-t2: 180ms;
  --ft-t3: 240ms;
  --ft-t4: 320ms;
  --ft-ease: cubic-bezier(0.32, 0.72, 0, 1);
  --ft-ease-out: cubic-bezier(0.4, 0, 1, 1);

  --ft-r1: 8px;
  --ft-r2: 11px;
  --ft-r3: 14px;
  --ft-r4: 18px;

  --ft-hair: var(--dsw-alias-border-l1);
  --ft-hair-strong: var(--dsw-alias-border-l2);
  --ft-ink: var(--dsw-alias-label-primary);
  --ft-ink-2: var(--dsw-alias-label-secondary);
  --ft-ink-3: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-caption));
  --ft-accent: var(--dsw-alias-brand-primary);

  --ft-surface: var(--dsw-alias-bg-overlay);
  --ft-surface-sunk: var(--dsw-alias-bg-layer-1);
  --ft-hover: var(--dsw-alias-interactive-bg-hover);
  --ft-active: var(--dsw-alias-interactive-bg-active);

  --ft-ring: 0 0 0 1px color-mix(in oklab, var(--dsw-alias-label-primary) 9%, transparent);
  --ft-shadow-1: 0 1px 2px color-mix(in oklab, var(--dsw-alias-bg-mask-1) 60%, transparent);
  --ft-shadow-2: 0 8px 24px -12px color-mix(in oklab, var(--dsw-alias-bg-mask-2) 90%, transparent),
    0 2px 6px -4px color-mix(in oklab, var(--dsw-alias-bg-mask-1) 70%, transparent);
  --ft-shadow-3: 0 28px 64px -24px color-mix(in oklab, var(--dsw-alias-bg-mask-3) 92%, transparent),
    0 8px 20px -12px color-mix(in oklab, var(--dsw-alias-bg-mask-2) 80%, transparent);

  color: var(--ft-ink);
  font-family: var(--ft-font);
  font-size: 13px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.ft-root *,
.ft-root *::before,
.ft-root *::after { box-sizing: border-box; }

.ft-root button,
.ft-root input,
.ft-root select,
.ft-root textarea {
  font: inherit;
  color: inherit;
  letter-spacing: inherit;
}

.ft-root :focus-visible {
  outline: 2px solid var(--ft-accent);
  outline-offset: 2px;
}

.ft-root ::selection {
  background: var(--dsw-alias-markdown-code-segment-selected);
  color: var(--ft-ink);
}

/* ---------------------------------------------------------------- atoms */
.ft-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 30px;
  padding: 0 11px;
  border: 1px solid var(--ft-hair);
  border-radius: var(--ft-r2);
  background: var(--ft-surface-sunk);
  color: var(--ft-ink);
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background var(--ft-t1) linear, border-color var(--ft-t1) linear,
    box-shadow var(--ft-t1) linear, transform var(--ft-t1) var(--ft-ease);
}

.ft-btn:not([disabled]):hover {
  background: var(--ft-hover);
  border-color: var(--ft-hair-strong);
}

.ft-btn:not([disabled]):active { transform: scale(0.98); }

.ft-btn[disabled] {
  opacity: 0.45;
  cursor: default;
}

.ft-btn-primary {
  background: var(--dsw-alias-button-primary-fill);
  border-color: transparent;
  color: var(--dsw-alias-label-primary-foreground, var(--dsw-alias-label-primary-inverted));
  box-shadow: var(--ft-shadow-1);
}

.ft-btn-primary:not([disabled]):hover {
  background: var(--dsw-alias-button-primary-hover);
  border-color: transparent;
}

.ft-btn-ghost,
.ft-btn-ghost:not([disabled]) {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}

.ft-btn-ghost:not([disabled]):hover {
  background: var(--ft-hover);
  border-color: transparent;
}

.ft-btn-icon {
  width: 30px;
  height: 30px;
  padding: 0;
}

.ft-btn-sm {
  height: 26px;
  padding: 0 9px;
  font-size: 11.5px;
  border-radius: var(--ft-r1);
}

.ft-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: currentColor;
}

.ft-spacer { flex: 1 1 auto; }

.ft-input {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--ft-hair);
  border-radius: var(--ft-r1);
  background: var(--ft-surface-sunk);
  color: var(--ft-ink);
  font-size: 12.5px;
  transition: border-color var(--ft-t1) linear, box-shadow var(--ft-t1) linear;
}

.ft-input::placeholder { color: var(--ft-ink-3); }

.ft-input:focus {
  outline: none;
  border-color: var(--ft-accent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-accent) 18%, transparent);
}

.ft-textarea {
  height: 72px;
  padding: 8px 10px;
  resize: vertical;
  line-height: 1.5;
}

.ft-seg {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 0;
  border-radius: 10px;
  background: var(--dsw-alias-bg-skeleton, var(--ft-surface-sunk));
}

.ft-seg > button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--ft-ink-2);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--ft-t1) linear, color var(--ft-t1) linear;
}

.ft-seg > button:not([disabled]):hover {
  background: var(--ft-hover);
  color: var(--ft-ink);
}

.ft-seg > button[aria-pressed='true'] {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--ft-ink);
  box-shadow: var(--ft-ring), var(--ft-shadow-1);
}

.ft-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 9px;
  border: 1px solid var(--ft-hair);
  border-radius: 999px;
  background: transparent;
  color: var(--ft-ink-2);
  font-size: 11.5px;
  cursor: pointer;
  transition: background var(--ft-t1) linear, color var(--ft-t1) linear, border-color var(--ft-t1) linear;
}

.ft-chip:not([disabled]):hover { background: var(--ft-hover); color: var(--ft-ink); }

.ft-chip[aria-pressed='true'] {
  color: var(--ft-ink);
  border-color: color-mix(in oklab, var(--ft-accent) 55%, var(--ft-hair));
  background: color-mix(in oklab, var(--ft-accent) 12%, transparent);
}

.ft-badge {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.ft-badge-ok {
  background: color-mix(in oklab, var(--dsw-alias-state-success-primary) 16%, transparent);
  color: var(--dsw-alias-state-success-primary);
}

.ft-badge-warn {
  background: color-mix(in oklab, var(--dsw-alias-state-warn-primary) 16%, transparent);
  color: var(--dsw-alias-state-warn-primary);
}

/* ---------------------------------------------------------------- shell */
.ft-studio {
  position: fixed;
  inset: var(--ft-chrome-top, 0px) 0 0 0;
  z-index: 2147483000;
  display: grid;
  /* The desktop shell owns the top strip of the window: it draws the window
     buttons there over an opaque fill of its own, and its own title bar shares
     that band. Covering it means our text collides with theirs and our
     background fights a rectangle we cannot recolour, so the overlay simply
     starts underneath it. In a browser the strip is 0 and this is edge to edge. */
  grid-template-rows: 52px minmax(0, 1fr);
  background: var(--dsw-alias-bg-base);
  overflow: hidden;
  counter-reset: none;
  animation: ft-enter var(--ft-t3) var(--ft-ease) both;
}

.ft-studio.is-closing {
  animation: ft-leave var(--ft-t2) var(--ft-ease-out) both;
  pointer-events: none;
}

@keyframes ft-enter {
  from { opacity: 0; transform: scale(0.994); }
  to { opacity: 1; transform: none; }
}

@keyframes ft-leave {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* ---------------------------------------------------------------- header */
.ft-head {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 0 12px;
  border-bottom: 1px solid var(--ft-hair);
  background: color-mix(in oklab, var(--dsw-alias-bg-overlay) 86%, transparent);
  backdrop-filter: blur(20px) saturate(160%);
}

.ft-head-left,
.ft-head-right {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.ft-head-left { flex: 1 1 0; }
.ft-head-right { justify-content: flex-end; }

.ft-head-mid {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.ft-head-title {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  padding: 0 6px;
}

.ft-name {
  width: 168px;
  height: 24px;
  padding: 0 6px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--ft-ink);
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-overflow: ellipsis;
}

.ft-name:hover { background: var(--ft-hover); }

.ft-name:focus {
  outline: none;
  background: var(--ft-surface-sunk);
  border-color: var(--ft-accent);
}

.ft-head-sub {
  padding-left: 6px;
  font-size: 11px;
  color: var(--ft-ink-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.ft-group {
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 1px;
  border-radius: var(--ft-r1);
}

.ft-group + .ft-group { margin-left: 4px; }

.ft-divider-v {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: var(--ft-hair);
}

/* ---------------------------------------------------------------- body */
.ft-body {
  display: grid;
  grid-template-columns: 60px 264px minmax(0, 1fr) 320px;
  min-height: 0;
}

.ft-body.no-inspector { grid-template-columns: 60px 264px minmax(0, 1fr); }

/* ---------------------------------------------------------------- rail */
.ft-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.ft-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 0;
  border-right: 1px solid var(--ft-hair);
  background: var(--dsw-alias-bg-layer-1);
}

.ft-rail-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: var(--ft-r2);
  background: transparent;
  color: var(--ft-ink-3);
  cursor: pointer;
  transition: background var(--ft-t1) linear, color var(--ft-t1) linear;
}

.ft-rail-btn:hover { background: var(--ft-hover); color: var(--ft-ink-2); }

.ft-rail-btn[aria-pressed='true'],
.ft-rail-btn[aria-expanded='true'] {
  background: var(--dsw-alias-button-ghost-active-fill);
  color: var(--ft-ink);
}

.ft-rail-btn[aria-pressed='true']::before,
.ft-rail-btn[aria-expanded='true']::before {
  content: '';
  position: absolute;
  left: -7px;
  top: 11px;
  bottom: 11px;
  width: 2.5px;
  border-radius: 2px;
  background: var(--ft-accent);
}

.ft-rail-spacer { flex: 1 1 auto; }

/* ---------------------------------------------------------------- sidebar */
.ft-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--ft-hair);
  background: var(--dsw-alias-bg-layer-1);
}

.ft-list-head {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 12px;
}

.ft-list-head h2 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.005em;
}

.ft-list-count {
  font-size: 11px;
  color: var(--ft-ink-3);
  font-variant-numeric: tabular-nums;
}

.ft-search {
  position: relative;
  padding: 0 10px 8px;
}

.ft-search-input {
  height: 28px;
  padding-left: 27px;
  border-color: transparent;
  background: var(--ft-surface-sunk);
  font-size: 12px;
}

.ft-search-input:hover { border-color: var(--ft-hair); }

.ft-search-icon {
  position: absolute;
  left: 20px;
  top: 7px;
  color: var(--ft-ink-3);
  pointer-events: none;
}

.ft-list-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  padding: 2px 10px 14px;
  align-content: start;
}

.ft-list-empty {
  padding: 24px 12px;
  text-align: center;
  font-size: 12px;
  color: var(--ft-ink-3);
  line-height: 1.6;
}

.ft-list-empty > div:first-child {
  color: var(--ft-ink-2);
  font-weight: 600;
  margin-bottom: 4px;
}

/* ---------------------------------------------------------------- cards */
.ft-card {
  position: relative;
  display: block;
  border: 1px solid var(--ft-hair);
  border-radius: var(--ft-r3);
  background: var(--dsw-alias-bg-layer-1);
  transition: border-color var(--ft-t1) linear, box-shadow var(--ft-t1) linear,
    transform var(--ft-t1) var(--ft-ease);
}

.ft-card:hover {
  border-color: var(--ft-hair-strong);
  box-shadow: var(--ft-shadow-2);
  transform: translateY(-1px);
}

.ft-card[data-selected='true'] {
  border-color: color-mix(in oklab, var(--ft-accent) 70%, var(--ft-hair));
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--ft-accent) 40%, transparent);
}

.ft-card-main {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  border-radius: inherit;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.ft-card-main-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 7px 9px 8px;
}

.ft-card-name {
  font-size: 12.5px;
  font-weight: 550;
  letter-spacing: -0.005em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ft-card-sub {
  font-size: 10.5px;
  color: var(--ft-ink-3);
  font-variant-numeric: tabular-nums;
}

.ft-card-del {
  position: absolute;
  z-index: 3;
  top: 6px;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--ft-hair);
  border-radius: 999px;
  background: var(--dsw-alias-bg-overlay);
  color: var(--ft-ink-2);
  opacity: 0;
  pointer-events: none;
  cursor: pointer;
  transition: opacity var(--ft-t1) linear, color var(--ft-t1) linear;
}

.ft-card:hover .ft-card-del,
.ft-card:focus-within .ft-card-del,
.ft-card-del[data-armed='true'] {
  opacity: 1;
  pointer-events: auto;
}

.ft-card-del:hover { color: var(--dsw-alias-state-error-primary); }
.ft-card-main { position: relative; z-index: 1; }
.ft-card-del { pointer-events: auto; }

.ft-card-del[data-armed='true'] {
  color: var(--dsw-alias-state-error-primary);
  border-color: color-mix(in oklab, var(--dsw-alias-state-error-primary) 50%, transparent);
}

/* ---------------------------------------------------------------- canvas */
.ft-canvas {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background-color: var(--dsw-alias-bg-base);
  background-image: radial-gradient(
    color-mix(in oklab, var(--dsw-alias-border-l2) 55%, transparent) 1px,
    transparent 1px
  );
  background-size: 16px 16px;
  background-position: -8px -8px;
}

.ft-canvas-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 14px;
  flex: 0 0 auto;
}

.ft-canvas-bar .ft-seg { background: var(--dsw-alias-bg-overlay); backdrop-filter: blur(12px); }

.ft-canvas-stage {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  place-items: center;
  padding: 0 16px 18px;
  overflow: hidden;
}

.ft-zoom {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  max-height: 100%;
}

.ft-zoom-inner {
  transform-origin: center center;
  transition: transform var(--ft-t2) var(--ft-ease);
}

.ft-stage-card {
  border-radius: var(--ft-r3);
  box-shadow: var(--ft-shadow-3), var(--ft-ring);
  overflow: hidden;
  background: var(--dsw-alias-bg-layer-1);
}

/* ---------------------------------------------------------------- inspector */
.ft-insp {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-left: 1px solid var(--ft-hair);
  background: var(--dsw-alias-bg-layer-1);
}

.ft-insp[hidden] { display: none; }

.ft-insp-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 18px;
}

.ft-sect + .ft-sect { border-top: 1px solid var(--ft-hair); }

.ft-sect-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 40px;
  padding: 0 14px;
  border: 0;
  background: transparent;
  color: var(--ft-ink);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.ft-sect-head:hover { background: var(--ft-hover); }

.ft-sect-head > .ft-chevron {
  color: var(--ft-ink-3);
  transition: transform var(--ft-t2) var(--ft-ease);
}

.ft-sect[data-open='true'] .ft-sect-head > .ft-chevron { transform: rotate(90deg); }

.ft-sect-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px 14px 14px;
}

.ft-sect[data-open='false'] .ft-sect-body { display: none; }

/* channels */
.ft-chan {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 9px;
  border: 1px solid var(--ft-hair);
  border-radius: var(--ft-r2);
  background: var(--dsw-alias-bg-layer-2);
}

.ft-chan-head {
  display: flex;
  align-items: center;
  gap: 7px;
}

.ft-chan-sw {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--dsw-alias-label-primary) 12%, transparent);
}

.ft-chan-head > span:nth-child(2) {
  font-size: 12px;
  font-weight: 550;
}

.ft-chan-hex {
  margin-left: auto;
  font-family: var(--ft-mono);
  font-size: 10.5px;
  color: var(--ft-ink-3);
  font-variant-numeric: tabular-nums;
}

.ft-lock {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ft-ink-3);
  cursor: pointer;
  transition: background var(--ft-t1) linear, color var(--ft-t1) linear;
}

.ft-lock:hover { background: var(--ft-hover); }

.ft-lock[aria-pressed='true'] {
  color: var(--ft-ink);
  background: var(--ft-hover);
}

/* hue strip */
.ft-hues {
  display: grid;
  grid-template-columns: repeat(18, 1fr);
  gap: 0;
  padding: 2px;
  border-radius: 9px;
  overflow: hidden;
  background: var(--ft-surface-sunk);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--dsw-alias-label-primary) 7%, transparent);
}

.ft-hues > button {
  position: relative;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 0;
  cursor: pointer;
  transition: transform var(--ft-t1) var(--ft-ease), box-shadow var(--ft-t1) linear;
}

.ft-hues > button::before {
  content: '';
  position: absolute;
  inset: -7px 0;
}

.ft-hues > button:hover { transform: scaleY(1.12); }

.ft-hues > button[aria-pressed='true'] {
  box-shadow: inset 0 0 0 2px var(--dsw-alias-bg-layer-1), inset 0 0 0 3.5px var(--ft-ink);
  transform: none;
  z-index: 1;
}

/* range */
.ft-slider {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ft-slider-top {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 11.5px;
  color: var(--ft-ink-2);
}

.ft-slider-val {
  margin-left: auto;
  font-family: var(--ft-mono);
  font-size: 10.5px;
  color: var(--ft-ink-3);
  font-variant-numeric: tabular-nums;
}

.ft-range {
  --ft-fill: 50%;
  --ft-track: var(--ft-hair-strong);
  position: relative;
  width: 100%;
  height: 28px;
  margin: 0;
  padding: 0;
  appearance: none;
  background: transparent;
  cursor: pointer;
  touch-action: none;
}

.ft-range::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: var(--ft-track);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--dsw-alias-label-primary) 6%, transparent);
}

.ft-range::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  margin-top: -6px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--dsw-alias-label-primary) 18%, transparent),
    0 1px 3px color-mix(in oklab, var(--dsw-alias-bg-mask-2) 70%, transparent);
  transition: transform var(--ft-t1) var(--ft-ease), box-shadow var(--ft-t1) linear;
}

.ft-range:not([disabled]):hover::-webkit-slider-thumb { transform: scale(1.08); }

.ft-range:not([disabled]):active::-webkit-slider-thumb {
  transform: scale(1.14);
  box-shadow: 0 0 0 1px var(--ft-accent), var(--ft-shadow-2);
}

.ft-range:focus-visible { outline: none; }

.ft-range:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 2px var(--ft-accent), var(--ft-shadow-2);
}

.ft-range[disabled] { opacity: 0.4; cursor: default; }

.ft-range::-moz-range-track {
  height: 4px;
  border-radius: 999px;
  background: var(--ft-track);
}

.ft-range::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 0;
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--dsw-alias-label-primary) 18%, transparent);
}

/* audit */
.ft-audit-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ft-audit-score {
  font-size: 12px;
  font-weight: 550;
  font-variant-numeric: tabular-nums;
}

.ft-audit-list {
  display: flex;
  flex-direction: column;
}

.ft-audit-row {
  display: grid;
  grid-template-columns: 7px 1fr auto auto;
  align-items: center;
  gap: 8px;
  height: 27px;
  border-top: 1px solid var(--ft-hair);
  font-size: 11.5px;
}

.ft-audit-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--dsw-alias-state-success-primary);
}

.ft-audit-row[data-pass='false'] .ft-audit-dot { background: var(--dsw-alias-state-error-primary); }

.ft-audit-row > span:nth-child(2) {
  color: var(--ft-ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ft-audit-num {
  font-family: var(--ft-mono);
  font-size: 10.5px;
  color: var(--ft-ink-3);
  font-variant-numeric: tabular-nums;
}

.ft-audit-num[data-pass='false'] { color: var(--dsw-alias-state-error-primary); }

/* ---------------------------------------------------------------- preview */
.ft-pv {
  position: relative;
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  width: 720px;
  height: 520px;
  overflow: hidden;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-family: var(--ft-font);
  font-size: 12px;
}

.ft-pv[data-size='sm'] { width: 560px; height: 420px; }

.ft-pv[data-view='form'] { grid-template-columns: 190px minmax(0, 1fr); }

.ft-pv-side {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 10px;
  background: var(--dsw-specific-sidebar-fill);
  border-right: 1px solid var(--dsw-alias-border-l1);
}

.ft-pv-logo {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 2px 6px 12px;
  font-size: 12px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.ft-pv-logo > i {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  background: var(--dsw-alias-brand-primary);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--dsw-alias-label-primary) 10%, transparent);
}

.ft-pv-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 27px;
  padding: 0 8px;
  border-radius: 7px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
}

.ft-pv-nav > i {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  background: currentColor;
  opacity: 0.38;
}

.ft-pv-nav[data-active='true'] {
  background: var(--dsw-specific-sidebar-nav-item-active);
  color: var(--dsw-alias-label-primary);
  font-weight: 550;
}

.ft-pv-nav[data-active='true'] > i { background: var(--dsw-alias-brand-primary); opacity: 1; }

.ft-pv-side-foot {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 9px;
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1);
}

.ft-pv-ava {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--dsw-alias-brand-primary), var(--dsw-specific-bubble-highlight));
}

.ft-pv-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.ft-pv-top {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}

.ft-pv-top > strong { font-size: 12px; font-weight: 600; }

.ft-pv-pill {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  height: 19px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
}

.ft-pv-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding: 14px;
}

/* Nothing inside the mock may shrink: a squashed flex item overprints its
   neighbours, which reads as a rendering bug rather than a design. */
.ft-pv-scroll > *,
.ft-pv-ai > * { flex: 0 0 auto; }

.ft-pv-user {
  align-self: flex-end;
  max-width: 72%;
  overflow-wrap: anywhere;
  padding: 7px 11px;
  border-radius: 13px 13px 4px 13px;
  background: var(--dsw-specific-bubble);
  color: var(--dsw-alias-label-primary);
  font-size: 11.5px;
  box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1);
}

.ft-pv-turn {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
}

.ft-pv-turn > span {
  width: 14px;
  height: 14px;
  border-radius: 5px;
  background: var(--dsw-alias-brand-primary);
  opacity: 0.9;
}

.ft-pv-ai { display: flex; flex-direction: column; gap: 7px; }

.ft-pv-p {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 11.5px;
  line-height: 1.55;
  color: var(--dsw-alias-label-primary);
}

.ft-pv-p strong { font-weight: 600; }

.ft-pv-p code,
.ft-pv-inline {
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--dsw-alias-markdown-inline-code);
  font-family: var(--ft-mono);
  font-size: 10.5px;
}

.ft-pv-link { color: var(--dsw-alias-link); text-decoration: none; }

.ft-pv-code {
  border-radius: 9px;
  overflow: hidden;
  background: var(--dsw-alias-markdown-code-block);
  box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1);
}

.ft-pv-code-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  background: var(--dsw-alias-markdown-code-block-banner);
  color: var(--dsw-alias-label-secondary);
  font-size: 9.5px;
  font-family: var(--ft-mono);
}

.ft-pv-code pre {
  margin: 0;
  padding: 8px 10px;
  font-family: var(--ft-mono);
  font-size: 10px;
  line-height: 1.7;
  color: var(--dsw-alias-label-primary);
  white-space: pre;
}

.ft-pv-k { color: var(--dsw-alias-label-primary-bluish); }
.ft-pv-c { color: var(--dsw-alias-label-secondary); }
.ft-pv-s { color: var(--dsw-alias-state-success-secondary); }

.ft-pv-tool {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 28px;
  padding: 0 9px;
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1);
  font-size: 10.5px;
  color: var(--dsw-alias-label-secondary);
}

.ft-pv-diff {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
  font-family: var(--ft-mono);
  font-size: 9.5px;
  box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1);
}

.ft-pv-diff > div {
  flex: 0 0 auto;
  display: flex;
  gap: 6px;
  padding: 2px 9px;
  white-space: nowrap;
  overflow: hidden;
}

.ft-pv-diff b { font-weight: 600; opacity: 0.7; }
.ft-pv-diff .add,
.ft-pv-diff .del {
  display: flex;
  gap: 8px;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
  border-left: 2px solid transparent;
}

.ft-pv-diff .add { background: var(--dsw-alias-code-diff-added); border-left-color: var(--dsw-alias-state-success-primary); }
.ft-pv-diff .del { background: var(--dsw-alias-code-diff-deleted); border-left-color: var(--dsw-alias-state-error-primary); }

.ft-pv-toast {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--dsw-alias-toast-bg);
  color: var(--dsw-alias-toast-label);
  font-size: 10.5px;
  box-shadow: var(--ft-shadow-2);
}

.ft-pv-tip {
  align-self: flex-start;
  padding: 5px 9px;
  border-radius: 8px;
  background: var(--dsw-alias-tooltip-bg);
  color: var(--dsw-alias-toast-label);
  font-size: 10px;
}

.ft-pv-composer {
  display: flex;
  align-items: center;
  min-height: 34px;
  gap: 8px;
  margin: 0 14px 12px;
  padding: 5px 6px 5px 11px;
  border-radius: 12px;
  background: var(--dsw-specific-input-major);
  box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1), var(--ft-shadow-1);
}

.ft-pv-input {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  line-height: 1.5;
  color: var(--dsw-alias-markdown-placeholder);
  font-size: 11px;
}

.ft-pv-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-inverted);
}

/* list view */
.ft-pv-list { display: flex; flex-direction: column; gap: 6px; }

.ft-pv-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 9px;
  background: var(--dsw-alias-bg-layer-2);
  box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1);
}

.ft-pv[data-mode='dark'] .ft-pv-row { background: var(--dsw-alias-bg-layer-3); }

.ft-pv[data-mode='dark'] .ft-pv-row { background: var(--dsw-alias-bg-layer-3); }

.ft-pv-row[data-active='true'] {
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--dsw-alias-brand-primary) 55%, transparent);
  background: var(--dsw-alias-interactive-bg-hover-accent);
}

.ft-pv-row > span:first-child {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-3);
}

.ft-pv-row > div { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ft-pv-row b { font-size: 11px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.ft-pv-row em { font-style: normal; font-size: 10px; color: var(--dsw-alias-label-tertiary); }

/* form view */
.ft-pv-form { display: flex; flex-direction: column; gap: 12px; }

.ft-pv-field { display: flex; flex-direction: column; gap: 5px; }

.ft-pv-label { font-size: 10.5px; color: var(--dsw-alias-label-secondary); }

.ft-pv-box {
  height: 28px;
  border-radius: 8px;
  background: var(--dsw-specific-input-major);
  box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1);
}

.ft-pv-box[data-focus='true'] {
  box-shadow: inset 0 0 0 1px var(--dsw-alias-brand-primary),
    0 0 0 3px color-mix(in oklab, var(--dsw-alias-brand-primary) 16%, transparent);
}

.ft-pv-toggle {
  position: relative;
  flex: 0 0 auto;
  width: 34px;
  height: 20px;
  border-radius: 999px;
  border: 0;
  padding: 0;
  cursor: pointer;
  background: var(--dsw-alias-interactive-bg-hover-solid);
  box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1);
  transition: background var(--ft-t2, 220ms) var(--ft-ease, cubic-bezier(0.22, 0.61, 0.36, 1)),
    box-shadow var(--ft-t2, 220ms) var(--ft-ease, cubic-bezier(0.22, 0.61, 0.36, 1));
}

.ft-pv-toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--dsw-alias-switch-thumb);
  box-shadow: 0 1px 2px color-mix(in oklab, var(--dsw-alias-label-primary) 22%, transparent);
  transition: transform var(--ft-t2, 220ms) var(--ft-ease, cubic-bezier(0.22, 0.61, 0.36, 1));
}

.ft-pv-toggle[data-on='true'] {
  background: var(--dsw-alias-brand-primary);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--dsw-alias-brand-primary) 60%, transparent);
}

.ft-pv-toggle[data-on='true']::after { transform: translateX(14px); }

.ft-pv-toggle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary), 0 0 0 4px var(--dsw-alias-bg-base);
}

.ft-pv-check { display: flex; align-items: center; gap: 7px; font-size: 10.5px; color: var(--dsw-alias-label-secondary); }

.ft-pv-check > i {
  width: 13px;
  height: 13px;
  border-radius: 4px;
  background: var(--dsw-alias-brand-primary);
}

.ft-pv-badge { margin-left: auto; }

.ft-zoomctl {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  margin-left: 4px;
  padding: 2px;
  border: 1px solid var(--ft-hair);
  border-radius: 999px;
  background: var(--dsw-alias-bg-overlay);
  backdrop-filter: blur(12px);
}

.ft-zoomctl > span {
  min-width: 38px;
  text-align: center;
  font-size: 11px;
  color: var(--ft-ink-2);
  font-variant-numeric: tabular-nums;
}

.ft-select {
  appearance: none;
  padding-right: 22px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238a8f98' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>");
  background-repeat: no-repeat;
  background-position: right 7px center;
}

/* ---------------------------------------------------------------- compare */
.ft-cmp {
  position: relative;
  border-radius: var(--ft-r3);
  overflow: hidden;
  box-shadow: var(--ft-shadow-3), var(--ft-ring);
}

.ft-cmp-track { position: relative; }

.ft-cmp-base,
.ft-cmp-b {
  position: absolute;
  inset: 0;
}

.ft-cmp-b { clip-path: inset(0 0 0 var(--ft-split, 50%)); }

.ft-cmp-tag {
  position: absolute;
  bottom: 10px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--dsw-alias-bg-mask-3) 62%, transparent);
  backdrop-filter: blur(8px);
  color: var(--dsw-alias-label-primary-inverted);
  font-size: 10px;
  font-weight: 500;
}

.ft-cmp-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--ft-split, 50%);
  z-index: 3;
  width: 2px;
  margin-left: -1px;
  background: var(--dsw-alias-label-primary-inverted);
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--dsw-alias-bg-mask-3) 45%, transparent);
  cursor: ew-resize;
  touch-action: none;
}

.ft-cmp-line::before { content: ''; position: absolute; inset: 0 -12px; }

.ft-cmp-line::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 26px;
  height: 26px;
  margin: -13px 0 0 -13px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: var(--ft-shadow-2), 0 0 0 1px color-mix(in oklab, var(--dsw-alias-label-primary) 12%, transparent);
}

/* ---------------------------------------------------------------- overlays */
.ft-mask {
  position: fixed;
  inset: 0;
  z-index: 2147483001;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in oklab, var(--dsw-alias-bg-mask-2) 88%, transparent);
  backdrop-filter: blur(6px);
  animation: ft-fade-in var(--ft-t2) linear both;
}

.ft-dialog {
  display: flex;
  flex-direction: column;
  width: min(520px, calc(100vw - 48px));
  max-height: min(620px, calc(100vh - 96px));
  border: 1px solid var(--ft-hair);
  border-radius: var(--ft-r4);
  background: color-mix(in oklab, var(--dsw-alias-bg-layer-1) 96%, transparent);
  backdrop-filter: blur(24px) saturate(160%);
  box-shadow: var(--ft-shadow-3);
  overflow: hidden;
  animation: ft-pop var(--ft-t3) var(--ft-ease) both;
}

.ft-dialog-head {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 12px 0 16px;
  border-bottom: 1px solid var(--ft-hair);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.ft-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  overflow-y: auto;
}

.ft-dialog-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--ft-hair);
  background: color-mix(in oklab, var(--dsw-alias-bg-layer-1) 55%, transparent);
}

.ft-cmd {
  position: fixed;
  top: 16vh;
  left: 50%;
  z-index: 2147483002;
  display: flex;
  flex-direction: column;
  width: min(560px, calc(100vw - 48px));
  max-height: min(440px, 60vh);
  transform: translateX(-50%);
  border: 1px solid var(--ft-hair);
  border-radius: var(--ft-r4);
  background: color-mix(in oklab, var(--dsw-alias-bg-layer-1) 96%, transparent);
  backdrop-filter: blur(24px) saturate(160%);
  box-shadow: var(--ft-shadow-3);
  overflow: hidden;
  animation: ft-pop var(--ft-t3) var(--ft-ease) both;
}

.ft-cmd-input {
  height: 50px;
  padding: 0 16px;
  border: 0;
  border-bottom: 1px solid var(--ft-hair);
  background: transparent;
  color: var(--ft-ink);
  font-size: 14.5px;
  letter-spacing: -0.01em;
}

.ft-cmd-input::placeholder { color: var(--ft-ink-3); }
.ft-cmd-input:focus { outline: none; }

.ft-cmd-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px;
  overflow-y: auto;
}

.ft-cmd-item {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 34px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--ft-r1);
  background: transparent;
  color: var(--ft-ink);
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
}

.ft-cmd-item > span:not(.ft-icon) { flex: 1 1 auto; min-width: 0; }
.ft-cmd-item > .ft-icon { flex: 0 0 auto; color: var(--ft-ink-3); }

.ft-cmd-item[data-active='true'] {
  background: var(--ft-hover);
}

.ft-cmd-item kbd {
  font-family: var(--ft-mono);
  font-size: 10px;
  color: var(--ft-ink-3);
}

.ft-toast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  z-index: 2147483003;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  padding: 0 13px;
  border: 1px solid var(--ft-hair);
  border-radius: 999px;
  background: color-mix(in oklab, var(--dsw-alias-bg-overlay) 92%, transparent);
  backdrop-filter: blur(16px) saturate(160%);
  box-shadow: var(--ft-shadow-2);
  color: var(--ft-ink);
  font-size: 12px;
  transform: translateX(-50%);
  animation: ft-toast-in var(--ft-t3) var(--ft-ease) both;
}

.ft-toast[data-tone='error'] { color: var(--dsw-alias-state-error-primary); }

.ft-inspect-tip {
  position: fixed;
  z-index: 2147483002;
  max-width: 268px;
  padding: 8px 10px;
  border: 1px solid var(--ft-hair);
  border-radius: var(--ft-r2);
  background: var(--dsw-alias-tooltip-bg);
  color: var(--dsw-alias-toast-label);
  box-shadow: var(--ft-shadow-3);
  font-size: 11px;
  line-height: 1.5;
  pointer-events: none;
}

.ft-inspect-tip code {
  font-family: var(--ft-mono);
  font-size: 10px;
  opacity: 0.86;
}

/* ---------------------------------------------------------------- generation */
.ft-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 116px;
  border: 1px dashed var(--ft-hair-strong);
  border-radius: var(--ft-r3);
  background: var(--ft-surface-sunk);
  color: var(--ft-ink-3);
  font-size: 11.5px;
  cursor: pointer;
  transition: border-color var(--ft-t1) linear, background var(--ft-t1) linear, color var(--ft-t1) linear;
}

.ft-drop:hover { border-color: var(--ft-accent); color: var(--ft-ink-2); }

.ft-drop[data-over='true'] {
  border-color: var(--ft-accent);
  background: color-mix(in oklab, var(--ft-accent) 8%, transparent);
  color: var(--ft-ink);
}

.ft-drop img {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  object-fit: cover;
  box-shadow: var(--ft-shadow-1);
}

.ft-swatches { display: flex; gap: 6px; flex-wrap: wrap; }

.ft-swatch {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--dsw-alias-label-primary) 12%, transparent);
}

.ft-gen { display: flex; flex-direction: column; gap: 8px; }

.ft-proposals {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.ft-spin {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 1.5px solid currentColor;
  border-right-color: transparent;
  border-radius: 999px;
  animation: ft-spin 640ms linear infinite;
}

@keyframes ft-spin { to { transform: rotate(360deg); } }

@keyframes ft-fade-in { from { opacity: 0; } to { opacity: 1; } }

@keyframes ft-pop {
  from { opacity: 0; transform: translateY(8px) scale(0.985); }
  to { opacity: 1; transform: none; }
}

@keyframes ft-toast-in {
  from { opacity: 0; transform: translate(-50%, 8px) scale(0.97); }
  to { opacity: 1; transform: translate(-50%, 0) scale(1); }
}

/* ---------------------------------------------------------------- settings row */
.ft-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 2px;
  border: 0;
  border-radius: var(--ft-r3);
  background: transparent;
  transition: background var(--ft-t1) linear;
}

.ft-row:hover { background: var(--dsw-alias-interactive-bg-hover); }

.ft-row-thumb {
  position: relative;
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  overflow: hidden;
  background: color-mix(in oklab, var(--dsw-alias-brand-primary) 9%, var(--dsw-alias-bg-base));
  box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l2), var(--ft-shadow-1);
  transition: box-shadow var(--ft-t1) linear;
}

.ft-row:hover .ft-row-thumb { box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l3), var(--ft-shadow-2); }

.ft-thumb-side {
  position: absolute;
  inset: 0 auto 0 0;
  width: 34%;
  display: block;
  box-shadow: inset -1px 0 0 var(--dsw-alias-border-l1);
}
.ft-thumb-card {
  position: absolute;
  left: 41%;
  right: 8%;
  top: 17%;
  height: 34%;
  border-radius: 3.5px;
  display: block;
  box-shadow: 0 0 0 1px var(--dsw-alias-border-l1);
}
.ft-thumb-line { position: absolute; left: 45%; top: 60%; width: 36%; height: 2.5px; border-radius: 2px; opacity: .5; display: block; }
.ft-thumb-line-2 { position: absolute; left: 45%; top: 70%; width: 24%; height: 2.5px; border-radius: 2px; opacity: .3; display: block; }
.ft-thumb-dot { position: absolute; left: 12%; top: 15%; width: 6px; height: 6px; border-radius: 50%; display: block; }

.ft-row-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1 1 auto; }

.ft-row-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.ft-row-hint {
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ft-row-actions { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }

.ft-row-action {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 5px 6px 5px 10px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: 500 12.5px/1.2 inherit;
  cursor: pointer;
  transition: background var(--ft-t1) linear, color var(--ft-t1) linear;
}
.ft-row-action:hover {
  background: var(--dsw-alias-interactive-bg-hover-accent);
  color: var(--dsw-alias-brand-primary);
}
.ft-row-action.is-on { color: var(--dsw-alias-brand-primary); }
.ft-row-action:focus-visible { outline: 2px solid var(--ft-accent); outline-offset: 2px; }

/* ---------------------------------------------------------------- scrollbars */
.ft-studio,
.ft-studio * {
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;
}

.ft-studio ::-webkit-scrollbar { width: 10px; height: 10px; }

.ft-studio ::-webkit-scrollbar-track { background: transparent; }

.ft-studio ::-webkit-scrollbar-thumb {
  border: 3px solid transparent;
  border-radius: 999px;
  background-clip: content-box;
  background-color: var(--dsw-alias-scrollbar-bg-l1);
}

.ft-studio ::-webkit-scrollbar-thumb:hover {
  background-color: var(--dsw-alias-scrollbar-hover-l1);
}

/* ---------------------------------------------------------------- responsive */
@media (max-width: 1180px) {
  .ft-body { grid-template-columns: 60px 240px minmax(0, 1fr) 288px; }
}

@media (max-width: 1080px) {
  .ft-body { grid-template-columns: 60px 232px minmax(0, 1fr); }

  .ft-insp {
    position: fixed;
    top: 52px;
    right: 0;
    bottom: 0;
    z-index: 2147483001;
    width: min(340px, 92vw);
    box-shadow: var(--ft-shadow-3);
    animation: ft-slide-in var(--ft-t3) var(--ft-ease) both;
  }

  @keyframes ft-slide-in {
    from { transform: translateX(14px); opacity: 0; }
    to { transform: none; opacity: 1; }
  }
}

@media (max-width: 780px) {
  .ft-body { grid-template-columns: 56px minmax(0, 1fr); }
  .ft-list { display: none; }
  .ft-canvas-stage { padding: 0 12px 12px; }
}

@media (hover: none) {
  .ft-card-del { opacity: 1; pointer-events: auto; }
}

@media (prefers-reduced-motion: reduce) {
  .ft-root,
  .ft-studio,
  .ft-studio *,
  .ft-studio *::before,
  .ft-studio *::after {
    animation-duration: 1ms !important;
    animation-delay: 0ms !important;
    transition-duration: 1ms !important;
  }

  .ft-hues > button:hover,
  .ft-hues > button[aria-pressed='true'],
  .ft-card:hover { transform: none; }
}

/* ── refinement layer ─────────────────────────────────────────────────────── */
.ft-body { min-height: 0; }
.ft-list { min-height: 0; }
.ft-list-body { min-height: 0; }
.ft-canvas { min-height: 0; overflow: hidden; }
.ft-insp { min-height: 0; }
.ft-insp-body { overflow: auto; min-height: 0; }

.ft-rail-divider {
  width: 18px;
  height: 1px;
  margin: 6px auto;
  background: var(--dsw-alias-border-l2);
  opacity: .8;
}
.ft-rail-btn svg { width: 18px; height: 18px; }

.ft-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 9px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: 500 12px/1 inherit;
  cursor: pointer;
  transition: background var(--ft-t1) linear, color var(--ft-t1) linear;
}
.ft-toggle:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.ft-toggle[aria-pressed='true'] {
  background: var(--dsw-alias-interactive-bg-hover-accent);
  color: var(--dsw-alias-brand-primary);
}
.ft-toggle:focus-visible { outline: 2px solid var(--ft-accent); outline-offset: 2px; }

.ft-blind { position: relative; display: inline-flex; }
.ft-menu {
  position: absolute;
  top: 34px;
  right: 0;
  z-index: 6;
  min-width: 158px;
  padding: 5px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  background: color-mix(in oklab, var(--dsw-alias-bg-layer-1) 97%, transparent);
  backdrop-filter: blur(20px) saturate(160%);
  box-shadow: var(--ft-shadow-3);
  animation: ft-pop var(--ft-t2) var(--ft-ease) both;
}
.ft-menu button {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 7px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: 400 12.5px/1.3 inherit;
  text-align: left;
  cursor: pointer;
}
.ft-menu button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.ft-menu button[aria-checked='true'] { color: var(--dsw-alias-brand-primary); }
.ft-menu-check { width: 12px; font-size: 11px; }

.ft-zoomctl { display: inline-flex; align-items: center; gap: 2px; }
.ft-zoomctl button {
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  cursor: pointer;
}
.ft-zoomctl button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.ft-zoomctl span {
  min-width: 42px;
  font: 500 11px/1 var(--ft-font-mono);
  color: var(--dsw-alias-label-secondary);
  text-align: center;
}

.ft-seg > button[aria-pressed='true'] {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .10);
}
.ft-seg > button + button { margin-left: 1px; }

/* library card: thumbnail on the left, name on the right */
.ft-card-main { display: flex; flex-direction: row; align-items: center; gap: 10px; padding: 7px 8px; }
.ft-card-main-text { padding: 0; gap: 2px; }
.ft-card-name { font-size: 12.5px; }
.ft-card-sub { font-size: 10.5px; }

.ft-card-sw {
  position: relative;
  display: block;
  flex: 0 0 auto;
  width: 84px;
  height: 50px;
  margin: 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1);
}
.ft-card-sw > .ft-card-side {
  position: absolute;
  inset: 0 auto 0 0;
  display: block;
  width: 28px;
  padding: 5px 0 0 5px;
  box-shadow: inset -1px 0 0 var(--dsw-alias-border-l1);
}
.ft-card-side u {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 2px;
  margin-bottom: 4px;
}
.ft-card-sw > .ft-card-body { position: absolute; inset: 0 0 0 28px; display: block; padding: 6px; }
.ft-card-bubble { display: block; height: 9px; width: 34px; margin: 5px 0 0 auto; border-radius: 4px; }
.ft-card-line { display: block; height: 3px; width: 30px; margin-top: 6px; border-radius: 2px; }
.ft-card-line.short { width: 20px; margin-top: 4px; }

/* code inside the preview scrolls instead of clipping mid glyph */
.ft-pv-code { overflow: hidden; }
.ft-pv-code pre {
  margin: 0;
  padding: 8px 10px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  white-space: pre;
}
.ft-pv-code pre::-webkit-scrollbar { height: 4px; }
.ft-pv-tip { bottom: auto; top: -34px; }
.ft-pv-toast { bottom: 12px; }
.ft-sect + .ft-sect { margin-top: 12px; }

/* floating samples inside the preview: toast bottom-centre, tooltip above the composer */
.ft-pv-main { position: relative; }
.ft-pv-floats { position: absolute; inset: 0; pointer-events: none; }
.ft-pv-toast {
  position: absolute;
  left: 50%;
  bottom: 62px;
  transform: translateX(-50%);
  pointer-events: auto;
}
.ft-pv-tip {
  position: absolute;
  right: 18px;
  bottom: 96px;
  pointer-events: auto;
}
.ft-pv-floats .ft-pv-toast { bottom: 62px; }
.ft-pv-floats .ft-pv-tip { top: auto; }

.ft-pv-code-lines {
  padding: 7px 10px 8px;
  font: 400 10px/1.65 var(--ft-font-mono);
  overflow-x: auto;
  scrollbar-width: thin;
}
.ft-pv-code-lines > div { white-space: pre; }

/* toolbar groups read as one object each, no hairline clutter */
.ft-canvas-bar { gap: 6px; padding: 0 14px; }
.ft-zoomctl {
  height: 28px;
  padding: 0 2px;
  border-radius: 8px;
  background: var(--dsw-alias-bg-skeleton);
}
.ft-zoomctl span { min-width: 40px; font-size: 10.5px; letter-spacing: .02em; }
.ft-zoomctl button { width: 22px; height: 22px; border-radius: 6px; }

.ft-rail-btn[aria-pressed='true'],
.ft-rail-btn[aria-expanded='true'] {
  background: color-mix(in oklab, var(--dsw-alias-brand-primary) 11%, transparent);
  color: var(--dsw-alias-brand-primary);
}

.ft-card { border-radius: 12px; }
.ft-card[data-selected='true'] {
  background: color-mix(in oklab, var(--dsw-alias-brand-primary) 6%, transparent);
  box-shadow: inset 0 0 0 1.5px var(--dsw-alias-brand-primary);
}
.ft-card-main { border-radius: 10px; }
.ft-card-sw { border-radius: 7px; }
.ft-card-side u:first-child { border-radius: 1.5px; }

/* only the current rail section is tinted; toggles use aria-expanded for state */
.ft-rail-btn[aria-expanded='true']:not([aria-pressed='true']) {
  background: transparent;
  color: var(--ft-ink-3);
}
.ft-rail-btn[aria-expanded='true']:not([aria-pressed='true']):hover {
  background: var(--ft-hover);
  color: var(--ft-ink-2);
}

/* the miniature window needs a touch more contrast at 84x50 */
.ft-card-bubble { opacity: .5 !important; }
.ft-card-line { opacity: .4 !important; }
.ft-card-line.short { opacity: .22 !important; }
.ft-card-side u { border-radius: 1.5px; }

/* preview list: status right-aligned, state carried by a dot */
.ft-pv-row { display: flex; align-items: center; gap: 9px; }
.ft-pv-row > span { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ft-pv-row > em {
  margin-left: auto;
  font: 500 9.5px/1 var(--ft-font-mono);
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--dsw-alias-label-tertiary);
  opacity: .9;
}
.ft-pv-row > i { flex: 0 0 auto; width: 5px; height: 5px; border-radius: 50%; background: var(--dsw-alias-label-tertiary); opacity: .45; }
.ft-pv-row[data-state='active'] > i { background: var(--dsw-alias-state-success-primary); opacity: 1; }
.ft-pv-row[data-state='done'] > i { background: var(--dsw-alias-brand-primary); opacity: .9; }
.ft-pv-row[data-state='active'] > em { color: var(--dsw-alias-state-success-secondary); }

/* preview form: labels, descriptions, status rows */
.ft-pv-form { padding: 14px 18px 18px; display: flex; flex-direction: column; gap: 10px; }
.ft-pv-field { display: flex; flex-direction: column; gap: 5px; }
.ft-pv-label { font: 500 11px/1.3 inherit; color: var(--dsw-alias-label-secondary); }
.ft-pv-hint { font: 400 10px/1.3 inherit; color: var(--dsw-alias-label-tertiary); }
.ft-pv-check-row { justify-content: space-between; align-items: center; gap: 12px; }
.ft-pv-check-row > span:first-child { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ft-pv-check-row b { font: 500 11.5px/1.3 inherit; color: var(--dsw-alias-label-primary); }
.ft-pv-check-row em { font: 400 10px/1.35 inherit; font-style: normal; color: var(--dsw-alias-label-tertiary); }
.ft-pv-status { align-items: center; gap: 8px; }
.ft-pv-status i {
  flex: 0 0 auto;
  width: 15px;
  height: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font: 600 9px/1 var(--ft-font-mono);
  font-style: normal;
}
.ft-pv-status span { flex: 1 1 auto; font: 400 11px/1.35 inherit; }
.ft-pv-status em { font: 400 9.5px/1 inherit; font-style: normal; color: var(--dsw-alias-label-tertiary); }
.ft-pv-status em + em::before,
.ft-pv-status em::before { content: '·'; margin: 0 6px 0 0; opacity: 0.55; }
.ft-pv-status-ok { background: var(--dsw-alias-state-success-tertiary); border-color: transparent; }
.ft-pv-status-ok i { background: var(--dsw-alias-state-success-primary); color: var(--dsw-alias-label-primary-foreground); }
.ft-pv-status-warn { background: var(--dsw-alias-state-warn-tertiary); border-color: transparent; }
.ft-pv-status-warn i { background: var(--dsw-alias-state-warn-primary); color: var(--dsw-alias-label-primary-foreground); }

/* traditional colour list: a swatch row, no card chrome */
.ft-list-note {
  margin: 2px 2px 6px;
  font: 400 10.5px/1.45 inherit;
  color: var(--dsw-alias-label-tertiary);
}
.ft-color {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 8px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: 500 12px/1.2 inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--ft-t1) linear, box-shadow var(--ft-t1) linear;
}
.ft-color:hover { background: var(--dsw-alias-interactive-bg-hover); }
.ft-color:focus-visible { outline: 2px solid var(--ft-accent); outline-offset: 1px; }
.ft-color > i {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .12), 0 0 0 .5px rgba(0, 0, 0, .06);
}
.ft-color > span { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ft-color > em {
  font: 400 9.5px/1 var(--ft-font-mono);
  font-style: normal;
  letter-spacing: .02em;
  color: var(--dsw-alias-label-tertiary);
}
.ft-color[data-selected='true'] {
  background: color-mix(in oklab, var(--dsw-alias-brand-primary) 7%, transparent);
  box-shadow: inset 0 0 0 1px var(--dsw-alias-brand-primary);
}
.ft-color[data-selected='true'] > span { color: var(--dsw-alias-brand-primary); }

/* hue strip: a vivid spectrum, not a row of pale chips */
.ft-hues { overflow: hidden; }
.ft-hues > button { flex: 1 1 0; height: 22px; border: 0; border-radius: 0; }
.ft-hues > button:first-child { border-radius: 7px 0 0 7px; }
.ft-hues > button:last-child { border-radius: 0 7px 7px 0; }
.ft-hues > button[aria-pressed='true'] {
  box-shadow: inset 0 0 0 2px var(--dsw-alias-bg-layer-1), inset 0 0 0 3px rgba(0, 0, 0, .28);
}

/* compare handle: a real grip, visible on light and dark previews */
.ft-cmp-line { width: 1px; background: color-mix(in oklab, var(--dsw-alias-label-primary) 55%, transparent); }
.ft-cmp-line::before { inset: 0 -14px; }
.ft-cmp-line::after {
  width: 28px;
  height: 28px;
  margin: -14px 0 0 -14px;
  background:
    linear-gradient(var(--dsw-alias-label-tertiary), var(--dsw-alias-label-tertiary)) center/2px 10px no-repeat,
    linear-gradient(var(--dsw-alias-bg-layer-1), var(--dsw-alias-bg-layer-1));
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--dsw-alias-label-primary) 16%, transparent), var(--ft-shadow-2);
}
.ft-cmp-tag { bottom: 10px; top: auto; }

.ft-cmp-tag { bottom: auto; top: 44px; }

/* command palette sits centred, with a quiet scrim */
.ft-cmd { left: 50%; transform: translateX(-50%); }
.ft-cmd-item { gap: 10px; height: 36px; padding: 0 12px; }
.ft-cmd-item > span { flex: 1 1 auto; }
.ft-cmd-item kbd {
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--dsw-alias-bg-skeleton);
  font: 500 9.5px/1.6 var(--ft-font-mono);
  color: var(--dsw-alias-label-tertiary);
}
.ft-mask {
  background: color-mix(in oklab, var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, .28)) 42%, transparent);
  backdrop-filter: blur(6px) saturate(120%);
}

.ft-mask {
  background: color-mix(in oklab, var(--dsw-alias-label-primary) 20%, transparent);
  backdrop-filter: blur(8px) saturate(120%);
}

/* dialog internals: one clear primary action, quiet secondaries */
.ft-btn-row { display: flex; gap: 8px; flex-wrap: wrap; }
.ft-sect-hair { height: 1px; background: var(--dsw-alias-border-l1); margin: 4px 0; }
.ft-dialog-label { font: 500 11px/1.3 inherit; color: var(--dsw-alias-label-secondary); }
.ft-dialog-body { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; }
.ft-dialog .ft-input { height: 32px; }
.ft-dialog .ft-textarea { min-height: 84px; padding: 8px 10px; line-height: 1.55; resize: vertical; }
.ft-mask { background: color-mix(in oklab, var(--dsw-alias-label-primary) 38%, transparent); }

/* the mock app's sidebar is real: clickable, hoverable, and it shows its state */
.ft-pv-nav[role='button'] { cursor: pointer; transition: background var(--ft-t1) var(--ft-ease), color var(--ft-t1) var(--ft-ease); }
.ft-pv-nav[role='button']:hover { background: color-mix(in oklab, var(--dsw-alias-brand-primary) 10%, transparent); }
.ft-pv-nav[data-active='true'] { background: var(--dsw-specific-sidebar-nav-item-active); color: var(--dsw-alias-brand-primary); }
.ft-pv-nav[data-active='true'] i { background: var(--dsw-alias-brand-primary); }
.ft-pv-nav[role='button']:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }

/* panels must scroll inside the studio, never push the page */
.ft-body > * { min-height: 0; }
.ft-list { display: flex; flex-direction: column; overflow: hidden; }
.ft-list-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
.ft-insp { display: flex; flex-direction: column; overflow: hidden; }
.ft-insp-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.ft-canvas { display: flex; flex-direction: column; overflow: hidden; }

/* a real, focusable composer inside the preview */
.ft-pv-input {
  flex: 1 1 auto;
  min-width: 0;
  height: 24px;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ft-pv-text, var(--dsw-alias-label-primary));
  font: inherit;
  font-size: 12px;
  padding: 0 4px;
}
.ft-pv-input::placeholder { color: inherit; opacity: 0.42; }
.ft-pv-input:focus-visible { box-shadow: inset 0 0 0 2px var(--dsw-alias-brand-primary); border-radius: 6px; }
.ft-pv-send[aria-disabled='true'] { opacity: 0.55; cursor: default; }

/* rename button sits beside the delete control, same reveal rule */
.ft-card-rename,
.ft-card-del { opacity: 0; pointer-events: none; }
.ft-card:hover .ft-card-rename,
.ft-card:hover .ft-card-del,
.ft-card:focus-within .ft-card-rename,
.ft-card:focus-within .ft-card-del { opacity: 1; pointer-events: auto; }
.ft-card-rename {
  position: absolute; top: 6px; right: 32px; z-index: 3;
  display: grid; place-items: center;
  width: 24px; height: 24px; padding: 0;
  border: 0; border-radius: 7px; background: transparent;
  color: var(--dsw-alias-label-tertiary); cursor: pointer;
  transition: background var(--ft-dur-1) var(--ft-ease), color var(--ft-dur-1) var(--ft-ease);
}
.ft-card-rename:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.ft-dialog-note { margin: 8px 0 0; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
@media (hover: none) {
  .ft-card-rename, .ft-card-del { opacity: 1; pointer-events: auto; }
}

/* Depth strip: the one palette-wide control, pinned above the role sections so
   it is reachable without scrolling past every channel. */
.ft-depth {
  position: sticky;
  top: 0;
  z-index: 3;
  margin: -2px -2px 10px;
  padding: 10px 12px 12px;
  border-radius: 12px;
  background: color-mix(in oklab, var(--dsw-alias-bg-overlay) 92%, transparent);
  backdrop-filter: blur(12px);
  box-shadow: 0 1px 0 color-mix(in oklab, var(--dsw-alias-label-primary) 8%, transparent);
}
.ft-depth .ft-seg.is-quick {
  gap: 4px;
}
.ft-depth .ft-seg.is-quick button {
  flex: 1;
  font-size: 11px;
  padding: 4px 0;
}
`
