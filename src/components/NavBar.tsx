import { useLocation } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'

interface Crumb {
  label: string
}

function getBreadcrumb(pathname: string): Crumb[] {
  if (pathname === '/') return [{ label: 'Home' }]
  if (pathname === '/editor') return [{ label: 'Home' }, { label: 'New Test' }]
  if (pathname.startsWith('/editor/')) return [{ label: 'Home' }, { label: 'Edit Test' }]
  if (pathname.startsWith('/setup/')) return [{ label: 'Home' }, { label: 'Practice Setup' }]
  if (pathname.startsWith('/session/')) return [{ label: 'Home' }, { label: 'Practice' }]
  if (pathname.startsWith('/results/')) return [{ label: 'Home' }, { label: 'Results' }]
  return [{ label: 'Home' }]
}

export function NavBar() {
  const { pathname } = useLocation()
  const crumbs = getBreadcrumb(pathname)

  return (
    <div className="h-10 border-b bg-card/80 backdrop-blur px-5 flex items-center justify-between shrink-0 z-10">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ClipboardList className="w-4 h-4 text-primary" />
        <span>Quiz Practice</span>
      </div>
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1 text-xs text-muted-foreground">
          {crumbs.map((c, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <span className="select-none">›</span>}
              <span className={i === crumbs.length - 1 ? 'text-foreground font-medium' : ''}>
                {c.label}
              </span>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}
