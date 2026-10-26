import { useEffect } from 'react'
import { SoundProvider } from './audio/useSound'
import {
  Approach,
  Beyond,
  Crew,
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
import { CHAPTERS } from './mission/timeline'

/**
 * Starts the mission clock, and turns the whole page to paper once the ship
 * is through the horizon (the last chapter is the light one).
 */
function useMission() {
  const reduced = useReducedMotion()
  useEffect(() => {
    mission.start(reduced)
    const html = document.documentElement
    const off = mission.onChapter((chapter) => {
      if (chapter === CHAPTERS.length - 1) html.dataset.escena = 'luz'
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
        <Crew />
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
