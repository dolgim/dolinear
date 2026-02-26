#!/bin/bash
# GitHub Project의 Todo 이슈에서 현재 진행 가능한 웨이브를 조회한다.
# 사용법: bash .claude/skills/github-operations/query-waves.sh

gh api graphql -f query='query {
  user(login: "dolgim") {
    projectV2(number: 4) {
      items(first: 50) {
        nodes {
          fieldValueByName(name: "Status") {
            ... on ProjectV2ItemFieldSingleSelectValue {
              name
            }
          }
          content {
            ... on Issue {
              number
              title
              state
              blockedBy(first: 10) { nodes { number title state } }
              blocking(first: 10) { nodes { number title state } }
            }
          }
        }
      }
    }
  }
}' --jq '
  .data.user.projectV2.items.nodes
  | map(select(.content.number > 0))
  | map({
      number: .content.number,
      title: .content.title,
      status: (.fieldValueByName.name // "No Status"),
      blockedBy: .content.blockedBy.nodes,
      blocking: .content.blocking.nodes
    })
  | map(select(.status == "Todo"))
  | map(
      . + {
        allBlockersResolved: ((.blockedBy | length == 0) or (.blockedBy | all(.state == "CLOSED"))),
        blockerSummary: [.blockedBy[] | "#\(.number)(\(.state))"]
      }
    )
  | group_by(.allBlockersResolved)
  | reverse
  | .[]
  | if .[0].allBlockersResolved then "=== Current Wave (unblocked) ===" else "=== Blocked ===" end,
    (.[] | "#\(.number)  \(.title)  blockedBy: \(.blockerSummary)")
'
