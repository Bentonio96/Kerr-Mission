import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../hooks/useMediaQuery'
import { mission } from '../mission/engine'
import { sceneOpacity, view } from '../mission/timeline'
import type { BlackHole, Quality } from '../webgl/blackhole'

let active: BlackHole | null = null

/** Render stats for the HUD's systems line; null until WebGL is up. */
export function sceneQuality(): Quality | null {
  return active?.quality() ?? null
}

/**
 * The black hole behind everything: a fixed full-screen canvas over a still
 * poster. The poster paints with the HTML (and stays if WebGL2 is missing);
 * the renderer loads after the page is idle and fades in over it.
 */
export function Scene() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = canvas.current
    const box = wrap.current
    if (!el || !box) return
    let cancelled = false
    let hole: BlackHole | null = null
    let unsubscribe = () => {}
    const pointer = { x: 0, y: 0, sx: 0, sy: 0 }
    let warpPhase = 0
    let shown = 1

    const onPointer = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1
    }

    const boot = async () => {
      const { createBlackHole } = await import('../webgl/blackhole')
      if (cancelled) return
      const phone = window.matchMedia('(pointer: coarse)').matches
      hole = createBlackHole(el, { phone, still: reduced })
      if (!hole) return
      active = hole
      setReady(true)
      if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true })

      unsubscribe = mission.subscribe(({ t, time, dt }) => {
        const opacity = sceneOpacity(t)
        if (opacity !== shown) {
          shown = opacity
          box.style.opacity = String(opacity)
        }
        if (opacity <= 0.001) return
        const narrow = window.innerWidth / window.innerHeight < 0.9
        // The pointer swings the camera a little around the hole.
        const k = 1 - Math.exp(-dt * 2.5)
        pointer.sx += (pointer.x - pointer.sx) * k
        pointer.sy += (pointer.y - pointer.sy) * k
        const v = view(t, narrow, reduced ? 0 : time * 0.025, warpPhase)
        warpPhase += dt * v.warp * 0.55
        hole!.draw(
          {
            ...v,
            phi: v.phi + pointer.sx * 0.35,
            theta: Math.min(Math.max(v.theta + pointer.sy * 0.09, 0.9), 1.62),
          },
          reduced ? 40 : time + 30,
          dt,
        )
      })
      mission.poke()
    }

    // Wait for the page to finish loading and go idle: the shader compile
    // should never compete with the first paint.
    const start = () => {
      const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 200))
      idle(() => void boot(), { timeout: 1500 })
    }
    if (document.readyState === 'complete') start()
    else window.addEventListener('load', start, { once: true })

    return () => {
      cancelled = true
      unsubscribe()
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('load', start)
      hole?.destroy()
      if (active === hole) active = null
    }
  }, [reduced])

  return (
    <div
      ref={wrap}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 bg-[#020205]"
    >
      <div className="poster absolute inset-0" />
      <canvas
        ref={canvas}
        className={`absolute inset-0 size-full transition-opacity duration-[1400ms] ${ready ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}
