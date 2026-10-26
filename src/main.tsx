import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import '@fontsource-variable/anybody/wdth.css'
import '@fontsource-variable/hanken-grotesk/wght.css'
import '@fontsource-variable/martian-mono/wdth.css'
import './index.css'
import App from './App.tsx'

const tree = (
  <StrictMode>
    <App />
  </StrictMode>
)

const root = document.getElementById('root')!

// Production HTML arrives prerendered (scripts/prerender.mjs), so the title
// paints before any JS runs; hydrate it. In dev the root is empty.
if (root.hasChildNodes()) hydrateRoot(root, tree)
else createRoot(root).render(tree)
