/**
 * Shared types. Every user-visible string is a `Localized` pair declared side
 * by side, so a missing translation is a type error.
 */
export const LANGUAGES = ['es', 'en'] as const
export type Lang = (typeof LANGUAGES)[number]

export type Localized = { readonly [K in Lang]: string }
