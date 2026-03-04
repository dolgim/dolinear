import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'
import { resolve } from 'path'
import {
  resolveAppUrl,
  getPortlessSuffix,
  isPortlessDisabled,
} from '@dolinear/env'

config({ path: resolve(import.meta.dirname, '../.env') })
config({ path: resolve(import.meta.dirname, '../apps/api/.env') })

const suffix = getPortlessSuffix()
const disabled = isPortlessDisabled()
const webURL = resolveAppUrl('web', { suffix, portlessDisabled: disabled })
const apiURL = resolveAppUrl('api', { suffix, portlessDisabled: disabled })

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'html' : 'list',

  use: {
    baseURL: webURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'setup',
      testDir: './fixtures',
      testMatch: /auth\.setup\.ts/,
      teardown: 'teardown',
    },
    {
      name: 'teardown',
      testDir: './fixtures',
      testMatch: /global\.teardown\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: [
    {
      command: 'pnpm --filter api dev',
      url: `${apiURL}/health`,
      reuseExistingServer: !process.env.CI,
      cwd: resolve(import.meta.dirname, '..'),
      timeout: 30_000,
    },
    {
      command: 'pnpm --filter web dev',
      url: webURL,
      reuseExistingServer: !process.env.CI,
      cwd: resolve(import.meta.dirname, '..'),
      timeout: 30_000,
    },
  ],
})
