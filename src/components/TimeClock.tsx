import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { COPY } from '../data/copy'
import { useReducedMotion } from '../hooks/useMediaQuery'
import { fill, formatNumber } from '../i18n/format'
import { useLanguage } from '../i18n/useLanguage'
import { gsap } from '../lib/gsap'
import {
  NADIR,
  ergosphereRadius,
  iscoRadius,
  orbitalDilation,
  orbitalSpeed,
} from '../mission/physics'
import type { Lang } from '../types'

const A = NADIR.spin
const R_MAX = 20
// Just outside the prograde photon orbit (1.424 M), where orbits end.
const R_MIN = 1.43
const STEPS = 1000
const UMBRAL = 1.95
const ISCO = iscoRadius(A)
const ERGO = ergosphereRadius(A)

/** Slider position → radius: logarithmic, and closer as it moves right. */
function radiusAt(v: number): number {
  return Math.exp(
    Math.log(R_MAX) + (Math.log(R_MIN) - Math.log(R_MAX)) * (v / STEPS),
  )
}

function valueAt(r: number): number {
  return Math.round(
    ((Math.log(r) - Math.log(R_MAX)) / (Math.log(R_MIN) - Math.log(R_MAX))) *
      STEPS,
  )
}

type Unit = keyof typeof COPY.clock.units

/** Hours, in whichever unit reads best: hours, days or years. */
function humanize(hours: number, lang: Lang): string {
  let value = hours
  let unit: Unit = 'hour'
  if (hours < 1) {
    value = hours * 60
    unit = 'minute'
  } else if (hours >= 24 * 365.25 * 2) {
    value = hours / (24 * 365.25)
    unit = 'year'
  } else if (hours >= 48) {
    value = hours / 24
    unit = 'day'
  }
  const decimals = value < 10 ? 2 : value < 100 ? 1 : 0
  const text = formatNumber(value, lang, decimals)
  const [one, many] = COPY.clock.units[unit][lang]
  return `${text} ${value === 1 ? one : many}`
}

function zoneOf(r: number): keyof typeof COPY.clock.zones {
  if (r < 1.5) return 'edge'
  if (r <= ERGO) return 'ergo'
  if (r < 4) return 'near'
  return 'far'
}

/** An analogue dial; the hand is turned from outside, through a ref. */
function Dial({
  label,
  hand,
  accent,
}: {
  label: string
  hand: RefObject<SVGLineElement | null>
  accent: boolean
}) {
  return (
    <figure className="flex flex-col items-center gap-2">
      <svg
        viewBox="-50 -50 100 100"
        aria-hidden="true"
        className="size-28 sm:size-36"
      >
        <circle
          r="46"
          className="fill-black/30 stroke-tinta/25"
          strokeWidth="1"
        />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2
          const inner = i % 3 === 0 ? 36 : 40
          return (
            <line
              key={i}
              x1={Math.sin(a) * inner}
              y1={-Math.cos(a) * inner}
              x2={Math.sin(a) * 44}
              y2={-Math.cos(a) * 44}
              className="stroke-tinta/50"
              strokeWidth={i % 3 === 0 ? 2 : 1}
            />
          )
        })}
        <line
          ref={hand}
          x1="0"
          y1="6"
          x2="0"
          y2="-38"
          strokeWidth="2"
          strokeLinecap="round"
          className={accent ? 'stroke-acento' : 'stroke-instrumento'}
        />
        <circle r="3" className={accent ? 'fill-acento' : 'fill-instrumento'} />
      </svg>
      <figcaption className="etiqueta text-tenue">{label}</figcaption>
    </figure>
  )
}

/**
 * How much an hour costs near Nadir. Pick an orbit (logarithmic slider, from
 * 20 M down to the edge of the photon orbit) and a stay aboard; the page
 * answers with the time that passes on Earth, from the same formula as the
 * HUD (prograde circular orbit, Bardeen–Press–Teukolsky). Two clocks show it:
 * Earth's turns as many times faster as the dilation says (drawn up to 60×).
 */
export function TimeClock() {
  const { t, lang } = useLanguage()
  const reduced = useReducedMotion()
  const id = useId()
  const [value, setValue] = useState(valueAt(UMBRAL))
  const [stay, setStay] = useState(1)
  const ship = useRef<SVGLineElement>(null)
  const earth = useRef<SVGLineElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const factorRef = useRef(1)

  const r = radiusAt(value)
  const dilation = orbitalDilation(r, A) ?? Infinity
  const speed = orbitalSpeed(r, A) ?? 1
  const hours = COPY.clock.stays[stay]!.hours
  factorRef.current = dilation

  useEffect(() => {
    const el = root.current
    if (!el || reduced) return
    let visible = false
    let shipAngle = 0
    let earthAngle = 0
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false
    })
    observer.observe(el)
    const tick = (_time: number, delta: number) => {
      if (!visible) return
      // One turn every 8 s aboard; Earth's clock, as many times faster.
      const step = (delta / 1000) * 45
      shipAngle = (shipAngle + step) % 360
      earthAngle = (earthAngle + step * Math.min(factorRef.current, 60)) % 360
      ship.current?.setAttribute('transform', `rotate(${shipAngle.toFixed(1)})`)
      earth.current?.setAttribute(
        'transform',
        `rotate(${earthAngle.toFixed(1)})`,
      )
    }
    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      observer.disconnect()
    }
  }, [reduced])

  const radiusText = `${formatNumber(r, lang, r < 10 ? 2 : 1)} M`
  const zone = t(COPY.clock.zones[zoneOf(r)])
  const presets = [
    { r: 10, label: COPY.clock.far },
    { r: ISCO, label: COPY.clock.isco },
    { r: UMBRAL, label: COPY.clock.umbral },
  ]

  return (
    <div
      ref={root}
      className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12"
    >
      <div className="space-y-6">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <label htmlFor={`${id}-r`} className="etiqueta text-tenue">
              {t(COPY.clock.radius)}
            </label>
            <span className="cifra text-lg text-tinta">{radiusText}</span>
          </div>
          <input
            id={`${id}-r`}
            type="range"
            min={0}
            max={STEPS}
            step={1}
            value={value}
            onChange={(event) => setValue(Number(event.target.value))}
            aria-valuetext={`${radiusText}, ${zone}`}
            className="rango mt-3 w-full"
          />
          <p className="etiqueta mt-2 text-instrumento">{zone}</p>
        </div>

        <div
          role="group"
          aria-label={t(COPY.clock.presets)}
          className="flex flex-wrap gap-2"
        >
          {presets.map((preset) => (
            <button
              key={preset.label.es}
              type="button"
              onClick={() => setValue(valueAt(preset.r))}
              className="min-h-11 cursor-pointer rounded-full border border-linea px-4 text-sm text-tinta transition-colors hover:border-acento hover:text-acento"
            >
              {t(preset.label)}
            </button>
          ))}
        </div>

        <fieldset>
          <legend className="etiqueta text-tenue">{t(COPY.clock.stay)}</legend>
          <div className="mt-3 inline-flex rounded-full border border-linea p-1">
            {COPY.clock.stays.map((option, i) => (
              <label
                key={option.hours}
                className={`relative flex min-h-10 cursor-pointer items-center rounded-full px-4 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-acento ${stay === i ? 'bg-acento text-fondo' : 'text-tinta hover:text-acento'}`}
              >
                <input
                  type="radio"
                  name={`${id}-stay`}
                  checked={stay === i}
                  onChange={() => setStay(i)}
                  className="sr-only"
                />
                {t(option.label)}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="vidrio rounded-2xl p-5 sm:p-7">
        <div className="flex justify-around gap-4">
          <Dial label={t(COPY.clock.aboard)} hand={ship} accent={false} />
          <Dial label={t(COPY.clock.onEarth)} hand={earth} accent />
        </div>
        <p className="sr-only">
          {fill(t(COPY.clock.clocks), {
            x: formatNumber(Math.min(dilation, 1e6), lang, 2),
          })}
        </p>
        <div className="mt-6 border-t border-linea pt-5">
          <p className="etiqueta text-tenue">
            {t(COPY.clock.stays[stay]!.label)} · {t(COPY.clock.earth)}
          </p>
          <output
            htmlFor={`${id}-r`}
            className="mt-1 block font-display text-[clamp(1.9rem,1.4rem+2.2vw,3.25rem)] leading-[1.05] text-acento [font-variation-settings:'wght'_720,'wdth'_105]"
          >
            {humanize(hours * dilation, lang)}
          </output>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <dt className="etiqueta text-tenue">{t(COPY.clock.factor)}</dt>
              <dd className="cifra text-tinta">
                × {formatNumber(dilation, lang, dilation < 100 ? 2 : 0)}
              </dd>
            </div>
            <div>
              <dt className="etiqueta text-tenue">{t(COPY.clock.speed)}</dt>
              <dd className="cifra text-tinta">
                {formatNumber(speed, lang, 2)} c
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
