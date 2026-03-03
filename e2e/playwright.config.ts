import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../apps/api/.env') })

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'html' : 'list',

  use: {
    baseURL: 'http://localhost:5173',
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
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      cwd: resolve(import.meta.dirname, '..'),
      timeout: 30_000,
    },
    {
      command: 'pnpm --filter web dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      cwd: resolve(import.meta.dirname, '..'),
      timeout: 30_000,
    },
  ],
})
