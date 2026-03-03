> 이 문서는 토큰 절약을 위해 영어로 작성되어 있습니다.
> This document MUST be written and maintained in English.

---
name: github-operations
description: GitHub GraphQL API patterns — reference for features not natively supported by gh CLI, such as sub-issues, blocked-by, and node ID lookups
---

# GitHub Operations Reference

A collection of GraphQL API scripts for GitHub features not directly supported by the `gh` CLI.

## Node ID Lookup

GitHub GraphQL mutations require a **global Node ID** (`id`, e.g., `I_kwDO...` Base64 string), not an issue number (`number`, e.g., #42). Use the following script to look up Node IDs from issue numbers:

- **File**: [`node-id.sh`](./node-id.sh)

```bash
# Single issue
bash .claude/skills/github-operations/node-id.sh 42

# Multiple issues (single query using alias pattern)
bash .claude/skills/github-operations/node-id.sh 1 2 3
```

Output: `#N  <node_id>  <title>`

## Sub-Issues

GitHub's sub-issue feature is **GraphQL-only** and requires the `GraphQL-Features: sub_issues` header. The scripts include this header automatically.

- **File**: [`sub-issues.sh`](./sub-issues.sh)

```bash
# List sub-issues
bash .claude/skills/github-operations/sub-issues.sh query 11

# Add sub-issue (requires Node IDs — look up with node-id.sh first)
bash .claude/skills/github-operations/sub-issues.sh add <parent_node_id> <child_node_id>

# Remove sub-issue
bash .claude/skills/github-operations/sub-issues.sh remove <parent_node_id> <child_node_id>
```

## Blocked-By (Issue Dependencies)

Manage blocking relationships between issues.

- **File**: [`dependencies.sh`](./dependencies.sh)

```bash
# Query dependencies of all open issues at once
bash .claude/skills/github-operations/dependencies.sh query-all

# Query specific issues only (single query using alias pattern)
bash .claude/skills/github-operations/dependencies.sh query 1 2 3

# Add dependency (requires Node IDs — look up with node-id.sh first)
# issueId = the blocked issue, blockingIssueId = the prerequisite issue
bash .claude/skills/github-operations/dependencies.sh add <blocked_node_id> <blocking_node_id>

# Remove dependency
bash .claude/skills/github-operations/dependencies.sh remove <blocked_node_id> <blocking_node_id>
```

## Background: Tasklist → Sub-issues Migration

GitHub's **Tasklist blocks** were retired on 2025-04-30 and replaced by **Sub-issues**.

- `trackedIssues`/`trackedInIssues`: Legacy Tasklist tracking fields. Do not use in new projects
- `parent`/`subIssues`: Sub-issues based fields (max 8 hierarchy levels, `GraphQL-Features: sub_issues` header required)
- `blockedBy`/`blocking`: Issue dependency fields (unrelated to Tasklist)

New projects should use `parent`/`subIssues` and `blockedBy`/`blocking`.

## Wave Management

### Wave Query Script

Queries the current actionable wave (issues whose blockers are all resolved) and still-blocked issues in a single call. **Do not compose inline filtering (`node -e`, `python -c`, `jq` pipes) yourself — run the script below.**

- **File**: [`query-waves.sh`](./query-waves.sh)

```bash
bash .claude/skills/github-operations/query-waves.sh
```

### Wave Execution Standard Procedure

For **any command requesting the next task** — "proceed with the next wave", "start the wave", "move on to the next task", etc. — **always** follow this procedure in order:

1. **Query wave**: Run the script above to get the current wave issue list
2. **Review issue details**: Check each issue's checklist and completion criteria (`gh issue view <N> --json body,title`)
3. **Display wave summary**: Show the user a table of issue numbers, titles, and types
4. **Create team**: Create a wave team with `TeamCreate`
5. **Worktree + agent spawn**: Create per-issue worktrees → spawn implementation agents (follow AGENTS.md worktree isolation rules)
6. **Await PRs**: After agents create PRs, review them and wait for user merge approval
7. **Merge + integration verification**: After all PRs are merged, verify integration with `pnpm build` + `pnpm --filter api test`
8. **Next wave**: If open issues remain, repeat from Step 1

## Notes

- Sub-issues API calls **fail** without the `GraphQL-Features: sub_issues` header
- Node IDs differ from issue numbers — look up with `node-id.sh` before mutations
- The `gh` CLI has no native commands for sub-issues or blocked-by
- When running multiple mutations in parallel, use separate `gh api graphql` calls for each
- `trackedInIssues`/`trackedIssues` is a **different feature** from blocked-by (Tasklist tracking). Always use `blockedBy`/`blocking` fields for dependency queries
- **Do not compose inline code containing `!` in a zsh environment.** Use the predefined scripts
