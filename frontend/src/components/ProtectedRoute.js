import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import LoginPage from '../pages/LoginPage'

const ProtectedRoute = ({ children, requiredRole, allowGuest = true }) => {
  const { user, loading, isGuest } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  // Check role-based access
  if (requiredRole) {
    // Guest users cannot access admin/agent routes
    if (isGuest && (requiredRole === 'admin' || requiredRole === 'agent')) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 mb-4">🚫</div>
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-gray-600 mb-4">
              Please log in with a registered account to access this feature.
            </p>
            <button
              onClick={() => (window.location.href = '/login')}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Go to Login
            </button>
          </div>
        </div>
      )
    }

    // Check if user has required role
    if (user.role !== requiredRole && user.role !== 'admin') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 mb-4">🚫</div>
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600">
              You don't have permission to access this area.
            </p>
          </div>
        </div>
      )
    }
  }

  // Check if guest access is allowed for this route
  if (isGuest && !allowGuest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-600 mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Registration Required</h2>
          <p className="text-gray-600 mb-4">
            Please create an account to access this feature.
          </p>
          <button
            onClick={() => (window.location.href = '/register')}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Register Now
          </button>
        </div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute
