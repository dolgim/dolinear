export const TEST_USER = {
  name: 'E2E Test User',
  email: 'e2e-test@dolinear.local',
  password: 'e2eTestPass123',
}

const suffix = process.env.PORTLESS_SUFFIX
const webName = suffix ? `web-${suffix}` : 'web'
export const BASE_URL = `http://${webName}.localhost:1355`
