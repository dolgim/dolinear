---
name: github-operations
description: GitHub GraphQL API 패턴 — sub-issues, blocked-by, node ID 조회 등 gh CLI로 직접 지원되지 않는 기능의 레퍼런스
---

# GitHub Operations Reference

`gh` CLI에서 직접 지원하지 않는 GitHub 기능들의 GraphQL API 레퍼런스.

## Node ID 조회

GitHub GraphQL mutation은 이슈 번호(`number`, 예: #42)가 아닌 **글로벌 Node ID**(`id`, 예: `I_kwDO...` Base64 문자열)를 요구한다. 이슈 번호로 먼저 조회해서 `id`를 얻는다:

```bash
# 특정 이슈 번호로 Node ID 조회
gh api graphql -f query='query {
  repository(owner: "OWNER", name: "REPO") {
    issue(number: 42) {
      id
      title
    }
  }
}'
```

## Sub-Issues

GitHub의 sub-issue 기능은 **GraphQL 전용**이며, `GraphQL-Features: sub_issues` 헤더가 **필수**다.

### 서브이슈 추가

```bash
gh api graphql \
  -H "GraphQL-Features: sub_issues" \
  -f query='mutation {
    addSubIssue(input: { issueId: "<parent_node_id>", subIssueId: "<child_node_id>" }) {
      issue { title }
      subIssue { title }
    }
  }'
```

### 서브이슈 제거

```bash
gh api graphql \
  -H "GraphQL-Features: sub_issues" \
  -f query='mutation {
    removeSubIssue(input: { issueId: "<parent_node_id>", subIssueId: "<child_node_id>" }) {
      issue { title }
      subIssue { title }
    }
  }'
```

## Blocked-By (이슈 의존관계)

이슈 간 blocking 관계 설정. 헤더 불필요.

### 의존관계 추가

```bash
gh api graphql \
  -f query='mutation {
    addBlockedBy(input: { issueId: "<blocked_node_id>", blockingIssueId: "<blocking_node_id>" }) {
      issue { title }
      blockingIssue { title }
    }
  }'
```

### 의존관계 제거

```bash
gh api graphql \
  -f query='mutation {
    removeBlockedBy(input: { issueId: "<blocked_node_id>", blockingIssueId: "<blocking_node_id>" }) {
      issue { title }
      blockingIssue { title }
    }
  }'
```

## 주의사항

- Sub-issues API는 `GraphQL-Features: sub_issues` 헤더 없이 호출하면 실패한다
- Node ID는 이슈 번호와 다르다 — 반드시 별도 쿼리로 조회
- `gh` CLI에는 sub-issue, blocked-by 관련 네이티브 명령이 없다
- 여러 mutation을 병렬로 실행할 때는 각각 별도의 `gh api graphql` 호출을 사용한다
