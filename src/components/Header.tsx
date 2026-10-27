import { useEffect, useState } from 'react'
import { useSound } from '../audio/useSound'
import { CHAPTER_NAMES, COPY } from '../data/copy'
import { useReducedMotion } from '../hooks/useMediaQuery'
import { useLanguage } from '../i18n/useLanguage'
import { mission } from '../mission/engine'
import { CHAPTERS, LIGHT_T } from '../mission/timeline'
import { scrollToTarget } from '../lib/scroll'
import { LANGUAGES } from '../types'
import { Magnetic } from './Magnetic'

/** True once the ship is through and the page has turned to paper. */
function useLight(): boolean {
  const [light, setLight] = useState(false)
  useEffect(() => mission.subscribe(({ t }) => setLight(t >= LIGHT_T)), [])
  return light
}

/** Jump to a chapter and hand focus to its heading. */
export function goTo(id: string) {
  scrollToTarget(`#${id}`)
  const heading = document.querySelector<HTMLElement>(`#${id} :is(h1, h2)`)
  heading?.setAttribute('tabindex', '-1')
  heading?.focus({ preventScroll: true })
}

/** Bars that dance while the sound is on. */
function SoundIcon({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className="flex h-3.5 items-end gap-[3px]">
      {[0.5, 1, 0.7, 0.85].map((h, i) => (
        <span
          key={i}
          className={`w-[2px] rounded-full bg-current ${on ? 'barra' : ''}`}
          style={{
            height: `${on ? h * 100 : 22}%`,
            animationDelay: `${i * 120}ms`,
          }}
        />
      ))}
    </span>
  )
}

export function SoundButton({
  className = '',
  label = false,
}: {
  className?: string
  label?: boolean
}) {
  const { t } = useLanguage()
  const { on, toggle } = useSound()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-full border px-3 transition-colors ${on ? 'border-acento text-acento' : 'border-linea text-tinta hover:border-tinta/60'} ${className}`}
    >
      <SoundIcon on={on} />
      <span className={label ? 'etiqueta' : 'etiqueta sr-only sm:not-sr-only'}>
        {t(COPY.sound)}
      </span>
    </button>
  )
}

/**
 * The sound is on from the start, so the first thing the page says is where
 * to turn it off: a small bubble under the button, pointing at it. It goes
 * away on its own a few seconds after the sound actually starts, when the
 * visitor uses the button, or when they close it.
 */
function SoundHint() {
  const { t } = useLanguage()
  const { on, waiting } = useSound()
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Intentional: shown only after hydration, never in the prerender.
    // eslint-disable-next-line react/set-state-in-effect
    if (!done) setOpen(on)
    if (!on) setDone(true)
  }, [on, done])

  useEffect(() => {
    if (!open || waiting) return
    const timer = window.setTimeout(() => {
      setOpen(false)
      setDone(true)
    }, 7000)
    return () => window.clearTimeout(timer)
  }, [open, waiting])

  if (!open || done) return null
  return (
    <div
      role="status"
      className="aviso vidrio absolute top-full right-0 mt-3 flex w-[min(16rem,calc(100vw-2rem))] items-start gap-2 rounded-2xl py-2.5 pr-1 pl-4 text-left"
    >
      <span
        aria-hidden="true"
        className="absolute -top-1.5 right-5 size-3 rotate-45 border-t border-l border-tinta/15 bg-fondo"
      />
      <p className="flex-1 pt-1.5">
        <span className="flex items-center gap-1.5 text-sm font-medium text-tinta">
          <span aria-hidden="true">↑</span>
          {t(COPY.hintMute)}
        </span>
        {waiting && (
          <span className="mt-1 block text-xs leading-snug text-tenue">
            {t(COPY.hintWaiting)}
          </span>
        )}
      </p>
      <button
        type="button"
        onClick={() => {
          setOpen(false)
          setDone(true)
        }}
        className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-tenue transition-colors hover:text-tinta"
      >
        <span aria-hidden="true">×</span>
        <span className="sr-only">{t(COPY.hintClose)}</span>
      </button>
    </div>
  )
}

/**
 * Everything that moves on its own stops with this switch, which reloads
 * into the reduced-motion build: WCAG 2.2.2 asks for a way to pause it.
 */
function MotionToggle() {
  const { t } = useLanguage()
  const reduced = useReducedMotion()
  const go = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('reduced', reduced ? '0' : '1')
    window.location.assign(url.toString())
  }
  return (
    <button
      type="button"
      onClick={go}
      className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 px-2 text-tenue transition-colors hover:text-tinta"
    >
      <span aria-hidden="true" className="flex gap-[3px]">
        {reduced ? (
          <span className="size-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-current" />
        ) : (
          <>
            <span className="h-2.5 w-[3px] bg-current" />
            <span className="h-2.5 w-[3px] bg-current" />
          </>
        )}
      </span>
      <span className="etiqueta sr-only xl:not-sr-only">
        {t(reduced ? COPY.motionOn : COPY.motionOff)}
      </span>
    </button>
  )
}

export function Header() {
  const { t, lang, setLang } = useLanguage()
  const light = useLight()

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-700 ${light ? 'bg-fondo/80 backdrop-blur-md' : ''}`}
    >
      <a
        href="#contenido"
        onClick={(event) => {
          event.preventDefault()
          scrollToTarget('#contenido')
          document.getElementById('contenido')?.focus({ preventScroll: true })
        }}
        className="etiqueta sr-only bg-tinta px-3 py-2 text-fondo focus:not-sr-only focus:absolute focus:top-3 focus:left-4"
      >
        {t(COPY.skip)}
      </a>
      <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-3 px-4 md:px-8">
        <a
          href="#lanzamiento"
          onClick={(event) => {
            event.preventDefault()
            scrollToTarget(0)
          }}
          className="flex min-h-11 items-center gap-2.5 text-tinta no-underline"
        >
          <span
            aria-hidden="true"
            className="marca relative size-6 rounded-full"
          />
          <span className="display text-lg tracking-[0.18em]">KERR</span>
          <span className="etiqueta hidden text-tenue md:inline">KRR-01</span>
          <span className="sr-only">{t(COPY.home)}</span>
        </a>

        <div className="flex items-center gap-1 sm:gap-2">
          <MotionToggle />
          <div
            role="group"
            aria-label={t(COPY.language)}
            className="etiqueta flex items-center"
          >
            {LANGUAGES.map((code) => (
              <button
                key={code}
                type="button"
                lang={code}
                aria-pressed={lang === code}
                onClick={() => setLang(code)}
                className={`min-h-11 min-w-11 cursor-pointer px-1.5 uppercase transition-colors ${lang === code ? 'text-acento underline decoration-1 underline-offset-4' : 'text-tenue hover:text-tinta'}`}
              >
                <span aria-hidden="true">{code}</span>
                <span className="sr-only">
                  {code === 'es' ? 'Español' : 'English'}
                </span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Magnetic>
              <SoundButton />
            </Magnetic>
            <SoundHint />
          </div>
        </div>
      </div>
    </header>
  )
}

/**
 * The chapters down the left edge on wide screens: where you are, and a
 * shortcut to anywhere. A thin progress line runs along it.
 */
export function ChapterRail() {
  const { t } = useLanguage()
  const [chapter, setChapter] = useState(0)
  useEffect(() => mission.onChapter(setChapter), [])
  const light = useLight()

  return (
    <nav
      aria-label={t(COPY.chapters)}
      className={`fixed top-1/2 left-6 z-40 hidden -translate-y-1/2 transition-opacity duration-500 xl:block ${light ? 'invisible opacity-0' : ''}`}
    >
      <ol className="flex flex-col gap-0.5">
        {CHAPTERS.map((id, i) => {
          const current = i === chapter
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={current ? 'step' : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  goTo(id)
                }}
                className={`group flex min-h-8 items-center gap-3 no-underline transition-colors ${current ? 'text-acento' : 'text-tenue hover:text-tinta'}`}
              >
                <span
                  aria-hidden="true"
                  className={`h-px transition-all duration-500 ease-salida ${current ? 'w-8 bg-acento' : 'w-3 bg-current group-hover:w-5'}`}
                />
                <span className="etiqueta">0{i + 1}</span>
                <span
                  className={`etiqueta transition-opacity duration-300 ${current ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}
                >
                  {t(CHAPTER_NAMES[i]!)}
                </span>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
