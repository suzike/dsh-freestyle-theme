/**
 * The plugin's stylesheet, as a string.
 *
 * Why a string: the client bundle is a single CJS file loaded by the module
 * loader; injecting one `<style>` element is the least invasive way to bring
 * CSS along, and it keeps the CSS module rules of the build out of the picture.
 *
 * Rules of the house:
 * - chrome colours come from `--dsw-alias-*` / `--dsw-specific-*`, so the UI
 *   follows the *host* theme (light or dark) instead of fighting it;
 * - the preview subtree re-declares those same variables from the candidate
 *   palette, so one component renders any theme without a second stylesheet;
 * - every animation goes through `--ft-dur-*`, so `prefers-reduced-motion`
 *   disables motion in one place.
 *
 * @module dsh-freestyle-theme/client/styles
 */

/** Element id for the injected stylesheet. */
export const STYLE_ID = 'dsh-freestyle-theme/styles'

export const CSS = `
/* ── tokens for the plugin chrome ─────────────────────────────────────── */
.ft-root {
  --ft-dur-1: 120ms;
  --ft-dur-2: 180ms;
  --ft-dur-3: 240ms;
  --ft-dur-4: 320ms;
  --ft-ease-in: cubic-bezier(.2, 0, 0, 1);
  --ft-ease-out: cubic-bezier(.4, 0, 1, 1);
  --ft-radius: 12px;
  --ft-hair: 1px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dsw-alias-label-primary, #1a1a1a);
  font-variant-numeric: tabular-nums;
}

.ft-root *, .ft-root *::before, .ft-root *::after { box-sizing: border-box; }
.ft-root button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
.ft-root input, .ft-root textarea, .ft-root select { font: inherit; color: inherit; }
.ft-root :focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #3b82f6);
  outline-offset: 2px;
  border-radius: 6px;
}

/* ── settings row ─────────────────────────────────────────────────────── */
.ft-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 4px;
  min-height: 60px;
}
.ft-row-thumb {
  position: relative;
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 11px;
  overflow: hidden;
  border: var(--ft-hair) solid var(--dsw-alias-border-l2, rgba(0,0,0,.1));
  box-shadow: 0 1px 2px rgba(0,0,0,.06);
}
.ft-row-thumb i { position: absolute; display: block; }
.ft-row-main { flex: 1 1 auto; min-width: 0; }
.ft-row-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
.ft-row-hint {
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary, #6b7280);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ft-row-actions { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }

/* ── buttons ──────────────────────────────────────────────────────────── */
.ft-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  border: var(--ft-hair) solid var(--dsw-alias-border-l2, rgba(0,0,0,.12));
  background: var(--dsw-alias-bg-layer-1, #fff);
  color: var(--dsw-alias-label-primary, #111);
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  transition: background var(--ft-dur-1) var(--ft-ease-in),
    border-color var(--ft-dur-1) var(--ft-ease-in),
    transform var(--ft-dur-1) var(--ft-ease-in);
}
.ft-btn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.05)); }
.ft-btn:active { transform: scale(.97); }
.ft-btn[disabled] { opacity: .45; cursor: not-allowed; transform: none; }
.ft-btn-primary {
  border-color: transparent;
  background: var(--dsw-alias-button-primary-fill, #111);
  color: var(--dsw-alias-label-primary-foreground, #fff);
}
.ft-btn-primary:hover { background: var(--dsw-alias-button-primary-hover, #333); }
.ft-btn-ghost { border-color: transparent; background: transparent; }
.ft-btn-ghost:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.06)); }
.ft-btn-icon { width: 30px; padding: 0; }
.ft-btn-sm { height: 26px; padding: 0 9px; font-size: 12px; border-radius: 7px; }

/* ── segmented control ────────────────────────────────────────────────── */
.ft-seg {
  display: inline-flex;
  padding: 2px;
  gap: 2px;
  border-radius: 9px;
  background: var(--dsw-alias-bg-layer-3, rgba(0,0,0,.06));
  border: var(--ft-hair) solid var(--dsw-alias-border-l1, rgba(0,0,0,.06));
}
.ft-seg button {
  height: 24px;
  padding: 0 9px;
  border-radius: 7px;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #555);
  transition: background var(--ft-dur-1) var(--ft-ease-in),
    color var(--ft-dur-1) var(--ft-ease-in);
}
.ft-seg button[aria-pressed='true'] {
  background: var(--dsw-alias-bg-layer-1, #fff);
  color: var(--dsw-alias-label-primary, #111);
  box-shadow: 0 1px 2px rgba(0,0,0,.1);
}

/* ── chips ────────────────────────────────────────────────────────────── */
.ft-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 9px;
  border-radius: 7px;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #555);
  border: var(--ft-hair) solid var(--dsw-alias-border-l2, rgba(0,0,0,.1));
  transition: color var(--ft-dur-1) var(--ft-ease-in),
    border-color var(--ft-dur-1) var(--ft-ease-in),
    background var(--ft-dur-1) var(--ft-ease-in);
}
.ft-chip:hover { color: var(--dsw-alias-label-primary, #111); }
.ft-chip[aria-pressed='true'] {
  color: var(--dsw-alias-label-primary, #111);
  border-color: var(--dsw-alias-brand-primary, #3b82f6);
  background: var(--dsw-alias-button-ghost-active-fill, rgba(59,130,246,.1));
}
.ft-chip-dot { width: 9px; height: 9px; border-radius: 50%; flex: 0 0 auto; }

/* ── inputs ───────────────────────────────────────────────────────────── */
.ft-input {
  height: 30px;
  padding: 0 10px;
  width: 100%;
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.03));
  border: var(--ft-hair) solid var(--dsw-alias-border-l2, rgba(0,0,0,.1));
  font-size: 12.5px;
  transition: border-color var(--ft-dur-1) var(--ft-ease-in),
    background var(--ft-dur-1) var(--ft-ease-in);
}
.ft-input:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.05)); }
.ft-input::placeholder { color: var(--dsw-alias-label-tertiary, #9ca3af); }
.ft-textarea { height: auto; min-height: 60px; padding: 8px 10px; resize: vertical; line-height: 1.45; }

/* ── switch ───────────────────────────────────────────────────────────── */
.ft-switch {
  position: relative;
  width: 34px;
  height: 20px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--dsw-alias-bg-mask-2, rgba(0,0,0,.18));
  transition: background var(--ft-dur-2) var(--ft-ease-in);
}
.ft-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--dsw-alias-switch-thumb, #fff);
  box-shadow: 0 1px 2px rgba(0,0,0,.25);
  transition: transform var(--ft-dur-2) var(--ft-ease-in);
}
.ft-switch[aria-checked='true'] { background: var(--dsw-alias-brand-primary, #3b82f6); }
.ft-switch[aria-checked='true']::after { transform: translateX(14px); }

/* ── studio shell ─────────────────────────────────────────────────────── */
.ft-studio {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: grid;
  grid-template-rows: 56px minmax(0, 1fr);
  background: var(--dsw-alias-bg-base, #fafafa);
  animation: ft-fade-in var(--ft-dur-3) var(--ft-ease-in);
}
.ft-studio.is-closing { animation: ft-fade-out var(--ft-dur-2) var(--ft-ease-out) forwards; }

.ft-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  border-bottom: var(--ft-hair) solid var(--dsw-alias-border-l1, rgba(0,0,0,.08));
  background: var(--dsw-alias-bg-layer-1, #fff);
}
.ft-head-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
.ft-head-mid { display: flex; align-items: center; gap: 6px; }
.ft-head-right { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.ft-name {
  height: 28px;
  width: 200px;
  padding: 0 8px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  border: var(--ft-hair) solid transparent;
  background: transparent;
  transition: background var(--ft-dur-1) var(--ft-ease-in),
    border-color var(--ft-dur-1) var(--ft-ease-in);
}
.ft-name:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.05)); }
.ft-name:focus { background: var(--dsw-alias-bg-layer-2, #fff); border-color: var(--dsw-alias-border-l2, rgba(0,0,0,.1)); }
.ft-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  padding: 0 7px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  color: var(--dsw-alias-label-secondary, #666);
  background: var(--dsw-alias-bg-layer-3, rgba(0,0,0,.06));
}
.ft-badge-ok { color: var(--dsw-alias-state-success-primary, #16a34a); background: var(--dsw-alias-state-success-tertiary, rgba(22,163,74,.12)); }
.ft-badge-warn { color: var(--dsw-alias-state-warn-label, #b45309); background: var(--dsw-alias-state-warn-tertiary, rgba(180,83,9,.12)); }

/* ── three-column body ────────────────────────────────────────────────── */
.ft-body {
  display: grid;
  grid-template-columns: 72px 240px minmax(0, 1fr) 320px;
  min-height: 0;
}
.ft-body.rail-collapsed { grid-template-columns: 72px minmax(0, 1fr) 320px; }
.ft-body.no-inspector { grid-template-columns: 72px 240px minmax(0, 1fr); }

/* rail: icons → labels */
.ft-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border-right: var(--ft-hair) solid var(--dsw-alias-border-l1, rgba(0,0,0,.08));
  background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-layer-2, #f4f4f5));
}
.ft-rail-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 58px;
  padding: 7px 0 5px;
  border-radius: 9px;
  font-size: 10.5px;
  color: var(--dsw-alias-label-tertiary, #8a8f98);
  transition: color var(--ft-dur-1) var(--ft-ease-in),
    background var(--ft-dur-1) var(--ft-ease-in);
}
.ft-rail-btn:hover { color: var(--dsw-alias-label-primary, #111); background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.06)); }
.ft-rail-btn[aria-pressed='true'] {
  color: var(--dsw-alias-label-primary, #111);
  background: var(--dsw-specific-sidebar-nav-item-active, rgba(0,0,0,.07));
}
.ft-rail-btn[aria-pressed='true']::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 12px;
  bottom: 12px;
  width: 2px;
  border-radius: 2px;
  background: var(--dsw-alias-brand-primary, #3b82f6);
}
.ft-rail-btn svg { width: 17px; height: 17px; }
.ft-rail-spacer { flex: 1 1 auto; }

/* list column */
.ft-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: var(--ft-hair) solid var(--dsw-alias-border-l1, rgba(0,0,0,.08));
  background: var(--dsw-alias-bg-layer-1, #fff);
}
.ft-list-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 8px;
  border-bottom: var(--ft-hair) solid var(--dsw-alias-border-l1, rgba(0,0,0,.06));
}
.ft-list-head h2 { margin: 0; font-size: 12px; font-weight: 600; letter-spacing: .02em; }
.ft-list-count { font-size: 11px; color: var(--dsw-alias-label-tertiary, #9ca3af); }
.ft-list-body { flex: 1 1 auto; overflow-y: auto; padding: 6px; }
.ft-list-empty {
  margin: 18px 10px;
  padding: 16px 12px;
  border-radius: 10px;
  border: 1px dashed var(--dsw-alias-border-l3, rgba(0,0,0,.16));
  text-align: center;
  color: var(--dsw-alias-label-tertiary, #8a8f98);
  font-size: 12px;
  line-height: 1.6;
}

/* theme card */
.ft-card {
  position: relative;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 7px 9px;
  margin-bottom: 2px;
  border-radius: 9px;
  text-align: left;
  transition: background var(--ft-dur-1) var(--ft-ease-in);
}
.ft-card:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.05)); }
.ft-card[aria-selected='true'] {
  background: var(--dsw-specific-sidebar-nav-item-active, rgba(0,0,0,.07));
}
.ft-card[aria-selected='true']::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 9px;
  border: var(--ft-hair) solid var(--dsw-alias-brand-primary, #3b82f6);
  pointer-events: none;
  opacity: .55;
}
.ft-card-sw {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: var(--ft-hair) solid var(--dsw-alias-border-l2, rgba(0,0,0,.08));
}
.ft-card-sw i { display: block; height: 100%; }
.ft-card-main { min-width: 0; }
.ft-card-name {
  font-size: 12.5px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ft-card-sub {
  margin-top: 1px;
  font-size: 10.5px;
  color: var(--dsw-alias-label-tertiary, #8a8f98);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ft-card-del {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border-radius: 5px;
  display: none;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-state-error-primary, #dc2626);
  background: var(--dsw-alias-bg-layer-1, #fff);
}
.ft-card:hover .ft-card-del { display: flex; }
.ft-group-label {
  padding: 10px 8px 4px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--dsw-alias-label-tertiary, #9ca3af);
}

/* ── canvas ───────────────────────────────────────────────────────────── */
.ft-canvas {
  position: relative;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 1px 1px, var(--dsw-alias-border-l1, rgba(0,0,0,.10)) 1px, transparent 0)
    0 0 / 16px 16px,
    var(--dsw-alias-bg-base, #f6f7f8);
}
.ft-canvas-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: var(--ft-hair) solid var(--dsw-alias-border-l1, rgba(0,0,0,.07));
  background: color-mix(in oklab, var(--dsw-alias-bg-layer-1, #fff) 78%, transparent);
  backdrop-filter: blur(12px) saturate(140%);
}
.ft-canvas-bar .ft-spacer { flex: 1 1 auto; }
.ft-canvas-stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  place-items: center;
  padding: 22px;
  overflow: auto;
}
.ft-zoom { position: relative; width: 100%; height: 100%; display: grid; place-items: center; }
.ft-zoom-inner { transform-origin: center center; transition: transform var(--ft-dur-2) var(--ft-ease-in); }

/* ── inspector ────────────────────────────────────────────────────────── */
.ft-insp {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-left: var(--ft-hair) solid var(--dsw-alias-border-l1, rgba(0,0,0,.08));
  background: var(--dsw-alias-bg-layer-1, #fff);
}
.ft-insp-body { flex: 1 1 auto; overflow-y: auto; }
.ft-sect { border-bottom: var(--ft-hair) solid var(--dsw-alias-border-l1, rgba(0,0,0,.07)); }
.ft-sect-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: .02em;
  color: var(--dsw-alias-label-secondary, #4b5563);
}
.ft-sect-head:hover { color: var(--dsw-alias-label-primary, #111); }
.ft-sect-head .ft-spacer { flex: 1 1 auto; }
.ft-sect-head svg { transition: transform var(--ft-dur-2) var(--ft-ease-in); }
.ft-sect-head[aria-expanded='false'] svg { transform: rotate(-90deg); }
.ft-sect-body { padding: 2px 12px 14px; display: grid; gap: 10px; }

/* channel block */
.ft-chan { border-radius: 10px; padding: 8px; background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.025)); }
.ft-chan-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 500;
}
.ft-chan-sw {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  flex: 0 0 auto;
  border: var(--ft-hair) solid var(--dsw-alias-border-l2, rgba(0,0,0,.12));
}
.ft-chan-hex { margin-left: auto; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #9ca3af); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.ft-lock {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  color: var(--dsw-alias-label-tertiary, #9ca3af);
}
.ft-lock[aria-pressed='true'] { color: var(--dsw-alias-brand-primary, #3b82f6); background: var(--dsw-alias-button-ghost-active-fill, rgba(59,130,246,.12)); }

/* slider row */
.ft-slider { display: grid; gap: 1px; padding: 2px 0; }
.ft-slider-top {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 10.5px;
  color: var(--dsw-alias-label-tertiary, #8a8f98);
}
.ft-slider-val {
  margin-left: auto;
  font-size: 10.5px;
  color: var(--dsw-alias-label-secondary, #6b7280);
  font-variant-numeric: tabular-nums;
  cursor: ew-resize;
  user-select: none;
  padding: 0 2px;
  border-radius: 3px;
}
.ft-slider-val:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.06)); }
.ft-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 20px;
  background: transparent;
  cursor: pointer;
}
.ft-range::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: var(--ft-track, var(--dsw-alias-border-l3, rgba(0,0,0,.15)));
}
.ft-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 13px;
  height: 13px;
  margin-top: -4.5px;
  border-radius: 50%;
  background: var(--dsw-alias-switch-thumb, #fff);
  border: var(--ft-hair) solid var(--dsw-alias-border-l3, rgba(0,0,0,.2));
  box-shadow: 0 1px 3px rgba(0,0,0,.22);
  transition: transform var(--ft-dur-1) var(--ft-ease-in);
}
.ft-range:hover::-webkit-slider-thumb { transform: scale(1.12); }
.ft-range:active::-webkit-slider-thumb { transform: scale(1.2); }
.ft-range::-moz-range-track { height: 4px; border-radius: 999px; background: var(--ft-track); }
.ft-range::-moz-range-thumb {
  width: 13px; height: 13px; border-radius: 50%;
  background: var(--dsw-alias-switch-thumb, #fff);
  border: var(--ft-hair) solid var(--dsw-alias-border-l3, rgba(0,0,0,.2));
}

/* hue bar (18 stops) */
.ft-hues { display: grid; grid-template-columns: repeat(18, 1fr); gap: 2px; margin: 2px 0 4px; }
.ft-hues button {
  height: 12px;
  border-radius: 3px;
  transition: transform var(--ft-dur-1) var(--ft-ease-in);
}
.ft-hues button:hover { transform: scaleY(1.5); }
.ft-hues button[aria-pressed='true'] { outline: 2px solid var(--dsw-alias-label-primary, #111); outline-offset: 1px; }

/* contrast panel */
.ft-audit-head {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}
.ft-audit-score { font-size: 12px; font-weight: 600; }
.ft-audit-list { display: grid; gap: 1px; }
.ft-audit-row {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 11.5px;
}
.ft-audit-row:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.05)); }
.ft-audit-row[data-pass='false'] { background: var(--dsw-alias-state-error-tertiary, rgba(220,38,38,.08)); }
.ft-audit-dot { width: 7px; height: 7px; border-radius: 50%; margin-left: 3px; }
.ft-audit-num { font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #8a8f98); font-variant-numeric: tabular-nums; }
.ft-audit-num b { color: var(--dsw-alias-label-secondary, #6b7280); font-weight: 600; }

/* swatches strip */
.ft-swatches { display: flex; gap: 4px; flex-wrap: wrap; }
.ft-swatch {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  border: var(--ft-hair) solid var(--dsw-alias-border-l2, rgba(0,0,0,.12));
}

/* ── preview frame ────────────────────────────────────────────────────── */
.ft-pv {
  position: relative;
  width: 560px;
  height: 420px;
  display: grid;
  grid-template-columns: 152px minmax(0, 1fr);
  overflow: hidden;
  border-radius: var(--ft-radius-lg, 16px);
  background: var(--dsw-alias-bg-base, #f7f7f8);
  color: var(--dsw-alias-label-primary, #111);
  border: var(--ft-hair) solid var(--dsw-alias-border-l2, rgba(0,0,0,.12));
  box-shadow: var(--ft-shadow-lg, 0 18px 48px rgba(0,0,0,.14));
  font-family: var(--ft-font-sans);
  font-size: calc(12px * var(--ft-font-scale, 1));
  line-height: 1.5;
  transition: background var(--ft-dur-3) var(--ft-ease-in),
    color var(--ft-dur-3) var(--ft-ease-in);
}
.ft-pv[data-size='lg'] { width: 720px; height: 520px; grid-template-columns: 190px minmax(0, 1fr); }
.ft-pv * { min-width: 0; }

.ft-pv-side {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 8px;
  background: var(--dsw-specific-sidebar-fill, #fbfbfc);
  border-right: var(--ft-hair) solid var(--dsw-alias-border-l1, rgba(0,0,0,.07));
}
.ft-pv-logo {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px 8px;
  font-size: calc(11.5px * var(--ft-font-scale, 1));
  font-weight: 600;
}
.ft-pv-logo i {
  width: 16px; height: 16px; border-radius: 5px;
  background: linear-gradient(135deg,
    var(--dsw-alias-brand-primary, #555),
    var(--dsw-alias-state-business-primary, #777));
}
.ft-pv-nav {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 8px;
  border-radius: var(--ft-radius-sm, 7px);
  font-size: calc(11.5px * var(--ft-font-scale, 1));
  color: var(--dsw-alias-label-secondary, #555);
}
.ft-pv-nav i { width: 12px; height: 12px; border-radius: 4px; background: var(--dsw-alias-label-dimmed, #bbb); opacity: .7; }
.ft-pv-nav[data-active='true'] {
  background: var(--dsw-specific-sidebar-nav-item-active, rgba(0,0,0,.06));
  color: var(--dsw-alias-label-primary, #111);
  font-weight: 600;
}
.ft-pv-nav[data-active='true'] i { background: var(--dsw-alias-brand-primary, #333); opacity: 1; }
.ft-pv-side-foot { margin-top: auto; display: flex; align-items: center; gap: 7px; padding: 6px; }
.ft-pv-ava {
  width: 22px; height: 22px; border-radius: 50%;
  background: linear-gradient(150deg,
    var(--dsw-alias-brand-primary, #777),
    var(--dsw-alias-state-business-tertiary, #aaa));
}

.ft-pv-main { display: grid; grid-template-rows: 38px minmax(0, 1fr) auto; min-height: 0; }
.ft-pv-top {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-bottom: var(--ft-hair) solid var(--dsw-alias-border-l1, rgba(0,0,0,.07));
  background: var(--dsw-alias-bg-layer-1, #fff);
  font-size: calc(11.5px * var(--ft-font-scale, 1));
  font-weight: 600;
}
.ft-pv-top .ft-pv-pill {
  margin-left: auto;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: calc(10px * var(--ft-font-scale, 1));
  font-weight: 500;
  color: var(--dsw-alias-label-secondary, #666);
  background: var(--dsw-alias-bg-layer-3, rgba(0,0,0,.05));
}
.ft-pv-scroll { overflow-y: auto; padding: 12px; display: grid; gap: 10px; align-content: start; }
.ft-pv-scroll::-webkit-scrollbar { width: 7px; }
.ft-pv-scroll::-webkit-scrollbar-thumb {
  border-radius: 99px;
  background: var(--dsw-alias-scrollbar-bg-l1, rgba(0,0,0,.16));
}

.ft-pv-user { display: flex; justify-content: flex-end; }
.ft-pv-bubble {
  max-width: 78%;
  padding: 7px 10px;
  border-radius: var(--ft-radius-md, 12px) var(--ft-radius-md, 12px) 4px var(--ft-radius-md, 12px);
  background: var(--dsw-specific-bubble, #eee);
  border: var(--ft-hair) solid var(--dsw-alias-border-l1, rgba(0,0,0,.05));
  font-size: calc(11.8px * var(--ft-font-scale, 1));
}

.ft-pv-turn { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 8px; }
.ft-pv-ai {
  width: 20px; height: 20px; border-radius: 6px;
  background: var(--dsw-alias-brand-primary, #333);
  display: grid; place-items: center;
  color: var(--dsw-alias-label-primary-foreground, #fff);
  font-size: 10px; font-weight: 700;
}
.ft-pv-p { margin: 0 0 8px; font-size: calc(11.8px * var(--ft-font-scale, 1)); }
.ft-pv-p:last-child { margin-bottom: 0; }
.ft-pv-strong { font-weight: 600; }
.ft-pv-dim { color: var(--dsw-alias-label-secondary, #666); }
.ft-pv-inline {
  padding: 1px 4px;
  border-radius: 4px;
  font-family: var(--ft-font-mono);
  font-size: .92em;
  background: var(--dsw-alias-markdown-inline-code, rgba(0,0,0,.06));
  border: var(--ft-hair) solid var(--dsw-alias-border-l1, rgba(0,0,0,.05));
}
.ft-pv-link { color: var(--dsw-alias-link, #2563eb); text-decoration: underline; text-underline-offset: 2px; }

.ft-pv-code {
  border-radius: var(--ft-radius-sm, 8px);
  overflow: hidden;
  border: var(--ft-hair) solid var(--dsw-alias-border-l2, rgba(0,0,0,.1));
  background: var(--dsw-alias-markdown-code-block, #f3f4f6);
  font-family: var(--ft-font-mono);
  font-size: calc(10.6px * var(--ft-font-scale, 1));
  margin: 8px 0;
}
.ft-pv-code-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  font-size: calc(10px * var(--ft-font-scale, 1));
  color: var(--dsw-alias-label-secondary, #666);
  background: var(--dsw-alias-markdown-code-block-banner, rgba(0,0,0,.05));
  border-bottom: var(--ft-hair) solid var(--dsw-alias-border-l1, rgba(0,0,0,.06));
}
.ft-pv-code pre { margin: 0; padding: 8px; overflow: hidden; white-space: pre; line-height: 1.55; }
.ft-pv-k { color: var(--dsw-alias-brand-text, #7c3aed); }
.ft-pv-s { color: var(--dsw-alias-state-success-primary, #16a34a); }
.ft-pv-c { color: var(--dsw-alias-label-tertiary, #999); }

.ft-pv-tool {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  padding: 6px 8px;
  border-radius: var(--ft-radius-sm, 8px);
  border: var(--ft-hair) solid var(--dsw-alias-border-l2, rgba(0,0,0,.1));
  background: var(--dsw-alias-bg-layer-1, #fff);
  font-size: calc(10.8px * var(--ft-font-scale, 1));
  margin: 6px 0;
}
.ft-pv-tool i {
  width: 16px; height: 16px; border-radius: 5px;
  background: var(--dsw-alias-state-business-tertiary, #ddd);
  display: grid; place-items: center;
  font-size: 9px; font-style: normal;
  color: var(--dsw-alias-label-primary, #333);
}
.ft-pv-tool span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ft-pv-tool em {
  font-style: normal;
  font-size: calc(9.6px * var(--ft-font-scale, 1));
  color: var(--dsw-alias-label-tertiary, #999);
}

.ft-pv-diff { border-radius: var(--ft-radius-sm, 8px); overflow: hidden; border: var(--ft-hair) solid var(--dsw-alias-border-l2, rgba(0,0,0,.1)); margin: 6px 0; }
.ft-pv-diff div {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 6px;
  padding: 2px 6px;
  font-family: var(--ft-font-mono);
  font-size: calc(10.4px * var(--ft-font-scale, 1));
}
.ft-pv-diff .add { background: var(--dsw-alias-file-diff-added-bg, #eaf7ec); }
.ft-pv-diff .del { background: var(--dsw-alias-file-diff-deleted-bg, #fdecec); }
.ft-pv-diff b {
  font-weight: 600;
  color: var(--dsw-alias-label-secondary, #666);
  background: var(--dsw-alias-file-diff-added-gutter, transparent);
}

.ft-pv-toast {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 9px;
  border-radius: var(--ft-radius-sm, 8px);
  background: var(--dsw-alias-toast-bg, #222);
  color: var(--dsw-alias-toast-label, #fff);
  font-size: calc(10.8px * var(--ft-font-scale, 1));
  width: fit-content;
  box-shadow: var(--ft-shadow-md);
}
.ft-pv-toast i { width: 7px; height: 7px; border-radius: 50%; background: var(--dsw-alias-state-success-secondary, #34d399); }

.ft-pv-tip {
  position: relative;
  display: inline-flex;
  padding: 5px 8px;
  border-radius: var(--ft-radius-sm, 8px);
  background: var(--dsw-alias-tooltip-bg, #1f2937);
  color: var(--dsw-alias-label-primary, #fff);
  font-size: calc(10.4px * var(--ft-font-scale, 1));
  margin: 2px 0 2px 12px;
}
.ft-pv-tip::before {
  content: '';
  position: absolute;
  left: -5px; top: 50%;
  transform: translateY(-50%) rotate(45deg);
  width: 8px; height: 8px;
  background: inherit;
  border-radius: 2px;
}

.ft-pv-composer {
  padding: 8px 12px 10px;
  border-top: var(--ft-hair) solid var(--dsw-alias-border-l1, rgba(0,0,0,.07));
  background: var(--dsw-alias-bg-layer-1, #fff);
}
.ft-pv-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px 7px 10px;
  border-radius: var(--ft-radius-md, 12px);
  background: var(--dsw-specific-input-major, #f5f5f6);
  border: var(--ft-hair) solid var(--dsw-alias-border-l2, rgba(0,0,0,.1));
  font-size: calc(11.4px * var(--ft-font-scale, 1));
  color: var(--dsw-alias-label-tertiary, #999);
}
.ft-pv-send {
  margin-left: auto;
  width: 24px; height: 24px;
  border-radius: 7px;
  display: grid; place-items: center;
  background: var(--dsw-alias-button-primary-fill, #111);
  color: var(--dsw-alias-label-primary-foreground, #fff);
  font-size: 11px;
}

/* list view */
.ft-pv-list { display: grid; gap: 1px; }
.ft-pv-row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--ft-radius-sm, 7px);
  font-size: calc(11.2px * var(--ft-font-scale, 1));
}
.ft-pv-row:nth-child(odd) { background: var(--dsw-alias-bg-layer-1, rgba(0,0,0,.02)); }
.ft-pv-row i { width: 16px; height: 16px; border-radius: 5px; background: var(--dsw-alias-label-dimmed, #ccc); }
.ft-pv-row em {
  font-style: normal;
  font-size: calc(9.8px * var(--ft-font-scale, 1));
  padding: 1px 6px;
  border-radius: 99px;
  background: var(--dsw-alias-bg-layer-3, rgba(0,0,0,.06));
  color: var(--dsw-alias-label-secondary, #666);
}

/* settings / form view */
.ft-pv-form { display: grid; gap: 10px; }
.ft-pv-field { display: grid; gap: 4px; }
.ft-pv-label { font-size: calc(10.6px * var(--ft-font-scale, 1)); color: var(--dsw-alias-label-secondary, #666); }
.ft-pv-box {
  height: 26px;
  border-radius: var(--ft-radius-sm, 7px);
  background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.03));
  border: var(--ft-hair) solid var(--dsw-alias-border-l2, rgba(0,0,0,.1));
  display: flex; align-items: center; padding: 0 8px;
  font-size: calc(11px * var(--ft-font-scale, 1));
  color: var(--dsw-alias-label-primary, #333);
}
.ft-pv-check {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 8px;
  border-radius: var(--ft-radius-sm, 7px);
  background: var(--dsw-alias-settings-card-fill, #fff);
  border: var(--ft-hair) solid var(--dsw-alias-settings-card-stroke, rgba(0,0,0,.08));
  font-size: calc(11.2px * var(--ft-font-scale, 1));
}
.ft-pv-check .ft-pv-toggle {
  margin-left: auto;
  width: 26px; height: 15px; border-radius: 99px;
  background: var(--dsw-alias-brand-primary, #3b82f6);
  position: relative;
}
.ft-pv-check .ft-pv-toggle::after {
  content: ''; position: absolute; right: 2px; top: 2px;
  width: 11px; height: 11px; border-radius: 50%;
  background: var(--dsw-alias-switch-thumb, #fff);
}

/* compare split */
.ft-cmp { position: relative; width: 100%; height: 100%; display: grid; place-items: center; }
.ft-cmp-track { position: relative; }
.ft-cmp-a, .ft-cmp-b { position: absolute; inset: 0; }
.ft-cmp-b { clip-path: inset(0 0 0 var(--ft-split, 50%)); }
.ft-cmp-base {
  position: absolute; inset: 0;
  clip-path: inset(0 calc(100% - var(--ft-split, 50%)) 0 0);
}
.ft-cmp-line {
  position: absolute;
  top: -8px; bottom: -8px;
  left: var(--ft-split, 50%);
  width: 2px;
  background: var(--dsw-alias-brand-primary, #3b82f6);
  cursor: ew-resize;
  transform: translateX(-1px);
}
.ft-cmp-line::after {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  width: 22px; height: 22px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: var(--dsw-alias-bg-layer-1, #fff);
  border: 2px solid var(--dsw-alias-brand-primary, #3b82f6);
  box-shadow: 0 2px 8px rgba(0,0,0,.18);
}
.ft-cmp-tag {
  position: absolute;
  top: 8px;
  padding: 2px 7px;
  border-radius: 6px;
  font-size: 10.5px;
  background: color-mix(in oklab, var(--dsw-alias-bg-overlay, #fff) 80%, transparent);
  color: var(--dsw-alias-label-secondary, #555);
  border: var(--ft-hair) solid var(--dsw-alias-border-l1, rgba(0,0,0,.08));
  backdrop-filter: blur(8px);
}

/* inspect hotspot + tooltip */
.ft-hot { position: relative; }
.ft-hot[data-hit='true'] { outline: 1.5px dashed var(--dsw-alias-brand-primary, #3b82f6); outline-offset: 1px; border-radius: 4px; }
.ft-inspect-tip {
  position: fixed;
  z-index: 2147483600;
  pointer-events: none;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--dsw-alias-tooltip-bg, #111827);
  color: var(--dsw-alias-tooltip-label, #f9fafb);
  font-size: 10.5px;
  line-height: 1.5;
  box-shadow: 0 8px 24px rgba(0,0,0,.24);
  max-width: 260px;
}
.ft-inspect-tip code { font-family: ui-monospace, Menlo, monospace; font-size: 10px; opacity: .85; }

/* ── modal / dialog ───────────────────────────────────────────────────── */
.ft-mask {
  position: fixed;
  inset: 0;
  z-index: 2147483400;
  display: grid;
  place-items: center;
  background: var(--dsw-alias-bg-mask-3, rgba(0,0,0,.42));
  backdrop-filter: blur(2px);
  animation: ft-fade-in var(--ft-dur-2) var(--ft-ease-in);
}
.ft-dialog {
  width: min(520px, 92vw);
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: var(--dsw-alias-bg-overlay, #fff);
  border: var(--ft-hair) solid var(--dsw-alias-border-l2, rgba(0,0,0,.1));
  box-shadow: 0 24px 64px rgba(0,0,0,.28);
  animation: ft-pop var(--ft-dur-3) var(--ft-ease-in);
  overflow: hidden;
}
.ft-dialog-head {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 14px;
  font-size: 13px; font-weight: 600;
  border-bottom: var(--ft-hair) solid var(--dsw-alias-border-l1, rgba(0,0,0,.08));
}
.ft-dialog-body { padding: 14px; overflow-y: auto; display: grid; gap: 10px; }
.ft-dialog-foot {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 10px 14px;
  border-top: var(--ft-hair) solid var(--dsw-alias-border-l1, rgba(0,0,0,.08));
}

/* ── command palette ──────────────────────────────────────────────────── */
.ft-cmd {
  position: fixed;
  z-index: 2147483500;
  left: 50%; top: 16vh;
  transform: translateX(-50%);
  width: min(460px, 92vw);
  border-radius: 13px;
  overflow: hidden;
  background: var(--dsw-alias-bg-overlay, #fff);
  border: var(--ft-hair) solid var(--dsw-alias-border-l2, rgba(0,0,0,.1));
  box-shadow: 0 24px 64px rgba(0,0,0,.3);
  animation: ft-pop var(--ft-dur-2) var(--ft-ease-in);
}
.ft-cmd-input {
  width: 100%;
  height: 42px;
  padding: 0 14px;
  border: 0;
  background: transparent;
  font-size: 13px;
  border-bottom: var(--ft-hair) solid var(--dsw-alias-border-l1, rgba(0,0,0,.08));
}
.ft-cmd-list { max-height: 300px; overflow-y: auto; padding: 5px; }
.ft-cmd-item {
  display: flex; align-items: center; gap: 9px;
  width: 100%; padding: 7px 9px; border-radius: 8px;
  font-size: 12.5px; text-align: left;
}
.ft-cmd-item[data-active='true'] { background: var(--dsw-alias-interactive-bg-active, rgba(59,130,246,.14)); }
.ft-cmd-item kbd {
  margin-left: auto;
  font-family: inherit;
  font-size: 10.5px;
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--dsw-alias-bg-layer-3, rgba(0,0,0,.06));
  color: var(--dsw-alias-label-tertiary, #999);
}

/* ── toast ────────────────────────────────────────────────────────────── */
.ft-toast {
  position: fixed;
  z-index: 2147483700;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 13px;
  border-radius: 10px;
  background: var(--dsw-alias-toast-bg, #1f2937);
  color: var(--dsw-alias-toast-label, #fff);
  font-size: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,.3);
  animation: ft-toast-in var(--ft-dur-3) var(--ft-ease-in);
}
.ft-toast[data-tone='error'] { background: var(--dsw-alias-state-error-primary, #dc2626); color: #fff; }

/* ── generation panel ─────────────────────────────────────────────────── */
.ft-gen { display: grid; gap: 8px; }
.ft-drop {
  display: grid;
  place-items: center;
  gap: 6px;
  min-height: 92px;
  padding: 12px;
  border-radius: 10px;
  border: 1.5px dashed var(--dsw-alias-border-l3, rgba(0,0,0,.18));
  background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.02));
  color: var(--dsw-alias-label-tertiary, #8a8f98);
  font-size: 11.5px;
  text-align: center;
  cursor: pointer;
  transition: border-color var(--ft-dur-1) var(--ft-ease-in),
    background var(--ft-dur-1) var(--ft-ease-in);
}
.ft-drop:hover, .ft-drop[data-over='true'] {
  border-color: var(--dsw-alias-brand-primary, #3b82f6);
  color: var(--dsw-alias-label-secondary, #666);
}
.ft-drop img { max-width: 100%; max-height: 120px; border-radius: 8px; }
.ft-proposals { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }

/* ── animations ───────────────────────────────────────────────────────── */
@keyframes ft-fade-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes ft-fade-out { from { opacity: 1 } to { opacity: 0 } }
@keyframes ft-pop { from { opacity: 0; transform: translateY(6px) scale(.985) } to { opacity: 1; transform: none } }
@keyframes ft-toast-in { from { opacity: 0; transform: translate(-50%, 8px) } to { opacity: 1; transform: translate(-50%, 0) } }
@keyframes ft-sweep { from { clip-path: circle(0% at 50% 50%) } to { clip-path: circle(140% at 50% 50%) } }

.ft-sweep { animation: ft-sweep 420ms var(--ft-ease-in); }

/* reduced motion: no movement, no fades — state appears instantly */
@media (prefers-reduced-motion: reduce) {
  .ft-root *, .ft-root *::before, .ft-root *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
}

/* narrow windows: fold the inspector under the canvas */
@media (max-width: 1080px) {
  .ft-body, .ft-body.rail-collapsed, .ft-body.no-inspector {
    grid-template-columns: 72px 200px minmax(0, 1fr);
  }
  .ft-insp { display: none; }
}
`
