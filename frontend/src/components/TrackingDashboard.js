import React, { useState, useEffect } from 'react';
import LiveTrackingMap from './LiveTrackingMap';
import { io } from 'socket.io-client';

const TrackingDashboard = ({ sosAlert, onClose }) => {
  const [agentLocation, setAgentLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [agent, setAgent] = useState(null);
  const [socket, setSocket] = useState(null);
  const [trackingStatus, setTrackingStatus] = useState('connecting');

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.REACT_APP_SOCKET_URL);
    setSocket(newSocket);

    // Set user location from SOS alert
    if (sosAlert) {
      setUserLocation({
        lat: parseFloat(sosAlert.latitude),
        lng: parseFloat(sosAlert.longitude)
      });
    }

    // Join tracking room for this SOS alert
    if (sosAlert?.id) {
      newSocket.emit('join_sos_tracking', { sosId: sosAlert.id });
    }

    // Listen for agent location updates
    newSocket.on('agent_location_update', (data) => {
      if (data.sosId === sosAlert?.id) {
        setAgentLocation({
          lat: parseFloat(data.latitude),
          lng: parseFloat(data.longitude)
        });
        setAgent(data.agent);
        setTrackingStatus('tracking');
      }
    });

    // Listen for SOS status updates
    newSocket.on('sos_status_update', (data) => {
      if (data.sosId === sosAlert?.id) {
        setTrackingStatus(data.status);
      }
    });

    // Listen for agent arrival
    newSocket.on('agent_arrived', (data) => {
      if (data.sosId === sosAlert?.id) {
        setTrackingStatus('arrived');
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [sosAlert]);

  // Get user location with high accuracy
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const handleMapLoad = (routeInfo) => {
    setEta(routeInfo);
  };

  const getStatusColor = (status) => {
    const colors = {
      'connecting': 'bg-yellow-500',
      'dispatched': 'bg-blue-500',
      'tracking': 'bg-green-500',
      'arrived': 'bg-purple-500',
      'completed': 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusText = (status) => {
    const texts = {
      'connecting': 'Connecting to tracking...',
      'dispatched': 'Agent dispatched',
      'tracking': 'Agent en route',
      'arrived': 'Agent has arrived',
      'completed': 'Rescue completed'
    };
    return texts[status] || 'Unknown status';
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Live Rescue Tracking</h2>
            <p className="text-sm text-gray-600">SOS Alert #{sosAlert?.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status Bar */}
        <div className="p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(trackingStatus)} animate-pulse`}></div>
              <span className="font-medium">{getStatusText(trackingStatus)}</span>
            </div>
            <div className="text-sm text-gray-600">
              Alert Time: {sosAlert?.created_at ? formatTime(sosAlert.created_at) : 'N/A'}
            </div>
          </div>

          {/* ETA Information */}
          {eta && (
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">{eta.duration}</div>
                <div className="text-xs text-gray-600">Estimated Time</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{eta.distance}</div>
                <div className="text-xs text-gray-600">Distance</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {eta.eta ? formatTime(eta.eta) : '--:--'}
                </div>
                <div className="text-xs text-gray-600">Arrival Time</div>
              </div>
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="p-4">
          <LiveTrackingMap
            userLocation={userLocation}
            agentLocation={agentLocation}
            sosAlert={sosAlert}
            agents={agent ? [agent] : []}
            onMapLoad={handleMapLoad}
            className="h-96"
          />
        </div>

        {/* Agent Information */}
        {agent && (
          <div className="p-4 border-t border-gray-200">
            <h3 className="font-bold text-lg mb-3">Assigned Agent</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Name</label>
                  <p className="font-medium">{agent.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Badge #</label>
                  <p className="font-medium">{agent.badge_number}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Phone</label>
                  <p className="font-medium">{agent.phone}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Vehicle</label>
                  <p className="font-medium">{agent.vehicle_info || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Information */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="font-bold text-lg mb-3">Emergency Details</h3>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Emergency Type</label>
                <p className="font-medium capitalize">{sosAlert?.emergency_type || 'General'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Priority</label>
                <p className="font-medium">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    🚨 High Priority
                  </span>
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-600">Additional Info</label>
                <p className="font-medium">{sosAlert?.additional_info || 'None provided'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-200 flex space-x-3">
          <button className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>Call Agent</span>
          </button>
          
          <button className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Send Message</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrackingDashboard;