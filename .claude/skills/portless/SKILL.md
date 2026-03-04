---
name: portless
description: Portless dev proxy reference — URL construction, daily commands, worktree isolation, parallel E2E, fallback to fixed ports, integration map, and troubleshooting. Use this skill whenever the user mentions portless, .localhost:1355 URLs, PORTLESS_SUFFIX, port conflicts, dev server setup in worktrees, CORS errors with portless origins, portless list/proxy commands, PORTLESS=0 fallback, or parallel dev/E2E environments. Also use when debugging 502 proxy errors or asking which files are wired into portless.
---

> This document MUST be written and maintained in English.

# Portless Reference

[Portless](https://port1355.dev/) replaces fixed port numbers with stable named `.localhost` URLs via a reverse proxy on port 1355. Installed as a devDependency of `@dolinear/env` (not globally).

## Quick Reference

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start API + Web servers (portless auto-starts proxy) |
| `pnpm exec portless list` | Show active routes and assigned ports |
| `pnpm exec portless proxy start` | Start proxy daemon manually |
| `pnpm exec portless proxy stop` | Stop proxy daemon |
| `pnpm exec portless proxy start --foreground` | Debug mode (logs to stdout) |
| `PORTLESS=0 pnpm dev` | Bypass portless, use fixed ports (API :3001, Web :5173) |

## URL Construction

**Pattern**: `http://<app>[-<suffix>].localhost:1355`

`PORTLESS_SUFFIX` is derived from the git branch name by `scripts/setup-db.sh`:
1. Extract the part after the last `/` (e.g., `feature/auth-flow` -> `auth-flow`)
2. Lowercase, replace non-alphanumeric with hyphens, deduplicate/trim hyphens
3. `main` branch gets empty suffix (no suffix appended)

| Branch | API URL | Web URL |
|--------|---------|---------|
| `main` | `http://api.localhost:1355` | `http://web.localhost:1355` |
| `feature/foo` | `http://api-foo.localhost:1355` | `http://web-foo.localhost:1355` |
| `fix/bar-baz` | `http://api-bar-baz.localhost:1355` | `http://web-bar-baz.localhost:1355` |

Internally, portless assigns a random ephemeral port (4000-4999) via the `PORT` env var and proxies traffic from the named URL to that port.

## Integration Map

Files where portless is wired into the project:

| File | Role |
|------|------|
| `packages/env/` | `@dolinear/env` — portless dependency, URL helpers, `portless-dev` CLI wrapper |
| `scripts/setup-db.sh` | Derives `PORTLESS_SUFFIX` from branch name, writes to root `.env` and `apps/api/.env` |
| `apps/api/package.json` | Dev script: `portless-dev api node --watch` |
| `apps/web/package.json` | Dev script: `portless-dev web vite` |
| `apps/web/vite.config.ts` | Uses `resolveAppUrl()` from `@dolinear/env` for dynamic proxy target |
| `apps/api/src/index.ts` | Dynamic CORS: accepts any origin ending with `.localhost:1355` |
| `apps/api/src/auth.ts` | Dynamic `trustedOrigins`: accepts `.localhost:1355` origins |
| `e2e/playwright.config.ts` | Uses `resolveAppUrl()` for dynamic `baseURL` and `webServer` URLs |
| `e2e/helpers/constants.ts` | Uses `resolveAppUrl()` for dynamic `BASE_URL` |

### CORS & Auth

The API accepts portless origins dynamically instead of hardcoding URLs:

- **CORS** (`apps/api/src/index.ts`): `origin.endsWith('.localhost:1355')` — any portless subdomain is accepted
- **Better Auth** (`apps/api/src/auth.ts`): same `.localhost:1355` suffix check in `trustedOrigins`
- **Fallback**: `http://localhost:5173` is always accepted (for non-portless mode)

When adding new origin checks elsewhere, follow this same pattern to maintain portless compatibility.

### Vite Proxy

The web app's Vite dev server proxies `/api` requests to the API. The target is chosen dynamically (`apps/web/vite.config.ts`):

- `PORTLESS=0` -> `http://localhost:3001` (fixed port)
- Otherwise -> `http://api[-suffix].localhost:1355` (portless URL)

The proxy uses `changeOrigin: true` to rewrite the Host header, which prevents routing loops when portless receives the forwarded request.

## Worktree Isolation

Each worktree gets unique portless app names automatically:

1. `pnpm db:setup` derives `PORTLESS_SUFFIX` from the branch name
2. The suffix is written to root `.env` and `apps/api/.env`
3. `portless-dev` CLI reads root `.env` and registers unique names with portless (e.g., `api-foo`, `web-foo`)
4. Multiple worktrees run dev servers simultaneously without port conflicts

Note: `PORTLESS_SUFFIX` uses hyphens (hostname-safe), while `DB_SUFFIX` uses underscores (SQL-safe). Both are derived from the same branch name.

## Parallel E2E Execution

Each worktree's E2E tests use its own portless URLs, enabling parallel test runs:

1. `e2e/playwright.config.ts` reads `PORTLESS_SUFFIX` from `apps/api/.env`
2. `webServer` entries start servers with unique portless names
3. `baseURL` points to the worktree-specific web URL

```bash
pnpm db:setup                   # generates PORTLESS_SUFFIX
pnpm --filter api db:push       # push schema
pnpm --filter e2e test          # servers auto-start with unique portless names
```

## Fallback (Fixed Ports)

Bypass portless entirely by setting `PORTLESS=0`:

```bash
PORTLESS=0 pnpm dev
```

This makes:
- API listen on `PORT=3001` (default)
- Vite proxy target `http://localhost:3001` instead of portless URL
- Web serve on Vite's default port

Use this when: portless is not installed, the proxy has issues, or running in CI without portless.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `portless-dev: command not found` | Add `@dolinear/env: workspace:*` to devDependencies and run `pnpm install` |
| Proxy not starting | `pnpm exec portless proxy start` (or `--foreground` to see logs) |
| Stale routes / port conflicts | `pnpm exec portless list` to inspect, then `pnpm exec portless proxy stop && pnpm exec portless proxy start` |
| CORS errors | Verify both servers registered (`pnpm exec portless list`); check `*.localhost:1355` pattern in `index.ts` and `auth.ts` |
| Need HTTPS | `pnpm exec portless proxy start --https`, then `sudo pnpm exec portless trust` once to add CA |
| State directory | `~/.portless/` (auto-created) |

## Notes

- portless is installed as a devDependency of `@dolinear/env`, not globally
- The `portless-dev` CLI wrapper handles `.env` loading, suffix injection, and `PORTLESS=0` fallback
- The proxy auto-starts on the first `portless <name> <cmd>` — manual `portless proxy start` is rarely needed
- `main` branch uses no suffix: `api.localhost:1355`, `web.localhost:1355`
- URL construction helpers (`resolveAppUrl`, `getPortlessSuffix`, etc.) are in `@dolinear/env` — use them instead of inline URL construction
