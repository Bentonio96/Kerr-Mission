import { useEffect, useRef, useState } from 'react'
import { useFinePointer, useReducedMotion } from '../hooks/useMediaQuery'
import { gsap } from '../lib/gsap'

/**
 * A dot that follows the pointer exactly and a ring that trails it. Over
 * anything interactive the ring grows; over an element with
 * `data-cursor="Label"` it grows further and shows the label (e.g. "Drag" on
 * the carousel). Inverts against whatever is under it, so it reads on paper
 * and at night. Mouse only, and never under reduced motion.
 */
export function Cursor() {
  const fine = useFinePointer()
  const reduced = useReducedMotion()
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const [label, setLabel] = useState('')

  const active = fine && !reduced

  useEffect(() => {
    if (!active) return
    const d = dot.current
    const r = ring.current
    if (!d || !r) return
    document.documentElement.dataset.cursor = ''

    const dx = gsap.quickSetter(d, 'x', 'px')
    const dy = gsap.quickSetter(d, 'y', 'px')
    const rx = gsap.quickTo(r, 'x', { duration: 0.45, ease: 'power3.out' })
    const ry = gsap.quickTo(r, 'y', { duration: 0.45, ease: 'power3.out' })
    let shown = false

    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      if (!shown) {
        shown = true
        gsap.set([d, r], { x: event.clientX, y: event.clientY })
        gsap.to([d, r], { autoAlpha: 1, duration: 0.3 })
      }
      dx(event.clientX)
      dy(event.clientY)
      rx(event.clientX)
      ry(event.clientY)

      const target = event.target instanceof Element ? event.target : null
      const labelled = target?.closest<HTMLElement>('[data-cursor]')
      const interactive = target?.closest(
        'a, button, summary, [role="tab"], input, label',
      )
      const text = labelled?.dataset.cursor ?? ''
      setLabel(text)
      gsap.to(r, {
        scale: text ? 2.6 : interactive ? 1.7 : 1,
        duration: 0.35,
        ease: 'power3.out',
        overwrite: 'auto',
      })
    }
    const leave = () => {
      shown = false
      gsap.to([d, r], { autoAlpha: 0, duration: 0.2 })
    }
    const down = () => gsap.to(r, { scale: '-=0.3', duration: 0.15 })
    const up = () => gsap.to(r, { scale: '+=0.3', duration: 0.3 })

    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    return () => {
      delete document.documentElement.dataset.cursor
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
    }
  }, [active])

  if (!active) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[70] mix-blend-difference"
    >
      <div
        ref={ring}
        className="invisible absolute top-0 left-0 -mt-5 -ml-5 flex size-10 items-center justify-center rounded-full border border-white opacity-0"
      >
        <span className="etiqueta scale-[0.42] whitespace-nowrap text-white">
          {label}
        </span>
      </div>
      <div
        ref={dot}
        className="invisible absolute top-0 left-0 -mt-[3px] -ml-[3px] size-1.5 rounded-full bg-white opacity-0"
      />
    </div>
  )
}
