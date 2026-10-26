import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { COPY, type ChapterCopy, type Fact } from '../data/copy'
import { useReducedMotion } from '../hooks/useMediaQuery'
import { fill } from '../i18n/format'
import { useLanguage } from '../i18n/useLanguage'
import { MQ, gsap, useGSAP } from '../lib/gsap'
import { scrollToTarget } from '../lib/scroll'
import { mission } from '../mission/engine'
import { LIGHT_T, diveAt } from '../mission/timeline'
import { CrewCarousel } from './CrewCarousel'
import { GlitchText } from './GlitchText'
import { SoundButton, goTo } from './Header'
import { KineticTitle } from './KineticTitle'
import { Magnetic } from './Magnetic'

const REPO = 'https://github.com/Bentonio96/Kerr-Mission'

/**
 * One chapter of the flight. With motion, the section is several screens
 * tall and its panel sticks while the black hole behind it changes: the
 * scroll drives the camera, the text holds still. Without motion (or for
 * chapters marked `flow`) it is an ordinary section a screen tall.
 *
 * The panel's copy sits at the bottom on phones (the hole is above it) and
 * at the vertical centre on wide screens (the hole is to the right).
 */
function Chapter({
  id,
  screens,
  flow = false,
  children,
  className = '',
}: {
  id: string
  screens: number
  flow?: boolean
  children: ReactNode
  className?: string
}) {
  const reduced = useReducedMotion()
  const root = useRef<HTMLElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [fits, setFits] = useState(true)
  const pinned = !reduced && !flow && fits

  // A pinned panel is exactly one screen tall. If its copy needs more (a
  // short phone, a large text setting), unpin it rather than cut it off.
  useEffect(() => {
    const el = inner.current
    if (!el || reduced || flow) return
    // Content bottom-aligned in a flex column overflows upwards, where
    // scrollHeight cannot see it: add up the children instead.
    const check = () => {
      const st = getComputedStyle(el)
      const needed =
        [...el.children].reduce(
          (sum, child) => sum + (child as HTMLElement).offsetHeight,
          0,
        ) +
        parseFloat(st.paddingTop) +
        parseFloat(st.paddingBottom)
      setFits(needed <= window.innerHeight + 1)
    }
    const observer = new ResizeObserver(check)
    observer.observe(el)
    for (const child of el.children) observer.observe(child)
    window.addEventListener('resize', check)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', check)
    }
  }, [reduced, flow])

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        const items = gsap.utils.toArray<HTMLElement>('[data-revela]')
        if (!items.length) return
        gsap.from(items, {
          y: 36,
          autoAlpha: 0,
          stagger: 0.08,
          duration: 1.2,
          scrollTrigger: {
            trigger: root.current,
            start: 'top 65%',
            toggleActions: 'play none none reverse',
          },
        })
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      id={id}
      aria-labelledby={`${id}-titulo`}
      className={`relative z-10 ${className}`}
      style={pinned ? { height: `${screens * 100}svh` } : undefined}
    >
      <div
        className={
          pinned ? 'sticky top-0 flex h-svh' : 'relative flex min-h-svh'
        }
      >
        <div
          aria-hidden="true"
          className="velo pointer-events-none absolute inset-0"
        />
        <div
          ref={inner}
          className={`sobre-escena relative mx-auto flex w-full max-w-[90rem] flex-col justify-end px-4 pt-20 pb-24 md:px-8 lg:justify-center lg:pt-24 lg:pb-20 xl:pl-52 ${flow ? '' : 'lg:pr-[26.5rem]'}`}
        >
          {children}
        </div>
      </div>
    </section>
  )
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <p data-revela="" className="etiqueta flex items-center gap-3 text-acento">
      <span aria-hidden="true" className="h-px w-8 bg-current" />
      {children}
    </p>
  )
}

function Facts({ facts }: { facts: readonly Fact[] }) {
  const { t } = useLanguage()
  return (
    <dl
      data-revela=""
      className="mt-6 grid max-w-2xl grid-cols-3 gap-2 md:mt-7 md:gap-3"
    >
      {facts.map((fact) => (
        <div
          key={fact.label.es}
          className="vidrio flex flex-col-reverse justify-end rounded-xl px-2 py-2.5 md:px-4 md:py-3"
        >
          <dt className="etiqueta mt-1 text-[0.625rem] text-tenue md:text-[0.6875rem]">
            {t(fact.label)}
          </dt>
          <dd className="cifra estrecha text-[0.8125rem] [overflow-wrap:normal] text-tinta sm:text-sm md:text-lg">
            {t(fact.value)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function Story({
  id,
  copy,
  screens,
}: {
  id: string
  copy: ChapterCopy
  screens: number
}) {
  const { t } = useLanguage()
  return (
    <Chapter id={id} screens={screens}>
      <div className="max-w-2xl">
        <Kicker>{t(copy.kicker)}</Kicker>
        <div data-revela="">
          <GlitchText
            as="h2"
            id={`${id}-titulo`}
            text={t(copy.title)}
            className="titulo mt-4 max-w-[16ch]"
          />
        </div>
        <p data-revela="" className="prosa mt-4 max-w-xl text-tinta/85 md:mt-5">
          {t(copy.lead)}
        </p>
        {copy.facts && <Facts facts={copy.facts} />}
      </div>
    </Chapter>
  )
}

/** Mission elapsed time since the page opened, ticking once a second. */
function MissionClock() {
  const { t } = useLanguage()
  const reduced = useReducedMotion()
  const [seconds, setSeconds] = useState<number | null>(null)
  useEffect(() => {
    if (reduced) return
    const start = Date.now()
    setSeconds(0)
    const timer = window.setInterval(
      () => setSeconds(Math.floor((Date.now() - start) / 1000)),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [reduced])
  if (seconds === null) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  const text = `T+ ${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`
  return (
    <p className="etiqueta text-tenue">
      {t(COPY.launch.clock)} <span className="cifra text-tinta">{text}</span>
    </p>
  )
}

export function Launch() {
  const { t } = useLanguage()
  return (
    <Chapter id="lanzamiento" screens={1.7}>
      <div className="entrada max-w-2xl">
        <p
          className="etiqueta flex items-center gap-3 text-acento"
          style={{ '--i': 0 } as CSSProperties}
        >
          <span aria-hidden="true" className="h-px w-8 bg-current" />
          {t(COPY.launch.kicker)}
        </p>
        <div style={{ '--i': 1 } as CSSProperties}>
          <KineticTitle
            text={t(COPY.launch.title)}
            label={t(COPY.launch.titleLabel)}
            className="mt-3 text-[clamp(3.75rem,min(15vw,14svh),11rem)] text-tinta"
          />
        </div>
        <p
          className="prosa mt-4 max-w-xl text-tinta/85"
          style={{ '--i': 2 } as CSSProperties}
        >
          {t(COPY.launch.lead)}
        </p>
        <div
          className="mt-6 flex flex-wrap items-center gap-2.5 sm:mt-7 sm:gap-3"
          style={{ '--i': 3 } as CSSProperties}
        >
          <Magnetic>
            <a
              href="#salto"
              onClick={(event) => {
                event.preventDefault()
                goTo('salto')
              }}
              className="inline-flex min-h-12 items-center gap-3 rounded-full bg-acento px-5 font-medium sm:px-6 text-fondo no-underline shadow-[0_0_40px_-6px_var(--acento)] transition-transform hover:scale-[1.03]"
            >
              {t(COPY.launch.start)}
              <span aria-hidden="true">↓</span>
            </a>
          </Magnetic>
          <Magnetic>
            <a
              href="#tripulacion"
              onClick={(event) => {
                event.preventDefault()
                goTo('tripulacion')
              }}
              className="inline-flex min-h-12 items-center rounded-full border border-linea px-5 text-tinta sm:px-6 no-underline transition-colors hover:border-acento hover:text-acento"
            >
              <span className="sm:hidden" aria-hidden="true">
                {t(COPY.launch.crewShort)}
              </span>
              <span className="sr-only sm:not-sr-only">
                {t(COPY.launch.crew)}
              </span>
            </a>
          </Magnetic>
        </div>
        <div
          className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-1.5 sm:mt-8"
          style={{ '--i': 4 } as CSSProperties}
        >
          <MissionClock />
          <p className="etiqueta text-tenue">{t(COPY.launch.note)}</p>
        </div>
      </div>
    </Chapter>
  )
}

export function Crew() {
  const { t } = useLanguage()
  return (
    <Chapter id="tripulacion" screens={1} flow>
      <div className="mx-auto w-full max-w-5xl text-center">
        <div className="flex justify-center">
          <Kicker>{t(COPY.crew.kicker)}</Kicker>
        </div>
        <div data-revela="">
          <GlitchText
            as="h2"
            id="tripulacion-titulo"
            text={t(COPY.crew.title)}
            className="titulo mt-4"
          />
        </div>
        <p data-revela="" className="prosa mx-auto mt-4 max-w-lg text-tinta/85">
          {t(COPY.crew.lead)}
        </p>
        <div data-revela="" className="mt-8">
          <CrewCarousel />
        </div>
      </div>
    </Chapter>
  )
}

export function Warp() {
  return <Story id="salto" copy={COPY.warp} screens={2.4} />
}

export function Approach() {
  return <Story id="aproximacion" copy={COPY.approach} screens={2.4} />
}

export function Ergosphere() {
  return <Story id="ergosfera" copy={COPY.ergosphere} screens={2.4} />
}

/**
 * The crossing. As the dive deepens, the copy stretches and splits into
 * colour (the `.deforma` transform, driven by --d), and the last words widen
 * on Anybody's width axis. Sized for the widest state, so nothing leaves the
 * screen.
 */
export function Horizon() {
  const { t, lang } = useLanguage()
  const box = useRef<HTMLDivElement>(null)
  const shout = useRef<HTMLParagraphElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    let last = -1
    let lastFade = -1
    return mission.subscribe(({ t: mt }) => {
      // The whole panel (copy and its dark wash) fades into the flash, so
      // nothing dark is left on screen when the page turns to paper.
      const panel = box.current?.parentElement?.parentElement
      const x = Math.min(Math.max((mt - (LIGHT_T - 0.1)) / 0.09, 0), 1)
      const fade = Math.round(x * x * (3 - 2 * x) * 1000) / 1000
      if (panel && fade !== lastFade) {
        lastFade = fade
        panel.style.opacity = String(1 - fade)
        panel.style.filter = fade > 0 ? `blur(${(fade * 10).toFixed(1)}px)` : ''
      }
      const d = Math.round(diveAt(mt) ** 1.4 * 1000) / 1000
      if (d === last) return
      last = d
      box.current?.style.setProperty('--d', String(d))
      shout.current?.style.setProperty(
        'font-variation-settings',
        `'wght' ${Math.round(500 + d * 400)}, 'wdth' ${(60 + d * 90).toFixed(1)}`,
      )
    })
  }, [reduced])

  const words = t(COPY.horizon.shout).split(' ')
  const lines =
    lang === 'es'
      ? [words.slice(0, 2), words.slice(2, 3), words.slice(3)]
      : [words.slice(0, 2), words.slice(2, 4), words.slice(4)]

  return (
    <Chapter id="horizonte" screens={3}>
      <div ref={box} className="deforma max-w-2xl">
        <Kicker>{t(COPY.horizon.kicker)}</Kicker>
        <div data-revela="">
          <GlitchText
            as="h2"
            id="horizonte-titulo"
            text={t(COPY.horizon.title)}
            className="titulo mt-4 max-w-[16ch]"
            every={[2500, 5000]}
          />
        </div>
        <p data-revela="" className="prosa mt-5 max-w-xl text-tinta/85">
          {t(COPY.horizon.lead)}
        </p>
        <p
          ref={shout}
          data-revela=""
          className="mt-6 font-display text-[clamp(1.75rem,min(8.5vw,8svh),5.5rem)] leading-[0.95] text-acento uppercase [font-variation-settings:'wght'_500,'wdth'_60]"
        >
          {lines.map((line) => (
            <span key={line.join(' ')} className="block py-[0.04em]">
              {line.join(' ')}
            </span>
          ))}
        </p>
      </div>
    </Chapter>
  )
}

export function Beyond() {
  const { t } = useLanguage()
  const b = COPY.beyond
  return (
    <section
      id="mas-alla"
      aria-labelledby="mas-alla-titulo"
      className="escena-luz relative z-10 min-h-svh"
    >
      <div className="mx-auto max-w-[90rem] px-4 pt-28 pb-16 md:px-8 lg:pt-36 xl:pl-52">
        <div className="max-w-3xl">
          <p className="etiqueta flex items-center gap-3 text-acento">
            <span aria-hidden="true" className="h-px w-8 bg-current" />
            {t(b.kicker)}
          </p>
          <GlitchText
            as="h2"
            id="mas-alla-titulo"
            text={t(b.title)}
            className="titulo mt-4"
          />
          <p className="prosa mt-5 max-w-xl text-tinta/85">{t(b.lead)}</p>
        </div>

        <h3 className="etiqueta mt-14 text-tenue">{t(b.logTitle)}</h3>
        <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-linea bg-linea lg:grid-cols-4">
          {b.log.map((item) => (
            <div key={item.label.es} className="bg-fondo px-4 py-5 md:px-6">
              <dt className="etiqueta text-tenue">{t(item.label)}</dt>
              <dd className="mt-2 font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-none [font-variation-settings:'wght'_700,'wdth'_110]">
                {t(item.value)}
              </dd>
            </div>
          ))}
        </dl>

        <h3 className="etiqueta mt-12 text-tenue">{t(b.physicsTitle)}</h3>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {b.physics.map((item) => (
            <div
              key={item.label.es}
              className="rounded-xl border border-linea px-4 py-3"
            >
              <dt className="etiqueta text-tenue">{t(item.label)}</dt>
              <dd className="cifra mt-1.5 text-sm text-instrumento">
                {t(item.value)}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Magnetic>
            <button
              type="button"
              onClick={() => scrollToTarget(0)}
              className="inline-flex min-h-12 cursor-pointer items-center gap-3 rounded-full bg-tinta px-6 font-medium text-fondo transition-colors hover:bg-acento"
            >
              <span aria-hidden="true">↑</span>
              {t(b.again)}
            </button>
          </Magnetic>
          <SoundButton label />
          <a
            href={REPO}
            className="inline-flex min-h-12 items-center rounded-full px-4 text-tinta underline decoration-linea underline-offset-4 transition-colors hover:decoration-acento"
          >
            {t(b.source)}
          </a>
        </div>
      </div>
      <footer className="border-t border-linea">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-4 px-4 py-6 md:px-8 xl:pl-52">
          <p className="max-w-2xl text-sm text-tenue">{t(b.credit)}</p>
          <p className="etiqueta text-tenue">
            {fill('KRR-01 · {year}', { year: 2026 })}
          </p>
        </div>
      </footer>
    </section>
  )
}
