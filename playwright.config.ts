import { defineConfig, devices } from '@playwright/test'

// E2E_URL lets the suite run against an already-deployed site instead of a local build.
const URL = process.env.E2E_URL ?? 'http://127.0.0.1:4173/tli-vorax-simulator/'
// All projects run in Chromium (iPhone sizes emulated) so only one browser download is needed.
const phone = (name: string) => ({ ...devices[name], browserName: 'chromium' as const, defaultBrowserType: 'chromium' as const })

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: URL },
  webServer: process.env.E2E_URL ? undefined : {
    command: 'npm run build && npx vite preview --port 4173 --strictPort --host 127.0.0.1',
    url: URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'iPhone 13 portrait', use: phone('iPhone 13') },
    { name: 'iPhone 13 landscape', use: phone('iPhone 13 landscape') },
    { name: 'Pixel 7 portrait', use: phone('Pixel 7') },
    { name: 'Pixel 7 landscape', use: phone('Pixel 7 landscape') },
    { name: 'Desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1326, height: 837 } } },
  ],
})
