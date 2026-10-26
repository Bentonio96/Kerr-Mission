/**
 * Nothing gets cut off, as a script: at every width, walk the mission
 * chapter by chapter (several stops inside each pinned one), screenshot it,
 * and flag anything that is clipped or hidden.
 *
 * Flags:
 *  - horizontal page scroll (document wider than the viewport);
 *  - text whose glyph box sticks out of an ancestor that clips
 *    (overflow hidden/clip), or sits under a clip-path;
 *  - text past the left or right edge of the viewport, or out of its card;
 *  - text above the top of the viewport while its chapter is pinned
 *    (a panel taller than the screen);
 *  - text under the fixed header or the HUD while its panel is pinned
 *    (or at the very end of the page, where nothing can scroll on).
 *
 * Side cards of the crew carousel are aria-hidden and leave the screen by
 * design; the front card is checked like any other text.
 *
 * Usage: npm run dev, then node scripts/clip-check.mjs [url] [out-dir] [query]
 * Uses the installed Google Chrome.
 */
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const OUT = process.argv[3] ?? 'docs/.clip'
const QUERY = process.argv[4] ?? ''

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1280, height: 720 },
  { name: 'tablet-h', width: 1024, height: 768 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'phone', width: 375, height: 667, mobile: true },
  { name: 'phone-s', width: 360, height: 640, mobile: true },
]

const CHAPTERS = [
  'lanzamiento',
  'tripulacion',
  'salto',
  'aproximacion',
  'ergosfera',
  'horizonte',
  'mas-alla',
]
// Where to stop inside each chapter, as a fraction of its height.
const STOPS = [0, 0.3, 0.55]

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-angle=metal', '--ignore-gpu-blocklist'],
})
await mkdir(OUT, { recursive: true })
let problems = 0

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    isMobile: vp.mobile ?? false,
    hasTouch: vp.mobile ?? false,
  })
  const page = await context.newPage()
  await page.goto(`${BASE}/${QUERY}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const found = new Set()

  for (const id of CHAPTERS) {
    for (const stop of STOPS) {
      const pinned = await page.evaluate(
        ([target, at]) => {
          const el = document.getElementById(target)
          if (!el) return false
          const y =
            el.getBoundingClientRect().top + window.scrollY + el.offsetHeight * at
          const lenis = window.__lenis
          if (lenis) lenis.scrollTo(y, { immediate: true })
          else window.scrollTo(0, y)
          return true
        },
        [id, stop],
      )
      if (!pinned) continue
      await page.waitForTimeout(1500)
      await page.screenshot({
        path: `${OUT}/${vp.name}-${id}-${stop}.jpg`,
        type: 'jpeg',
        quality: 65,
      })

      const issues = await page.evaluate(
        ([target]) => {
          const out = []
          // Pinned: the chapter's sticky panel is stuck to the top right now.
          const sticky = document.querySelector(`#${target} > .sticky`)
          const isPinned = Boolean(sticky && Math.abs(sticky.getBoundingClientRect().top) < 2)
          const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
          const de = document.documentElement
          if (de.scrollWidth > window.innerWidth + 1)
            out.push(`page scrolls sideways: ${de.scrollWidth} > ${window.innerWidth}`)

          const skip = (el) =>
            el.closest('[aria-hidden="true"], .sr-only, [inert], dialog:not([open])')
          const describe = (el) =>
            `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${(el.textContent ?? '').trim().slice(0, 40)}"`
          const visible = (el) => {
            for (let a = el; a; a = a.parentElement) {
              const st = getComputedStyle(a)
              if (st.visibility === 'hidden' || Number(st.opacity) < 0.05) return false
            }
            return true
          }
          const header = document.querySelector('header')?.getBoundingClientRect()
          const hudEl = document.querySelector('aside.hud')
          const hud = hudEl && visible(hudEl) ? hudEl.getBoundingClientRect() : null
          const section = document.getElementById(target)

          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
          const range = document.createRange()
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const el = node.parentElement
            if (!el || !node.textContent.trim() || skip(el) || !visible(el)) continue
            range.selectNodeContents(node)
            const r = range.getBoundingClientRect()
            if (!r.width || !r.height) continue
            if (r.bottom < 0 || r.top > window.innerHeight) continue
            const fixed = el.closest('header, aside.hud, nav')
            for (let a = el; a && a !== document.body; a = a.parentElement) {
              const st = getComputedStyle(a)
              const box = a.getBoundingClientRect()
              if (/(hidden|clip)/.test(st.overflowX) && (r.left < box.left - 1 || r.right > box.right + 1))
                out.push(`clipped horizontally by ${describe(a)}: ${describe(el)}`)
              if (/(hidden|clip)/.test(st.overflowY) && (r.top < box.top - 1 || r.bottom > box.bottom + 1))
                out.push(`clipped vertically by ${describe(a)}: ${describe(el)}`)
              if (st.clipPath && st.clipPath !== 'none')
                out.push(`clip-path on ${describe(a)} over ${describe(el)}`)
            }
            const card = el.closest('.vidrio, .rounded-xl, .rounded-2xl')
            if (card) {
              const c = card.getBoundingClientRect()
              if (r.left < c.left - 1 || r.right > c.right + 1)
                out.push(`spills out of its card: ${describe(el)}`)
            }
            if (r.right > window.innerWidth + 1 || r.left < -1)
              out.push(`past the edge: ${describe(el)} [${Math.round(r.left)}, ${Math.round(r.right)}]`)
            if (fixed) continue
            const inSection = section?.contains(el)
            if (isPinned && inSection && r.top < -1)
              out.push(`above the screen in a pinned panel: ${describe(el)}`)
            const overlaps = (b) =>
              b && r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top
            if (isPinned && inSection && overlaps(header))
              out.push(`under the header: ${describe(el)}`)
            // Flowing text passes under the fixed HUD as you scroll, like
            // under any fixed bar; it is a problem where it cannot move on.
            if ((isPinned || atEnd) && overlaps(hud)) out.push(`under the HUD: ${describe(el)}`)
          }
          return out
        },
        [id],
      )
      for (const issue of issues) found.add(`${id}@${stop}: ${issue}`)
    }
  }

  console.log(`${vp.name} (${vp.width}×${vp.height}): ${found.size} problems`)
  for (const f of found) console.log(`  ${f}`)
  problems += found.size
  await context.close()
}

await browser.close()
process.exit(problems ? 1 : 0)
