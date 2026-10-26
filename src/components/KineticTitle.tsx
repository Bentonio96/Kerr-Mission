import { useRef } from 'react'
import { useReducedMotion } from '../hooks/useMediaQuery'
import { gsap, useGSAP } from '../lib/gsap'

const REST = { wght: 720, wdth: 112 }
const PEAK = { wght: 900, wdth: 150 }

/**
 * The wordmark: each letter of Anybody swells in width and weight as the
 * pointer comes near (on the variable axes, so glyphs stay crisp instead of
 * being scaled), and a slow wave runs through them when it does not.
 *
 * Sized for its widest state (every letter at wdth 150, wght 900), so it can
 * never outgrow its line. The letters are hidden from assistive tech; the
 * label is what is read. Glitch copies ride on top, offset only.
 */
export function KineticTitle({
  text,
  label,
  className = '',
}: {
  text: string
  label: string
  className?: string
}) {
  const root = useRef<HTMLHeadingElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      const el = root.current
      if (!el || reduced) return
      const letters = [...el.querySelectorAll<HTMLElement>('[data-letra]')]
      const pointer = { x: -1e4, y: -1e4 }
      const influence = letters.map(() => 0)
      let visible = false
      let t = 0
      let glitch = 0
      let next = 2.5

      const move = (event: PointerEvent) => {
        pointer.x = event.clientX
        pointer.y = event.clientY
      }
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry?.isIntersecting ?? false
      })
      observer.observe(el)
      window.addEventListener('pointermove', move, { passive: true })

      const tick = (_time: number, delta: number) => {
        if (!visible) return
        const dt = delta / 1000
        t += dt
        // Every few seconds one letter stutters to an extreme and back.
        if (t > next) {
          glitch = 0.18
          next = t + 3 + Math.random() * 4
        }
        glitch = Math.max(0, glitch - dt)
        const jumpy = glitch > 0 ? Math.floor(t * 40) % letters.length : -1
        const size = el.getBoundingClientRect().height
        letters.forEach((letter, i) => {
          const r = letter.getBoundingClientRect()
          const dx = pointer.x - (r.left + r.width / 2)
          const dy = pointer.y - (r.top + r.height / 2)
          const near = Math.exp(-(dx * dx + dy * dy) / (size * size * 0.8))
          const wave = 0.5 + 0.5 * Math.sin(t * 1.3 - i * 0.9)
          let goal = Math.max(near, wave * 0.35)
          if (i === jumpy) goal = Math.random()
          const current = influence[i] ?? 0
          const value = i === jumpy ? goal : current + (goal - current) * 0.1
          influence[i] = value
          const wght = REST.wght + (PEAK.wght - REST.wght) * value
          const wdth = REST.wdth + (PEAK.wdth - REST.wdth) * value
          letter.style.fontVariationSettings = `'wght' ${wght.toFixed(0)}, 'wdth' ${wdth.toFixed(1)}`
        })
      }
      gsap.ticker.add(tick)
      return () => {
        gsap.ticker.remove(tick)
        observer.disconnect()
        window.removeEventListener('pointermove', move)
      }
    },
    { dependencies: [reduced, text], scope: root },
  )

  const settings = `'wght' ${REST.wght}, 'wdth' ${REST.wdth}`

  return (
    <h1 ref={root} className={`display ${className}`}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="inline-flex whitespace-nowrap uppercase">
        {[...text].map((char, i) => (
          <span
            key={`${char}-${i}`}
            data-letra=""
            className="inline-block"
            style={{ fontVariationSettings: settings }}
          >
            {char}
          </span>
        ))}
      </span>
    </h1>
  )
}
