/**
 * Reduced motion, with an explicit escape hatch.
 *
 * Appending `?reduced=1` to the URL forces the no-motion build. That is
 * partly a development affordance — pinned sections are hard to inspect any
 * other way — and partly a deliberate feature: the reduced-motion version of
 * this piece is a real deliverable, not a degraded one, and anyone reviewing
 * it should be able to see it without changing their operating system
 * settings. `?reduced=0` forces motion back on.
 *
 * The override rewrites the media query strings themselves rather than
 * branching at every call site, so gsap.matchMedia() and the React hooks
 * both follow it and cannot disagree about which version is running.
 */

const ALWAYS = '(min-width: 0px)'
const NEVER = '(min-width: 999999px)'

function readOverride(): boolean | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('reduced')
  if (value === null) return null
  return value !== '0' && value !== 'false'
}

const override = readOverride()

export const REDUCED_MOTION_QUERY =
  override === null
    ? '(prefers-reduced-motion: reduce)'
    : override
      ? ALWAYS
      : NEVER

export const MOTION_QUERY =
  override === null
    ? '(prefers-reduced-motion: no-preference)'
    : override
      ? NEVER
      : ALWAYS

/** True when the piece is running its no-motion build, for whatever reason. */
export function isReducedMotionForced(): boolean {
  return override === true
}
