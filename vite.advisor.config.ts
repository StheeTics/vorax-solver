// Builds src/strategy/advisor.ts into one self-contained script for the OCR helper's embedded V8.
// Exposes a global `VoraxAdvisor` with advise() and names().
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    outDir: 'dist-advisor',
    emptyOutDir: true,
    target: 'es2020',
    lib: { entry: fileURLToPath(new URL('./src/strategy/advisor.ts', import.meta.url)), name: 'VoraxAdvisor', formats: ['iife'], fileName: () => 'advisor.js' },
  },
})
