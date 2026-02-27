# dolinear - AI 에이전트 작업 가이드

## 프로젝트 컨텍스트

**dolinear**는 Linear 클론 프로젝트입니다.

- Frontend: React + Vite + TypeScript + TanStack Router + TanStack Query + Tailwind CSS v4
- Backend: Hono + TypeScript + Node.js
- Database: PostgreSQL 15 + Drizzle ORM
- Auth: Better Auth (Email/Password)
- Testing: Vitest + Testcontainers
- Infra: Docker Compose, pnpm + Turborepo 모노레포
- 구조: `apps/web`, `apps/api`, `packages/shared`

## 개발 환경

### 명령어

```bash
# 전체 서비스 실행
pnpm dev                        # turbo dev (web + api 동시 실행)
pnpm build                      # turbo build

# 데이터베이스
pnpm db:up                      # docker compose up -d (PostgreSQL 시작)
pnpm db:down                    # docker compose down
pnpm db:setup                   # 현재 브랜치 기반 전용 DB 생성 + .env 업데이트

# Drizzle ORM (apps/api 내)
pnpm --filter api db:push       # 스키마를 DB에 반영
pnpm --filter api db:generate   # 마이그레이션 생성
pnpm --filter api db:studio     # Drizzle Studio 실행

# 테스트
pnpm --filter api test          # Vitest + Testcontainers (Docker 필요)

# 코드 품질
pnpm lint                       # ESLint
pnpm format                     # Prettier
```

### 워크트리에서 작업 시작

`git worktree add` 또는 `git checkout` 시 `post-checkout` hook이 자동으로 `db:setup`을 실행하여 브랜치별 전용 DB를 생성한다. Docker가 꺼져 있으면 안내 메시지만 출력되므로, 이 경우 수동으로 실행한다:

```bash
pnpm db:up          # PostgreSQL 시작
pnpm db:setup       # 브랜치별 DB 생성 + .env 업데이트
pnpm --filter api db:push   # 스키마 반영
```

## 워크플로우

### Git 브랜치 & PR

각 기능은 별도의 브랜치에서 작업하고 PR을 통해 main에 머지한다. Claude Code 실행 시 `--worktree` 옵션을 사용하므로 worktree 관리는 자동으로 처리된다.

**브랜치 네이밍 컨벤션**:

- `feature/<기능명>`: 새로운 기능 추가
- `fix/<버그명>`: 버그 수정
- `refactor/<내용>`: 리팩토링
- `docs/<내용>`: 문서 업데이트

**PR 생성**:

```bash
gh pr create --title "제목" --body "설명"
```

PR 본문에는 다음을 포함한다:

- 변경 사항 요약
- `Closes #N`으로 이슈 참조
- 테스트 플랜 (체크리스트 형태)

**한 PR에는 하나의 목적만 포함한다.** 버그 수정과 문서 업데이트처럼 독립적인 변경은 별도 PR 또는 별도 커밋으로 분리한다. 문서 업데이트는 main에 직접 커밋 가능하므로, fix/feature 브랜치 PR에 섞지 않는다.

### 이슈 관리

GitHub Issues + GitHub Projects로 관리한다.

**GitHub Project**:

- **프로젝트명**: DOLinear
- **번호**: 4 (owner: dolgim)
- **Project ID**: `PVT_kwHOAPxGec4BP540`
- **URL**: https://github.com/users/dolgim/projects/4
- **Status 필드**: Todo → In Progress → Done

```bash
# 프로젝트 아이템 목록 조회
gh project item-list 4 --owner dolgim

# 이슈의 Status를 변경 (예: In Progress로)
gh project item-edit --project-id PVT_kwHOAPxGec4BP540 --id <ITEM_ID> --field-id PVTSSF_lAHOAPxGec4BP540zg-LXxA --single-select-option-id 47fc9ee4
```

**Status Option IDs**:

- Todo: `f75ad846`
- In Progress: `47fc9ee4`
- Done: `98236657`

**이슈 운영 규칙**:

- 작업 시작 시 해당 이슈를 확인하고 체크리스트를 따른다
- 작업 시작 시 프로젝트 Status를 **In Progress**로 변경한다
- PR 생성 시 `Closes #N`으로 이슈를 참조한다
- PR 머지 후 프로젝트 Status가 **Done**으로 변경된다 (`Closes #N`으로 이슈 자동 닫힘)
- 이슈 간 의존관계가 설정되어 있으므로 순서를 지킨다
  - 해당 사항은 `/github-operations` skill을 참조한다.
  - 이슈 간 의존관계 조회 시 반드시 `blockedBy`/`blocking` GraphQL 필드를 사용한다. `trackedInIssues`/`trackedIssues`는 레거시 Tasklist 기능이며 의존관계와 무관하다
  - 여러 이슈의 의존관계를 조회할 때 for 루프로 `gh api graphql`을 반복 호출하지 않는다. GraphQL alias 패턴으로 단일 쿼리를 사용한다

## 작업 규칙

### 코딩 컨벤션

1. **타입 정의**: `packages/shared`에 공통 타입을 중앙화한다
2. **모노레포 패키지 추가**:
   - 워크스페이스 루트: `pnpm add -w <package>`
   - 특정 패키지: `pnpm --filter <pkg> add <package>`
3. **최신 라이브러리**: 새 의존성 추가 시 최신 버전을 사용한다
4. **AGENTS.md 유지보수**: 이슈 작업 중 새 명령어, 패턴, 컨벤션이 생기면 이 파일을 업데이트한다
5. **패키지 실행**: `npx` 대신 `pnpm exec`를 사용한다 (pnpm 모노레포 환경)
6. **DB 스키마 관리**: Drizzle schema(`apps/api/src/db/schema.ts`)를 single source of truth로 사용한다. 테스트 셋업 등에서 raw SQL로 테이블을 직접 생성하지 않는다 (`drizzle-kit push` 사용)

### ✅ DO

- 한 번에 하나의 이슈씩 구현하고, 동작 확인 후 다음으로 넘어간다
- 이슈의 체크리스트와 완료 조건을 충족시킨다
- 기존 코드의 패턴과 컨벤션을 따른다
- PR 생성 시 테스트 결과를 포함한다
- 작업 완료 시 lint와 TypeScript 타입 에러가 없는지 확인한다
- 요구사항이 불명확하거나 여러 해석이 가능한 경우, **추측하지 않고 사용자에게 질문**한다

### ❌ DON'T

- main 브랜치에 직접 커밋하지 않는다 (문서 업데이트 제외)
- 여러 이슈를 한꺼번에 구현하지 않는다
- 동작 검증 없이 다음 단계로 넘어가지 않는다
- 병렬 에이전트에게 메인 레포에서 `git checkout -b`를 지시하지 않는다 (워크트리 격리 사용)

### 브라우저 테스트

사용자의 요청에 따라 Claude in Chrome MCP 도구를 사용하여 실제 브라우저에서 앱을 테스트한다.

#### 버그 발견 시 수정 프로세스

테스트 중 버그를 발견하면 심각도에 따라 처리 방식을 분기한다.

**블로커/크리티컬** (테스트 진행 자체가 불가능한 경우):

1. main 워킹 디렉토리에서 코드를 수정하고, 브라우저에서 동작을 확인한다 (커밋하지 않는다)
2. 수정이 확인되면 `fix/<버그명>` 브랜치를 생성하고 커밋 → PR 생성한다
3. PR이 머지된 후 main을 pull하고 테스트를 이어서 진행한다

사용자에게 "커밋할까요?"를 묻지 않고, 수정 확인 후 바로 브랜치 → PR 프로세스를 진행한다.

**논크리티컬** (테스트 진행에는 지장 없는 경우):

1. GitHub 이슈를 생성하고 DOLinear 프로젝트에 등록한다 (Status: Todo)
2. 테스트를 이어서 진행한다

테스트 완료 후 사용자에게 발견된 버그 목록 (생성한 PR/이슈 포함)을 보고한다.

## 에이전트 협업

### 역할 정의

| 역할                     | 책임                                                                 |
| ------------------------ | -------------------------------------------------------------------- |
| **리더** (메인 에이전트) | 이슈 배분, 팀원 생성/종료, PR 머지, Status→Done 변경                 |
| **구현 에이전트**        | 이슈 구현, 테스트, PR 생성, 리뷰 서브에이전트 생성, 리뷰 피드백 반영 |

### 리뷰 프로세스

- 구현 에이전트는 PR 생성 후 자체적으로 리뷰용 서브에이전트(Task tool)를 생성한다
- 서브에이전트는 별도 컨텍스트에서 실행되므로 "자기 코드를 자기가 리뷰하지 않는다" 원칙이 유지된다
- 리뷰가 웨이브 내에서 자연스럽게 병렬화되어 병목이 발생하지 않는다

### Project Status 관리

- 구현 에이전트는 프로젝트 Status를 **In Progress**로만 변경한다
- **Done 변경은 리더(메인 에이전트)만 수행**하며, PR 머지 완료 후에만 변경한다
- PR 생성 ≠ 작업 완료. PR이 머지되어야 완료이다
- 리뷰 서브에이전트도 Status를 Done으로 변경하지 않는다

### 완료 조건 검증

- 이슈의 완료 조건에 런타임 검증(서버 기동, API 호출, 빌드 등)이 포함된 경우, **코드 리뷰만으로 완료로 판단하지 않는다**
- 리뷰 서브에이전트는 코드 리뷰에 더해 **런타임 검증도 실제로 수행**해야 한다 (서버 실행, curl 테스트 등)
- PR의 테스트 플랜에 미체크 항목이 있으면 LGTM을 주지 않는다
- 테스트 플랜의 모든 항목이 체크되어야 리뷰 완료로 간주한다

### PR 머지

- PR 머지는 **사용자의 명시적 승인 후에만** 수행한다 ("머지해줘" 등 직접적인 지시 필요)
- 사용자가 리뷰를 완료하지 않은 상태에서 선제적으로 머지하지 않는다
- 에이전트가 리뷰를 완료했더라도, 머지 권한은 사용자에게 있다

### 병렬 실행 & 웨이브 운영

- **웨이브** = 블로커가 모두 완료된 이슈 그룹 (의존관계 DAG의 같은 레벨)
- 웨이브 진행 시 반드시 `/github-operations` skill의 **"웨이브 진행 표준 절차"**를 따른다
- 이슈 쿼리는 skill에 정의된 **웨이브 조회 스크립트**를 그대로 사용한다 (인라인 쿼리/필터링 직접 구성 금지)
- 웨이브 내 이슈들은 Agent team을 사용하여 **병렬로 진행**한다
- 병렬 진행 시 각 이슈는 별도 worktree에서 작업한다

#### 워크트리 격리 규칙

병렬 에이전트는 각자 별도 워크트리에서 작업한다. **워크트리 생명주기는 리더가 전담**하며, 구현 에이전트는 워크트리를 생성/삭제하지 않는다. 다음 규칙을 반드시 준수한다:

**리더 (메인 에이전트):**

- **워크트리 생성**: 에이전트 스폰 **전에** `git worktree add .claude/worktrees/<agent-name> -b <branch> main` 실행
- **에이전트 스폰**: 프롬프트에 워크트리 절대 경로를 전달하고, 에이전트가 `cd`로 이동하도록 지시한다
- **PR 머지 순서**: 팀원 종료 → `git worktree remove <path>` → `gh pr merge <PR> --squash --delete-branch`
  - `gh pr merge --delete-branch`는 워크트리가 브랜치를 점유하면 실패한다 (GitHub CLI #3442). 반드시 워크트리를 먼저 제거한다
- `isolation: "worktree"` 옵션은 사용하지 않는다 (teammate에서 미동작)

**구현 에이전트:**

- 프롬프트에 지정된 워크트리 경로로 `cd`
- `pwd`로 `.claude/worktrees/` 하위인지 확인 (아니면 즉시 작업 중단 + 리더에게 보고)
- 셋업 순서: `cd <path>` → `pnpm install` → `pnpm db:setup` → `pnpm --filter api db:push`
- `git worktree add`, `git worktree remove`, `git checkout -b` 사용 금지
- 메인 레포 디렉토리로 `cd`하지 않는다

#### 웨이브 완료 & 전환

- 웨이브의 모든 PR이 머지되면, 최신 main에서 `pnpm build` + `pnpm --filter api test`를 수행하여 통합 상태를 검증한다
- 통합 검증에서 문제가 발견되면 수정 PR을 생성하여 해결한 후 다음 웨이브로 넘어간다
- 통합 검증이 통과하면 다음 웨이브로 즉시 진행한다

### 팀원 생명주기

- 팀원의 작업 완료 = PR 생성이 아니라 **PR 머지**이다
- PR 생성 후에도 리뷰 피드백 대응을 위해 팀원(구현 에이전트)을 유지한다
- 리뷰에서 코드 변경 요청이 오면 해당 구현 에이전트가 수정한다
- 리뷰 완료 + 사용자 머지 승인 후: 팀원 종료 → 워크트리 정리(`git worktree remove <path>`) → PR 머지(`gh pr merge <PR> --squash --delete-branch`)
- 사용자가 명시적으로 종료를 지시하면 즉시 제거 가능
