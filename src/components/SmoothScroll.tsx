import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { useEffect, type ReactNode } from 'react'
import { useReducedMotion } from '../hooks/useMediaQuery'
import { ScrollTrigger, gsap } from '../lib/gsap'
import { setActiveLenis } from '../lib/scroll'

/**
 * Lenis on GSAP's ticker, so the scroll position, every ScrollTrigger and the
 * WebGL frame are read and written in the same requestAnimationFrame. Off
 * under reduced motion: smooth scrolling is motion too.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const lenis = new Lenis({
      duration: 1.25,
      easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
      syncTouch: false,
    })
    setActiveLenis(lenis)
    if (import.meta.env.DEV) {
      ;(window as Window & { __lenis?: Lenis }).__lenis = lenis
    }

    const update = (time: number) => lenis.raf(time * 1000)
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)

    // ScrollTrigger changes nothing about document height here (no pins),
    // but fonts and posters do; re-measure both once things settle.
    const onRefresh = () => window.setTimeout(() => lenis.resize(), 0)
    ScrollTrigger.addEventListener('refresh', onRefresh)
    void document.fonts.ready.then(() => ScrollTrigger.refresh())

    return () => {
      ScrollTrigger.removeEventListener('refresh', onRefresh)
      gsap.ticker.remove(update)
      gsap.ticker.lagSmoothing(500, 33)
      lenis.destroy()
      setActiveLenis(null)
    }
  }, [reduced])

  return children
}
