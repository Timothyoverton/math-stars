import os from 'node:os'
import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

// Browsers live outside the repo and outside /tmp (which gets wiped) — same as
// the speed-racer repo.
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(os.homedir(), '.cache/ms-playwright')
// Headed on Tim's real X display, matching the house style. Set PW_HEADLESS=1
// to run without a display.
process.env.DISPLAY ||= ':0'
const headless = process.env.PW_HEADLESS === '1'

// The match spec needs the relay. `partykit dev` gets SIGTERM'd under some
// sandboxes (see the brief), so it is NOT started here — run the match spec
// with the relay reachable one of two ways:
//   • deployed:  PARTYKIT_HOST=math-stars.<user>.partykit.dev npm run test:e2e
//   • local:     npm run party:dev   (in another terminal), then npm run test:e2e
// When PARTYKIT_HOST is set it is handed to the dev server as VITE_PARTYKIT_HOST.
const relayHost = process.env.PARTYKIT_HOST || ''

export default defineConfig({
  testDir: 'tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  timeout: 120_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: 'http://localhost:5173',
    headless,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 480, height: 900 },
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], headless } }],

  webServer: {
    command: relayHost ? `VITE_PARTYKIT_HOST=${relayHost} npm run dev` : 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
