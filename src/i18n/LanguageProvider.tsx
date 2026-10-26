import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { LANGUAGES, type Lang, type Localized } from '../types'
import { LanguageContext, type LanguageContextValue } from './context'
import { formatNumber, t as translate } from './format'

const STORAGE_KEY = 'kerr:lang'

function isLang(value: string | null): value is Lang {
  return value !== null && (LANGUAGES as readonly string[]).includes(value)
}

/**
 * Resolved once, before first paint, so the piece never renders in one
 * language and then flips. Order: explicit past choice, then browser
 * preference, then Spanish.
 */
function detectInitialLang(): Lang {
  if (typeof window === 'undefined') return 'es'

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isLang(stored)) return stored
  } catch {
    // Private browsing can throw on access. Fall through to detection.
  }

  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // The HTML is prerendered in Spanish; the stored or browser language is
  // applied in a layout effect, after hydration but before the first paint,
  // so an English reader never sees Spanish and hydration never mismatches.
  const [lang, setLangState] = useState<Lang>('es')
  useLayoutEffect(() => {
    // Intentional: the stored language only exists on the client.
    // eslint-disable-next-line react/set-state-in-effect
    setLangState(detectInitialLang())
  }, [])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)

    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Persisting the choice is a convenience, not a requirement.
    }
  }, [])

  // Without this a screen reader reads English prose with Spanish phonemes.
  // An effect rather than inside setLang, so a detected English first visit
  // is announced in English too.
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      t: (entry: Localized) => translate(entry, lang),
      n: (v: number, decimals = 0) => formatNumber(v, lang, decimals),
    }),
    [lang, setLang],
  )

  return <LanguageContext value={value}>{children}</LanguageContext>
}
