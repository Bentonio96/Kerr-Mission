import type { Lang, Localized } from '../types'

/**
 * Spanish writes 1.200 and 4,5; English writes 1,200 and 4.5. Every figure on
 * the page goes through here, so the two languages cannot disagree.
 */
const LOCALES: Record<Lang, string> = {
  es: 'es-CL',
  en: 'en-GB',
}

/** Cached because counters call this on every animation frame. */
const formatterCache = new Map<string, Intl.NumberFormat>()

function getFormatter(lang: Lang, decimals: number): Intl.NumberFormat {
  const key = `${lang}:${decimals}`
  const cached = formatterCache.get(key)
  if (cached) return cached

  const formatter = new Intl.NumberFormat(LOCALES[lang], {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  formatterCache.set(key, formatter)
  return formatter
}

export function formatNumber(value: number, lang: Lang, decimals = 0): string {
  return getFormatter(lang, decimals).format(value)
}

/** Pick the current language out of a Localized pair. */
export function t(entry: Localized, lang: Lang): string {
  return entry[lang]
}

/**
 * Fill {name} placeholders. Used instead of concatenation because word order
 * differs between the two languages — "3 de 7" and "3 of 7" happen to match,
 * but "faltan {n} días" and "{n} days to go" do not.
 */
export function fill(
  template: string,
  vars: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key]
    return value === undefined ? match : String(value)
  })
}

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'

function superscript(n: number): string {
  const digits = [...String(Math.abs(n))].map((d) => SUPERSCRIPT[Number(d)])
  return (n < 0 ? '⁻' : '') + digits.join('')
}

/**
 * Big and small figures the way a physics paper writes them: 2,95 × 10⁷
 * (or 2.95 × 10⁷), with the mantissa in the reader's own convention.
 * Figures between 0.01 and 100 000 are written plainly.
 */
export function formatScientific(
  value: number,
  lang: Lang,
  decimals = 2,
): string {
  if (!Number.isFinite(value)) return '∞'
  if (value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 0.01 && abs < 1e5) {
    const places = abs >= 100 ? 0 : abs >= 10 ? 1 : decimals
    return formatNumber(value, lang, places)
  }
  let exp = Math.floor(Math.log10(abs))
  let mantissa = value / 10 ** exp
  // 9.996 rounds to 10.00: carry it into the exponent.
  if (Math.abs(Number(mantissa.toFixed(decimals))) >= 10) {
    mantissa /= 10
    exp += 1
  }
  return `${formatNumber(mantissa, lang, decimals)} × 10${superscript(exp)}`
}
