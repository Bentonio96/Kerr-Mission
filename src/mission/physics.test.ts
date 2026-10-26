import { describe, expect, it } from 'vitest'
import {
  ergosphereRadius,
  freeFall,
  horizonRadius,
  iscoRadius,
  lapse,
  orbitalDilation,
  orbitalSpeed,
  photonOrbitRadius,
  schwarzschildRadiusKm,
  tidalStretchG,
} from './physics'

describe('Schwarzschild limit (a = 0)', () => {
  it('puts the horizon at 2M, the photon orbit at 3M and the ISCO at 6M', () => {
    expect(horizonRadius(0)).toBeCloseTo(2)
    expect(photonOrbitRadius(0)).toBeCloseTo(3)
    expect(iscoRadius(0)).toBeCloseTo(6)
  })

  it('reduces orbital speed to 1/√(r − 2) and dilation to 1/√(1 − 3/r)', () => {
    expect(orbitalSpeed(6, 0)).toBeCloseTo(0.5)
    expect(orbitalDilation(6, 0)).toBeCloseTo(Math.SQRT2)
  })

  it('has no orbit inside the photon sphere', () => {
    expect(orbitalSpeed(2.9, 0)).toBeNull()
    expect(orbitalDilation(2.9, 0)).toBeNull()
  })

  it('gives the static lapse √(1 − 2/r)', () => {
    expect(lapse(8, 0)).toBeCloseTo(Math.sqrt(0.75))
  })

  it('gives about 2.95 km per solar mass for r_s', () => {
    expect(schwarzschildRadiusKm(1)).toBeCloseTo(2.953, 2)
  })
})

describe('Nadir (a = 0.94)', () => {
  const a = 0.94

  it('shrinks the horizon and the orbits inwards', () => {
    expect(horizonRadius(a)).toBeCloseTo(1.341, 3)
    expect(photonOrbitRadius(a)).toBeCloseTo(1.424, 2)
    expect(iscoRadius(a)).toBeCloseTo(2.023, 2)
  })

  it('reaches 2M at the equator of the ergosphere and r₊ at the poles', () => {
    expect(ergosphereRadius(a)).toBeCloseTo(2)
    expect(ergosphereRadius(a, 0)).toBeCloseTo(horizonRadius(a))
  })

  it('stretches time without bound at the horizon', () => {
    const r = horizonRadius(a)
    expect(lapse(r, a)).toBe(0)
    expect(freeFall(r, a)).toBeNull()
    expect(freeFall(r + 1e-4, a)!.speed).toBeGreaterThan(0.99)
  })

  it('keeps a crew of 2 m comfortable at the horizon of ten million suns', () => {
    expect(tidalStretchG(horizonRadius(a), 1e7)).toBeLessThan(1e-3)
    // A ten-solar-mass hole would pull them apart at the same radius.
    expect(tidalStretchG(horizonRadius(a), 10)).toBeGreaterThan(1e6)
  })

  it('agrees on dilation between the orbit formula and γ/α', () => {
    const r = 3
    const v = orbitalSpeed(r, a)!
    const fromZamo = 1 / Math.sqrt(1 - v * v) / lapse(r, a)
    expect(orbitalDilation(r, a)).toBeCloseTo(fromZamo, 6)
  })
})
