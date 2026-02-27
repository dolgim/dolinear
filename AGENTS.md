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
```

### Starting Work in a Worktree

On `git worktree add` or `git checkout`, the `post-checkout` hook automatically runs `db:setup` to create a branch-specific DB. If Docker is not running, only a message is printed; in that case, run manually:

```bash
pnpm db:up          # start PostgreSQL
pnpm db:setup       # create branch-specific DB + update .env
pnpm --filter api db:push   # push schema
```

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

### DO

- Implement one issue at a time; verify it works before moving to the next
- Fulfill the issue's checklist and completion criteria
- Follow existing code patterns and conventions
- Include test results when creating a PR
- Ensure no lint or TypeScript type errors upon completion
- When requirements are unclear or ambiguous, **ask the user instead of guessing**

### DON'T

- Do not commit directly to main (except documentation updates)
- Do not implement multiple issues at once
- Do not proceed to the next step without verifying behavior
- Do not instruct parallel agents to run `git checkout -b` in the main repo (use worktree isolation)

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

| Role                        | Responsibilities                                                                |
| --------------------------- | ------------------------------------------------------------------------------- |
| **Leader** (main agent)     | Issue assignment, teammate creation/termination, PR merge, Status→Done change   |
| **Implementation agent**    | Issue implementation, testing, PR creation, review subagent creation, review feedback handling |

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

> **Agent team worktrees** are created outside the project at `~/.claude/worktrees/dolinear/`. Creating worktrees inside the project (`.claude/worktrees/`) causes duplicate loading of CLAUDE.md/AGENTS.md, wasting context tokens. Note: session worktrees created by the `--worktree` flag are hardcoded by Claude Code to `.claude/worktrees/` and cannot be changed (known limitation).

The following rules must be strictly observed:

**Leader (main agent):**

- **Worktree creation**: Run `git worktree add ~/.claude/worktrees/dolinear/<agent-name> -b <branch> main` **before** spawning the agent
- **Agent spawning**: Pass the worktree absolute path in the prompt and instruct the agent to `cd` into it
- **PR merge order**: Terminate teammate → `git worktree remove <path>` → `gh pr merge <PR> --squash --delete-branch`
  - `gh pr merge --delete-branch` fails if a worktree occupies the branch (GitHub CLI #3442). Always remove the worktree first
- Do not use the `isolation: "worktree"` option (does not work with teammates)

**Implementation agent:**

- `cd` to the worktree path specified in the prompt
- Verify with `pwd` that you are under `~/.claude/worktrees/dolinear/` (if not, stop work immediately and report to the leader)
- Setup sequence: `cd <path>` → `pnpm install` → `pnpm db:setup` → `pnpm --filter api db:push`
- Do not use `git worktree add`, `git worktree remove`, or `git checkout -b`
- Do not `cd` to the main repo directory

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
