import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <span className="text-lg font-semibold">RFP Web</span>
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
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
