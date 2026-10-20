/**
 * Node module hooks: `./x` → `./x.ts(x)`, and JSX compiled with the project's
 * own TypeScript so tests run the shipping sources directly.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const RELATIVE = /^\.{1,2}\//

export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context)
  } catch (error) {
    if (RELATIVE.test(specifier) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      for (const extension of ['.ts', '.tsx']) {
        try {
          return await next(specifier + extension, context)
        } catch {}
      }
    }
    throw error
  }
}

export async function load(url, context, next) {
  if (!url.endsWith('.tsx')) return next(url, context)
  const file = fileURLToPath(url)
  const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  })
  return { format: 'module', source: outputText, shortCircuit: true }
}
