---
name: github-operations
description: GitHub GraphQL API 패턴 — sub-issues, blocked-by, node ID 조회 등 gh CLI로 직접 지원되지 않는 기능의 레퍼런스
---

# GitHub Operations Reference

`gh` CLI에서 직접 지원하지 않는 GitHub 기능들의 GraphQL API 스크립트 모음.

## Node ID 조회

GitHub GraphQL mutation은 이슈 번호(`number`, 예: #42)가 아닌 **글로벌 Node ID**(`id`, 예: `I_kwDO...` Base64 문자열)를 요구한다. 아래 스크립트로 이슈 번호에서 Node ID를 조회한다:

- **파일**: [`node-id.sh`](./node-id.sh)

```bash
# 단일 이슈
bash .claude/skills/github-operations/node-id.sh 42

# 여러 이슈 (alias 패턴으로 단일 쿼리)
bash .claude/skills/github-operations/node-id.sh 1 2 3
```

출력: `#N  <node_id>  <title>`

## Sub-Issues

GitHub의 sub-issue 기능은 **GraphQL 전용**이며, `GraphQL-Features: sub_issues` 헤더가 **필수**다. 스크립트가 헤더를 자동으로 포함한다.

- **파일**: [`sub-issues.sh`](./sub-issues.sh)

```bash
# 서브이슈 목록 조회
bash .claude/skills/github-operations/sub-issues.sh query 11

# 서브이슈 추가 (Node ID 필요 — node-id.sh로 먼저 조회)
bash .claude/skills/github-operations/sub-issues.sh add <parent_node_id> <child_node_id>

# 서브이슈 제거
bash .claude/skills/github-operations/sub-issues.sh remove <parent_node_id> <child_node_id>
```

## Blocked-By (이슈 의존관계)

이슈 간 blocking 관계 관리.

- **파일**: [`dependencies.sh`](./dependencies.sh)

```bash
# 모든 open 이슈의 의존관계 한 번에 조회
bash .claude/skills/github-operations/dependencies.sh query-all

# 특정 이슈만 조회 (alias 패턴으로 단일 쿼리)
bash .claude/skills/github-operations/dependencies.sh query 1 2 3

# 의존관계 추가 (Node ID 필요 — node-id.sh로 먼저 조회)
# issueId = 블로킹 당하는 이슈, blockingIssueId = 선행 조건 이슈
bash .claude/skills/github-operations/dependencies.sh add <blocked_node_id> <blocking_node_id>

# 의존관계 제거
bash .claude/skills/github-operations/dependencies.sh remove <blocked_node_id> <blocking_node_id>
```

## 배경: Tasklist → Sub-issues 전환

GitHub의 **Tasklist blocks**는 2025-04-30부로 retired되었으며 **Sub-issues**로 대체되었다.

- `trackedIssues`/`trackedInIssues`: 레거시 Tasklist 추적 필드. 새 프로젝트에서 사용 금지
- `parent`/`subIssues`: Sub-issues 기반 필드 (계층 최대 8단계, `GraphQL-Features: sub_issues` 헤더 필수)
- `blockedBy`/`blocking`: 이슈 간 의존관계 필드 (Tasklist과 무관)

새 프로젝트에서는 `parent`/`subIssues`와 `blockedBy`/`blocking`을 사용한다.

## 웨이브 관리

### 웨이브 조회 스크립트

현재 진행 가능한 웨이브(블로커가 모두 해소된 이슈)와 아직 블로킹된 이슈를 한 번에 조회한다. **인라인 필터링(`node -e`, `python -c`, `jq` 파이프)을 직접 구성하지 않고, 아래 스크립트를 실행한다.**

- **파일**: [`query-waves.sh`](./query-waves.sh)

```bash
bash .claude/skills/github-operations/query-waves.sh
```

### 웨이브 진행 표준 절차

"다음 웨이브 진행", "웨이브 시작" 등의 명령 시 **반드시** 아래 절차를 순서대로 따른다:

1. **웨이브 조회**: 위 스크립트를 실행하여 현재 웨이브 이슈 목록을 확인한다
2. **이슈 상세 조회**: 각 이슈의 체크리스트와 완료 조건을 확인한다 (`gh issue view <N> --json body,title`)
3. **웨이브 요약 출력**: 사용자에게 이슈 번호, 제목, 유형을 테이블로 보여준다
4. **팀 생성**: `TeamCreate`로 웨이브 팀을 생성한다
5. **워크트리 + 에이전트 스폰**: 이슈별 워크트리 생성 → 구현 에이전트 스폰 (AGENTS.md 워크트리 격리 규칙 준수)
6. **PR 대기**: 에이전트가 PR을 생성하면 리뷰 후 사용자 머지 승인을 대기한다
7. **머지 + 통합 검증**: 모든 PR 머지 후 `pnpm build` + `pnpm --filter api test`로 통합 상태를 검증한다
8. **다음 웨이브**: 오픈 이슈가 남아있으면 Step 1부터 반복한다

## 주의사항

- Sub-issues API는 `GraphQL-Features: sub_issues` 헤더 없이 호출하면 실패한다
- Node ID는 이슈 번호와 다르다 — mutation 전에 `node-id.sh`로 조회
- `gh` CLI에는 sub-issue, blocked-by 관련 네이티브 명령이 없다
- 여러 mutation을 병렬로 실행할 때는 각각 별도의 `gh api graphql` 호출을 사용한다
- `trackedInIssues`/`trackedIssues`는 blocked-by와 **다른 기능**이다 (Tasklist 추적 기능). 의존관계 조회 시 반드시 `blockedBy`/`blocking` 필드를 사용할 것
- **zsh 환경에서 `!` 포함 인라인 코드를 직접 구성하지 않는다.** 사전 정의된 스크립트를 사용한다
