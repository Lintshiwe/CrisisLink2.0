import React, { useState, useEffect } from 'react'
import { useSocket } from '../contexts/SocketContext'
import { useLocation } from '../contexts/LocationContext'
import toast from 'react-hot-toast'

const TestTrackingPage = () => {
  const { socket, isConnected, sendEmergencyAlert, updateUserStatus } =
    useSocket()
  const { currentLocation } = useLocation()
  const [userName, setUserName] = useState(
    localStorage.getItem('userName') || ''
  )
  const [userStatus, setUserStatus] = useState('active')
  const [emergencyType, setEmergencyType] = useState('medical')
  const [description, setDescription] = useState('Test emergency alert')

  useEffect(() => {
    if (userName) {
      localStorage.setItem('userName', userName)
    }
  }, [userName])

  const handleRegisterUser = () => {
    if (!userName) {
      toast.error('Please enter your name first')
      return
    }

    const userData = {
      userId: `USER-${Date.now()}`,
      name: userName,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName)}`,
      company: 'Frontend Test User',
      deviceInfo: `${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'} Test App v2.1.0`,
      socketId: socket?.id,
    }

    localStorage.setItem('crisisLinkUserId', userData.userId)
    localStorage.setItem('userName', userName)

    if (socket) {
      socket.emit('user-register', userData)
      toast.success(`Registered as ${userName}`)
    }
  }

  const handleLocationUpdate = () => {
    if (navigator.geolocation && socket) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              address: 'Test Location',
            },
            battery: Math.round(20 + Math.random() * 80),
            threatLevel: 'Low',
          }

          socket.emit('user-location-update', locationData)
          toast.success('Location updated')
        },
        (error) => {
          toast.error('Location not available')
        }
      )
    }
  }

  const handleStatusChange = () => {
    updateUserStatus(userStatus)
    toast.success(`Status changed to ${userStatus}`)
  }

  const handleEmergencyAlert = () => {
    if (currentLocation) {
      sendEmergencyAlert({
        emergencyType,
        description,
        location: {
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
        },
      })
      toast.success('Emergency alert sent!')
    } else {
      toast.error('Location not available for emergency alert')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          Backend-Frontend Tracking Test
        </h1>

        {/* Connection Status */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-3">Connection Status</h2>
          <div className="flex items-center space-x-4">
            <div
              className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}
            ></div>
            <span>{isConnected ? 'Connected to Backend' : 'Disconnected'}</span>
            {socket && (
              <span className="text-gray-400">Socket ID: {socket.id}</span>
            )}
          </div>
        </div>

        {/* User Registration */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-3">User Registration</h2>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="px-3 py-2 bg-gray-700 rounded border border-gray-600 flex-1"
            />
            <button
              onClick={handleRegisterUser}
              disabled={!isConnected}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
            >
              Register with Backend
            </button>
          </div>
        </div>

        {/* Location Tracking */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-3">Location Tracking</h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLocationUpdate}
              disabled={!isConnected}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
            >
              Send Location Update
            </button>
            {currentLocation && (
              <span className="text-gray-400">
                Lat: {currentLocation.latitude?.toFixed(4)}, Lng:{' '}
                {currentLocation.longitude?.toFixed(4)}
              </span>
            )}
          </div>
        </div>

        {/* Status Management */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-3">Status Management</h2>
          <div className="flex items-center space-x-4">
            <select
              value={userStatus}
              onChange={(e) => setUserStatus(e.target.value)}
              className="px-3 py-2 bg-gray-700 rounded border border-gray-600"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="emergency">Emergency</option>
            </select>
            <button
              onClick={handleStatusChange}
              disabled={!isConnected}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded disabled:opacity-50"
            >
              Update Status
            </button>
          </div>
        </div>

        {/* Emergency Alert */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-3">Emergency Alert Test</h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <select
                value={emergencyType}
                onChange={(e) => setEmergencyType(e.target.value)}
                className="px-3 py-2 bg-gray-700 rounded border border-gray-600"
              >
                <option value="medical">Medical Emergency</option>
                <option value="fire">Fire Emergency</option>
                <option value="police">Police Emergency</option>
                <option value="accident">Accident</option>
                <option value="other">Other</option>
              </select>
              <input
                type="text"
                placeholder="Emergency description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="px-3 py-2 bg-gray-700 rounded border border-gray-600 flex-1"
              />
            </div>
            <button
              onClick={handleEmergencyAlert}
              disabled={!isConnected || !currentLocation}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
            >
              🚨 Send Emergency Alert
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">Instructions</h2>
          <ul className="text-gray-300 space-y-2">
            <li>1. Enter your name and click "Register with Backend"</li>
            <li>2. Click "Send Location Update" to share your location</li>
            <li>3. Change your status and click "Update Status"</li>
            <li>4. Test emergency alerts with different types</li>
            <li>
              5. Check the backend admin dashboard to see your data in real-time
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default TestTrackingPage
