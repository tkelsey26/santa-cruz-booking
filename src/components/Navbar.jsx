import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          active
            ? 'bg-indigo-700 text-white'
            : 'text-indigo-100 hover:bg-indigo-700 hover:text-white'
        }`}
      >
        {children}
      </Link>
    )
  }

  return (
    <nav className="bg-indigo-600 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-1">
            <span className="text-white font-semibold mr-3">🏠 Santa Cruz House</span>
            <NavLink to="/">Calendar</NavLink>
            <NavLink to="/my-bookings">My Bookings</NavLink>
            {isAdmin && <NavLink to="/admin">Admin</NavLink>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-indigo-200 text-sm hidden sm:block">
              {profile?.full_name}
              {isAdmin && (
                <span className="ml-1.5 text-xs bg-indigo-800 text-indigo-200 px-1.5 py-0.5 rounded">
                  Admin
                </span>
              )}
              {profile?.role === 'priority_guest' && (
                <span className="ml-1.5 text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded">
                  Priority
                </span>
              )}
            </span>
            <button
              onClick={handleSignOut}
              className="text-indigo-200 hover:text-white text-sm px-3 py-1.5 rounded-md border border-indigo-400 hover:border-indigo-200 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
