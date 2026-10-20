/**
 * Standalone build config for dsh-freestyle-theme.
 *
 * Two artifacts, one package (a "dual-face" plugin):
 *   - `lib/index.js`   — the host face. ESM for the Cordis Loader; registers the
 *                        AI-naming route on `webServer` using the host `llm` and
 *                        `agentDefaultModel` services. No npm runtime deps.
 *   - `lib/client.js`  — the browser face. Closure-factory artifact for the web
 *                        shell's `window.__ModuleLoader__`: externals resolve
 *                        through the loader's frozen module table (see
 *                        `shared/web-platform.ts`), everything else is inlined.
 *
 * Types come from `tsc -p tsconfig.build.json` (lib/types), never from tsdown,
 * so the banner/footer stay parseable.
 */
import { clientBundle } from './shared/tsdown.client.ts'

export default clientBundle('dsh-freestyle-theme', ['src/index.ts'], {
  clientEntry: 'src/client/index.tsx',
})
