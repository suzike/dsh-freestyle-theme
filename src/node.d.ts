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
  export function unlink(path: string): Promise<void>
  export function stat(path: string): Promise<{ size: number }>
}

declare module 'node:crypto' {
  export function randomUUID(): string
}

declare module 'node:os' {
  export function homedir(): string
}

declare module 'node:path' {
  export function join(...segments: string[]): string
  export function dirname(path: string): string
}

/** Only the members the host half calls — deliberately not a Uint8Array subclass. */
declare class Buffer {
  static from(chunk: unknown): Buffer
  static concat(chunks: readonly Buffer[]): Buffer
  readonly length: number
  toString(encoding: 'utf8'): string
}

declare const process: {
  pid: number
  env: Record<string, string | undefined>
}
