import { useNavigate } from '@tanstack/react-router'
import { authClient } from '@/lib/auth'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate()

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
      {/* Logo area */}
      <div className="flex h-12 items-center justify-between px-4 border-b border-white/10">
        {!collapsed && (
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

      {/* Navigation placeholder */}
      <nav className="flex-1 overflow-y-auto p-2">
        {!collapsed && (
          <ul className="space-y-1">
            <li>
              <span className="block rounded px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200 cursor-default">
                My Issues
              </span>
            </li>
            <li>
              <span className="block rounded px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200 cursor-default">
                Projects
              </span>
            </li>
            <li>
              <span className="block rounded px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200 cursor-default">
                Views
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
