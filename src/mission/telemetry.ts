import {
  NADIR,
  freeFall,
  gravitationalRadiusKm,
  horizonRadius,
  lapse,
  lorentz,
  orbitalDilation,
  orbitalSpeed,
  tidalStretchG,
} from './physics'
import { cruise, logRadius } from './timeline'

export type Regime = 'cruise' | 'orbit' | 'fall' | 'beyond'

export interface Telemetry {
  /** Distance to the centre, in gravitational radii M. */
  readonly r: number
  readonly km: number
  /** Speed in units of c, as a local (non-rotating) observer measures it. */
  readonly speed: number
  /** Hours on Earth per hour on board; Infinity at and past the horizon. */
  readonly dilation: number
  /** Stretch across a 2 m body, in g. */
  readonly tidal: number
  readonly regime: Regime
}

const A = NADIR.spin
const M_KM = gravitationalRadiusKm(NADIR.solarMasses)
const R_PLUS = horizonRadius(A)

function orbitAt(r: number) {
  const speed = orbitalSpeed(r, A)
  const dilation = orbitalDilation(r, A)
  if (speed === null || dilation === null) return freeFall(r, A)
  return { speed, dilation }
}

/**
 * What the HUD shows at mission time t. Three regimes, each with its own
 * formula: cruising (special relativity, γ over the lapse), a prograde
 * circular orbit (Bardeen–Press–Teukolsky), and the final free fall
 * (γ/α = 1/α²), blended where one hands over to the next.
 */
export function telemetry(t: number): Telemetry {
  const r = 10 ** logRadius(t)
  const km = r * M_KM
  const tidal = tidalStretchG(r, NADIR.solarMasses)

  if (r <= R_PLUS) {
    return { r, km, speed: 1, dilation: Infinity, tidal, regime: 'beyond' }
  }

  if (t < 3) {
    const beta = cruise(t)
    return {
      r,
      km,
      speed: beta,
      dilation: lorentz(beta) / lapse(r, A),
      tidal,
      regime: 'cruise',
    }
  }

  const orbit = orbitAt(r)
  if (t < 5 || !orbit) {
    return {
      r,
      km,
      speed: orbit?.speed ?? 1,
      dilation: orbit?.dilation ?? Infinity,
      tidal,
      regime: 'orbit',
    }
  }

  const fall = freeFall(r, A)
  if (!fall) {
    return { r, km, speed: 1, dilation: Infinity, tidal, regime: 'beyond' }
  }
  const k = Math.min(1, (t - 5) / 0.25)
  return {
    r,
    km,
    speed: orbit.speed + (fall.speed - orbit.speed) * k,
    dilation: orbit.dilation + (fall.dilation - orbit.dilation) * k,
    tidal,
    regime: 'fall',
  }
}
