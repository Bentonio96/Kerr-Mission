/**
 * Static prerender: renders the app once at build time and injects the HTML
 * into dist/index.html, so the hero (the LCP element) paints with the CSS,
 * without waiting for React. Runs after the client and SSR builds.
 */
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { render } = await import(
  new URL('../dist-server/entry-server.js', import.meta.url).href
)

const file = join(root, 'dist', 'index.html')
const template = readFileSync(file, 'utf8')
const marker = '<div id="root"></div>'
if (!template.includes(marker))
  throw new Error(`No ${marker} in dist/index.html`)

const html = render()
writeFileSync(file, template.replace(marker, `<div id="root">${html}</div>`))
rmSync(join(root, 'dist-server'), { recursive: true, force: true })
console.log(`prerendered ${(html.length / 1024).toFixed(1)} KB of HTML`)
