import { useEffect, useRef, useState } from 'react'
import { CHAPTER_NAMES, COPY } from '../data/copy'
import { fill, formatNumber, formatScientific } from '../i18n/format'
import { useLanguage } from '../i18n/useLanguage'
import { mission } from '../mission/engine'
import {
  NADIR,
  ergosphereRadius,
  horizonRadius,
  iscoRadius,
  photonOrbitRadius,
  schwarzschildRadiusKm,
} from '../mission/physics'
import { telemetry, type Telemetry } from '../mission/telemetry'
import { diveAt, sceneOpacity } from '../mission/timeline'
import type { Lang } from '../types'
import { sceneQuality } from './Scene'

const A = NADIR.spin
const RS_KM = schwarzschildRadiusKm(NADIR.solarMasses)
const RADAR = 46

/** Radar radius for a distance in M: log-compressed so every ring shows. */
function radarRadius(r: number): number {
  const l = Math.log(Math.max(r, 1.0001))
  return RADAR * (l / (l + 0.6))
}

const RINGS = [
  { r: horizonRadius(A), cls: 'fill-black stroke-tinta/60' },
  { r: photonOrbitRadius(A), cls: 'fill-none stroke-acento/80' },
  {
    r: ergosphereRadius(A),
    cls: 'fill-none stroke-instrumento/70 [stroke-dasharray:2_3]',
  },
  { r: iscoRadius(A) + 0.35, cls: 'fill-none stroke-tinta/25' },
  { r: 10, cls: 'fill-none stroke-tinta/15' },
  { r: 1e4, cls: 'fill-none stroke-tinta/10' },
]

function speedText(beta: number, lang: Lang): string {
  if (beta >= 0.9999) return `${formatNumber(beta, lang, 7)} c`
  if (beta >= 0.01) return `${formatNumber(beta, lang, 2)} c`
  // Slow: kilometres per second read better than 0.000037 c.
  return `${formatNumber(beta * 299_792.458, lang, 0)} km/s`
}

/**
 * The ship's instruments. React renders the frame once; the numbers are
 * written straight into the DOM on every mission tick, so a scroll never
 * re-renders anything. Phone: one strip of three readings at the bottom.
 * Wide screens: the full panel, with a radar of where the ship is relative
 * to the horizon, the photon orbit and the ergosphere.
 */
export function Hud() {
  const { t, lang } = useLanguage()
  const [chapter, setChapter] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const fields = useRef<Record<string, HTMLElement | null>>({})
  const ship = useRef<SVGCircleElement>(null)
  const langRef = useRef(lang)
  langRef.current = lang

  useEffect(() => mission.onChapter(setChapter), [])

  useEffect(() => {
    const set = (key: string, text: string) => {
      const el = fields.current[key]
      if (el && el.textContent !== text) el.textContent = text
    }
    let frame = 0
    let last: Telemetry | null = null
    return mission.subscribe(({ t: mt, time, dt }) => {
      const box = root.current
      if (!box) return
      const visible = sceneOpacity(mt)
      box.style.opacity = String(visible)
      box.style.visibility = visible < 0.01 ? 'hidden' : ''
      box.style.setProperty('--d', String(diveAt(mt) ** 2))
      // Text at 20 Hz is plenty, and spares layout. Still frames (dt 0, the
      // reduced build) always update.
      if (dt > 0 && frame++ % 3 !== 0 && last) return
      const l = langRef.current
      const data = telemetry(mt)
      last = data
      const lost = data.regime === 'beyond'
      set('distance', lost ? '—' : `${formatScientific(data.km, l)} km`)
      set('radius', lost ? '< r₊' : `r = ${formatScientific(data.r, l)} M`)
      set(
        'dilation',
        lost || !Number.isFinite(data.dilation)
          ? '∞'
          : `× ${formatScientific(data.dilation, l)}`,
      )
      set(
        'dilationLine',
        !Number.isFinite(data.dilation)
          ? COPY.hud.infinite[l]
          : fill(COPY.hud.dilationUnit[l], {
              x: formatScientific(data.dilation, l),
            }),
      )
      set('speed', speedText(data.speed, l))
      set('tidal', `${formatScientific(data.tidal, l)} g`)
      set('regime', COPY.hud.regime[data.regime][l])
      const q = sceneQuality()
      set(
        'render',
        q
          ? `${formatNumber(q.scale, l, 2)}× · ${q.steps} · ${formatNumber(q.fps, l, 0)} fps`
          : '—',
      )
      box.toggleAttribute('data-lost', lost)
      const dot = ship.current
      if (dot) {
        const rr = lost ? 0 : radarRadius(data.r)
        const angle = time * 0.35
        dot.setAttribute('cx', (Math.cos(angle) * rr).toFixed(2))
        dot.setAttribute('cy', (Math.sin(angle) * rr).toFixed(2))
      }
    })
  }, [])

  const field = (key: string) => (el: HTMLElement | null) => {
    fields.current[key] = el
  }

  const name = CHAPTER_NAMES[chapter] ?? CHAPTER_NAMES[0]!

  return (
    <aside
      ref={root}
      aria-label={t(COPY.hud.title)}
      className={`hud deforma pointer-events-none fixed inset-x-0 bottom-0 z-30 transition-opacity duration-500 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[23rem] ${chapter === 1 ? 'lg:invisible lg:opacity-0' : ''}`}
    >
      <div className="vidrio border-x-0 border-b-0 px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] lg:rounded-2xl lg:border lg:p-4">
        <div className="hidden items-center justify-between gap-3 lg:flex">
          <p className="etiqueta text-tenue">
            {t(COPY.hud.phase)}{' '}
            <span className="text-tinta">
              0{chapter + 1} · {t(name)}
            </span>
          </p>
          <span className="etiqueta flex items-center gap-1.5 text-instrumento">
            <span
              aria-hidden="true"
              className="hud-pulso size-1.5 rounded-full bg-current"
            />
            <span ref={field('regime')}>{t(COPY.hud.regime.cruise)}</span>
          </span>
        </div>

        <div className="mt-0 flex items-start gap-4 lg:mt-3">
          <dl className="grid min-w-0 flex-1 grid-cols-3 gap-x-3 gap-y-2 lg:grid-cols-1 lg:gap-y-2.5">
            <div className="min-w-0">
              <dt className="etiqueta text-tenue">
                <span className="lg:hidden">{t(COPY.hud.distanceShort)}</span>
                <span className="hidden lg:inline">{t(COPY.hud.distance)}</span>
              </dt>
              <dd
                className="cifra estrecha text-[0.6875rem] sm:text-[0.75rem] text-tinta lg:text-sm"
                ref={field('distance')}
              >
                —
              </dd>
              <dd
                className="cifra hidden text-xs text-tenue lg:block"
                ref={field('radius')}
              >
                —
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="etiqueta text-tenue">
                <span className="lg:hidden">{t(COPY.hud.dilationShort)}</span>
                <span className="hidden lg:inline">{t(COPY.hud.dilation)}</span>
              </dt>
              <dd
                className="cifra estrecha text-[0.6875rem] sm:text-[0.75rem] text-acento lg:text-sm"
                ref={field('dilation')}
              >
                —
              </dd>
              <dd
                className="cifra hidden text-xs text-tenue lg:block"
                ref={field('dilationLine')}
              >
                —
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="etiqueta text-tenue">
                <span className="lg:hidden">{t(COPY.hud.speedShort)}</span>
                <span className="hidden lg:inline">{t(COPY.hud.speed)}</span>
              </dt>
              <dd
                className="cifra estrecha text-[0.6875rem] sm:text-[0.75rem] text-tinta lg:text-sm"
                ref={field('speed')}
              >
                —
              </dd>
            </div>
            <div className="hidden min-w-0 lg:block">
              <dt className="etiqueta text-tenue">{t(COPY.hud.tidal)}</dt>
              <dd className="cifra text-sm text-tinta" ref={field('tidal')}>
                —
              </dd>
            </div>
          </dl>

          <svg
            viewBox={`${-RADAR - 4} ${-RADAR - 4} ${RADAR * 2 + 8} ${RADAR * 2 + 8}`}
            className="hidden size-28 shrink-0 self-center lg:block"
            role="img"
            aria-label={t(COPY.hud.radar)}
          >
            {RINGS.slice()
              .reverse()
              .map(({ r, cls }) => (
                <circle
                  key={r}
                  r={radarRadius(r)}
                  className={`${cls} [stroke-width:0.8]`}
                />
              ))}
            <line
              x1={-RADAR}
              x2={RADAR}
              y1="0"
              y2="0"
              className="stroke-tinta/10 [stroke-width:0.5]"
            />
            <line
              y1={-RADAR}
              y2={RADAR}
              x1="0"
              x2="0"
              className="stroke-tinta/10 [stroke-width:0.5]"
            />
            <circle
              ref={ship}
              r="2.6"
              cx={RADAR}
              cy="0"
              className="fill-acento"
            />
          </svg>
        </div>

        <p className="mt-3 hidden justify-between gap-2 border-t border-linea pt-2.5 lg:flex">
          <span className="etiqueta text-tenue">
            {t(COPY.hud.rs)}{' '}
            <span className="text-tinta">
              {formatScientific(RS_KM, lang)} km
            </span>
          </span>
        </p>
        <p className="mt-1 hidden justify-between gap-2 lg:flex">
          <span className="etiqueta text-tenue">{t(COPY.hud.render)}</span>
          <span className="etiqueta text-tenue" ref={field('render')}>
            —
          </span>
        </p>
        <p
          className="hud-perdida etiqueta mt-2 hidden text-acento"
          aria-hidden="true"
        >
          {t(COPY.hud.lost)}
        </p>
      </div>
    </aside>
  )
}
