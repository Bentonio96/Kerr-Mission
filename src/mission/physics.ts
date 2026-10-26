/**
 * The physics behind the HUD. Real formulas, simplified to the one case the
 * mission flies: the equatorial plane of a Kerr black hole.
 *
 * Radii are in gravitational radii, M = GM/c² (geometric units, G = c = 1),
 * and the spin is the dimensionless a = J/(Mc), 0 ≤ a < 1. Sources: Bardeen,
 * Press & Teukolsky (1972), "Rotating black holes: locally nonrotating
 * frames, energy extraction, and scalar synchrotron radiation".
 */

/** GM☉/c² in kilometres: the gravitational radius of one solar mass. */
export const SOLAR_GRAVITATIONAL_RADIUS_KM = 1.476625

/** GM☉ in m³/s². */
export const SOLAR_GM = 1.32712440018e20

/** Standard gravity, for expressing tidal stretch in g. */
export const G_EARTH = 9.80665

/** Nadir, the target: ten million suns, spinning at 94 % of the limit. */
export const NADIR = {
  solarMasses: 1e7,
  spin: 0.94,
  /** Distance from Earth in light years. */
  distanceLy: 26_000,
} as const

export const LIGHT_YEAR_KM = 9.4607e12

/** Gravitational radius M in kilometres. */
export function gravitationalRadiusKm(solarMasses: number): number {
  return SOLAR_GRAVITATIONAL_RADIUS_KM * solarMasses
}

/** Schwarzschild radius r_s = 2GM/c², in kilometres. */
export function schwarzschildRadiusKm(solarMasses: number): number {
  return 2 * gravitationalRadiusKm(solarMasses)
}

/** Outer event horizon r₊ = M + √(M² − a²). */
export function horizonRadius(a: number): number {
  return 1 + Math.sqrt(1 - a * a)
}

/** Outer edge of the ergosphere at polar angle θ: M + √(M² − a² cos²θ). */
export function ergosphereRadius(a: number, theta = Math.PI / 2): number {
  const c = Math.cos(theta)
  return 1 + Math.sqrt(1 - a * a * c * c)
}

/** Prograde circular photon orbit: 2M{1 + cos[⅔ arccos(−a)]}. */
export function photonOrbitRadius(a: number): number {
  return 2 * (1 + Math.cos((2 / 3) * Math.acos(-a)))
}

/** Prograde innermost stable circular orbit (BPT 1972, eq. 2.21). */
export function iscoRadius(a: number): number {
  const z1 =
    1 + Math.cbrt(1 - a * a) * (Math.cbrt(1 + a) + Math.cbrt(1 - a))
  const z2 = Math.sqrt(3 * a * a + z1 * z1)
  return 3 + z2 - Math.sqrt((3 - z1) * (3 + z1 + 2 * z2))
}

/**
 * Lapse of the locally non-rotating observer (ZAMO) in the equatorial plane,
 * α = √(ΔΣ/A): how fast their clock runs against a clock far away. It goes
 * to zero at the horizon, which is where "time stops" comes from.
 */
export function lapse(r: number, a: number): number {
  const delta = r * r - 2 * r + a * a
  if (delta <= 0) return 0
  const big = (r * r + a * a) ** 2 - a * a * delta
  return Math.sqrt((delta * r * r) / big)
}

/** Frame-dragging angular velocity ω = 2Mar/A (equatorial), in c/M. */
export function frameDragging(r: number, a: number): number {
  const delta = r * r - 2 * r + a * a
  const big = (r * r + a * a) ** 2 - a * a * delta
  return (2 * a * r) / big
}

/**
 * Speed of a prograde circular orbit as a ZAMO measures it, in units of c
 * (BPT 1972, eq. 3.10). Null inside the photon orbit, where no orbit exists.
 */
export function orbitalSpeed(r: number, a: number): number | null {
  const delta = r * r - 2 * r + a * a
  if (delta <= 0 || r <= photonOrbitRadius(a)) return null
  const v =
    (r * r - 2 * a * Math.sqrt(r) + a * a) /
    (Math.sqrt(delta) * (r ** 1.5 + a))
  return v < 1 ? v : null
}

/**
 * Time dilation of a prograde circular orbit, dt/dτ = u^t: hours on Earth
 * for each hour on board (BPT 1972, eq. 2.12). Null inside the photon orbit.
 */
export function orbitalDilation(r: number, a: number): number | null {
  const denom = r ** 1.5 - 3 * Math.sqrt(r) + 2 * a
  if (denom <= 0) return null
  return (r ** 1.5 + a) / (r ** 0.75 * Math.sqrt(denom))
}

/**
 * Falling straight in from rest far away (E = 1, L = 0): the ZAMO sees the
 * ship pass at v = √(1 − α²), and dt/dτ = γ/α = 1/α². Both reach their limit
 * (c and ∞) exactly at the horizon.
 */
export function freeFall(r: number, a: number): { speed: number; dilation: number } | null {
  const alpha = lapse(r, a)
  if (alpha <= 0) return null
  return { speed: Math.sqrt(1 - alpha * alpha), dilation: 1 / (alpha * alpha) }
}

/** Lorentz factor γ = 1/√(1 − β²). */
export function lorentz(beta: number): number {
  return 1 / Math.sqrt(1 - beta * beta)
}

/**
 * Tidal stretch across a body of `length` metres, Δa = 2GM·L/r³, in g.
 * The Newtonian term, which is what a crew would feel well outside r₊.
 */
export function tidalStretchG(
  r: number,
  solarMasses: number,
  length = 2,
): number {
  const metres = r * gravitationalRadiusKm(solarMasses) * 1000
  const gm = SOLAR_GM * solarMasses
  return (2 * gm * length) / metres ** 3 / G_EARTH
}
