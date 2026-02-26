#!/bin/bash
# Sub-issues 관리: 조회, 추가, 제거
# 사용법: bash .claude/skills/github-operations/sub-issues.sh <command> [args...]

OWNER="dolgim"
REPO="dolinear"
HEADER=(-H "GraphQL-Features: sub_issues")

case "${1:-}" in
  query)
    # 특정 이슈의 서브이슈 목록 조회
    # 사용법: sub-issues.sh query <issue_number>
    if [ -z "${2:-}" ]; then
      echo "Usage: sub-issues.sh query <issue_number>"
      exit 1
    fi
    gh api graphql "${HEADER[@]}" \
      -f query="query {
        repository(owner: \"${OWNER}\", name: \"${REPO}\") {
          issue(number: ${2}) {
            title
            subIssues(first: 50) {
              nodes { id number title state }
            }
          }
        }
      }"
    ;;

  add)
    # 서브이슈 추가 (Node ID 필요 — node-id.sh로 먼저 조회)
    # 사용법: sub-issues.sh add <parent_node_id> <child_node_id>
    if [ -z "${2:-}" ] || [ -z "${3:-}" ]; then
      echo "Usage: sub-issues.sh add <parent_node_id> <child_node_id>"
      exit 1
    fi
    gh api graphql "${HEADER[@]}" \
      -f query="mutation {
        addSubIssue(input: { issueId: \"${2}\", subIssueId: \"${3}\" }) {
          issue { title }
          subIssue { title }
        }
      }"
    ;;

  remove)
    # 서브이슈 제거 (Node ID 필요)
    # 사용법: sub-issues.sh remove <parent_node_id> <child_node_id>
    if [ -z "${2:-}" ] || [ -z "${3:-}" ]; then
      echo "Usage: sub-issues.sh remove <parent_node_id> <child_node_id>"
      exit 1
    fi
    gh api graphql "${HEADER[@]}" \
      -f query="mutation {
        removeSubIssue(input: { issueId: \"${2}\", subIssueId: \"${3}\" }) {
          issue { title }
          subIssue { title }
        }
      }"
    ;;

  *)
    echo "Sub-issues 관리"
    echo ""
    echo "Usage: bash .claude/skills/github-operations/sub-issues.sh <command> [args...]"
    echo ""
    echo "Commands:"
    echo "  query <issue_number>                     서브이슈 목록 조회"
    echo "  add <parent_node_id> <child_node_id>     서브이슈 추가"
    echo "  remove <parent_node_id> <child_node_id>  서브이슈 제거"
    echo ""
    echo "add/remove는 Node ID가 필요합니다. node-id.sh로 먼저 조회하세요."
    exit 1
    ;;
esac
