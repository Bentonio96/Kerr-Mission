import { gsap } from '../lib/gsap'
import { CHAPTERS, STILL_T } from './timeline'

/**
 * The mission clock. One loop, on GSAP's ticker (which also drives Lenis),
 * turns the scroll position into mission time t and hands it to everyone
 * who draws: the black hole, the HUD, the sound and the horizon distortion.
 *
 * t = chapter index + the fraction of that chapter scrolled past the top of
 * the viewport. It is eased towards the scroll position, so a jump (a nav
 * click, a flick on a phone) still reads as a flight, not a cut.
 *
 * Under reduced motion nothing eases: t snaps to one resting value per
 * chapter, and listeners only hear about it when the chapter changes.
 */

export interface Tick {
  readonly t: number
  readonly chapter: number
  /** Seconds since the clock started. */
  readonly time: number
  readonly dt: number
}

type Listener = (tick: Tick) => void

const listeners = new Set<Listener>()
const chapterListeners = new Set<(chapter: number) => void>()

let tops: number[] = []
let heights: number[] = []
let started = false
let still = false
let t = 0
let chapter = -1
let time = 0
let observer: ResizeObserver | null = null

function frozen(): number | null {
  if (!import.meta.env.DEV) return null
  const value = new URLSearchParams(window.location.search).get('t')
  return value === null ? null : Number(value)
}

function measure() {
  const sections = CHAPTERS.map((id) => document.getElementById(id))
  tops = sections.map((el) => (el ? el.getBoundingClientRect().top + window.scrollY : 0))
  heights = sections.map((el) => el?.offsetHeight ?? 1)
}

function target(): number {
  const y = window.scrollY
  for (let i = tops.length - 1; i >= 0; i--) {
    const top = tops[i] ?? 0
    if (y >= top) {
      const h = heights[i] ?? 1
      return Math.min(i + (y - top) / h, CHAPTERS.length - 0.001)
    }
  }
  return 0
}

function emit(dt: number) {
  const tick: Tick = { t, chapter, time, dt }
  listeners.forEach((fn) => fn(tick))
}

function setChapter(next: number) {
  if (next === chapter) return false
  chapter = next
  chapterListeners.forEach((fn) => fn(next))
  return true
}

function loop(_time: number, deltaMs: number) {
  const dt = Math.min(deltaMs / 1000, 0.1)
  time += dt
  const pinned = frozen()
  const goal = pinned ?? target()

  if (still) {
    const index = Math.floor(goal)
    if (setChapter(index)) {
      t = STILL_T[index] ?? goal
      emit(0)
    }
    return
  }

  // Critically damped-ish follow: quick, but never a jump.
  t += (goal - t) * (1 - Math.exp(-dt * 7))
  if (Math.abs(goal - t) < 1e-4) t = goal
  setChapter(Math.floor(t))
  emit(dt)
}

export const mission = {
  start(reduced: boolean) {
    if (started) return
    started = true
    still = reduced
    measure()
    t = frozen() ?? target()
    observer = new ResizeObserver(measure)
    observer.observe(document.body)
    window.addEventListener('resize', measure)
    gsap.ticker.add(loop)
  },
  stop() {
    if (!started) return
    started = false
    gsap.ticker.remove(loop)
    observer?.disconnect()
    window.removeEventListener('resize', measure)
    chapter = -1
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
  onChapter(fn: (chapter: number) => void): () => void {
    chapterListeners.add(fn)
    if (chapter >= 0) fn(chapter)
    return () => chapterListeners.delete(fn)
  },
  /** Force one emission (e.g. after a renderer is created in still mode). */
  poke() {
    if (started) emit(0)
  },
  get t() {
    return t
  },
}
