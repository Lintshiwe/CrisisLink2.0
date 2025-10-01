import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)

  const login = async (email, password) => {
    try {
      // Mock login - replace with actual authentication
      const mockUser = {
        id: 1,
        email,
        name: 'Test User',
        phone: '+27123456789',
        role: 'user',
      }
      setUser(mockUser)
      setIsGuest(false)
      localStorage.setItem('user', JSON.stringify(mockUser))
      localStorage.removeItem('guestMode')
      return { success: true, user: mockUser }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const loginAsGuest = () => {
    const guestUser = {
      id: 'guest-' + Date.now(),
      name: 'Guest User',
      email: 'guest@crisislink.com',
      phone: '',
      role: 'guest',
    }
    setUser(guestUser)
    setIsGuest(true)
    localStorage.setItem('user', JSON.stringify(guestUser))
    localStorage.setItem('guestMode', 'true')
    return { success: true, user: guestUser }
  }

  const logout = () => {
    setUser(null)
    setIsGuest(false)
    localStorage.removeItem('user')
    localStorage.removeItem('guestMode')
  }

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem('user')
    const guestMode = localStorage.getItem('guestMode')

    if (storedUser) {
      const userData = JSON.parse(storedUser)
      setUser(userData)
      setIsGuest(guestMode === 'true' || userData.role === 'guest')
    }
    setLoading(false)
  }, [])

  const value = {
    user,
    login,
    loginAsGuest,
    logout,
    loading,
    isGuest,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
