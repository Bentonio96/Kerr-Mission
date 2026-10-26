import { createContext } from 'react'
import type { Lang, Localized } from '../types'

export interface LanguageContextValue {
  readonly lang: Lang
  readonly setLang: (lang: Lang) => void
  /** Resolve a Localized pair against the active language. */
  readonly t: (entry: Localized) => string
  /** Format a number with the active locale conventions. */
  readonly n: (value: number, decimals?: number) => string
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)
