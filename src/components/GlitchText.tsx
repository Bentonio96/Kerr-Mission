import { useEffect, useRef, type ElementType } from 'react'
import { useReducedMotion } from '../hooks/useMediaQuery'

/**
 * Text that glitches now and then: two tinted copies jump sideways for a few
 * frames, on hover and at random intervals while it is on screen. The copies
 * are aria-hidden and only ever offset, never masked, so the real text under
 * them is always whole. Nothing happens under reduced motion.
 */
export function GlitchText({
  text,
  as: Tag = 'span',
  className = '',
  id,
  every = [5000, 11000],
}: {
  text: string
  as?: ElementType
  className?: string
  id?: string
  every?: readonly [number, number]
}) {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    let timer = 0
    let off = 0
    let visible = false
    const fire = () => {
      el.dataset.on = ''
      window.clearTimeout(off)
      off = window.setTimeout(() => delete el.dataset.on, 440)
    }
    const schedule = () => {
      const [min, max] = every
      timer = window.setTimeout(() => {
        if (visible && !document.hidden) fire()
        schedule()
      }, min + Math.random() * (max - min))
    }
    const observer = new IntersectionObserver(([entry]) => {
      const was = visible
      visible = entry?.isIntersecting ?? false
      if (visible && !was) fire()
    })
    observer.observe(el)
    el.addEventListener('pointerenter', fire)
    schedule()
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(off)
      observer.disconnect()
      el.removeEventListener('pointerenter', fire)
    }
  }, [reduced, every])

  return (
    <Tag ref={ref} id={id} className={`glitch ${className}`}>
      {text}
      <span aria-hidden="true" className="glitch-copia r">
        {text}
      </span>
      <span aria-hidden="true" className="glitch-copia c">
        {text}
      </span>
    </Tag>
  )
}
