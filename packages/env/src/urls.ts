import type { AppName } from './constants.ts'
import { FALLBACK_PORTS, PORTLESS_PORT } from './constants.ts'

export function getPortlessName(app: AppName, suffix?: string): string {
  return suffix ? `${app}-${suffix}` : app
}

export function getPortlessUrl(app: AppName, suffix?: string): string {
  const name = getPortlessName(app, suffix)
  return `http://${name}.localhost:${PORTLESS_PORT}`
}

export function getFallbackUrl(app: AppName): string {
  return `http://localhost:${FALLBACK_PORTS[app]}`
}

export function resolveAppUrl(
  app: AppName,
  opts?: { suffix?: string; portlessDisabled?: boolean },
): string {
  if (opts?.portlessDisabled) {
    return getFallbackUrl(app)
  }
  return getPortlessUrl(app, opts?.suffix)
}

export function getPortlessSuffix(): string | undefined {
  return process.env.PORTLESS_SUFFIX || undefined
}

export function isPortlessDisabled(): boolean {
  return process.env.PORTLESS === '0'
}
