/**
 * Test entry: registers the TypeScript hooks and resolves a source module by
 * name (`palette`, `studio`, `index`) so tests need no build step.
 */
import { register } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const root = join(dirname(fileURLToPath(import.meta.url)), '..')

register(pathToFileURL(join(root, 'tests', 'hooks.mjs')).href)

export const load = (name) => {
  const dir = name.includes('/') ? join(root, 'src') : join(root, 'src/client')
  const candidates = /\.[cm]?[jt]sx?$/.test(name) ? [name] : [`${name}.ts`, `${name}.tsx`]
  const found = candidates.map((candidate) => join(dir, candidate)).find((file) => existsSync(file))
  if (!found) throw new Error(`no source for ${name} under ${dir}`)
  return import(pathToFileURL(found).href)
}
