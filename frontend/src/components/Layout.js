import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  Home,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Users,
  AlertTriangle,
} from 'lucide-react'

const Layout = ({ children }) => {
  const { user, isGuest, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    setMobileMenuOpen(false)
  }

  const navItems = [
    { href: '/', label: 'Home', icon: Home, guestAllowed: true },
    {
      href: '/sos',
      label: 'Emergency SOS',
      icon: AlertTriangle,
      guestAllowed: true,
    },
    { href: '/profile', label: 'Profile', icon: User, guestAllowed: false },
  ]

  const adminNavItems = [
    { href: '/admin', label: 'Admin Dashboard', icon: Shield },
    { href: '/admin/services', label: 'Service Management', icon: Settings },
    { href: '/agent', label: 'Agent Dashboard', icon: Users },
  ]

  const isAdmin = user?.role === 'admin'
  const isAgent = user?.role === 'agent'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-red-600 text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🚨</span>
              <span className="text-xl font-bold">CrisisLink</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => {
                const IconComponent = item.icon
                const isAllowed = item.guestAllowed || !isGuest

                if (!isAllowed) return null

                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{item.label}</span>
                  </a>
                )
              })}

              {/* Admin Navigation */}
              {(isAdmin || isAgent) && (
                <div className="border-l border-red-500 pl-6 ml-6">
                  {adminNavItems.map((item) => {
                    const IconComponent = item.icon

                    // Show service management only to admins
                    if (item.href === '/admin/services' && !isAdmin) return null
                    // Show admin dashboard only to admins
                    if (item.href === '/admin' && !isAdmin) return null
                    // Show agent dashboard to both agents and admins

                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        className="inline-flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors mr-2"
                      >
                        <IconComponent className="h-4 w-4" />
                        <span>{item.label}</span>
                      </a>
                    )
                  })}
                </div>
              )}
            </div>

            {/* User Info & Controls */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Guest Mode Indicator */}
              {isGuest && (
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-yellow-500 text-yellow-900 rounded-full text-xs font-medium">
                    🚪 Guest Mode
                  </span>
                  <a href="/login" className="text-sm hover:underline">
                    Login for full access
                  </a>
                </div>
              )}

              {/* User Info */}
              {!isGuest && user && (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm">{user.name}</span>
                </div>
              )}

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>{isGuest ? 'Exit Guest' : 'Logout'}</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md hover:bg-red-700"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-red-500">
              <div className="space-y-2">
                {navItems.map((item) => {
                  const IconComponent = item.icon
                  const isAllowed = item.guestAllowed || !isGuest

                  if (!isAllowed) return null

                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <IconComponent className="h-4 w-4" />
                      <span>{item.label}</span>
                    </a>
                  )
                })}

                {/* Admin Navigation Mobile */}
                {(isAdmin || isAgent) && (
                  <>
                    <div className="border-t border-red-500 pt-2 mt-2">
                      {adminNavItems.map((item) => {
                        const IconComponent = item.icon

                        if (item.href === '/admin/services' && !isAdmin)
                          return null
                        if (item.href === '/admin' && !isAdmin) return null

                        return (
                          <a
                            key={item.href}
                            href={item.href}
                            className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <IconComponent className="h-4 w-4" />
                            <span>{item.label}</span>
                          </a>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* User Info & Logout Mobile */}
                <div className="border-t border-red-500 pt-2 mt-2">
                  {isGuest && (
                    <div className="px-3 py-2">
                      <span className="px-2 py-1 bg-yellow-500 text-yellow-900 rounded-full text-xs font-medium">
                        🚪 Guest Mode
                      </span>
                      <a
                        href="/login"
                        className="block text-sm hover:underline mt-1"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Login for full access
                      </a>
                    </div>
                  )}

                  {!isGuest && user && (
                    <div className="px-3 py-2 text-sm border-b border-red-500">
                      Logged in as: {user.name}
                    </div>
                  )}

                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 w-full text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{isGuest ? 'Exit Guest Mode' : 'Logout'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="bg-gray-800 text-white py-4 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            © 2025 CrisisLink - Emergency Response System for South Africa
          </p>
          {isGuest && (
            <p className="text-xs text-gray-400 mt-1">
              Running in Guest Mode -{' '}
              <a href="/register" className="hover:underline">
                Create account
              </a>{' '}
              for full features
            </p>
          )}
        </div>
      </footer>
    </div>
  )
}

export default Layout
