import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <span className="flex items-center gap-2 text-lg font-semibold">
            <img src="/logo.svg" alt="" className="h-6 w-6" aria-hidden="true" />
            GP Tenders
          </span>
          <NavLink
            to="/tenders"
            className={({ isActive }) =>
              cn(
                'text-sm font-medium transition-colors hover:text-foreground',
                isActive ? 'text-foreground' : 'text-muted-foreground',
              )
            }
          >
            Tenders
          </NavLink>
          <NavLink
            to="/runs"
            className={({ isActive }) =>
              cn(
                'text-sm font-medium transition-colors hover:text-foreground',
                isActive ? 'text-foreground' : 'text-muted-foreground',
              )
            }
          >
            Runs
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'text-sm font-medium transition-colors hover:text-foreground',
                isActive ? 'text-foreground' : 'text-muted-foreground',
              )
            }
          >
            Settings
          </NavLink>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
