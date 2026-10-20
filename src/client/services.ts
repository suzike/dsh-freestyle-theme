/**
 * Service contracts this plugin's browser half consumes.
 *
 * The browser bundle is injected into the running shell, so these interfaces
 * describe — rather than import — the services owned by
 * `dsh-client-ui-theme`, `dsh-client-ui-slots`, `dsh-client-locale` and
 * `dsh-client-llm`. Keeping them local means a package that this plugin only
 * *talks to* never becomes a byte of the shipped bundle; only the shell, which
 * owns those packages, decides what a service really is.
 *
 * Every member is optional on purpose: the plugin resolves each service at the
 * moment it needs it, so a shell that lacks one degrades instead of failing to
 * start.
 *
 * @module dsh-freestyle-theme/client/services
 */

/** One token in both modes. */
export interface TokenPair {
  light: string
  dark: string
}

/** Token overrides keyed by custom-property name. */
export type TokenOverrides = Record<string, TokenPair>

/** The shell's theme service (owned by `dsh-client-ui-theme`). */
export interface ThemeService {
  /** Register a named, user-selectable theme. */
  register?: (id: string, tokens: TokenOverrides) => unknown
  /** Override tokens for an already registered theme id. */
  overrideTokens?: (id: string, tokens: TokenOverrides) => unknown
}

/**
 * What a `settings.general.item` registration accepts. The seat projects no
 * label and passes the owner no props, so a row carries only its key and
 * position here and draws everything else itself.
 */
export interface SlotRegisterOptions {
  name: string
  id?: string
  order?: number
}

/** The shell's slot service (owned by `dsh-client-ui-slots`). */
export interface SlotsService {
  /** Run `register` inside the slot's registration scope. */
  inject: (name: string, register: () => void) => unknown
  /** Declare one contribution to the current slot scope. */
  register: (options: SlotRegisterOptions, component: unknown) => unknown
}

/** The shell's i18n service (owned by `dsh-client-locale`). */
export interface LocaleService {
  /**
   * Register a dictionary. The shell has historically accepted both
   * `register(ns, { zh, en })` and `register(ns, localeId, dict)`; both are
   * offered by callers of this type.
   */
  register?: (namespace: string, dictionaries: unknown, locale?: unknown) => void
  /** Return the translator for a namespace. */
  bind: (namespace: string) => (key: string) => string
  /** Active language id, when the service exposes one. */
  current?: string
}
