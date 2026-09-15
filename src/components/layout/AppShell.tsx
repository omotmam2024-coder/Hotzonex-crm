import { LogOutIcon, MenuIcon, PlusIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useActivityModal } from '@/features/activities/ActivityModalProvider'
import { NotificationsBell } from '@/features/notifications/NotificationsBell'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { GlobalSearch } from './GlobalSearch'
import { rememberRoute } from './ProtectedRoute'
import { RouteErrorBoundary } from './RouteErrorBoundary'
import { NAV_ITEMS } from './nav-items'

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  agent: 'Agent',
  technician: 'Technician',
  viewer: 'Viewer',
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

export function AppShell() {
  const { profile, signOut } = useAuth()
  const { openLogActivity } = useActivityModal()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    rememberRoute(location.pathname)
  }, [location.pathname])

  const displayName = profile?.full_name || profile?.email || 'You'
  const roleLabel = profile ? (ROLE_LABEL[profile.role] ?? profile.role) : ''

  return (
    <div className="flex min-h-dvh bg-bg text-text">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-border bg-surface transition-all duration-200 md:flex',
          sidebarCollapsed ? 'w-16' : 'w-60',
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-sm font-bold text-accent">
            H
          </div>
          {!sidebarCollapsed && <span className="truncate text-sm font-semibold">Hotzonex CRM</span>}
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-accent/15 text-accent' : 'text-text-muted hover:bg-surface-2 hover:text-text',
                )
              }
            >
              <item.icon className="size-4.5 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-full justify-center"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setSidebarCollapsed((v) => !v)}
          >
            <MenuIcon className="size-4.5" />
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur no-print">
          <Link to="/" className="flex items-center gap-2 md:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-accent/15 text-sm font-bold text-accent">
              H
            </div>
            <span className="text-sm font-semibold">Hotzonex CRM</span>
          </Link>
          <div className="hidden md:block" />

          <div className="flex items-center gap-2">
            <GlobalSearch />
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => openLogActivity()}
              title="Log activity (shortcut: A)"
            >
              <PlusIcon className="size-4" /> <span className="hidden sm:inline">Log activity</span>
            </Button>

          <NotificationsBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2"
                aria-label="Account menu"
              >
                <Avatar className="size-8">
                  <AvatarFallback>{initials(displayName)}</AvatarFallback>
                </Avatar>
                <span className="hidden flex-col items-start leading-tight sm:flex">
                  <span className="text-sm font-medium">{displayName}</span>
                  <Badge variant="muted" className="px-1.5 py-0 text-[10px]">
                    {roleLabel}
                  </Badge>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium text-text">{displayName}</span>
                  <span className="text-xs text-text-muted">{profile?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
                <LogOutIcon />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 pb-20 md:pb-0">
          <RouteErrorBoundary route={location.pathname}>
            <Outlet />
          </RouteErrorBoundary>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 border-t border-border bg-surface no-print md:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium',
                isActive ? 'text-accent' : 'text-text-muted',
              )
            }
          >
            <item.icon className="size-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
