---
name: planning
description: Feature planning workflow — from product decisions to a complete spec document with wireframes and implementation issues. Use this skill whenever the user wants to plan a new feature, write a feature spec, create wireframes, or go through a structured planning process before implementation. Also trigger when the user mentions "기획", "스펙", "wireframe", "feature spec", or wants to define what to build before coding. Covers the full cycle: decisions → spec → wireframes → reviews → PR → issue breakdown.
---

> This document MUST be written and maintained in English.

# Feature Planning Skill

Guide the user through a structured planning workflow that produces a complete,
implementation-ready spec document with wireframes and GitHub Issues.

## Output

```
docs/specs/<feature>/
  <feature>.md          # Spec document (Korean)
  wireframe-*.png       # Hi-DPI wireframe captures
GitHub Issues             # Implementation issues with dependencies
```

## Conventions

**Feature name (`<feature>`)**: Derive from the user's stated feature name.
Lowercase, hyphens, no spaces or special characters, short slug.
Example: "Kanban Board" → `kanban-board`. Use consistently across branch name,
directory, and PR title.

**Spec language**: Spec documents are written in Korean (the user's language).
Section headers like `이번에 구현`, `후속 이슈` are Korean. The SKILL.md itself
is maintained in English per project convention.

**Repo root path**: Use this snippet to get the main repo root from anywhere
(works from inside a worktree too):
```bash
REPO_ROOT="$(git worktree list --porcelain | head -1 | sed 's/worktree //')"
```
Use `$REPO_ROOT` when referencing skill scripts or files outside the worktree.

**Shell state**: Shell state does not persist between Bash tool calls.
Re-set `REPO_ROOT` at the start of each bash block that references it.

## Workflow

The planning process has four phases. Steps within each phase are sequential;
phases build on each other.

```
Phase 1: Foundation
  0. Worktree setup
  1. Codebase exploration

Phase 2: Product Decisions
  2. Product decisions (conversation with user)
  3. UX review → fill decision gaps
  4. Technical feasibility review → adjust infeasible items
     └─ 3↔4 loop until converged (max 3 rounds)
  5. Decision checkpoint — user confirms before expensive steps

Phase 3: Wireframes & Spec
  6. Wireframe generation
  7. Wireframe completeness review
  8. Spec document writing
  9. Spec quality review (×2 parallel) → iterate until converged
  10. Technical spec review (×2 parallel, frontend/backend) → iterate

Phase 4: Delivery
  11. Commit → PR
  12. Human review → incorporate feedback
  13. Implementation issues + follow-up issues → GitHub
```

### Scale Adaptability

Not every feature needs every step. The workflow above is the full process;
use the table below for principled exceptions:

| Feature size | Skip candidates | Examples |
|---|---|---|
| **Large** (new page, multi-component) | None — run all steps | Kanban board, settings page |
| **Medium** (new component in existing page) | Step 6: limit to 1-2 wireframes. Step 7 (completeness review): optional | Filter bar, bulk actions |
| **Small** (single behavior change) | Steps 6-7 (wireframes) if behavior is text-describable; Step 4 (tech review) if no changes to existing architecture or data model | Keyboard shortcut, sort order |

When skipping steps, note what was skipped and why in the spec's Overview section.

---

## Phase 1: Foundation

### Step 0: Worktree Setup

Create a worktree at the start. All spec artifacts are written directly in it.

```bash
REPO_ROOT="$(git worktree list --porcelain | head -1 | sed 's/worktree //')"
# If branch already exists (e.g., abandoned previous session):
git branch -D docs/<feature>-spec 2>/dev/null || true
git push origin --delete docs/<feature>-spec 2>/dev/null || true
git worktree add .claude/worktrees/docs-<feature>-spec -b docs/<feature>-spec main
cd .claude/worktrees/docs-<feature>-spec
mkdir -p docs/specs/<feature>
```

**Do NOT clean up the worktree until Step 12 is complete** (after human review
feedback is incorporated). Premature cleanup removes the workspace needed for
post-PR changes.

### Step 1: Codebase Exploration

Before any product discussion, understand what exists.

```
Agent(subagent_type="Explore", model="sonnet")
```

Key things to discover:
- Existing components, routes, API endpoints in the feature area
- Data model (schema, relations, types)
- UI patterns already in use (libraries, conventions)
- What can be reused vs. what needs to be built

**Persist the output**: Collect the Explore subagent's output and write a
concise exploration summary to
`<worktree-absolute-path>/docs/specs/<feature>/exploration-notes.md`.
Use an absolute path (the subagent's cwd may differ from the worktree).
This file is consumed by the technical reviewers in Steps 4 and 10 (avoids
duplicate exploration) and deleted before the final commit.

**If the feature already partially exists**: Report what's already implemented
and what's missing. In Step 2, use this as the starting point — decisions focus
on extending or refactoring the existing implementation, not building from
scratch. The scope section should clarify what's reused vs. new.

Share findings with the user as a brief summary before moving to decisions.

---

## Phase 2: Product Decisions

### Step 2: Product Decisions

Work through decisions with the user, starting from the biggest (scope, core
behavior) and narrowing down. Ask one cluster of related questions at a time.

**Decision ordering principle**: Decide things that constrain other things first.
Example: "Is this a new page or a view within an existing page?" constrains
layout, routing, and state management decisions.

**Exit condition — mandatory decision categories**: Before declaring decisions
complete and proceeding to Step 3, verify that the following categories have
been addressed (skip categories that don't apply):

1. **Scope**: What's in and what's explicitly out
2. **Navigation/routing**: New page, tab, modal, or inline?
3. **Data ownership**: What data does this feature read/write? New entities?
4. **Key interactions**: Primary user actions and their outcomes
5. **States**: Empty, loading, error, edge cases
6. **Permissions**: Who can see/use this? (if applicable)

If a category is unresolved, ask the user before proceeding.

**Follow-up issue tracking**: When the conversation reveals related features
out of scope, add them to a running "후속 이슈" list with enough context to
create a useful GitHub Issue later:
```
- [Title]: [1-2 sentence description + reason for deferral]
```

**User mid-flow changes**: If the user substantially changes a core decision
during Steps 3-4, re-run from Step 3 (UX review) with the updated decisions.
Prior review findings may be stale.

### Step 3: UX Review

After the big decisions are made, spawn a UX reviewer subagent to check for gaps.

```
Agent(subagent_type="Explore", model="sonnet")
```

Use `Explore` subagent type (read-only) to prevent codebase tool usage.
Pass the decision summary as the prompt. **Do not instruct it to read code.**

#### UX Reviewer Persona

```
Role: Product/UX reviewer. Evaluate ONLY from a user-experience perspective.
Do NOT consider technical feasibility, implementation difficulty, or code.
Do NOT use Grep, Glob, or Bash to explore any codebase.
The decision summary is provided as text below. Do not search for or read any files.

Input: The decision summary so far.

Review criteria:
- Missing decisions that affect what the user sees or experiences
- Scope gaps — features half-defined or implied but not stated
- Follow-up issues that should be tracked but aren't listed

Output: Numbered list of gaps with brief explanation for each.
If no gaps: "LGTM — no gaps found."
```

Apply the reviewer's findings: present them to the user, get decisions, update.

### Step 4: Technical Feasibility Review

After UX review is addressed, spawn a technical reviewer subagent. This one
DOES read the codebase.

```
Agent(subagent_type="general-purpose", model="sonnet")
```

Include the decision summary, UX review results, AND the exploration notes
from Step 1 (`docs/specs/<feature>/exploration-notes.md`).

#### Technical Feasibility Reviewer Persona

```
Role: Technical feasibility reviewer.
You have full codebase access. Read relevant files to assess feasibility.

Input: The decision summary + UX review results + exploration notes.

Review criteria:
- Implementation difficulty (any item unreasonably hard given current codebase?)
- Existing infrastructure that can be reused
- Technical risks or blockers

Output: For each concern, state the item, the issue, and a suggested adjustment.
If everything is feasible: "LGTM — all items feasible."
```

If the technical reviewer flags items as infeasible, adjust scope and re-run
the UX reviewer (Step 3) to verify the adjusted scope still makes product sense.

**Convergence criterion**: The technical reviewer returns LGTM (or only
LOW-severity items) AND the UX reviewer confirms the adjusted scope still
makes product sense.

**Loop cap**: Max 3 rounds of 3↔4 iteration. If convergence is not reached
after 3 rounds, present remaining conflicts to the user for a final decision.

### Step 5: Decision Checkpoint

Before entering the expensive wireframe/spec phase, present a consolidated
**decision summary** to the user for batch confirmation:

- Group decisions by topic (scope, layout, interactions, data, states)
- List the 후속 이슈 items collected so far
- Ask: "Does this match your intent? Any changes before I proceed to wireframes?"

**Do NOT proceed until the user explicitly confirms.** This prevents expensive
rework in Steps 6-10 due to misunderstood scope.

---

## Phase 3: Wireframes & Spec

### Step 6: Wireframe Generation

Create wireframes as HTML files, then capture as hi-DPI PNGs.

#### Wireframe Types

Cover these categories as needed (not every feature needs all five):

1. **Main layout** — Overall UI structure showing all elements in context
2. **Layout annotation** — Fixed vs. scroll regions, structural explanations
3. **Interaction detail** — DnD, hover, click, and other dynamic behaviors
4. **Component closeup** — Repeated elements with detail + variants
5. **State variations** — Empty state, filtered state, error state, etc.

#### HTML → PNG Pipeline

Write each wireframe as a self-contained HTML file in `/tmp/`, using inline CSS.
Dark theme, system font stack, realistic sample data.

**Capture script** (auto-measures document height, prevents bottom clipping).
Run from the worktree root (`cd` into the worktree first) so the relative
output path resolves correctly:

```bash
REPO_ROOT="$(git worktree list --porcelain | head -1 | sed 's/worktree //')"
cd "$REPO_ROOT/.claude/worktrees/docs-<feature>-spec"
bash "$REPO_ROOT/.claude/skills/planning/capture-wireframe.sh" \
  /tmp/wireframe-<name>.html \
  docs/specs/<feature>/wireframe-<name>.png \
  1200
```

The script requires Chrome. If it fails (Chrome not found, measurement error),
fall back to manual `--window-size` with generous height (4000px+) and verify
the PNG visually with the Read tool.

**Verify PNGs are in `docs/specs/<feature>/`** before writing the spec
(Step 8 references them with relative paths). Verify each PNG with the Read
tool after capture.

#### Wireframe Style Guide

- Dark background (`#1a1a2e`), card background (`#252545`), borders (`#3a3a5a`)
- Accent color for highlights: orange (`#f5a623`)
- Text: light gray (`#e0e0e0`), secondary text: dim gray (`#8888aa`)
- Include annotation boxes below the main UI with spec details
- Use realistic (but fictional) data — not "Lorem ipsum"

#### HTML Template

Minimal starting point:

```html
<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #1a1a2e; color: #e0e0e0;
    font-family: system-ui, -apple-system, sans-serif;
    padding: 24px; width: 1200px;
  }
  .card {
    background: #252545; border: 1px solid #3a3a5a;
    border-radius: 8px; padding: 16px;
  }
  .accent { color: #f5a623; }
  .annotation {
    margin-top: 24px; padding: 16px;
    background: rgba(245, 166, 35, 0.1);
    border: 1px dashed #f5a623;
    border-radius: 8px; font-size: 14px;
  }
  .annotation strong { color: #f5a623; }
</style>
</head>
<body>
  <!-- Main wireframe content here -->
  <div class="annotation">
    <strong>Spec Notes:</strong> Behavioral details and constraints.
  </div>
</body>
</html>
```

#### Wireframe Modification Strategy

When a wireframe needs changes after review:
- **Regenerate from scratch** rather than editing existing HTML source.
  Read the current PNG to understand the design intent, then write new HTML.
- Keep the old PNG until the new one is verified, then replace it.

### Step 7: Wireframe Completeness Review

Spawn a completeness reviewer subagent.

```
Agent(subagent_type="Explore", model="sonnet")
```

Use `Explore` type (read-only) to prevent codebase access.
Pass the decision summary AND the **expanded** absolute paths to each wireframe
PNG (list them explicitly — do not pass a glob pattern, because the Explore
subagent cannot expand globs via Bash). The subagent must Read each PNG file
to see its visual content.

#### Wireframe Completeness Reviewer Persona

```
Role: Wireframe completeness reviewer.
Do NOT consider technical feasibility.
Do NOT use Grep, Glob, or Bash to explore any codebase.

Input: Decision summary + wireframe PNG files (read each one).

Core question: "What would an implementation agent have to IMAGINE
(i.e., make up without guidance) if given only these wireframes?"

Every decision in scope should be visually represented in at least one
wireframe. If not, list what's missing and why it matters.

Output: List of additional wireframes needed + reason for each.
If complete: "LGTM — all decisions visually covered."
```

Create any additional wireframes identified, then proceed.

---

### Step 8: Spec Document Writing

Write the spec as Markdown in the worktree:
`docs/specs/<feature>/<feature>.md`

**Prerequisite**: All wireframe PNGs must already be in `docs/specs/<feature>/`
so relative image paths resolve correctly.

#### Document Structure

```markdown
# Feature Name

One-line description.

> **용어 참고** (if UI terms differ from API field names)

## 개요
Brief description + main wireframe reference.

## 범위
### 이번에 구현
- Boundary-setting bullet list (what's in/out). No behavioral details here.

### 후속 이슈
- [Title]: [1-2 sentence description + reason for deferral]

## [Section per major area]
Each section covers one aspect (Layout, Card, DnD, Filter, etc.).
Reference wireframes inline with `![description](wireframe-<name>.png)`.

### Subsections for sub-behaviors
```

#### Quality Principles

- **Scope section**: Boundaries only (what and what not). Behavioral details
  belong in their respective sections.
- **Terminology**: State upfront if UI terms differ from API field names.
- **Common behaviors**: Extract into a shared subsection (e.g., "DnD 공통")
  rather than repeating in each specific case.
- **Special cases**: Define relationship to the general case (e.g., "Empty
  column drop = special case of cross-column move").
- **Edge cases**: Explicitly state failure handling, overflow behavior,
  thresholds, cancel conditions.
- **Wireframe gaps**: If a wireframe omits an element for brevity, add an
  inline `> note` explaining what's omitted and what the actual behavior is.

### Step 9: Spec Quality Review

Run **2 reviewer subagents in parallel** with differentiated focus, then merge
findings (deduplicate overlapping items, keep unique ones from each).

```
Agent(subagent_type="Explore", model="sonnet")  # Reviewer A — completeness
Agent(subagent_type="Explore", model="sonnet")  # Reviewer B — consistency
```

Use `Explore` type (read-only) to prevent codebase access. Pass only the
absolute paths to the spec file and wireframe PNGs.

#### Reviewer A Persona — Completeness Focus

```
Role: Spec document completeness reviewer.

CONSTRAINTS:
- You may ONLY read files whose paths are given in this prompt
- Do NOT use Grep, Glob, or Bash to explore the codebase
- Do NOT read any .ts, .tsx, .js, .json files

JUDGMENT BOUNDARY: Evaluate only user-visible behavior completeness.
- ✅ IN SCOPE: "Drop causes card to move to insertion position" — behavioral
- ❌ OUT OF SCOPE: "sortOrder recalculation algorithm" — technical design
- ✅ IN SCOPE: "API failure rolls back card + shows error toast" — user-visible

Focus on:
1. Missing specs: Any user-visible behavior not described?
2. Wireframe coverage: Every major decision visually represented?
3. Edge cases: Failure handling, overflow, empty states described?

Output: Severity (HIGH/MEDIUM/LOW) per finding.
If clean: "LGTM — no issues found."
```

#### Reviewer B Persona — Consistency Focus

```
Role: Spec document consistency and clarity reviewer.

CONSTRAINTS:
- You may ONLY read files whose paths are given in this prompt
- Do NOT use Grep, Glob, or Bash to explore the codebase
- Do NOT read any .ts, .tsx, .js, .json files

JUDGMENT BOUNDARY: Evaluate only user-visible behavior clarity.
Same in-scope/out-of-scope rules as Reviewer A.

Focus on:
1. Ambiguous wording: Could a behavior be interpreted multiple ways?
2. Consistency: Terms, numbers, descriptions consistent within the document?
3. Contradictions: Do any sections describe conflicting behavior?
4. Structure/readability: Is the document well-organized?

Output: Severity (HIGH/MEDIUM/LOW) per finding.
If clean: "LGTM — no issues found."
```

#### Review Loop

**Decision authority**: Resolve LOW findings autonomously. Propose a fix for
MEDIUM findings and proceed unless the user objects. Present HIGH findings to
the user for explicit decision.

1. Run 2 parallel reviewers → merge findings (deduplicate)
2. Present merged findings to user, propose fixes, get decisions
3. Apply fixes to spec **and update affected wireframes** (if a fix changes
   visual behavior, regenerate the relevant wireframe — see the "Wireframe Modification Strategy" subsection in Step 6)
4. Run 1 more review round as convergence check

**Convergence criteria**: HIGH = 0 and new MEDIUMs are at detail level (exact
pixel values, animation timing, tooltip positioning). If unsure whether a
MEDIUM is detail-level, ask the user.

**Loop cap**: Max 3 review rounds total. If not converged after 3 rounds,
apply remaining fixes and proceed — diminishing returns beyond this point.

### Step 10: Technical Spec Review

After the spec quality review converges, run a **technical review of the
complete spec** to verify implementability against the codebase. This is a
separate step from Step 4 (early feasibility) because the spec may have
introduced details during Steps 6-8 that weren't present in the original
decisions.

Run **2 reviewer subagents in parallel** with differentiated focus (frontend
vs. backend), then merge findings. For single-stack features (frontend-only
or backend-only), use 1 reviewer.

```
Agent(subagent_type="general-purpose", model="sonnet")  # Reviewer A — frontend
Agent(subagent_type="general-purpose", model="sonnet")  # Reviewer B — backend
```

Both subagents have full codebase access. Pass the spec file path, wireframe
PNG paths, and the exploration notes from Step 1.

#### Reviewer A Persona — Frontend Focus

```
Role: Technical spec reviewer (frontend focus).
You have full codebase access. Read relevant source files.

Input: The complete spec document + wireframe PNGs + exploration notes.

Focus on frontend implementability:
1. Do specified UI behaviors conflict with existing component architecture?
2. Are there implicit assumptions about components, routes, or state management
   that don't exist?
3. Are there UI behaviors that would require disproportionate effort?
   (flag for user decision, don't reject)
4. Are there missing frontend preconditions (new libraries, patterns)?

Output: Severity (HIGH/MEDIUM/LOW) per finding with spec section reference,
the technical concern, and a suggested resolution.
If clean: "LGTM — frontend is implementable."
```

#### Reviewer B Persona — Backend Focus

```
Role: Technical spec reviewer (backend focus).
You have full codebase access. Read relevant source files.

Input: The complete spec document + wireframe PNGs + exploration notes.

Focus on backend implementability:
1. Do specified behaviors conflict with existing API or data model architecture?
2. Are there implicit assumptions about endpoints, schema, or relations
   that don't exist?
3. Are there data operations that would require disproportionate effort?
   (flag for user decision, don't reject)
4. Are there missing backend preconditions (schema migrations, new tables)?

Output: Severity (HIGH/MEDIUM/LOW) per finding with spec section reference,
the technical concern, and a suggested resolution.
If clean: "LGTM — backend is implementable."
```

#### Review Loop

**Decision authority**: Resolve LOW findings autonomously. Propose a fix for
MEDIUM findings and proceed unless the user objects. Present HIGH findings to
the user for explicit decision.

1. Run 2 parallel reviewers → merge findings (deduplicate)
2. Present merged findings to user, propose adjustments
3. Apply agreed fixes to spec **and update affected wireframes** (if a fix
   changes visual behavior, regenerate the relevant wireframe — see the
   "Wireframe Modification Strategy" subsection in Step 6)
4. Run 1 more review round as convergence check

**Convergence criteria**: Same as Step 9 — HIGH = 0 and new MEDIUMs are at
detail level.

**Loop cap**: Max 3 review rounds total. After fixes, also run ONE spec
quality review round (Step 9 format) as sanity check to catch inconsistencies
introduced by technical adjustments. This sanity check is a standalone round,
not counted against Step 9's loop cap. If it surfaces new HIGHs, fix them and
proceed (do not re-enter Step 9's full loop).

---

## Phase 4: Delivery

### Step 11: Commit and PR

From the worktree:

```bash
REPO_ROOT="$(git worktree list --porcelain | head -1 | sed 's/worktree //')"
cd "$REPO_ROOT/.claude/worktrees/docs-<feature>-spec"

# Add only spec and wireframes (exclude exploration-notes.md scratch file)
git add docs/specs/<feature>/<feature>.md docs/specs/<feature>/wireframe-*.png
git commit -m "docs: add <feature> spec with wireframes"
git push -u origin docs/<feature>-spec
gh pr create --title "docs: <feature> spec" --body "$(cat <<'EOF'
## Summary
- Feature spec for <feature> with wireframes
- Covers: [list major areas]

## Contents
- `docs/specs/<feature>/<feature>.md` — spec document
- `docs/specs/<feature>/wireframe-*.png` — wireframe images

## Review notes
This is a spec document for review. No implementation code is included.
After approval, implementation issues will be created from this spec.
EOF
)"
```

**Do NOT clean up the worktree yet.** The human review in Step 12 may require
changes.

### Step 12: Human Review

The PR is now ready for user review. This is a natural pause point.

**Tell the user**: "PR이 생성되었습니다. 리뷰 후 피드백을 주세요. 피드백이
없으면 이슈 생성으로 넘어갑니다."

When the user provides feedback:
1. Apply changes to spec **and update affected wireframes** (if feedback changes
   visual behavior, regenerate the relevant wireframe — see the "Wireframe Modification Strategy" subsection in Step 6)
2. Commit and push (same `git add` pattern as Step 11 — add only the spec
   `.md` and `wireframe-*.png` files, do not include `exploration-notes.md`)
3. If changes are substantial (new user-visible behaviors added, or scope
   changed — not just wording clarifications or typo fixes), re-run ONE round
   of spec quality review (Step 9) as sanity check. This is a standalone
   round, not counted against Step 9's 3-round cap.
4. If changes are substantial AND affect technical feasibility (new data
   requirements, changed API surface, etc.), also re-run ONE round of
   Step 10 (technical review). This is a standalone round, not counted
   against Step 10's 3-round cap.
5. When the user approves, proceed to Step 13

### Step 13: Implementation Issues and Follow-Up Issues

After the spec is approved, break it down into implementation issues and
register follow-up issues.

#### 13a: Implementation Issue Breakdown

Spawn a subagent to analyze the spec + codebase and produce an issue plan.

```
Agent(subagent_type="general-purpose", model="sonnet")
```

Pass the spec file, wireframe PNGs, and exploration notes. Instruct the
subagent to also read relevant codebase files.

##### Issue Breakdown Subagent Prompt

```
Role: Implementation issue planner.
You have full codebase access.

Input: The spec document + wireframe PNGs + exploration notes.

Tasks:
1. Read the spec thoroughly and identify implementation units.
   Each unit should be a coherent, independently-deliverable piece of work.
2. Read relevant codebase files to assess:
   - What can be reused vs. built from scratch
   - Which files each unit will touch
   - Shared components or APIs that multiple units depend on
3. Analyze dependencies between units:
   - If unit B needs a component created in unit A, A blocks B
   - If two units touch the same files, they should be sequenced
   - Shared infrastructure (new API endpoints, shared components) should be
     early in the dependency chain
4. Assign wave numbers: Wave 1 = no blockers, Wave 2 = blocked by Wave 1, etc.

Output format (as a structured list):
For each issue:
- Title
- Spec sections covered (reference by header)
- Checklist of implementation tasks
- Dependencies (blocked by which other issues)
- Wave number
- Estimated scope (S/M/L)
```

Present the issue plan to the user for approval before creating issues.

#### 13b: Create GitHub Issues

After user approves the plan, create issues:

```bash
# For each implementation issue:
gh issue create --title "..." --body "$(cat <<'EOF'
## Context
Spec: docs/specs/<feature>/<feature>.md — [Section Name]

## Checklist
- [ ] ...
- [ ] ...

## Dependencies
Blocked by: #N, #M (if any)

## Acceptance criteria
- [ ] ...
EOF
)" | xargs -I {} gh project item-add 4 --owner dolgim --url {}
```

After all issues are created, set up dependencies using the
`/github-operations` skill scripts — specifically
`bash .claude/skills/github-operations/dependencies.sh add <blocker_node_id> <blocked_node_id>`
for each dependency. Look up node IDs first with `node-id.sh`.

Back-reference issue numbers in the spec document under each relevant section.

#### 13c: Follow-Up Issues

Register items from the "후속 이슈" list:

```bash
gh issue create --title "..." --body "$(cat <<'EOF'
## Context
Deferred from <feature> spec: docs/specs/<feature>/<feature>.md

## Description
[Description from the 후속 이슈 list]

## Reason for deferral
[Why this was excluded from the current scope]
EOF
)" | xargs -I {} gh project item-add 4 --owner dolgim --url {}
```

#### 13d: Final Cleanup

After all issues are created:

```bash
REPO_ROOT="$(git worktree list --porcelain | head -1 | sed 's/worktree //')"

# Commit the back-references added to the spec
cd "$REPO_ROOT/.claude/worktrees/docs-<feature>-spec"
git add docs/specs/<feature>/<feature>.md
git commit -m "docs: add issue references to <feature> spec"
git push

# Remove exploration scratch file (handles both tracked and untracked cases)
git rm -f docs/specs/<feature>/exploration-notes.md 2>/dev/null || rm -f docs/specs/<feature>/exploration-notes.md

# Now clean up the worktree (all feedback incorporated, issues created)
cd "$REPO_ROOT"
git worktree remove .claude/worktrees/docs-<feature>-spec
```

Report all created issues to the user.

---

## Anti-Patterns Learned

These patterns caused problems in practice and should be avoided:

1. **Reviewer persona bleed**: If a reviewer can access code files, it will
   naturally make technical judgments even when told not to. Use `Explore`
   subagent type (read-only, no Bash) for non-technical reviewers and
   explicitly restrict file paths in the prompt. This is best-effort —
   `Explore` agents can still Glob/Grep, but the prompt constraint + lack
   of Bash access reduces bleed significantly.

2. **"Can it be implemented from this doc alone?" is too broad**: This question
   leads spec reviewers into API design and algorithm territory. Restrict to
   "Are all user-visible behaviors described?" instead.

3. **Single reviewer blind spots**: One reviewer misses things another catches.
   Always run 2 in parallel for spec review, with differentiated focus
   (completeness vs. consistency). 3+ has diminishing returns.

4. **Skipping re-verification after fixes**: Every fix round needs at least one
   verification round. Fixes can introduce new inconsistencies.

5. **Creating spec files directly on main**: Always use a worktree, even for
   documentation.

6. **Editing wireframe HTML instead of regenerating**: When a wireframe needs
   changes, read the current PNG for design intent and write fresh HTML. Patching
   existing HTML/CSS is slower and more error-prone than regeneration.

7. **Using raw Chrome commands for capture**: Always use the capture script
   (`capture-wireframe.sh`) which handles height measurement and Chrome's
   window chrome offset (~87px) automatically. Reference it with `$REPO_ROOT`.

8. **Premature worktree cleanup**: Do not remove the worktree after PR creation.
   Human review feedback requires a workspace. Clean up only after Step 13
   (all issues created, back-references committed).

9. **Running this skill as a teammate**: When the skill executor is itself a
   teammate on a team, `Agent()` calls spawn new teammates (async messages)
   instead of isolated subagents (synchronous return). If executing as a
   teammate, either perform reviews inline (self-review using the persona
   prompts) or coordinate with spawned teammates via messages. The skill is
   designed for solo agent execution.
