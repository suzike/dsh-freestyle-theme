/**
 * Browser platform modules — the module-table entries the web shell seeds
 * before any plugin bundle runs. A client bundle may only `require` what this
 * list names (plus inline-safe wire layers); everything else must be bundled.
 *
 * This table mirrors the shell's own `platformModules()` factory in
 * `@deepseek-ai/dsh-web-frontend` (the `SZ()` closure in its dist bundle),
 * read from DSH 0.2.1-rc.2. Keep it aligned with the installed DSH when
 * upgrading: a specifier here that the shell no longer seeds resolves to
 * `undefined` at runtime, and a missing one cannot be required at all.
 *
 * @module dsh-freestyle-theme/shared/web-platform
 */

/** The module specifiers the shell shares into the frozen module table. */
export const PLATFORM_MODULES = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  'zod',
  '@tanstack/react-virtual',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
] as const

/** One platform module specifier (a seed-table key). */
export type PlatformModule = (typeof PLATFORM_MODULES)[number]
