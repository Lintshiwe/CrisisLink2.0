import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import SOSButton from '../components/SOSButton'
import { AlertTriangle, Shield } from 'lucide-react'

const HomePage = () => {
  const { user, isGuest } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-red-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-red-600 mb-4">
            🚨 CrisisLink
          </h1>
          <p className="text-lg text-gray-700 mb-4">
            One-Tap Emergency Response System
          </p>

          {/* Welcome Message */}
          {isGuest ? (
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-center text-yellow-800">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <p className="text-sm">
                  <strong>Guest Mode:</strong> You have access to basic
                  emergency features.
                  <a
                    href="/register"
                    className="ml-1 underline hover:text-yellow-900"
                  >
                    Create an account
                  </a>{' '}
                  for full functionality.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-center text-green-800">
                <Shield className="h-5 w-5 mr-2" />
                <p className="text-sm">
                  <strong>Welcome back, {user?.name}!</strong> You have full
                  access to all emergency response features.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Main SOS Button */}
        <div className="flex justify-center mb-12">
          <SOSButton />
        </div>

        {/* Features Grid */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-8">
            Available Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Emergency SOS */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
              <div className="text-3xl mb-4">🆘</div>
              <h3 className="text-lg font-semibold mb-2">Instant SOS</h3>
              <p className="text-gray-600 mb-4">
                One-tap emergency alerts with GPS location
              </p>
              {isGuest && (
                <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  ✓ Available in Guest Mode
                </span>
              )}
            </div>

            {/* Live Tracking */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
              <div className="text-3xl mb-4">📍</div>
              <h3 className="text-lg font-semibold mb-2">Live Tracking</h3>
              <p className="text-gray-600 mb-4">
                Real-time location tracking for emergency responders
              </p>
              {isGuest ? (
                <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                  ⚠️ Limited in Guest Mode
                </span>
              ) : (
                <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  ✓ Full Access
                </span>
              )}
            </div>

            {/* Weather Monitoring */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-500">
              <div className="text-3xl mb-4">🌡️</div>
              <h3 className="text-lg font-semibold mb-2">Weather Alerts</h3>
              <p className="text-gray-600 mb-4">
                Real-time weather monitoring and warnings
              </p>
              {isGuest && (
                <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  ✓ Available in Guest Mode
                </span>
              )}
            </div>

            {/* Profile Management */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
              <div className="text-3xl mb-4">👤</div>
              <h3 className="text-lg font-semibold mb-2">Profile & Settings</h3>
              <p className="text-gray-600 mb-4">
                Manage personal information and emergency contacts
              </p>
              {isGuest ? (
                <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                  🚫 Requires Account
                </span>
              ) : (
                <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  ✓ Full Access
                </span>
              )}
            </div>

            {/* Communication */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-teal-500">
              <div className="text-3xl mb-4">�</div>
              <h3 className="text-lg font-semibold mb-2">Live Support</h3>
              <p className="text-gray-600 mb-4">
                Direct communication with emergency responders
              </p>
              {isGuest ? (
                <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                  ⚠️ Basic Chat Only
                </span>
              ) : (
                <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  ✓ Full Communication
                </span>
              )}
            </div>

            {/* History & Reports */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-indigo-500">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-lg font-semibold mb-2">History & Reports</h3>
              <p className="text-gray-600 mb-4">
                View past incidents and generate safety reports
              </p>
              {isGuest ? (
                <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                  🚫 Requires Account
                </span>
              ) : (
                <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  ✓ Full Access
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Call to Action for Guest Users */}
        {isGuest && (
          <div className="mt-12 text-center">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                🌟 Get Full Access to CrisisLink
              </h3>
              <p className="text-gray-600 mb-6">
                Create a free account to unlock all emergency response features,
                save your profile information, and get personalized safety
                recommendations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/register"
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Create Free Account
                </a>
                <a
                  href="/login"
                  className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-300"
                >
                  Sign In to Existing Account
                </a>
              </div>
            </div>
          </div>
        )}

        {/* System Status for All Users */}
        <div className="mt-12">
          <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">
                  System Status: Operational
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500">Emergency Services</p>
                <p className="text-sm font-medium text-green-600">✓ Online</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">GPS Tracking</p>
                <p className="text-sm font-medium text-green-600">✓ Active</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Weather Data</p>
                <p className="text-sm font-medium text-green-600">✓ Updated</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Communications</p>
                <p className="text-sm font-medium text-green-600">✓ Ready</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
