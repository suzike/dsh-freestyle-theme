/**
 * How much of the top of the window belongs to the desktop shell, in CSS px.
 *
 * The desktop build hides its title bar and draws minimise / maximise / close
 * with Electron's `titleBarOverlay`, which the OS paints *above* every pixel of
 * page content. A full-window overlay therefore has to keep its own controls
 * out of that strip, or they end up buried under the window buttons — and on
 * macOS the traffic lights sit in the same band.
 *
 * Signals, strongest first:
 *   1. an explicit override (tests and manual debugging);
 *   2. `env(titlebar-area-height)`, which Chromium exposes exactly when an
 *      overlay is present, so it is correct per platform and per window state;
 *   3. `data-platform` on `<html>`, set by the desktop preload from
 *      `process.platform`. The web build never sets it, which is precisely how
 *      a browser tab stays edge-to-edge.
 *
 * A browser tab must resolve to 0: there is no strip to reserve, and 40px of
 * dead space at the top of a full-bleed overlay is a bug, not a margin.
 */
export const DESKTOP_STRIP = 40

export interface ChromeSignals {
  /** Explicit override, already parsed to px. */
  forced?: number | null
  /** Resolved `env(titlebar-area-height)`; negative when the overlay is absent. */
  areaHeight?: number | null
  /** `document.documentElement.dataset.platform`, e.g. `win32` / `darwin`. */
  platform?: string | null
}

export function chromeTopFrom(signals: ChromeSignals): number {
  const forced = signals.forced
  if (typeof forced === 'number' && Number.isFinite(forced)) return Math.max(0, forced)
  const area = signals.areaHeight
  if (typeof area === 'number' && Number.isFinite(area) && area >= 0) return area
  return signals.platform ? DESKTOP_STRIP : 0
}

/** Reads the live signals from the current document. */
export function detectChromeTop(doc: Document, win: Window): number {
  const forced = (win as unknown as { __ftChromeTop?: number }).__ftChromeTop

  let areaHeight: number | null = null
  try {
    // Two probes with different fallbacks: without an overlay they resolve to
    // 0px and 1px and disagree, with one they both report the real height. A
    // single negative fallback is not usable — it is invalid CSS and silently
    // collapses to 0, which looks exactly like "no strip".
    const read = (fallback: string): number => {
      const probe = doc.createElement('span')
      probe.style.cssText = `position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;padding-top:env(titlebar-area-height, ${fallback})`
      doc.body.appendChild(probe)
      const value = Number.parseFloat(win.getComputedStyle(probe).paddingTop)
      probe.remove()
      return Number.isFinite(value) ? value : Number.NaN
    }
    const a = read('0px')
    const b = read('1px')
    areaHeight = a === b ? a : -1
  } catch {
    /* a probe that cannot run only costs us signal 2 */
  }

  return chromeTopFrom({
    forced: typeof forced === 'number' ? forced : null,
    areaHeight,
    platform: doc.documentElement.dataset.platform ?? null,
  })
}

/**
 * Whether a `position: fixed` overlay really covers the viewport. A transformed
 * ancestor turns `fixed` into "fixed to that ancestor", and the overlay would
 * shrink to a panel — where reserving the shell's strip would just leave a band
 * of dead space. Measuring the box cannot tell the two apart while the entry
 * animation scales it, so inspect the ancestors instead.
 */
export function isViewportAnchored(el: HTMLElement): boolean {
  if (getComputedStyle(el).position !== 'fixed') return false
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    // A dialog that is still animating in carries a transient transform; it is
    // not what will contain us once the animation settles.
    if (node.getAnimations().some((animation) => animation.playState === 'running')) continue
    const style = getComputedStyle(node)
    if (style.transform !== 'none' || style.filter !== 'none' || style.perspective !== 'none') return false
    if (style.contain.includes('paint') || style.willChange.includes('transform')) return false
  }
  return true
}
