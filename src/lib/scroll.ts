import type Lenis from 'lenis'

let activeLenis: Lenis | null = null

export function setActiveLenis(lenis: Lenis | null): void {
  activeLenis = lenis
}

/** Scroll that goes through Lenis when it is running, natively otherwise. */
export function scrollToTarget(target: string | HTMLElement | number): void {
  if (activeLenis) {
    activeLenis.scrollTo(target, { duration: 2.4 })
    return
  }
  if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: 'auto' })
    return
  }
  const element =
    typeof target === 'string' ? document.querySelector(target) : target
  element?.scrollIntoView({ behavior: 'auto', block: 'start' })
}
