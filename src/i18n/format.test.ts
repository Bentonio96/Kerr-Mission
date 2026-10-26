import { describe, expect, it } from 'vitest'
import { fill, formatScientific } from './format'

describe('formatScientific', () => {
  it('writes large figures with a power of ten in each convention', () => {
    expect(formatScientific(2.9532e7, 'es')).toBe('2,95 × 10⁷')
    expect(formatScientific(2.9532e7, 'en')).toBe('2.95 × 10⁷')
  })

  it('writes small ones with a negative exponent', () => {
    expect(formatScientific(6.97e-5, 'en')).toBe('6.97 × 10⁻⁵')
  })

  it('carries a rounded-up mantissa into the exponent', () => {
    expect(formatScientific(9.9999e8, 'en')).toBe('1.00 × 10⁹')
  })

  it('writes everyday figures plainly', () => {
    expect(formatScientific(3.4509, 'es')).toBe('3,45')
    expect(formatScientific(1000, 'en')).toBe('1,000')
    expect(formatScientific(Infinity, 'es')).toBe('∞')
  })
})

describe('fill', () => {
  it('fills placeholders by name', () => {
    expect(fill('{n} de {total}', { n: 2, total: 5 })).toBe('2 de 5')
  })
})
