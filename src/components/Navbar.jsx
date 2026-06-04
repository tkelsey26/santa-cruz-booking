import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function Navbar() {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  function NavLink({ to, children }) {
    const active = location.pathname === to
    return (
      <Link
        to={to}
        className={cn(
          'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
          active
            ? 'bg-white/20 text-white'
            : 'text-sea-100 hover:bg-white/10 hover:text-white'
        )}
      >
        {children}
      </Link>
    )
  }

  return (
    <header className="bg-sea-600 border-b border-sea-700 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand + nav */}
          <div className="flex items-center gap-1">
            <span className="text-white font-semibold text-sm mr-3 tracking-wide">
              🏠 Santa Cruz
            </span>
            <NavLink to="/">Calendar</NavLink>
            <NavLink to="/my-bookings">My Bookings</NavLink>
            {isAdmin && <NavLink to="/admin">Admin</NavLink>}
          </div>

          {/* User info + sign out */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-sea-100 text-sm">{profile?.full_name}</span>
              {isAdmin && <Badge variant="admin">Admin</Badge>}
              {profile?.role === 'priority_guest' && <Badge variant="priority">Priority</Badge>}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="border-sea-400 text-sea-100 bg-transparent hover:bg-white/10 hover:text-white hover:border-sea-300"
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
