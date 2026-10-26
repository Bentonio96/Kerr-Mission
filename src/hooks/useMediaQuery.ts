import { useSyncExternalStore } from 'react'
import { REDUCED_MOTION_QUERY } from '../lib/motion-preference'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** True when the no-motion build is running, by preference or ?reduced=1. */
export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY)
}

/** A mouse or trackpad: the custom cursor and magnetism only make sense here. */
export function useFinePointer(): boolean {
  return useMediaQuery('(hover: hover) and (pointer: fine)')
}
