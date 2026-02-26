import { useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useWorkspaces } from '@/hooks/use-workspaces'
import { useTeams } from '@/hooks/use-teams'
import { authClient } from '@/lib/auth'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui'
import type { Workspace, Team } from '@dolinear/shared'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as {
    workspaceSlug?: string
    teamIdentifier?: string
  }
  const currentSlug = params.workspaceSlug
  const { data: workspaces } = useWorkspaces()
  const currentWorkspace = workspaces?.find((ws) => ws.slug === currentSlug)
  const { data: teams } = useTeams(currentWorkspace?.id ?? '')

  const handleLogout = async () => {
    await authClient.signOut()
    navigate({ to: '/login' })
  }

  return (
    <aside
      data-testid="sidebar"
      className={`flex flex-col border-r border-white/10 bg-[#0f0f23] transition-[width] duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Workspace switcher */}
      <div className="flex h-12 items-center justify-between px-4 border-b border-white/10">
        {!collapsed && currentSlug && (
          <WorkspaceSwitcher
            workspaces={workspaces ?? []}
            currentWorkspace={currentWorkspace}
          />
        )}
        {!collapsed && !currentSlug && (
          <span className="text-sm font-bold text-white tracking-wide">
            DOLinear
          </span>
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {!collapsed && currentSlug && (
          <ul className="space-y-1">
            <li>
              <Link
                to="/workspace/$workspaceSlug/my-issues"
                params={{ workspaceSlug: currentSlug }}
                className="flex items-center rounded px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200"
                activeProps={{ className: 'bg-white/10 text-white' }}
              >
                My Issues
              </Link>
            </li>
            {/* Team list */}
            {teams?.map((team) => (
              <TeamSection
                key={team.id}
                team={team}
                workspaceSlug={currentSlug}
                activeTeamIdentifier={params.teamIdentifier}
              />
            ))}
          </ul>
        )}
        {!collapsed && !currentSlug && (
          <ul className="space-y-1">
            <li>
              <span className="block rounded px-3 py-1.5 text-sm text-gray-400">
                Select a workspace
              </span>
            </li>
          </ul>
        )}
      </nav>

      {/* Logout button */}
      <div className="p-2 border-t border-white/10">
        <button
          onClick={handleLogout}
          className={`flex items-center rounded px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200 w-full ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {collapsed ? '⏻' : 'Log out'}
        </button>
      </div>
    </aside>
  )
}

function WorkspaceSwitcher({
  workspaces,
  currentWorkspace,
}: {
  workspaces: Workspace[]
  currentWorkspace: Workspace | undefined
}) {
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="workspace-switcher"
          className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-sm font-bold text-white hover:bg-white/10 truncate max-w-[160px]"
        >
          <span className="truncate">
            {currentWorkspace?.name ?? 'Workspace'}
          </span>
          <span className="text-gray-500 text-xs">▾</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onSelect={() =>
              navigate({
                to: '/workspace/$workspaceSlug/my-issues',
                params: { workspaceSlug: ws.slug },
              })
            }
          >
            <span className="truncate">{ws.name}</span>
            {ws.slug === currentWorkspace?.slug && (
              <span className="ml-auto text-xs text-indigo-400">✓</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: '/dashboard' })}>
          All workspaces
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TeamSection({
  team,
  workspaceSlug,
  activeTeamIdentifier,
}: {
  team: Team
  workspaceSlug: string
  activeTeamIdentifier?: string
}) {
  const isActive = team.identifier === activeTeamIdentifier
  const [expanded, setExpanded] = useState(isActive)

  return (
    <li>
      <button
        onClick={() => setExpanded((prev) => !prev)}
        data-testid={`team-toggle-${team.identifier}`}
        className="flex w-full items-center rounded px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200"
      >
        <span className="mr-1.5 text-xs text-gray-500">
          {expanded ? '▼' : '▶'}
        </span>
        <span className="truncate font-medium">{team.name}</span>
      </button>
      {expanded && (
        <ul
          className="ml-4 space-y-0.5"
          data-testid={`team-links-${team.identifier}`}
        >
          <li>
            <Link
              to="/workspace/$workspaceSlug/team/$teamIdentifier/issues"
              params={{ workspaceSlug, teamIdentifier: team.identifier }}
              className="block rounded px-3 py-1 text-sm text-gray-500 hover:bg-white/5 hover:text-gray-300"
              activeProps={{ className: 'bg-white/10 text-white' }}
            >
              Issues
            </Link>
          </li>
          <li>
            <Link
              to="/workspace/$workspaceSlug/team/$teamIdentifier/active"
              params={{ workspaceSlug, teamIdentifier: team.identifier }}
              className="block rounded px-3 py-1 text-sm text-gray-500 hover:bg-white/5 hover:text-gray-300"
              activeProps={{ className: 'bg-white/10 text-white' }}
            >
              Active
            </Link>
          </li>
          <li>
            <Link
              to="/workspace/$workspaceSlug/team/$teamIdentifier/backlog"
              params={{ workspaceSlug, teamIdentifier: team.identifier }}
              className="block rounded px-3 py-1 text-sm text-gray-500 hover:bg-white/5 hover:text-gray-300"
              activeProps={{ className: 'bg-white/10 text-white' }}
            >
              Backlog
            </Link>
          </li>
        </ul>
      )}
    </li>
  )
}
