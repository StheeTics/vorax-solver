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

export default defineConfig({
  base: '/tli-vorax-simulator/',
  plugins: [react()],
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
