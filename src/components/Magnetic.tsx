import { useRef, type ReactNode } from 'react'
import { useFinePointer, useReducedMotion } from '../hooks/useMediaQuery'
import { gsap, useGSAP } from '../lib/gsap'

/**
 * Pulls its child towards the pointer while the pointer is near, and springs
 * back when it leaves. Only with a mouse and with motion on; otherwise it is
 * a plain wrapper. `className` sets the wrapper's display (default
 * inline-flex), so callers can hide it per breakpoint.
 */
export function Magnetic({
  children,
  strength = 0.35,
  className = 'inline-flex',
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const fine = useFinePointer()
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      const el = ref.current
      if (!el || !fine || reduced) return
      const x = gsap.quickTo(el, 'x', {
        duration: 0.6,
        ease: 'elastic.out(1, 0.4)',
      })
      const y = gsap.quickTo(el, 'y', {
        duration: 0.6,
        ease: 'elastic.out(1, 0.4)',
      })
      const move = (event: PointerEvent) => {
        const r = el.getBoundingClientRect()
        x((event.clientX - (r.left + r.width / 2)) * strength)
        y((event.clientY - (r.top + r.height / 2)) * strength)
      }
      const leave = () => {
        x(0)
        y(0)
      }
      el.addEventListener('pointermove', move)
      el.addEventListener('pointerleave', leave)
      return () => {
        el.removeEventListener('pointermove', move)
        el.removeEventListener('pointerleave', leave)
      }
    },
    { dependencies: [fine, reduced, strength] },
  )

  return (
    <span ref={ref} className={className}>
      {children}
    </span>
  )
}
