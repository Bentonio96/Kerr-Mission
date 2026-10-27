import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { mission } from '../mission/engine'
import { telemetry } from '../mission/telemetry'
import { LIGHT_T, diveAt, logRadius, warpAt } from '../mission/timeline'
import { createVoice, type Voice } from './engine'

interface Sound {
  readonly on: boolean
  /** On, but the browser is still waiting for a first gesture. */
  readonly waiting: boolean
  readonly toggle: () => void
}

const SoundContext = createContext<Sound | null>(null)

const STORAGE_KEY = 'kerr:sound'
// Gestures every browser accepts for starting audio. Scrolling is not one.
const GESTURES = ['pointerdown', 'keydown', 'touchend'] as const

function storedMute(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'off'
  } catch {
    return false
  }
}

/**
 * The score, on by default. It tries to start as the page loads; where the
 * browser forbids that (most of them, until the visitor interacts), it
 * starts on the first click, tap or key press anywhere. Muting is remembered
 * for the next visit. Proximity is the log distance to Nadir mapped to
 * 0 … 1, so the score keeps growing all the way down; the clock follows the
 * HUD's time dilation.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  // Prerendered as on; a stored mute is applied once mounted.
  const [on, setOn] = useState(true)
  const [running, setRunning] = useState(false)
  const voice = useRef<Voice | null>(null)
  const enabled = useRef(false)

  const ensure = useCallback(() => {
    if (!voice.current) {
      voice.current = createVoice()
      voice.current?.onState(() =>
        setRunning(voice.current?.running() ?? false),
      )
    }
    return voice.current
  }, [])

  useEffect(() => {
    const muted = storedMute()
    enabled.current = !muted
    // Intentional: the stored choice only exists on the client.
    // eslint-disable-next-line react/set-state-in-effect
    setOn(!muted)
    if (!muted) {
      ensure()?.setEnabled(true)
      mission.poke()
    }
    const unlock = () => voice.current?.unlock()
    GESTURES.forEach((type) =>
      window.addEventListener(type, unlock, { capture: true, passive: true }),
    )
    return () => {
      GESTURES.forEach((type) =>
        window.removeEventListener(type, unlock, { capture: true }),
      )
      voice.current?.close()
      voice.current = null
    }
  }, [ensure])

  useEffect(() => {
    return mission.subscribe(({ t }) => {
      const v = voice.current
      if (!v || !enabled.current) return
      const clamp = (x: number) => Math.min(Math.max(x, 0), 1)
      const proximity = 1 - clamp(logRadius(t) / 6)
      const beyond = clamp((t - LIGHT_T) / 0.15)
      v.update({
        proximity: Math.max(proximity, diveAt(t)),
        warp: warpAt(t),
        dive: diveAt(t),
        beyond,
        dilation: telemetry(t).dilation,
        // The ostinato enters with the ergosphere and runs to the horizon.
        tension: clamp((t - 3.9) / 0.45) * (1 - beyond),
      })
    })
  }, [])

  const toggle = useCallback(() => {
    const next = !enabled.current
    enabled.current = next
    setOn(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
    } catch {
      // Remembering the choice is a convenience, not a requirement.
    }
    ensure()?.setEnabled(next)
    mission.poke()
  }, [ensure])

  const value = useMemo(
    () => ({ on, waiting: on && !running, toggle }),
    [on, running, toggle],
  )
  return <SoundContext value={value}>{children}</SoundContext>
}

export function useSound(): Sound {
  const value = use(SoundContext)
  if (!value) throw new Error('useSound must be used inside <SoundProvider>')
  return value
}
