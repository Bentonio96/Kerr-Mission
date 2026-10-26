import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // GSAP and Lenis load after the first paint; keep them in their own
        // chunk so the entry stays small.
        manualChunks(id) {
          if (id.includes('gsap') || id.includes('lenis')) return 'motion'
          return undefined
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
