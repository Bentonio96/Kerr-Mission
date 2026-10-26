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
import { diveAt, logRadius, warpAt } from '../mission/timeline'
import { createVoice, type Voice } from './engine'

interface Sound {
  readonly on: boolean
  readonly toggle: () => void
}

const SoundContext = createContext<Sound | null>(null)

/**
 * The sound switch. Off by default and on every visit: the first click
 * creates the audio context, later clicks fade the master in and out.
 * Proximity is the log distance to Nadir mapped to 0 … 1, so the score keeps
 * growing all the way down; the clock follows the HUD's time dilation.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false)
  const voice = useRef<Voice | null>(null)
  const enabled = useRef(false)

  useEffect(() => {
    return mission.subscribe(({ t }) => {
      const v = voice.current
      if (!v || !enabled.current) return
      const clamp = (x: number) => Math.min(Math.max(x, 0), 1)
      const proximity = 1 - clamp(logRadius(t) / 6)
      const beyond = clamp((t - 5.92) / 0.2)
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

  useEffect(() => () => voice.current?.close(), [])

  const toggle = useCallback(() => {
    const next = !enabled.current
    enabled.current = next
    setOn(next)
    // Created synchronously, inside the click: Safari only lets an audio
    // context start during a user gesture.
    voice.current ??= createVoice()
    voice.current?.setEnabled(next)
    mission.poke()
  }, [])

  const value = useMemo(() => ({ on, toggle }), [on, toggle])
  return <SoundContext value={value}>{children}</SoundContext>
}

export function useSound(): Sound {
  const value = use(SoundContext)
  if (!value) throw new Error('useSound must be used inside <SoundProvider>')
  return value
}
