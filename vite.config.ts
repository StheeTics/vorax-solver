/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'

/** The commit the site is built from, shown in Solver reports. */
const build = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
})()

/** version.json beside the pages: open pages compare it with their own build to offer a refresh (src/ui/updateToast.ts). */
const versionFile = { name: 'version-file', generateBundle(this: { emitFile: (f: { type: 'asset'; fileName: string; source: string }) => void }) { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build }) }) } }

export default defineConfig({
  base: '/tli-vorax-simulator/',
  plugins: [react(), versionFile],
  define: { __BUILD__: JSON.stringify(build) },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        simulator: fileURLToPath(new URL('./simulator.html', import.meta.url)),
        solver: fileURLToPath(new URL('./solver.html', import.meta.url)),
        guide: fileURLToPath(new URL('./optimal-play.html', import.meta.url)),
      },
    },
  },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'jsdom', globals: true, setupFiles: ['tests/setup.ts'], exclude: [...configDefaults.exclude, 'tests/e2e/**'] },
})
