// Backend Location Service - handles location calculations and utilities

class LocationService {
  // Calculate distance between two points using Haversine formula
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

  // Estimate ETA based on distance and average speed
  calculateETA(originLat, originLng, destLat, destLng, averageSpeedKmh = 50) {
    const distance = this.calculateDistance(originLat, originLng, destLat, destLng);
    const timeHours = distance.kilometers / averageSpeedKmh;
    const timeMinutes = timeHours * 60;
    
    // Account for traffic and urban conditions
    let adjustedMinutes = timeMinutes;
    
    // Add traffic factor based on distance
    if (distance.kilometers < 5) {
      adjustedMinutes *= 1.5; // Urban traffic
    } else if (distance.kilometers < 20) {
      adjustedMinutes *= 1.3; // Suburban traffic
    } else {
      adjustedMinutes *= 1.1; // Highway traffic
    }
    
    const eta = new Date(Date.now() + adjustedMinutes * 60 * 1000);
    
    return {
      distance_km: distance.kilometers,
      distance_meters: distance.meters,
      estimated_minutes: Math.round(adjustedMinutes),
      estimated_seconds: Math.round(adjustedMinutes * 60),
      eta_timestamp: eta,
      eta_formatted: this.formatTime(eta)
    };
  }

  // Check if point is within a circular area
  isWithinRadius(centerLat, centerLng, pointLat, pointLng, radiusMeters) {
    const distance = this.calculateDistance(centerLat, centerLng, pointLat, pointLng);
    return distance.meters <= radiusMeters;
  }

  // Find nearest point from an array of points
  findNearest(originLat, originLng, points) {
    if (!points || points.length === 0) return null;
    
    let nearest = null;
    let shortestDistance = Infinity;
    
    points.forEach(point => {
      const distance = this.calculateDistance(
        originLat, 
        originLng, 
        parseFloat(point.lat || point.latitude || point.current_lat), 
        parseFloat(point.lng || point.longitude || point.current_lng)
      );
      
      if (distance.kilometers < shortestDistance) {
        shortestDistance = distance.kilometers;
        nearest = {
          ...point,
          distance: distance
        };
      }
    });
    
    return nearest;
  }

  // Validate coordinates
  isValidCoordinate(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return false;
    }
    
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
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

  // Get South African city bounds for location validation
  getSouthAfricanBounds() {
    return {
      north: -22.0, // Northern border
      south: -35.0, // Southern border (Cape of Good Hope)
      east: 33.0,   // Eastern border
      west: 16.0    // Western border (Atlantic coast)
    };
  }

  // Check if coordinates are within South Africa
  isInSouthAfrica(lat, lng) {
    const bounds = this.getSouthAfricanBounds();
    return lat >= bounds.south && 
           lat <= bounds.north && 
           lng >= bounds.west && 
           lng <= bounds.east;
  }

  // Get major South African cities with coordinates
  getMajorCities() {
    return [
      { name: 'Cape Town', lat: -33.9249, lng: 18.4241 },
      { name: 'Johannesburg', lat: -26.2041, lng: 28.0473 },
      { name: 'Durban', lat: -29.8587, lng: 31.0218 },
      { name: 'Pretoria', lat: -25.7479, lng: 28.2293 },
      { name: 'Port Elizabeth', lat: -33.9608, lng: 25.6022 },
      { name: 'Bloemfontein', lat: -29.0852, lng: 26.1596 },
      { name: 'East London', lat: -33.0153, lng: 27.9116 },
      { name: 'Pietermaritzburg', lat: -29.6132, lng: 30.3794 },
      { name: 'Polokwane', lat: -23.9045, lng: 29.4689 },
      { name: 'Kimberley', lat: -28.7282, lng: 24.7499 },
      { name: 'Nelspruit', lat: -25.4753, lng: 30.969 }
    ];
  }

  // Find nearest major city
  findNearestCity(lat, lng) {
    const cities = this.getMajorCities();
    return this.findNearest(lat, lng, cities);
  }

  // Generate location bounds for area search
  generateBounds(centerLat, centerLng, radiusKm) {
    const latDegreeKm = 110.574; // Approximate km per latitude degree
    const lngDegreeKm = 111.320 * Math.cos(this.toRadians(centerLat)); // Varies by latitude
    
    const latOffset = radiusKm / latDegreeKm;
    const lngOffset = radiusKm / lngDegreeKm;
    
    return {
      north: centerLat + latOffset,
      south: centerLat - latOffset,
      east: centerLng + lngOffset,
      west: centerLng - lngOffset
    };
  }

  // Utility functions
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  toDegrees(radians) {
    return radians * (180 / Math.PI);
  }

  formatTime(date) {
    return date.toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Johannesburg'
    });
  }

  // Calculate speed between two location updates
  calculateSpeed(lat1, lng1, timestamp1, lat2, lng2, timestamp2) {
    const distance = this.calculateDistance(lat1, lng1, lat2, lng2);
    const timeDiff = (new Date(timestamp2) - new Date(timestamp1)) / 1000; // seconds
    
    if (timeDiff <= 0) return 0;
    
    const speedMs = distance.meters / timeDiff; // meters per second
    const speedKmh = speedMs * 3.6; // kilometers per hour
    
    return {
      meters_per_second: speedMs,
      kilometers_per_hour: speedKmh,
      miles_per_hour: speedKmh * 0.621371
    };
  }

  // Generate geofence for tracking
  createGeofence(centerLat, centerLng, radiusMeters, name = 'Emergency Zone') {
    return {
      name,
      center: { lat: centerLat, lng: centerLng },
      radius_meters: radiusMeters,
      bounds: this.generateBounds(centerLat, centerLng, radiusMeters / 1000),
      created_at: new Date()
    };
  }

  // Check if location is within geofence
  isInGeofence(geofence, lat, lng) {
    return this.isWithinRadius(
      geofence.center.lat,
      geofence.center.lng,
      lat,
      lng,
      geofence.radius_meters
    );
  }
}

module.exports = new LocationService();