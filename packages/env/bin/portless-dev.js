#!/usr/bin/env node

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

// --- .env loading ---

function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
      // Don't override existing env vars
      if (!(key in process.env)) {
        process.env[key] = value
      }
    }
  } catch {
    // .env file not found — that's fine
  }
}

function findProjectRoot(startDir) {
  let dir = startDir
  while (dir !== dirname(dir)) {
    try {
      readFileSync(resolve(dir, 'pnpm-workspace.yaml'), 'utf-8')
      return dir
    } catch {
      dir = dirname(dir)
    }
  }
  return startDir
}

// Load CWD .env first (higher priority), then root .env
const cwd = process.cwd()
const root = findProjectRoot(cwd)
loadEnvFile(resolve(cwd, '.env'))
if (cwd !== root) {
  loadEnvFile(resolve(root, '.env'))
}

// --- Argument parsing ---

const args = process.argv.slice(2)
if (args.length < 2) {
  console.error('Usage: portless-dev <app-name> <command...>')
  console.error('Example: portless-dev api node --watch src/index.ts')
  process.exit(1)
}

const appName = args[0]
const command = args.slice(1)

// --- Build portless name with suffix ---

const suffix = process.env.PORTLESS_SUFFIX
const portlessName = suffix ? `${appName}-${suffix}` : appName

// --- PORTLESS=0 fallback: run command directly ---

if (process.env.PORTLESS === '0') {
  const child = spawn(command[0], command.slice(1), {
    stdio: 'inherit',
    env: process.env,
  })
  process.on('SIGINT', () => child.kill('SIGINT'))
  process.on('SIGTERM', () => child.kill('SIGTERM'))
  child.on('exit', (code) => process.exit(code ?? 1))
  child.on('error', (err) => {
    console.error(`Failed to start: ${err.message}`)
    process.exit(1)
  })
} else {
  // --- Resolve portless binary from this package's node_modules ---

  const selfDir = dirname(fileURLToPath(import.meta.url))
  const portlessBin = resolve(selfDir, '../node_modules/.bin/portless')
  try {
    readFileSync(portlessBin)
  } catch {
    console.error(
      'Error: portless is not installed. Add @dolinear/env as a devDependency.',
    )
    process.exit(1)
  }

  const child = spawn(portlessBin, [portlessName, ...command], {
    stdio: 'inherit',
    env: process.env,
  })
  process.on('SIGINT', () => child.kill('SIGINT'))
  process.on('SIGTERM', () => child.kill('SIGTERM'))
  child.on('exit', (code) => process.exit(code ?? 1))
  child.on('error', (err) => {
    console.error(`Failed to start portless: ${err.message}`)
    process.exit(1)
  })
}
