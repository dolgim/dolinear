> 이 문서는 토큰 절약을 위해 영어로 작성되어 있습니다.
> This document MUST be written and maintained in English.

# dolinear - AI Agent Work Guide

## Project Context

**dolinear** is a Linear clone project.

- Frontend: React + Vite + TypeScript + TanStack Router + TanStack Query + Tailwind CSS v4
- Backend: Hono + TypeScript + Node.js
- Database: PostgreSQL 15 + Drizzle ORM
- Auth: Better Auth (Email/Password)
- Testing: Vitest + Testcontainers
- Infra: Docker Compose, pnpm + Turborepo monorepo
- Structure: `apps/web`, `apps/api`, `packages/shared`

## Development Environment

### Commands

```bash
# Run all services
pnpm dev                        # turbo dev (web + api simultaneously)
pnpm build                      # turbo build

# Database
pnpm db:up                      # docker compose up -d (start PostgreSQL)
pnpm db:down                    # docker compose down
pnpm db:setup                   # create branch-specific DB + update .env

# Drizzle ORM (inside apps/api)
pnpm --filter api db:push       # push schema to DB
pnpm --filter api db:generate   # generate migration
pnpm --filter api db:studio     # run Drizzle Studio

# Testing
pnpm --filter api test          # Vitest + Testcontainers (Docker required)

# Code quality
pnpm lint                       # ESLint
pnpm format                     # Prettier

# portless (dev proxy — installed via @dolinear/env)
pnpm exec portless list         # show active routes
pnpm exec portless proxy start/stop  # control proxy
PORTLESS=0 pnpm dev             # disable portless (fallback to fixed ports)
```

### Starting Work in a Worktree

On `git worktree add` or `git checkout`, the `post-checkout` hook automatically runs `db:setup` to create a branch-specific DB and generate `PORTLESS_SUFFIX` for port isolation. If Docker is not running, only a message is printed; in that case, run manually:

```bash
pnpm db:up          # start PostgreSQL
pnpm db:setup       # create branch-specific DB + update .env (incl. PORTLESS_SUFFIX)
pnpm --filter api db:push   # push schema
```

The `PORTLESS_SUFFIX` env var (derived from the branch name) ensures each worktree gets unique portless app names (e.g., `api-foo`, `web-foo` for branch `feature/foo`), enabling parallel dev servers without port conflicts.

portless is installed as a devDependency of `@dolinear/env` (not globally). The `portless-dev` CLI wrapper handles `.env` loading, suffix injection, and `PORTLESS=0` fallback.

## Workflow

### Git Branch & PR

Each feature is developed on a separate branch and merged to main via PR. Claude Code uses the `--worktree` option, so worktree management is handled automatically.

**Branch naming convention**:

- `feature/<name>`: new feature
- `fix/<name>`: bug fix
- `refactor/<name>`: refactoring
- `docs/<name>`: documentation update

**PR creation**:

```bash
gh pr create --title "title" --body "description"
```

PR body must include:

- Summary of changes
- Issue reference via `Closes #N`
- Test plan (checklist format)

**Each PR must have a single purpose.** Separate independent changes (e.g., bug fix and documentation update) into different PRs or different commits. Documentation updates can be committed directly to main, so do not mix them into fix/feature branch PRs.

### Issue Management

Managed with GitHub Issues + GitHub Projects.

**GitHub Project**:

- **Project name**: DOLinear
- **Number**: 4 (owner: dolgim)
- **Project ID**: `PVT_kwHOAPxGec4BP540`
- **URL**: https://github.com/users/dolgim/projects/4
- **Status field**: Todo → In Progress → Done

```bash
# List project items
gh project item-list 4 --owner dolgim

# Change issue Status (e.g., to In Progress)
gh project item-edit --project-id PVT_kwHOAPxGec4BP540 --id <ITEM_ID> --field-id PVTSSF_lAHOAPxGec4BP540zg-LXxA --single-select-option-id 47fc9ee4
```

**Status Option IDs**:

- Todo: `f75ad846`
- In Progress: `47fc9ee4`
- Done: `98236657`

**Issue operation rules**:

- When creating a new issue, always add it to the DOLinear project (Status: Todo):
  ```bash
  gh issue create --title "..." --body "..." | xargs -I {} gh project item-add 4 --owner dolgim --url {}
  ```
- Check the issue and follow its checklist when starting work
- Change project Status to **In Progress** when starting work
- Reference issue via `Closes #N` when creating a PR
- After PR merge, project Status changes to **Done** (issue auto-closed via `Closes #N`)
- Respect dependency order between issues
  - Refer to the `/github-operations` skill for details
  - Use `blockedBy`/`blocking` GraphQL fields for dependency queries. `trackedInIssues`/`trackedIssues` are legacy Tasklist features, unrelated to dependencies
  - Do not use for loops calling `gh api graphql` repeatedly for multiple issue dependencies. Use the GraphQL alias pattern with a single query

## Work Rules

### Coding Conventions

1. **Type definitions**: Centralize shared types in `packages/shared`
2. **Adding monorepo packages**:
   - Workspace root: `pnpm add -w <package>`
   - Specific package: `pnpm --filter <pkg> add <package>`
3. **Latest libraries**: Use the latest version when adding new dependencies
4. **AGENTS.md maintenance**: Update this file when new commands, patterns, or conventions emerge during issue work
5. **Package execution**: Use `pnpm exec` instead of `npx` (pnpm monorepo environment)
6. **DB schema management**: Use Drizzle schema (`apps/api/src/db/schema.ts`) as the single source of truth. Do not create tables via raw SQL in test setups (use `drizzle-kit push`)

### E2E Testing

E2E tests are written with Playwright in the `e2e/` directory.

#### Commands

```bash
pnpm --filter e2e test                    # Run all E2E tests (servers auto-start)
pnpm --filter e2e test:ui                 # Playwright UI mode
pnpm --filter e2e exec playwright test tests/auth/  # Run specific directory only
pnpm --filter e2e exec playwright install --with-deps chromium  # Install browsers
```

#### Adding E2E Tests for New Features

1. Follow existing test file patterns in `e2e/tests/`
2. Set up test data via the `api` fixture (API calls), not direct DB inserts
3. Add `data-testid` attributes to new UI components for stable selectors
4. Import `test` from `e2e/fixtures/base.fixture.ts`
5. For unauthenticated tests, use `test.use({ storageState: { cookies: [], origins: [] } })`
6. Include E2E test results in the PR test plan

#### Test Stability Rules

- Use Playwright built-in auto-waiting (`waitForURL`, `expect().toBeVisible()`, etc.)
- Hard-coded waits (`page.waitForTimeout()`) are forbidden
- Selector priority: `data-testid` > `getByRole` > `getByLabel` > `getByText`
- Each test must be independent (no dependency on other test results)

### DO

- **When no issue exists for the task, create one before starting work** unless the task is trivial (typo fix, minor config tweak). An issue naturally triggers the proper workflow: issue → branch → worktree → PR (`Closes #N`). Skipping issue creation leads to skipping the rest of the process
- Implement one issue at a time; verify it works before moving to the next
- Fulfill the issue's checklist and completion criteria
- Follow existing code patterns and conventions
- Include test results when creating a PR
- Ensure no lint or TypeScript type errors upon completion
- When requirements are unclear or ambiguous, **ask the user instead of guessing**
- Write E2E tests for new UI features (`e2e/tests/` directory)

### DON'T

- Do not commit directly to main (except documentation updates)
- Do not implement multiple issues at once
- Do not proceed to the next step without verifying behavior
- Do not instruct parallel agents to run `git checkout -b` in the main repo (use worktree isolation)

### Common Pitfalls

Lessons from past implementation mistakes. Review before starting work.

#### pnpm Monorepo Conventions

- **Always use pnpm**, never npm or npx. `packageManager` in root `package.json` is a project-wide mandate
- New packages belong in `pnpm-workspace.yaml`. A separate lockfile is always wrong — one lockfile per monorepo
- For root scripts that delegate to workspace packages, use `pnpm --filter <pkg> <script>` (e.g., `pnpm --filter api test`). Do not use `npx`, `cd && run`, or `pnpm exec` patterns
- Before writing new scripts or commands, check existing patterns in root `package.json` and follow them

#### Read Before You Write

- **Verify API response structure** before writing helpers — check route handlers for response wrappers (e.g., `{ data: ... }`)
- **Verify route parameters** — distinguish between UUID (`id`) and human-readable identifier (`identifier` like "ENG-1") by reading route definitions
- **Verify routing structure** — when similar routes exist (e.g., `/issue/` vs `/issues/`), check the router config to find actual functionality
- **Verify environment readiness** before running tests (DB running, schema pushed, servers available)

#### E2E Auth & Session

- `cleanDatabase()` in the auto fixture must **preserve auth tables** (`user`, `session`, `account`). Only truncate domain tables. Truncating auth tables invalidates the shared storageState
- API calls from `ApiHelper` must go through the **Vite proxy** (same origin as the browser, `localhost:5173`), not directly to the API server (`localhost:3001`). Cookies are scoped to the origin domain
- **Destructive auth actions** (logout, password change) must use their own disposable session (`test.use({ storageState: { cookies: [], origins: [] } })` + fresh signup), never the shared storageState

### Browser Testing

Use Claude in Chrome MCP tools to test the app in a real browser upon user request.

#### Bug Fix Process on Discovery

When a bug is found during testing, handle it based on severity.

**Blocker/Critical** (testing cannot proceed):

1. Fix the code in the main working directory and verify in the browser (do not commit yet)
2. Once verified, create a `fix/<bug-name>` branch, commit, and create a PR
3. After the PR is merged, pull main and resume testing

Do not ask the user "should I commit?" — proceed directly to the branch/PR process after verification.

**Non-critical** (testing can continue):

1. Create a GitHub issue and add it to the DOLinear project (Status: Todo)
2. Continue testing

After testing is complete, report the list of discovered bugs (including created PRs/issues) to the user.

## Agent Collaboration

### Role Definitions

| Role                     | Responsibilities                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| **Leader** (main agent)  | Issue assignment, teammate creation/termination, PR merge, Status→Done change                  |
| **Implementation agent** | Issue implementation, testing, PR creation, review subagent creation, review feedback handling |

### Review Process

- Implementation agents create their own review subagent (Task tool) after PR creation
- Subagents run in a separate context, maintaining the "don't review your own code" principle
- Reviews naturally parallelize within a wave, avoiding bottlenecks

### Project Status Management

- Implementation agents only change project Status to **In Progress**
- **Only the leader (main agent) changes Status to Done**, and only after PR merge
- PR creation ≠ task completion. The task is complete only when the PR is merged
- Review subagents do not change Status to Done either

### Completion Criteria Verification

- When an issue's completion criteria include runtime verification (server startup, API calls, builds, etc.), **do not consider it complete based on code review alone**
- Review subagents must **perform runtime verification in addition to code review** (server startup, curl tests, etc.)
- UI feature changes in a PR must have corresponding E2E tests that pass (`pnpm --filter e2e test`) before review is considered complete
- Do not give LGTM if the PR's test plan has unchecked items
- Review is considered complete only when all test plan items are checked

### PR Merge

- PR merge is performed **only after explicit user approval** (direct instruction like "merge it" required)
- Do not preemptively merge before the user completes their review
- Even if the agent has completed its review, merge authority belongs to the user

### Parallel Execution & Wave Operations

- **Wave** = a group of issues whose blockers are all completed (same level in the dependency DAG)
- When running a wave, follow the **"Wave Execution Standard Procedure"** in the `/github-operations` skill
- Use the **wave query script** defined in the skill as-is (do not compose inline queries/filtering)
- Issues within a wave are executed **in parallel** using Agent teams
- Each issue in parallel execution works in a separate worktree

#### Worktree Isolation Rules

Parallel agents each work in a separate worktree. **The leader manages the worktree lifecycle**; implementation agents do not create or delete worktrees.

> **Agent team worktrees** are created inside the project at `.claude/worktrees/`. This ensures teammates inherit project-level permission settings and avoid shell cwd resets. The tradeoff is CLAUDE.md/AGENTS.md double-loading (extra token cost), which is acceptable compared to the permission issues with external worktrees.

The following rules must be strictly observed:

**Leader (main agent):**

- **Worktree creation**: Run `git worktree add .claude/worktrees/<agent-name> -b <branch> main` **before** spawning the agent
- **Agent spawning**: Pass the worktree absolute path in the prompt and instruct the agent to `cd` into it
- **PR merge order**: Terminate teammate → `git worktree remove <path>` → `gh pr merge <PR> --squash --delete-branch`
  - `gh pr merge --delete-branch` fails if a worktree occupies the branch (GitHub CLI #3442). Always remove the worktree first
- Do not use the `isolation: "worktree"` option (does not work with teammates)

**Implementation agent:**

- `cd` to the worktree path specified in the prompt
- Verify with `pwd` that you are under `.claude/worktrees/` (if not, stop work immediately and report to the leader)
- Setup sequence: `cd <path>` → `pnpm install` → `pnpm db:setup` → `pnpm --filter api db:push`
- Do not use `git worktree add`, `git worktree remove`, or `git checkout -b`
- Do not `cd` to the main repo directory

#### Portless Name Isolation

Each worktree gets a unique `PORTLESS_SUFFIX` (auto-generated by `pnpm db:setup`), so portless app names are unique per worktree (e.g., `api-foo` / `web-foo`). This allows multiple worktrees to run dev servers simultaneously without port conflicts. URLs follow the pattern `http://api-<suffix>.localhost:1355`.

#### Wave Completion & Transition

- Once all PRs in a wave are merged, run `pnpm build` + `pnpm --filter api test` on the latest main to verify integration
- If integration issues are found, create a fix PR to resolve them before proceeding to the next wave
- If integration verification passes, proceed to the next wave immediately

### Teammate Lifecycle

- Teammate work completion = **PR merge**, not PR creation
- Keep teammates (implementation agents) alive after PR creation to handle review feedback
- If a review requests code changes, the corresponding implementation agent makes the fixes
- After review completion + user merge approval: terminate teammate → clean up worktree (`git worktree remove <path>`) → merge PR (`gh pr merge <PR> --squash --delete-branch`)
- Teammates can be removed immediately if the user explicitly instructs termination
