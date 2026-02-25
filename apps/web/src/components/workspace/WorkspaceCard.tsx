import type { Workspace } from '@dolinear/shared'

interface WorkspaceCardProps {
  workspace: Workspace
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  return (
    <a
      href={`/workspace/${workspace.slug}`}
      className="block rounded-lg border border-gray-800 bg-[#16162a] p-6 transition-colors hover:border-gray-700"
    >
      <h3 className="text-lg font-semibold text-white">{workspace.name}</h3>
      <p className="mt-1 text-sm text-gray-400">{workspace.slug}</p>
    </a>
  )
}
