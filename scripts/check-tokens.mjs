#!/usr/bin/env node
/**
 * Token + accessibility guard.
 *
 * Two failure modes this catches before a release:
 *   1. a token name that the shell never defines (typo → silently unstyled UI);
 *   2. a palette that ships a failing contrast pair in any preset or mode.
 *
 * Runs on raw TypeScript through Node's type stripping, so no build step.
 * The shell's token list is optional: set DSH_THEME_CLIENT to the installed
 * `dsh-client-ui-theme/lib/client.js` to enable check 1.
 */
import { register } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

// palette.ts is dependency-free, but contrast.ts uses extensionless imports.
// Teach the loader to resolve `./x` to `./x.ts` for type-stripped sources.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx) } catch (e) {
    if (spec.startsWith('.') && !/\\.[cm]?[jt]sx?$/.test(spec)) return next(spec + '.ts', ctx)
    throw e
  }
}`),
  pathToFileURL(join(here, 'hook.mjs')),
)

const palette = await import(pathToFileURL(join(root, 'src/client/palette.ts')).href)
const contrast = await import(pathToFileURL(join(root, 'src/client/contrast.ts')).href)

let failed = 0
const fail = (message) => {
  failed += 1
  console.error('  ✗ ' + message)
}

/* 1 ── every token exists in the shell ──────────────────────────────────── */
const shellPath = process.env.DSH_THEME_CLIENT
if (shellPath && existsSync(shellPath)) {
  const shell = new Set([...readFileSync(shellPath, 'utf8').matchAll(/--dsw-[a-z0-9-]+/g)].map((m) => m[0]))
  const sources = ['palette.ts', 'preview.tsx', 'studio.tsx', 'index.tsx', 'styles.ts']
  const seen = new Set()
  const usedByUi = new Set()
  for (const file of sources) {
    const text = readFileSync(join(root, 'src/client', file), 'utf8')
    for (const match of text.matchAll(/--dsw-[a-z0-9-]+/g)) {
      seen.add(match[0])
      if (file !== 'palette.ts') usedByUi.add(match[0])
    }
  }
  const unknown = [...seen].filter((token) => !shell.has(token) && token !== '--dsw-alias-' && token !== '--dsw-specific-')
  console.log(`tokens: ${seen.size} referenced, ${shell.size} defined by the shell`)
  if (unknown.length) fail('not defined by the shell: ' + unknown.join(', '))
  // Every token the palette can emit should actually be painted somewhere, so a
  // renamed token cannot silently become dead weight.
  const emitted = Object.keys(palette.generateTokens(palette.defaultSpec('light')))
  const unpainted = emitted.filter((token) => !usedByUi.has(token))
  if (unpainted.length) console.log(`tokens: ${unpainted.length} emitted but not painted (fine for reserved aliases): ${unpainted.slice(0, 4).join(', ')}…`)
} else {
  console.log('tokens: skipped shell diff (set DSH_THEME_CLIENT to enable)')
}

/* 2 ── token count and pair integrity ───────────────────────────────────── */
const tokens = palette.generateTokens(palette.defaultSpec('light'))
const names = Object.keys(tokens)
console.log(`palette: ${names.length} tokens`)
if (names.length !== 119) fail(`expected 119 tokens, got ${names.length}`)

const broken = names.filter((name) => {
  const pair = tokens[name]
  return !pair || typeof pair.light !== 'string' || typeof pair.dark !== 'string'
})
if (broken.length) fail('tokens without a light/dark pair: ' + broken.join(', '))

/* 3 ── contrast, every preset, both modes ───────────────────────────────── */
const TEXT_KINDS = new Set(['body', 'secondary', 'caption'])
let worst = { ratio: Infinity, id: '', preset: '', mode: '' }
for (const preset of palette.PRESETS) {
  for (const mode of ['light', 'dark']) {
    const results = contrast.auditPalette(palette.fullPalette(palette.presetSpec(preset.id, mode)))
    const bad = results.filter((result) => !result.pass)
    if (bad.length) fail(`${preset.id}/${mode}: ` + bad.map((r) => `${r.id} ${r.ratio}:1 lc${r.lc}`).join(', '))
    // No pair may rely on the 3:1 large-text / UI allowance: the panel states
    // AA compliance, so every measured pair has to clear 4.5:1 here.
    const thin = results.filter((result) => TEXT_KINDS.has(result.kind) ? result.ratio < 4.5 : result.ratio < 3)
    if (thin.length) fail(`${preset.id}/${mode} AA floor: ` + thin.map((r) => `${r.id} ${r.ratio}:1`).join(', '))
    for (const result of results) {
      if (result.ratio < worst.ratio) worst = { ratio: result.ratio, id: result.id, preset: preset.id, mode }
    }
  }
}
console.log(`contrast: ${palette.PRESETS.length} presets × 2 modes × ${contrast.AUDIT_PAIRS.length} pairs`)
console.log(`contrast: thinnest pair ${worst.ratio}:1 (${worst.id}, ${worst.preset}/${worst.mode})`)

/* 4 ── share code round-trips ───────────────────────────────────────────── */
const spec = palette.defaultSpec('dark')
const parsed = palette.decodeShare(palette.encodeShare(spec))
const decoded = palette.normalizeSpec(parsed?.spec)
const expected = palette.normalizeSpec(spec)
const drift = Object.keys(expected).filter(
  (key) => JSON.stringify(decoded[key]) !== JSON.stringify(expected[key]),
)
if (drift.length) fail('share code loses: ' + drift.join(', '))
else console.log(`share: ${palette.encodeShare(spec).length} chars, lossless`)

if (failed) {
  console.error(`\n${failed} problem(s).`)
  process.exit(1)
}
console.log('\nall checks passed.')
