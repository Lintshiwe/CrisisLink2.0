import React, { useState, useEffect, useCallback } from 'react';
import { 
  GoogleMap, 
  LoadScript, 
  Marker, 
  InfoWindow, 
  DirectionsRenderer,
  TrafficLayer,
  Circle,
  Polyline
} from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '12px',
  border: '2px solid #e5e7eb'
};

const defaultCenter = {
  lat: -26.2041, // Johannesburg, South Africa
  lng: 28.0473
};

// Google APIs to load
const libraries = ['places', 'geometry', 'directions', 'visualization'];

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
  trafficLayer: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#f5f5f5' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#dadada' }]
    }
  ]
};

const LiveTrackingMap = ({ 
  userLocation, 
  agentLocation, 
  sosAlert, 
  className = '',
  showDirections = true,
  showTraffic = true,
  showGeofence = true,
  onMapLoad,
  onRouteUpdate,
  agents = []
}) => {
  const [map, setMap] = useState(null);
  const [directions, setDirections] = useState(null);
  const [alternativeRoutes, setAlternativeRoutes] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [trafficLayer, setTrafficLayer] = useState(null);
  const [routeHistory, setRouteHistory] = useState([]);
  const [weatherOverlay, setWeatherOverlay] = useState(null);
  const [emergencyRadius, setEmergencyRadius] = useState(100); // meters

  // Enhanced routing with multiple options and real-time updates
  const calculateAdvancedRouting = useCallback(async (origin, destination) => {
    if (!window.google || !origin || !destination) return null;

    const directionsService = new window.google.maps.DirectionsService();
    
    try {
      // Get multiple route options
      const requests = [
        {
          origin: origin,
          destination: destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: window.google.maps.TrafficModel.BEST_GUESS
          },
          provideRouteAlternatives: true,
          avoidHighways: false,
          avoidTolls: false,
          optimizeWaypoints: true
        }
      ];

      const results = await Promise.all(
        requests.map(request => 
          new Promise((resolve, reject) => {
            directionsService.route(request, (result, status) => {
              if (status === 'OK') {
                resolve(result);
              } else {
                reject(new Error(`Directions request failed: ${status}`));
              }
            });
          })
        )
      );

      const mainResult = results[0];
      setDirections(mainResult);

      // Process all routes
      const allRoutes = mainResult.routes.map((route, index) => {
        const leg = route.legs[0];
        return {
          index,
          distance: leg.distance,
          duration: leg.duration,
          duration_in_traffic: leg.duration_in_traffic || leg.duration,
          start_address: leg.start_address,
          end_address: leg.end_address,
          steps: leg.steps,
          route: route
        };
      });

      // Select fastest route considering traffic
      const fastestRoute = allRoutes.reduce((fastest, current) => {
        const fastestTime = fastest.duration_in_traffic?.value || fastest.duration.value;
        const currentTime = current.duration_in_traffic?.value || current.duration.value;
        return currentTime < fastestTime ? current : fastest;
      });

      setAlternativeRoutes(allRoutes);

      // Get traffic conditions and update everything
      const trafficData = await getTrafficConditions(origin, destination);
      
      // Update route history for pattern analysis
      setRouteHistory(prev => [...prev.slice(-10), {
        timestamp: new Date(),
        route: fastestRoute,
        traffic_conditions: trafficData
      }]);

      // Dispatch comprehensive route info
      if (onMapLoad) {
        onMapLoad({
          distance: fastestRoute.distance.text,
          duration: fastestRoute.duration.text,
          duration_in_traffic: fastestRoute.duration_in_traffic?.text || fastestRoute.duration.text,
          eta: new Date(Date.now() + (fastestRoute.duration_in_traffic?.value || fastestRoute.duration.value) * 1000),
          alternative_routes: allRoutes.length,
          traffic_delay: fastestRoute.duration_in_traffic ? 
            (fastestRoute.duration_in_traffic.value - fastestRoute.duration.value) / 60 : 0,
          route_quality: calculateRouteQuality(fastestRoute)
        });
      }

      if (onRouteUpdate) {
        onRouteUpdate({
          main_route: fastestRoute,
          alternatives: allRoutes,
          traffic_data: trafficData
        });
      }

    } catch (error) {
      console.error('Advanced routing error:', error);
      // Fallback to basic routing
      calculateBasicETA(origin, destination);
    }
  }, [onMapLoad, onRouteUpdate]);

  // Fallback basic routing
  const calculateBasicETA = useCallback((origin, destination) => {
    const directionsService = new window.google.maps.DirectionsService();
    
    directionsService.route({
      origin: origin,
      destination: destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
    }, (result, status) => {
      if (status === 'OK') {
        setDirections(result);
        const route = result.routes[0];
        const leg = route.legs[0];
        
        if (onMapLoad) {
          onMapLoad({
            distance: leg.distance.text,
            duration: leg.duration.text,
            eta: new Date(Date.now() + leg.duration.value * 1000)
          });
        }
      }
    });
  }, [onMapLoad]);

  // Get real-time traffic conditions
  const getTrafficConditions = async (origin, destination) => {
    try {
      const distanceService = new window.google.maps.DistanceMatrixService();
      
      return new Promise((resolve) => {
        distanceService.getDistanceMatrix({
          origins: [origin],
          destinations: [destination],
          travelMode: window.google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: window.google.maps.TrafficModel.BEST_GUESS
          },
          avoidHighways: false,
          avoidTolls: false,
        }, (response, status) => {
          if (status === 'OK') {
            const element = response.rows[0]?.elements[0];
            if (element?.status === 'OK') {
              resolve({
                distance: element.distance,
                duration: element.duration,
                duration_in_traffic: element.duration_in_traffic,
                traffic_delay_seconds: element.duration_in_traffic ? 
                  element.duration_in_traffic.value - element.duration.value : 0
              });
            }
          }
          resolve(null);
        });
      });
    } catch (error) {
      console.error('Traffic conditions error:', error);
      return null;
    }
  };

  // Calculate route quality score
  const calculateRouteQuality = (route) => {
    let score = 100;
    
    // Penalize for traffic delays
    if (route.duration_in_traffic && route.duration) {
      const delay = (route.duration_in_traffic.value - route.duration.value) / 60;
      score -= Math.min(delay * 2, 30); // Max 30 point penalty
    }
    
    // Penalize for longer distances
    const distance = route.distance.value / 1000; // km
    if (distance > 20) score -= (distance - 20) * 0.5;
    
    return Math.max(score, 0);
  };

  // Update directions when locations change with real-time routing
  useEffect(() => {
    if (isLoaded && userLocation && agentLocation && showDirections) {
      calculateAdvancedRouting(agentLocation, userLocation);
    }
  }, [userLocation, agentLocation, showDirections, isLoaded, calculateAdvancedRouting]);

  // Set up real-time route updates every 2 minutes
  useEffect(() => {
    if (isLoaded && userLocation && agentLocation && showDirections) {
      const routeUpdateInterval = setInterval(() => {
        calculateAdvancedRouting(agentLocation, userLocation);
      }, 120000); // 2 minutes

      return () => clearInterval(routeUpdateInterval);
    }
  }, [userLocation, agentLocation, showDirections, isLoaded, calculateAdvancedRouting]);

  // Initialize traffic layer
  useEffect(() => {
    if (map && showTraffic && !trafficLayer) {
      const traffic = new window.google.maps.TrafficLayer();
      traffic.setMap(map);
      setTrafficLayer(traffic);
    }
    
    return () => {
      if (trafficLayer) {
        trafficLayer.setMap(null);
      }
    };
  }, [map, showTraffic, trafficLayer]);

  const onLoad = useCallback((map) => {
    setMap(map);
    setIsLoaded(true);
    
    // Fit bounds to show both user and agent
    if (userLocation && agentLocation) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(userLocation);
      bounds.extend(agentLocation);
      map.fitBounds(bounds);
    }
  }, [userLocation, agentLocation]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Get marker icon based on agent status
  const getAgentIcon = (agent) => {
    const baseUrl = 'data:image/svg+xml;base64,';
    let color = '#10b981'; // green for available
    
    if (agent.status === 'busy') color = '#f59e0b'; // amber
    if (agent.status === 'offline') color = '#6b7280'; // gray
    if (agent.id === sosAlert?.assigned_agent_id) color = '#ef4444'; // red for assigned
    
    const svg = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
        <path d="M12 6v12M6 12h12" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
    
    return {
      url: baseUrl + btoa(svg),
      scaledSize: new window.google.maps.Size(32, 32),
      anchor: new window.google.maps.Point(16, 16)
    };
  };

  // User location icon (red SOS marker)
  const userIcon = {
    url: 'data:image/svg+xml;base64,' + btoa(`
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#ef4444" stroke="white" stroke-width="3"/>
        <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">SOS</text>
      </svg>
    `),
    scaledSize: new window.google.maps.Size(32, 32),
    anchor: new window.google.maps.Point(16, 16)
  };

  return (
    <div className={`relative ${className}`}>
      <LoadScript
        googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
        libraries={libraries}
      >
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={13}
          center={userLocation || agentLocation || defaultCenter}
          options={mapOptions}
          onLoad={onLoad}
          onUnmount={onUnmount}
        >
          {/* Emergency radius geofence */}
          {userLocation && showGeofence && (
            <Circle
              center={userLocation}
              radius={emergencyRadius}
              options={{
                fillColor: '#ef4444',
                fillOpacity: 0.1,
                strokeColor: '#ef4444',
                strokeOpacity: 0.5,
                strokeWeight: 2,
              }}
            />
          )}

          {/* User location marker */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={userIcon}
              title="Your Location (SOS Alert)"
              zIndex={1000}
              animation={window.google?.maps.Animation.DROP}
            />
          )}

          {/* Agent markers with enhanced info */}
          {agents.map((agent, index) => (
            <Marker
              key={agent.id}
              position={{
                lat: parseFloat(agent.current_lat),
                lng: parseFloat(agent.current_lng)
              }}
              icon={getAgentIcon(agent)}
              title={`Agent ${agent.name} - ${agent.status}`}
              onClick={() => setSelectedAgent(agent)}
              zIndex={agent.id === sosAlert?.assigned_agent_id ? 999 : 100}
              animation={agent.id === sosAlert?.assigned_agent_id ? 
                window.google?.maps.Animation.BOUNCE : null}
            />
          ))}

          {/* Route history visualization */}
          {routeHistory.length > 1 && (
            <Polyline
              path={routeHistory.map(entry => ({
                lat: entry.route.start_location?.lat || agentLocation?.lat,
                lng: entry.route.start_location?.lng || agentLocation?.lng
              })).filter(point => point.lat && point.lng)}
              options={{
                strokeColor: '#10b981',
                strokeOpacity: 0.6,
                strokeWeight: 2,
                icons: [
                  {
                    icon: {
                      path: window.google?.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                      scale: 2,
                      strokeColor: '#10b981'
                    },
                    offset: '100%'
                  }
                ]
              }}
            />
          )}

          {/* Enhanced agent info window */}
          {selectedAgent && (
            <InfoWindow
              position={{
                lat: parseFloat(selectedAgent.current_lat),
                lng: parseFloat(selectedAgent.current_lng)
              }}
              onCloseClick={() => setSelectedAgent(null)}
            >
              <div className="p-3 min-w-64">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm">Agent {selectedAgent.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedAgent.status === 'available' ? 'bg-green-100 text-green-800' :
                    selectedAgent.status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedAgent.status}
                  </span>
                </div>
                
                <div className="space-y-1 text-xs text-gray-600">
                  <p><strong>Badge:</strong> {selectedAgent.badge_number}</p>
                  <p><strong>Phone:</strong> {selectedAgent.phone}</p>
                  <p><strong>Vehicle:</strong> {selectedAgent.vehicle_info || 'Not specified'}</p>
                  
                  {selectedAgent.id === sosAlert?.assigned_agent_id && (
                    <div className="mt-2 p-2 bg-red-50 rounded border-l-4 border-red-400">
                      <p className="text-red-700 font-bold text-xs">🚨 Assigned to your SOS</p>
                      {directions && (
                        <div className="mt-1 text-xs">
                          <p>Distance: {directions.routes[0]?.legs[0]?.distance?.text}</p>
                          <p>ETA: {directions.routes[0]?.legs[0]?.duration_in_traffic?.text || 
                            directions.routes[0]?.legs[0]?.duration?.text}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </InfoWindow>
          )}

          {/* Main route */}
          {directions && showDirections && (
            <DirectionsRenderer
              directions={directions}
              routeIndex={0}
              options={{
                polylineOptions: {
                  strokeColor: '#ef4444',
                  strokeWeight: 6,
                  strokeOpacity: 0.8
                },
                suppressMarkers: true,
                preserveViewport: false
              }}
            />
          )}

          {/* Alternative routes */}
          {alternativeRoutes.slice(1).map((route, index) => (
            <DirectionsRenderer
              key={`alt-route-${index}`}
              directions={{
                ...directions,
                routes: [route.route]
              }}
              options={{
                polylineOptions: {
                  strokeColor: '#6b7280',
                  strokeWeight: 3,
                  strokeOpacity: 0.5
                },
                suppressMarkers: true,
                preserveViewport: true
              }}
            />
          ))}

          {/* Traffic Layer */}
          {showTraffic && <TrafficLayer />}
        </GoogleMap>
      </LoadScript>

      {/* Map legend */}
      <div className="absolute top-2 right-2 bg-white p-2 rounded-lg shadow-lg text-xs">
        <div className="flex items-center gap-1 mb-1">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>Your Location</span>
        </div>
        <div className="flex items-center gap-1 mb-1">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Available Agent</span>
        </div>
        <div className="flex items-center gap-1 mb-1">
          <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
          <span>Busy Agent</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
          <span>Assigned Agent</span>
        </div>
      </div>

      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTrackingMap;