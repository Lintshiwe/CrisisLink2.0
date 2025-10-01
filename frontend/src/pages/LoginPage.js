import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'react-hot-toast'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const { login, loginAsGuest } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await login(email, password)
      if (result.success) {
        toast.success('Successfully logged in!')
        // Redirect will be handled by App.js auth check
      } else {
        toast.error(result.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login failed:', error)
      toast.error('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGuestAccess = async () => {
    setGuestLoading(true)
    try {
      const result = loginAsGuest()
      if (result.success) {
        toast.success("Welcome! You're using guest mode.")
        // Redirect will be handled by App.js auth check
      }
    } catch (error) {
      console.error('Guest access failed:', error)
      toast.error('Guest access failed. Please try again.')
    } finally {
      setGuestLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-red-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-red-600 mb-2">
            🚨 CrisisLink
          </h1>
          <p className="text-gray-600">Emergency Response Login</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || guestLoading}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Guest Access Section */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          <button
            onClick={handleGuestAccess}
            disabled={loading || guestLoading}
            className="mt-4 w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 transition-colors border border-gray-300"
          >
            {guestLoading ? 'Accessing...' : '🚪 Continue as Guest'}
          </button>
        </div>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600">
            Guest mode provides basic emergency features
          </p>
          <p className="text-xs text-gray-500">
            For full access, please create an account or contact your
            administrator
          </p>
          <a
            href="/register"
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            Create Account
          </a>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
