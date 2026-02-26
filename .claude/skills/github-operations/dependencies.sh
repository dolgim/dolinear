#!/bin/bash
# 이슈 의존관계(blocked-by) 관리: 조회, 추가, 제거
# 사용법: bash .claude/skills/github-operations/dependencies.sh <command> [args...]

OWNER="dolgim"
REPO="dolinear"

case "${1:-}" in
  query-all)
    # 모든 open 이슈의 의존관계를 한 번에 조회
    # 사용법: dependencies.sh query-all
    gh api graphql \
      -f query="query {
        repository(owner: \"${OWNER}\", name: \"${REPO}\") {
          issues(first: 50, filterBy: {states: OPEN}) {
            nodes {
              number
              title
              blockedBy(first: 10) { nodes { number title state } }
              blocking(first: 10) { nodes { number title state } }
            }
          }
        }
      }" \
      --jq '.data.repository.issues.nodes[] | "#\(.number) \(.title) | blockedBy: \([.blockedBy.nodes[] | "#\(.number)(\(.state))"]) | blocking: \([.blocking.nodes[] | "#\(.number)(\(.state))"])"'
    ;;

  query)
    # 특정 이슈들의 의존관계 조회 (alias 패턴)
    # 사용법: dependencies.sh query <issue_number> [issue_number...]
    shift
    if [ $# -eq 0 ]; then
      echo "Usage: dependencies.sh query <issue_number> [issue_number...]"
      exit 1
    fi
    QUERY_PARTS=""
    for num in "$@"; do
      QUERY_PARTS+="i${num}: issue(number: ${num}) { number title blockedBy(first:10) { nodes { number state } } blocking(first:10) { nodes { number state } } } "
    done
    gh api graphql \
      -f query="query { repository(owner: \"${OWNER}\", name: \"${REPO}\") { ${QUERY_PARTS} } }" \
      --jq '.data.repository | to_entries[] | .value | "#\(.number) \(.title) | blockedBy: \([.blockedBy.nodes[] | "#\(.number)(\(.state))"]) | blocking: \([.blocking.nodes[] | "#\(.number)(\(.state))"])"'
    ;;

  add)
    # 의존관계 추가 (Node ID 필요 — node-id.sh로 먼저 조회)
    # 사용법: dependencies.sh add <blocked_node_id> <blocking_node_id>
    if [ -z "${2:-}" ] || [ -z "${3:-}" ]; then
      echo "Usage: dependencies.sh add <blocked_node_id> <blocking_node_id>"
      echo "  blocked_node_id  = 블로킹 당하는 이슈 (이 이슈가 차단됨)"
      echo "  blocking_node_id = 블로킹 하는 이슈 (이 이슈가 선행 조건)"
      exit 1
    fi
    gh api graphql \
      -f query="mutation {
        addBlockedBy(input: { issueId: \"${2}\", blockingIssueId: \"${3}\" }) {
          issue { title }
          blockingIssue { title }
        }
      }"
    ;;

  remove)
    # 의존관계 제거 (Node ID 필요)
    # 사용법: dependencies.sh remove <blocked_node_id> <blocking_node_id>
    if [ -z "${2:-}" ] || [ -z "${3:-}" ]; then
      echo "Usage: dependencies.sh remove <blocked_node_id> <blocking_node_id>"
      exit 1
    fi
    gh api graphql \
      -f query="mutation {
        removeBlockedBy(input: { issueId: \"${2}\", blockingIssueId: \"${3}\" }) {
          issue { title }
          blockingIssue { title }
        }
      }"
    ;;

  *)
    echo "이슈 의존관계(blocked-by) 관리"
    echo ""
    echo "Usage: bash .claude/skills/github-operations/dependencies.sh <command> [args...]"
    echo ""
    echo "Commands:"
    echo "  query-all                                    모든 open 이슈 의존관계 조회"
    echo "  query <issue_number> [issue_number...]       특정 이슈 의존관계 조회"
    echo "  add <blocked_node_id> <blocking_node_id>     의존관계 추가"
    echo "  remove <blocked_node_id> <blocking_node_id>  의존관계 제거"
    echo ""
    echo "add/remove는 Node ID가 필요합니다. node-id.sh로 먼저 조회하세요."
    exit 1
    ;;
esac
