import { test as base } from '@playwright/test'
import { cleanDatabase } from '../helpers/db.helper.js'
import { ApiHelper } from '../helpers/api.helper.js'
import { BASE_URL } from '../helpers/constants.js'

type Fixtures = {
  cleanDb: void
  api: ApiHelper
}

export const test = base.extend<Fixtures>({
  cleanDb: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      await cleanDatabase()
      await use()
    },
    { auto: true },
  ],

  api: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: BASE_URL,
      storageState: '.auth/user.json',
    })
    const api = new ApiHelper(context)
    await use(api)
    await context.dispose()
  },
})

export { expect } from '@playwright/test'
