export const PORTLESS_PORT = 1355

export const FALLBACK_PORTS = {
  api: 3001,
  web: 5173,
} as const

export type AppName = keyof typeof FALLBACK_PORTS
