/**
 * Resolve `./x` to `./x.ts` so tests can import the type-stripped sources
 * directly — no build step, the same bytes that ship are the ones under test.
 */
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = join(dirname(fileURLToPath(import.meta.url)), '..')

register(
  'data:text/javascript,' +
    encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx) } catch (e) {
    if (spec.startsWith('.') && !/\\.[cm]?[jt]sx?$/.test(spec)) return next(spec + '.ts', ctx)
    throw e
  }
}`),
  pathToFileURL(join(root, 'tests', 'hook.mjs')),
)

export const load = (name) => {
  const relative = name.endsWith('.ts') ? name : `${name}.ts`
  const file = relative.includes('/') ? join(root, 'src', relative) : join(root, 'src/client', relative)
  return import(pathToFileURL(file).href)
}
