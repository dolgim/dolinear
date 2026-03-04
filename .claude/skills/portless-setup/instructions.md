# Portless Setup Guide

## Overview

This project uses [portless](https://port1355.dev/) to replace fixed port numbers with stable, named `.localhost` URLs. Each dev server registers with the portless proxy (port 1355) and is accessible via `http://<name>.localhost:1355`.

**Prerequisite**: Install portless globally: `npm install -g portless`

## How It Works

1. `pnpm db:setup` computes a `PORTLESS_SUFFIX` from the git branch name and writes it to `.env` files
2. Dev scripts (`pnpm dev`) read `PORTLESS_SUFFIX` and start portless with the appropriate app name
3. The portless proxy routes requests based on the subdomain

### URL Patterns

| Branch | API URL | Web URL |
|--------|---------|---------|
| `main` | `http://api.localhost:1355` | `http://web.localhost:1355` |
| `feature/foo` | `http://api-foo.localhost:1355` | `http://web-foo.localhost:1355` |
| `fix/bar-baz` | `http://api-bar-baz.localhost:1355` | `http://web-bar-baz.localhost:1355` |

## Worktree-Specific Setup

Each worktree gets its own `PORTLESS_SUFFIX` automatically:
1. `pnpm db:setup` derives the suffix from the branch name (e.g., `feature/foo` → `foo`)
2. The suffix is written to `apps/api/.env` and `apps/web/.env`
3. Dev scripts use this suffix for unique portless app names

This enables parallel dev servers across worktrees without port conflicts.

## Troubleshooting

### portless command not found
Install globally: `npm install -g portless`

### Proxy not starting
Start manually: `portless proxy start`

### Port conflicts
Check active routes: `portless list`

### Falling back to fixed ports
Set `PORTLESS=0` before running: `PORTLESS=0 pnpm dev`

### CORS errors
The API server dynamically accepts any origin matching `*.localhost:1355`. If you see CORS errors, check that:
- The portless proxy is running
- Both API and Web servers are registered with portless

## Parallel E2E Execution

With portless, multiple E2E test suites can run simultaneously from different worktrees:

1. Each worktree has a unique `PORTLESS_SUFFIX`
2. `pnpm --filter e2e test` starts servers with unique portless names
3. No port conflicts between parallel test runs

To run E2E tests from a worktree:
```bash
pnpm db:setup                   # generates PORTLESS_SUFFIX
pnpm --filter api db:push       # push schema
pnpm --filter e2e test          # servers auto-start with unique names
```
