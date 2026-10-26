import { use } from 'react'
import { LanguageContext, type LanguageContextValue } from './context'

export function useLanguage(): LanguageContextValue {
  const value = use(LanguageContext)
  if (value === null) {
    throw new Error('useLanguage must be used inside <LanguageProvider>')
  }
  return value
}
