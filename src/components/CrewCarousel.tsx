import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { COPY } from '../data/copy'
import { CREW } from '../data/crew'
import { useReducedMotion } from '../hooks/useMediaQuery'
import { fill } from '../i18n/format'
import { useLanguage } from '../i18n/useLanguage'
import { Magnetic } from './Magnetic'
import { Portrait } from './Portrait'

const COUNT = CREW.length
const TALLEST = CREW.reduce((a, b) =>
  b.bio.es.length > a.bio.es.length ? b : a,
)

/** Shortest signed distance from the active card, around the loop. */
function offsetOf(i: number, active: number): number {
  let d = i - active
  if (d > COUNT / 2) d -= COUNT
  if (d < -COUNT / 2) d += COUNT
  return d
}

/**
 * The crew on a loop with depth: the front card faces you, its neighbours
 * turn away and sink back. Drag it, use the arrows or the arrow keys. Only
 * the front card is exposed to assistive tech (the others are inert), and the
 * change is announced politely.
 *
 * Under reduced motion it is a plain grid of five cards.
 */
export function CrewCarousel() {
  const { t, lang } = useLanguage()
  const reduced = useReducedMotion()
  const [active, setActive] = useState(0)
  const [drag, setDrag] = useState(0)
  const [moved, setMoved] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const start = useRef<{ x: number; id: number } | null>(null)

  const go = useCallback((step: number) => {
    setMoved(true)
    setActive((a) => (a + step + COUNT) % COUNT)
  }, [])

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') go(1)
    else if (event.key === 'ArrowLeft') go(-1)
    else return
    event.preventDefault()
  }

  useEffect(() => {
    const el = stage.current
    if (!el || reduced) return
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return
      start.current = { x: event.clientX, id: event.pointerId }
    }
    const move = (event: PointerEvent) => {
      const s = start.current
      if (!s || s.id !== event.pointerId) return
      const dx = event.clientX - s.x
      if (Math.abs(dx) > 6 && !el.hasPointerCapture(event.pointerId))
        el.setPointerCapture(event.pointerId)
      setDrag(dx)
    }
    const up = (event: PointerEvent) => {
      const s = start.current
      if (!s || s.id !== event.pointerId) return
      const dx = event.clientX - s.x
      start.current = null
      setDrag(0)
      const width = el.clientWidth * 0.18
      if (dx < -width) go(1)
      else if (dx > width) go(-1)
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
  }, [go, reduced])

  if (reduced) {
    return (
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {CREW.map((member) => (
          <li key={member.id}>
            <Card member={member} />
          </li>
        ))}
      </ul>
    )
  }

  const current = CREW[active]!
  const shift = drag / ((stage.current?.clientWidth ?? 800) * 0.32)

  return (
    <div
      role="region"
      className="overflow-x-clip"
      aria-roledescription="carousel"
      aria-label={t(COPY.crew.carousel)}
      onKeyDown={onKey}
    >
      <div
        ref={stage}
        data-cursor={t(COPY.crew.drag)}
        className="relative mx-auto touch-pan-y select-none [perspective:1100px]"
      >
        {/* Sizes the stage to the tallest card, so nothing below overlaps. */}
        <div
          aria-hidden="true"
          className="invisible mx-auto w-[min(17.5rem,72vw)]"
        >
          <Card member={TALLEST} />
        </div>
        {CREW.map((member, i) => {
          const d = offsetOf(i, active) + shift
          const abs = Math.abs(d)
          const front = i === active
          return (
            <div
              key={member.id}
              role="group"
              aria-roledescription={t(COPY.crew.slide)}
              aria-label={fill(t(COPY.crew.of), { n: i + 1, total: COUNT })}
              aria-current={front ? 'true' : undefined}
              aria-hidden={front ? undefined : 'true'}
              inert={!front}
              className="absolute top-0 left-1/2 w-[min(17.5rem,72vw)]"
              style={{
                transform: `translateX(-50%) translateX(${d * 58}%) translateZ(${-abs * 170}px) rotateY(${-d * 24}deg)`,
                opacity: abs > 2.2 ? 0 : 1 - abs * 0.28,
                zIndex: 10 - Math.round(abs * 2),
                transition: drag
                  ? 'none'
                  : 'transform 700ms var(--ease-salida), opacity 700ms var(--ease-salida)',
              }}
            >
              <Card member={member} />
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <Magnetic>
          <button
            type="button"
            onClick={() => go(-1)}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-linea text-tinta transition-colors hover:border-acento hover:text-acento"
          >
            <span aria-hidden="true">←</span>
            <span className="sr-only">{t(COPY.crew.prev)}</span>
          </button>
        </Magnetic>
        <p
          className="etiqueta min-w-24 text-center text-tenue"
          aria-hidden="true"
        >
          {fill(t(COPY.crew.of), { n: active + 1, total: COUNT })}
        </p>
        <Magnetic>
          <button
            type="button"
            onClick={() => go(1)}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-linea text-tinta transition-colors hover:border-acento hover:text-acento"
          >
            <span aria-hidden="true">→</span>
            <span className="sr-only">{t(COPY.crew.next)}</span>
          </button>
        </Magnetic>
      </div>
      <p className="sr-only" aria-live="polite">
        {moved ? `${current.name}, ${current.role[lang]}` : ''}
      </p>
    </div>
  )
}

function Card({ member }: { member: (typeof CREW)[number] }) {
  const { t } = useLanguage()
  return (
    <article className="vidrio overflow-hidden rounded-2xl">
      <Portrait member={member} />
      <div className="p-4">
        <p className="etiqueta text-acento">{t(member.role)}</p>
        <h3 className="mt-1 font-display text-xl [font-variation-settings:'wght'_700,'wdth'_100]">
          {member.name}
        </h3>
        <p className="mt-2 text-sm leading-snug text-tenue">{t(member.bio)}</p>
        <p className="mt-3 text-sm leading-snug text-tinta italic">
          {t(member.quote)}
        </p>
        <p className="mt-3 flex items-baseline justify-between gap-2 border-t border-linea pt-2">
          <span className="etiqueta text-tenue">{t(member.stat.label)}</span>
          <span className="cifra text-sm text-instrumento">
            {member.stat.value}
          </span>
        </p>
      </div>
    </article>
  )
}
