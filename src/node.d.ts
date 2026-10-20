/**
 * Minimal ambient declarations for the three Node builtins the host half uses.
 *
 * The project keeps `types: []` on purpose: the client bundle must never
 * acquire Node typings (it would let a `node:` import typecheck silently and
 * then fail the purity gate). Declaring only the members we call keeps that
 * guarantee while still typechecking the host.
 */

declare module 'node:fs/promises' {
  export function readFile(path: string, encoding: 'utf8'): Promise<string>
  export function writeFile(path: string, data: string, encoding: 'utf8'): Promise<void>
  export function mkdir(path: string, options: { recursive: boolean }): Promise<string | undefined>
  export function rename(from: string, to: string): Promise<void>
}

declare module 'node:os' {
  export function homedir(): string
}

declare module 'node:path' {
  export function join(...segments: string[]): string
  export function dirname(path: string): string
}

declare const process: {
  pid: number
  env: Record<string, string | undefined>
}
