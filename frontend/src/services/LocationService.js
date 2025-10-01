// LocationService.js - Handles geolocation, tracking, and distance calculations
class LocationService {
  constructor() {
    this.watchId = null;
    this.currentPosition = null;
    this.trackingCallbacks = new Set();
    this.options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    };
  }

  // Get current location (one-time)
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp)
          };
          this.currentPosition = location;
          resolve(location);
        },
        (error) => {
          let errorMessage = 'Unknown location error';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        this.options
      );
    });
  }

  // Start continuous location tracking
  startTracking(callback) {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    // Add callback to set
    if (callback) {
      this.trackingCallbacks.add(callback);
    }

    // Start watching if not already started
    if (!this.watchId) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
            timestamp: new Date(position.timestamp)
          };
          
          this.currentPosition = location;
          
          // Notify all callbacks
          this.trackingCallbacks.forEach(callback => {
            try {
              callback(location);
            } catch (error) {
              console.error('Error in location callback:', error);
            }
          });
        },
        (error) => {
          console.error('Location tracking error:', error);
          this.trackingCallbacks.forEach(callback => {
            try {
              callback(null, error);
            } catch (callbackError) {
              console.error('Error in location error callback:', callbackError);
            }
          });
        },
        this.options
      );
    }

    return this.watchId;
  }

  // Stop location tracking
  stopTracking(callback = null) {
    if (callback) {
      this.trackingCallbacks.delete(callback);
    }

    // If no more callbacks, stop watching
    if (this.trackingCallbacks.size === 0 && this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // Stop all tracking
  stopAllTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.trackingCallbacks.clear();
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return {
      kilometers: distance,
      meters: distance * 1000,
      miles: distance * 0.621371
    };
  }

  // Calculate bearing between two points
  calculateBearing(lat1, lng1, lat2, lng2) {
    const dLng = this.toRadians(lng2 - lng1);
    const lat1Rad = this.toRadians(lat1);
    const lat2Rad = this.toRadians(lat2);
    
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    
    const bearing = this.toDegrees(Math.atan2(y, x));
    return (bearing + 360) % 360; // Normalize to 0-360
  }

  // Check if user is within a certain radius of a point
  isWithinRadius(targetLat, targetLng, radiusMeters, currentLat = null, currentLng = null) {
    const userLat = currentLat || this.currentPosition?.lat;
    const userLng = currentLng || this.currentPosition?.lng;
    
    if (!userLat || !userLng) {
      return false;
    }
    
    const distance = this.calculateDistance(userLat, userLng, targetLat, targetLng);
    return distance.meters <= radiusMeters;
  }

  // Get address from coordinates (reverse geocoding)
  async reverseGeocode(lat, lng) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      
      return new Promise((resolve, reject) => {
        geocoder.geocode(
          { location: { lat, lng } },
          (results, status) => {
            if (status === 'OK') {
              if (results[0]) {
                resolve({
                  formatted_address: results[0].formatted_address,
                  address_components: results[0].address_components,
                  place_id: results[0].place_id
                });
              } else {
                reject(new Error('No results found'));
              }
            } else {
              reject(new Error(`Geocoder failed: ${status}`));
            }
          }
        );
      });
    } catch (error) {
      throw new Error(`Reverse geocoding failed: ${error.message}`);
    }
  }

  // Get coordinates from address (forward geocoding)
  async geocode(address) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      
      return new Promise((resolve, reject) => {
        geocoder.geocode(
          { address },
          (results, status) => {
            if (status === 'OK') {
              if (results[0]) {
                const location = results[0].geometry.location;
                resolve({
                  lat: location.lat(),
                  lng: location.lng(),
                  formatted_address: results[0].formatted_address,
                  place_id: results[0].place_id
                });
              } else {
                reject(new Error('No results found'));
              }
            } else {
              reject(new Error(`Geocoder failed: ${status}`));
            }
          }
        );
      });
    } catch (error) {
      throw new Error(`Geocoding failed: ${error.message}`);
    }
  }

  // Format coordinates for display
  formatCoordinates(lat, lng, precision = 6) {
    return {
      decimal: `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`,
      dms: this.toDMS(lat, lng)
    };
  }

  // Convert decimal degrees to degrees, minutes, seconds
  toDMS(lat, lng) {
    const formatDMS = (coordinate, isLat) => {
      const absolute = Math.abs(coordinate);
      const degrees = Math.floor(absolute);
      const minutes = Math.floor((absolute - degrees) * 60);
      const seconds = ((absolute - degrees - minutes / 60) * 3600).toFixed(2);
      
      const direction = isLat 
        ? (coordinate >= 0 ? 'N' : 'S')
        : (coordinate >= 0 ? 'E' : 'W');
      
      return `${degrees}°${minutes}'${seconds}"${direction}`;
    };
    
    return {
      latitude: formatDMS(lat, true),
      longitude: formatDMS(lng, false),
      formatted: `${formatDMS(lat, true)} ${formatDMS(lng, false)}`
    };
  }

  // Utility functions
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  toDegrees(radians) {
    return radians * (180 / Math.PI);
  }

  // Get current position (cached)
  getCurrentPosition() {
    return this.currentPosition;
  }

  // Check if geolocation is supported
  static isSupported() {
    return 'geolocation' in navigator;
  }

  // Check location permissions
  async checkPermissions() {
    if (!navigator.permissions) {
      return 'unknown';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state; // 'granted', 'denied', or 'prompt'
    } catch (error) {
      return 'unknown';
    }
  }

  // Request location permissions
  async requestPermissions() {
    try {
      const position = await this.getCurrentLocation();
      return { success: true, position };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const locationService = new LocationService();

export default locationService;