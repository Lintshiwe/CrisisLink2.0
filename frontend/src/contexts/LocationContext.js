import React, { createContext, useContext, useState, useEffect } from 'react';
import LocationService from '../services/LocationService';
import toast from 'react-hot-toast';

const LocationContext = createContext();

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissions, setPermissions] = useState('unknown');
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    // Check location permissions on mount
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const permission = await LocationService.checkPermissions();
      setPermissions(permission);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const requestLocation = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const position = await LocationService.getCurrentLocation();
      setLocation(position);
      setPermissions('granted');
      toast.success('📍 Location access granted');
      return position;
    } catch (error) {
      setError(error.message);
      setPermissions('denied');
      toast.error(`Location error: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const startTracking = (callback) => {
    if (isTracking) return;

    try {
      LocationService.startTracking((newLocation, error) => {
        if (error) {
          setError(error.message);
          toast.error(`Tracking error: ${error.message}`);
          return;
        }

        setLocation(newLocation);
        if (callback) callback(newLocation);
      });

      setIsTracking(true);
      toast.success('📍 Location tracking started');
    } catch (error) {
      setError(error.message);
      toast.error(`Failed to start tracking: ${error.message}`);
    }
  };

  const stopTracking = () => {
    if (!isTracking) return;

    LocationService.stopAllTracking();
    setIsTracking(false);
    toast.success('📍 Location tracking stopped');
  };

  const updateLocation = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      const position = await LocationService.getCurrentLocation();
      setLocation(position);
      return position;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getDistance = (targetLat, targetLng) => {
    if (!location) return null;
    return LocationService.calculateDistance(
      location.lat,
      location.lng,
      targetLat,
      targetLng
    );
  };

  const isWithinRadius = (targetLat, targetLng, radiusMeters) => {
    if (!location) return false;
    return LocationService.isWithinRadius(
      targetLat,
      targetLng,
      radiusMeters,
      location.lat,
      location.lng
    );
  };

  const formatCoordinates = (precision = 6) => {
    if (!location) return null;
    return LocationService.formatCoordinates(location.lat, location.lng, precision);
  };

  const reverseGeocode = async () => {
    if (!location) throw new Error('No location available');
    return LocationService.reverseGeocode(location.lat, location.lng);
  };

  const value = {
    // State
    location,
    isLoading,
    error,
    permissions,
    isTracking,
    
    // Actions
    requestLocation,
    startTracking,
    stopTracking,
    updateLocation,
    checkPermissions,
    
    // Utilities
    getDistance,
    isWithinRadius,
    formatCoordinates,
    reverseGeocode,
    
    // Service access
    LocationService
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};