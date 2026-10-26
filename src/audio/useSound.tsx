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
 * Proximity is the log distance to Nadir mapped to 0 … 1, so the drone keeps
 * growing all the way down.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false)
  const voice = useRef<Voice | null>(null)
  const enabled = useRef(false)

  useEffect(() => {
    return mission.subscribe(({ t }) => {
      const v = voice.current
      if (!v || !enabled.current) return
      const proximity = 1 - Math.min(Math.max(logRadius(t) / 6, 0), 1)
      const beyond = Math.min(Math.max((t - 5.92) / 0.2, 0), 1)
      v.update(Math.max(proximity, diveAt(t)), warpAt(t), beyond)
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
