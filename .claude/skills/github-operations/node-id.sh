#!/bin/bash
# 이슈 번호로 GitHub 글로벌 Node ID를 조회한다.
# 사용법: bash .claude/skills/github-operations/node-id.sh <issue_number> [issue_number...]

OWNER="dolgim"
REPO="dolinear"

if [ $# -eq 0 ]; then
  echo "Usage: bash .claude/skills/github-operations/node-id.sh <issue_number> [issue_number...]"
  echo ""
  echo "Examples:"
  echo "  bash .claude/skills/github-operations/node-id.sh 42"
  echo "  bash .claude/skills/github-operations/node-id.sh 1 2 3"
  exit 1
fi

# alias 패턴으로 단일 쿼리 구성
QUERY_PARTS=""
for num in "$@"; do
  QUERY_PARTS+="i${num}: issue(number: ${num}) { id number title } "
done

gh api graphql \
  -f query="query { repository(owner: \"${OWNER}\", name: \"${REPO}\") { ${QUERY_PARTS} } }" \
  --jq '.data.repository | to_entries[] | .value | "#\(.number)  \(.id)  \(.title)"'
