/**
 * Regenerates the screenshots in docs/, the Open Graph image and the poster
 * (the still the canvas fades in over, and the fallback without WebGL2).
 *
 * The poster is the canvas itself, read back from the reduced-motion build,
 * which renders each chapter once at full quality (320 march steps, full
 * resolution) and keeps the drawing buffer.
 *
 * Needs the dev server (npm run dev). Uses the installed Google Chrome.
 * Usage: node scripts/capture.mjs [http://localhost:5173]
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const DESKTOP = { width: 1440, height: 900 }
const PHONE = { width: 390, height: 844 }

const SHOTS = [
  { file: '01-lanzamiento.jpg', viewport: DESKTOP, section: 'lanzamiento' },
  { file: '02-tripulacion.jpg', viewport: DESKTOP, section: 'tripulacion', offset: 0.12 },
  { file: '03-salto.jpg', viewport: DESKTOP, section: 'salto', offset: 0.25 },
  { file: '04-aproximacion.jpg', viewport: DESKTOP, section: 'aproximacion', offset: 0.3 },
  { file: '05-ergosfera.jpg', viewport: DESKTOP, section: 'ergosfera', offset: 0.3 },
  { file: '06-horizonte.jpg', viewport: DESKTOP, section: 'horizonte', offset: 0.42 },
  { file: '07-mas-alla.jpg', viewport: DESKTOP, section: 'mas-alla', offset: 0.05 },
  { file: '08-movimiento-reducido.jpg', viewport: DESKTOP, section: 'tripulacion', offset: 0.1, query: '?reduced=1' },
  { file: '09-movil.jpg', viewport: PHONE, section: 'lanzamiento', scale: 2, mobile: true },
  { file: '10-movil-salto.jpg', viewport: PHONE, section: 'salto', offset: 0.25, scale: 2, mobile: true },
  { file: '11-english.jpg', viewport: DESKTOP, section: 'ergosfera', offset: 0.3, lang: 'en' },
]

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-angle=metal', '--ignore-gpu-blocklist'],
})
await mkdir('docs', { recursive: true })

async function open({ viewport, query = '', lang = 'es', scale = 1, mobile = false }) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: scale,
    isMobile: mobile,
    hasTouch: mobile,
    locale: lang === 'en' ? 'en-GB' : 'es-CL',
  })
  await context.addInitScript((l) => localStorage.setItem('kerr:lang', l), lang)
  const page = await context.newPage()
  await page.goto(`${BASE}/${query}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  return { context, page }
}

async function scrollTo(page, section, offset = 0) {
  await page.evaluate(
    ([id, at]) => {
      const el = document.getElementById(id)
      const y = el.getBoundingClientRect().top + window.scrollY + el.offsetHeight * at
      const lenis = window.__lenis
      if (lenis) lenis.scrollTo(y, { immediate: true })
      else window.scrollTo(0, y)
    },
    [section, offset],
  )
  await page.waitForTimeout(2600)
}

for (const shot of SHOTS) {
  const { context, page } = await open(shot)
  await scrollTo(page, shot.section, shot.offset)
  await page.screenshot({ path: `docs/${shot.file}`, type: 'jpeg', quality: 82 })
  console.log(`docs/${shot.file}`)
  if (shot.file.startsWith('01-')) {
    await page.screenshot({
      path: 'public/og.jpg',
      type: 'jpeg',
      quality: 82,
      clip: { x: 0, y: 0, width: 1440, height: 756 },
    })
    console.log('public/og.jpg')
  }
  await context.close()
}

// The poster: one full-quality frame of the opening shot, canvas only.
{
  const { context, page } = await open({
    viewport: { width: 1600, height: 1000 },
    query: '?reduced=1',
  })
  await page.waitForTimeout(2000)
  const data = await page.evaluate(() =>
    document.querySelector('canvas').toDataURL('image/webp', 0.78),
  )
  await writeFile('public/poster.webp', Buffer.from(data.split(',')[1], 'base64'))
  console.log('public/poster.webp')
  await context.close()
}

await browser.close()
