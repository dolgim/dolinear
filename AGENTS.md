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

## 개발 명령어

<!-- 이슈 작업 중 새 명령어가 추가되면 이 섹션을 업데이트할 것 -->

(아직 프로젝트 초기화 전 — 이슈 #1~#10 진행에 따라 채워질 예정)

## Git 워크플로우

**중요**: 각 기능은 별도의 브랜치에서 작업하고 PR을 통해 main에 머지합니다. Claude Code 실행 시 `--worktree` 옵션을 사용하므로 worktree 관리는 자동으로 처리됩니다.

### PR 생성

```bash
gh pr create --title "제목" --body "설명"
```

### 브랜치 네이밍 컨벤션

- `feature/<기능명>`: 새로운 기능 추가
- `fix/<버그명>`: 버그 수정
- `refactor/<내용>`: 리팩토링
- `docs/<내용>`: 문서 업데이트

## 이슈 및 프로젝트 관리

GitHub Issues + GitHub Projects로 관리합니다.

### GitHub Project

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

### GitHub Issues

- 작업 시작 시 해당 이슈를 확인하고 체크리스트를 따른다
- 작업 시작 시 프로젝트 Status를 **In Progress**로 변경한다
- PR 생성 시 `Closes #N`으로 이슈를 참조한다
- 작업 완료 시 프로젝트 Status를 **Done**으로 변경한다
- 이슈 간 의존관계(blocked-by)가 설정되어 있으므로 순서를 지킨다

### 병렬 실행 원칙

- 작업 시작 전 GraphQL `blockedBy`/`blocking` 필드를 조회하여 의존관계 DAG를 파악한다 (`/github-operations` skill 참조)
- 블로커가 모두 완료된(closed) 이슈는 가급적 **병렬로 진행**한다
- 병렬 진행 시 각 이슈는 별도 worktree에서 작업한다

## 작업 시 주의사항

1. **타입 정의**: `packages/shared`에 공통 타입을 중앙화한다
2. **모노레포 패키지 추가**:
   - 워크스페이스 루트: `pnpm add -w <package>`
   - 특정 패키지: `pnpm --filter <pkg> add <package>`
3. **최신 라이브러리**: 새 의존성 추가 시 최신 버전을 사용한다
4. **AGENTS.md 유지보수**: 이슈 작업 중 새 명령어, 패턴, 컨벤션이 생기면 이 파일을 업데이트한다

## 작업 규칙

### ✅ DO

- **새 기능은 항상 별도 브랜치에서 작업**하고 PR을 통해 머지한다
- 한 번에 하나의 이슈씩 구현하고, 동작 확인 후 다음으로 넘어간다
- 이슈의 체크리스트와 완료 조건을 충족시킨다
- 기존 코드의 패턴과 컨벤션을 따른다
- PR 생성 시 테스트 결과를 포함한다
- 작업 완료 시 lint와 TypeScript 타입 에러가 없는지 확인한다

### ❌ DON'T

- main 브랜치에 직접 커밋하지 않는다 (문서 업데이트 제외)
- 여러 이슈를 한꺼번에 구현하지 않는다
- 동작 검증 없이 다음 단계로 넘어가지 않는다
- 이슈의 의존관계(blocked-by)를 무시하고 순서를 건너뛰지 않는다
