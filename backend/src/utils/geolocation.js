const axios = require('axios');

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in kilometers
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Reverse geocode coordinates to get human-readable address
 */
async function reverseGeocode(latitude, longitude) {
  try {
    const response = await axios.get(
      `https://api.openweathermap.org/geo/1.0/reverse`,
      {
        params: {
          lat: latitude,
          lon: longitude,
          limit: 1,
          appid: process.env.OPENWEATHER_API_KEY
        }
      }
    );

    if (response.data && response.data.length > 0) {
      const location = response.data[0];
      return `${location.name}, ${location.state || location.country}`;
    }

    // Fallback to coordinates if reverse geocoding fails
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
}

/**
 * Validate coordinates
 */
function validateCoordinates(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lon)) {
    return { valid: false, message: 'Invalid coordinates: must be numbers' };
  }

  if (lat < -90 || lat > 90) {
    return { valid: false, message: 'Invalid latitude: must be between -90 and 90' };
  }

  if (lon < -180 || lon > 180) {
    return { valid: false, message: 'Invalid longitude: must be between -180 and 180' };
  }

  // Check if coordinates are within South Africa bounds (roughly)
  const southAfricaBounds = {
    north: -22.0,
    south: -35.0,
    east: 33.0,
    west: 16.0
  };

  if (lat > southAfricaBounds.north || lat < southAfricaBounds.south ||
      lon > southAfricaBounds.east || lon < southAfricaBounds.west) {
    console.warn('Coordinates appear to be outside South Africa');
  }

  return { valid: true, latitude: lat, longitude: lon };
}

/**
 * Calculate estimated travel time between two points
 */
function calculateETA(fromLat, fromLon, toLat, toLon, averageSpeed = 40) {
  const distance = calculateDistance(fromLat, fromLon, toLat, toLon);
  const timeInHours = distance / averageSpeed;
  const timeInMinutes = Math.ceil(timeInHours * 60);
  
  const eta = new Date();
  eta.setMinutes(eta.getMinutes() + timeInMinutes);
  
  return {
    distance: distance,
    timeInMinutes: timeInMinutes,
    eta: eta
  };
}

/**
 * Check if a point is within a certain radius of another point
 */
function isWithinRadius(centerLat, centerLon, pointLat, pointLon, radiusKm) {
  const distance = calculateDistance(centerLat, centerLon, pointLat, pointLon);
  return distance <= radiusKm;
}

/**
 * Get South African provinces based on coordinates
 */
function getProvinceFromCoordinates(latitude, longitude) {
  // Rough province boundaries for South Africa
  const provinces = [
    {
      name: 'Western Cape',
      bounds: { north: -29.0, south: -35.0, east: 25.0, west: 16.0 }
    },
    {
      name: 'Eastern Cape',
      bounds: { north: -30.0, south: -35.0, east: 30.0, west: 22.0 }
    },
    {
      name: 'Northern Cape',
      bounds: { north: -26.0, south: -33.0, east: 25.0, west: 16.0 }
    },
    {
      name: 'Free State',
      bounds: { north: -26.0, south: -31.0, east: 30.0, west: 24.0 }
    },
    {
      name: 'KwaZulu-Natal',
      bounds: { north: -26.0, south: -32.0, east: 33.0, west: 28.0 }
    },
    {
      name: 'North West',
      bounds: { north: -24.0, south: -28.0, east: 28.0, west: 22.0 }
    },
    {
      name: 'Gauteng',
      bounds: { north: -25.0, south: -27.0, east: 29.0, west: 27.0 }
    },
    {
      name: 'Mpumalanga',
      bounds: { north: -22.0, south: -27.0, east: 33.0, west: 28.0 }
    },
    {
      name: 'Limpopo',
      bounds: { north: -22.0, south: -25.5, east: 32.0, west: 26.0 }
    }
  ];

  for (const province of provinces) {
    const { bounds } = province;
    if (latitude >= bounds.south && latitude <= bounds.north &&
        longitude >= bounds.west && longitude <= bounds.east) {
      return province.name;
    }
  }

  return 'Unknown Province';
}

/**
 * Format coordinates for display
 */
function formatCoordinates(latitude, longitude, precision = 4) {
  return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
}

/**
 * Generate a bounding box around a point
 */
function getBoundingBox(latitude, longitude, radiusKm) {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  
  // Rough conversion: 1 degree ≈ 111 km
  const latOffset = radiusKm / 111;
  const lonOffset = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

  return {
    north: lat + latOffset,
    south: lat - latOffset,
    east: lon + lonOffset,
    west: lon - lonOffset
  };
}

module.exports = {
  calculateDistance,
  deg2rad,
  reverseGeocode,
  validateCoordinates,
  calculateETA,
  isWithinRadius,
  getProvinceFromCoordinates,
  formatCoordinates,
  getBoundingBox
};