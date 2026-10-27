import { useEffect } from 'react'
import { SoundProvider } from './audio/useSound'
import {
  Approach,
  Beyond,
  Clock,
  Ergosphere,
  Horizon,
  Launch,
  Warp,
} from './components/Chapters'
import { Cursor } from './components/Cursor'
import { ChapterRail, Header } from './components/Header'
import { Hud } from './components/Hud'
import { Scene } from './components/Scene'
import { SmoothScroll } from './components/SmoothScroll'
import { useReducedMotion } from './hooks/useMediaQuery'
import { LanguageProvider } from './i18n/LanguageProvider'
import { mission } from './mission/engine'
import { LIGHT_T } from './mission/timeline'

/**
 * Starts the mission clock, and turns the whole page to paper the moment
 * the ship is through the horizon (LIGHT_T, in the white of the flash).
 */
function useMission() {
  const reduced = useReducedMotion()
  useEffect(() => {
    mission.start(reduced)
    const html = document.documentElement
    let light = false
    const off = mission.subscribe(({ t }) => {
      const next = t >= LIGHT_T
      if (next === light) return
      light = next
      if (next) html.dataset.escena = 'luz'
      else delete html.dataset.escena
    })
    return () => {
      off()
      mission.stop()
      delete html.dataset.escena
    }
  }, [reduced])
}

function Page() {
  useMission()
  return (
    <>
      <Scene />
      <Header />
      <ChapterRail />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <Launch />
        <Clock />
        <Warp />
        <Approach />
        <Ergosphere />
        <Horizon />
        <Beyond />
      </main>
      <Hud />
      <Cursor />
    </>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <SoundProvider>
        <SmoothScroll>
          <Page />
        </SmoothScroll>
      </SoundProvider>
    </LanguageProvider>
  )
}
