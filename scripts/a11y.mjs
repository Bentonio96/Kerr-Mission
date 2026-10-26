/**
 * axe-core over every build of the page: motion and reduced motion, Spanish
 * and English, desktop and phone, the horizon crossing and the light chapter.
 * Fails (exit 1) on any violation.
 *
 * Usage: npm run build && npx vite preview --port 4173, then
 *        node scripts/a11y.mjs [http://localhost:4173]
 * Uses the installed Google Chrome (channel "chrome").
 */
import AxeBuilder from '@axe-core/playwright'
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://localhost:4173'

const RUNS = [
  {
    name: 'desktop · es',
    query: '',
    lang: 'es',
    viewport: { width: 1440, height: 900 },
  },
  {
    name: 'desktop · en',
    query: '',
    lang: 'en',
    viewport: { width: 1440, height: 900 },
  },
  {
    name: 'phone · es',
    query: '',
    lang: 'es',
    viewport: { width: 390, height: 844 },
  },
  {
    name: 'desktop · es · horizon crossing',
    query: '',
    lang: 'es',
    viewport: { width: 1440, height: 900 },
    scroll: '#horizonte', offset: 0.5,
  },
  {
    name: 'phone · en · light chapter',
    query: '',
    lang: 'en',
    viewport: { width: 390, height: 844 },
    scroll: '#mas-alla', offset: 0.1,
  },
  {
    name: 'reduced · es',
    query: '?reduced=1',
    lang: 'es',
    viewport: { width: 1440, height: 900 },
  },
  {
    name: 'reduced phone · en',
    query: '?reduced=1',
    lang: 'en',
    viewport: { width: 390, height: 844 },
  },
]

const browser = await chromium.launch({ channel: 'chrome' })
let failed = 0

for (const run of RUNS) {
  const context = await browser.newContext({
    viewport: run.viewport,
    locale: run.lang === 'en' ? 'en-GB' : 'es-CL',
  })
  await context.addInitScript((l) => {
    localStorage.setItem('kerr:lang', l)
  }, run.lang)
  const page = await context.newPage()
  await page.goto(`${BASE}/${run.query}`, { waitUntil: 'networkidle' })
  // Let the scene load and the hero entrance finish.
  await page.waitForTimeout(3500)
  if (run.scroll) {
    await page.evaluate(([sel, offset]) => {
      const el = document.querySelector(sel)
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + el.offsetHeight * offset)
    }, [run.scroll, run.offset ?? 0])
    await page.waitForTimeout(2500)
  }
  const { violations } = await new AxeBuilder({ page })
    .withTags([
      'wcag2a',
      'wcag2aa',
      'wcag21a',
      'wcag21aa',
      'wcag22aa',
      'best-practice',
    ])
    .analyze()
  const lang = await page.evaluate(() => document.documentElement.lang)
  console.log(
    `${run.name}: ${violations.length} violations (html lang=${lang})`,
  )
  for (const v of violations) {
    failed++
    console.log(`  ${v.id} [${v.impact}] ${v.help}`)
    for (const node of v.nodes.slice(0, 4))
      console.log(`    ${node.target.join(' ')}`)
  }
  if (lang !== run.lang) {
    failed++
    console.log(`  html lang should be ${run.lang}`)
  }
  await context.close()
}

await browser.close()
process.exit(failed ? 1 : 0)
