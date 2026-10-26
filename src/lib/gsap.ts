import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MOTION_QUERY, REDUCED_MOTION_QUERY } from './motion-preference'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/**
 * The mobile URL bar collapses as you scroll and fires a resize. Without this
 * every trigger re-measures mid-scroll and the page jumps.
 */
ScrollTrigger.config({ ignoreMobileResize: true })

// One easing for the whole piece: the expo-ish ease-out of the house style.
gsap.defaults({ ease: 'expo.out', duration: 1.1 })

if (import.meta.env.DEV) {
  ;(window as Window & { __ScrollTrigger?: unknown }).__ScrollTrigger =
    ScrollTrigger
}

/**
 * Media query keys for gsap.matchMedia(). Timelines declared inside the
 * motion branch are never created under reduced motion, rather than created
 * and suppressed.
 */
export const MQ = {
  motion: MOTION_QUERY,
  reduced: REDUCED_MOTION_QUERY,
} as const

export { gsap, ScrollTrigger, useGSAP }
