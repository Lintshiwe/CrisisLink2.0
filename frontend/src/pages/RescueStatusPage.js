import React, { useState, useEffect } from 'react'
import { useSocket } from '../contexts/SocketContext'

const RescueStatusPage = () => {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const { socket } = useSocket() // eslint-disable-line no-unused-vars

  useEffect(() => {
    // Mock rescue status - replace with actual API call
    const mockStatus = {
      id: 'RES-001',
      status: 'In Progress',
      timestamp: new Date(),
      location: {
        latitude: -26.2041,
        longitude: 28.0473,
        address: 'Johannesburg, South Africa',
      },
      responder: {
        name: 'Unit Alpha-7',
        eta: '8 minutes',
        phone: '+27123456789',
      },
      updates: [
        { time: '14:30', message: 'Emergency alert received' },
        { time: '14:32', message: 'Unit dispatched' },
        { time: '14:35', message: 'Unit en route' },
      ],
    }

    setTimeout(() => {
      setStatus(mockStatus)
      setLoading(false)
    }, 1000)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading rescue status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-red-600 mb-2">
              🚨 Rescue Status
            </h1>
            <p className="text-gray-600">Emergency ID: {status?.id}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-700 mb-2">
                Status: {status?.status}
              </h3>
              <p className="text-green-600">
                Help is on the way! Stay calm and remain at your location.
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-700 mb-2">
                Responder: {status?.responder?.name}
              </h3>
              <p className="text-blue-600">ETA: {status?.responder?.eta}</p>
              <p className="text-blue-600">
                Contact: {status?.responder?.phone}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Location
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-600">{status?.location?.address}</p>
              <p className="text-sm text-gray-500">
                Lat: {status?.location?.latitude}, Lng:{' '}
                {status?.location?.longitude}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Timeline
            </h3>
            <div className="space-y-3">
              {status?.updates?.map((update, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                  <span className="text-sm text-gray-500">{update.time}</span>
                  <span className="text-gray-700">{update.message}</span>
                </div>
              ))}
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-500">Live</span>
                <span className="text-gray-700">Tracking in progress...</span>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">
              Contact Emergency Services
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RescueStatusPage
