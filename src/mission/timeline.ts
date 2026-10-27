import type { View } from '../webgl/blackhole'

/**
 * The mission as a function of one number, `t`: the chapter index plus how
 * far through that chapter the reader has scrolled (0 … 1). Every camera
 * parameter and every figure on the HUD is a track of keyframes over t, so
 * scrolling backwards replays the flight exactly in reverse.
 */
export const CHAPTERS = [
  'lanzamiento',
  'reloj',
  'salto',
  'aproximacion',
  'ergosfera',
  'horizonte',
  'mas-alla',
] as const

export type ChapterId = (typeof CHAPTERS)[number]

/** Where each chapter rests in the reduced-motion build (one still each). */
export const STILL_T = [0.3, 1.35, 2.45, 3.55, 4.45, 5.45, 6.2] as const

type Key = readonly [t: number, value: number]

function ease(x: number): number {
  return x * x * (3 - 2 * x)
}

/** A keyframe track: eased between keys, held flat beyond the ends. */
function track(keys: readonly Key[]): (t: number) => number {
  return (t) => {
    const first = keys[0]!
    if (t <= first[0]) return first[1]
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1] = keys[i]!
      if (t <= t1) {
        const [t0, v0] = keys[i - 1]!
        return v0 + (v1 - v0) * ease((t - t0) / (t1 - t0))
      }
    }
    return keys[keys.length - 1]![1]
  }
}

// ---- camera ---------------------------------------------------------------

const camR = track([
  [0, 23],
  [1, 21],
  [2, 19],
  [2.22, 90],
  [2.75, 90],
  [3.05, 75],
  [3.85, 9],
  [4.1, 5.6],
  [4.6, 3.9],
  [5.0, 3.0],
  [5.35, 1.7],
  [5.62, 1.04],
])

const theta = track([
  [0, 1.4],
  [2, 1.34],
  [3.05, 1.08],
  [3.6, 1.25],
  [3.95, 1.43],
  [4.6, 1.49],
  [5.0, 1.44],
  [5.62, 1.2],
])

// The ship swings around the hole once it is close.
const orbit = track([
  [3.8, 0],
  [5.0, 2.1],
  [6, 2.9],
])

const roll = track([
  [4, 0],
  [4.5, 0.16],
  [5, -0.04],
  [5.62, 0.3],
])

// Near the hole its shadow fills most of the sky; look past its edge.
const yaw = track([
  [4.0, 0],
  [4.6, 0.22],
  [5.0, 0.35],
  [5.35, 0.8],
  [5.62, 1.15],
])

const warp = track([
  [2.0, 0],
  [2.24, 1],
  [2.72, 1],
  [3.02, 0],
])

const dive = track([
  [5.05, 0],
  [5.62, 1],
])

const exposure = track([
  [0, 1.05],
  [0.65, 1.05],
  [1.05, 0.5],
  [1.75, 0.5],
  [2.05, 0.95],
  [3.1, 1.05],
  [3.9, 0.7],
  [4.3, 0.42],
  [5.2, 0.36],
  [5.5, 0.5],
])

const fov = track([
  [0, 0.95],
  [3.0, 0.95],
  [4.3, 1.1],
  [5.0, 1.15],
  [5.62, 1.55],
])

// Where the hole sits on screen (in units of screen height): beside the text
// on wide screens, above it on narrow ones.
const offXWide = track([
  [0, 0.33],
  [0.8, 0.33],
  [1.1, 0],
  [1.8, 0],
  [2.05, 0.3],
  [3.4, 0.3],
  [4.05, 0.12],
  [4.5, 0],
])

const offYNarrow = track([
  [0, 0.2],
  [0.8, 0.2],
  [1.1, 0.1],
  [3.2, 0.2],
  [4.2, 0.08],
  [4.6, 0],
])

/**
 * The moment the ship is through: the dive ends in white (the shader's
 * flash) while the horizon panel is still pinned, and at this t the page
 * turns to paper under it. The canvas then bows out over a ground of the
 * same colour, so the light chapter rises onto paper, not onto space.
 */
export const LIGHT_T = 5.6

/** Canvas opacity: gone once the page has turned to paper. */
export const sceneOpacity = track([
  [LIGHT_T - 0.02, 1],
  [LIGHT_T + 0.06, 0],
])

export function view(
  t: number,
  narrow: boolean,
  drift: number,
  warpPhase: number,
): View {
  return {
    camR: camR(t),
    theta: theta(t),
    phi: 0.55 + t * 0.5 + orbit(t) + drift,
    roll: roll(t),
    yaw: yaw(t),
    fov: fov(t) * (narrow ? 1.25 : 1),
    offX: narrow ? 0 : offXWide(t),
    offY: narrow ? offYNarrow(t) : 0,
    warp: warp(t),
    warpPhase,
    dive: dive(t),
    exposure: exposure(t),
  }
}

// ---- flight data --------------------------------------------------------

/** log₁₀ of the distance to Nadir in gravitational radii. */
export const logRadius = track([
  [0, 10.22],
  [1, 10.22],
  [2.0, 10.19],
  [2.7, 4.1],
  [3.05, 3.9],
  [3.75, 1.05],
  [4.05, Math.log10(2.3)],
  [4.6, Math.log10(1.96)],
  [5.0, Math.log10(1.95)],
  [5.6, Math.log10(1.3)],
])

/** The ship's own speed while cruising, as a fraction of c. */
export const cruise = track([
  [0, 3.7e-5],
  [1.6, 1e-4],
  [2.0, 0.02],
  [2.22, 0.9999995],
  [2.72, 0.9999995],
  [3.0, 0.004],
])

export { warp as warpAt, dive as diveAt }
