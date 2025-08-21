import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

interface LocationData {
  latitude: string;
  longitude: string;
  accuracy?: number;
}

interface UseLocationTrackingOptions {
  userId: string;
  userType: "runner" | "lab" | "clinician";
  enabled?: boolean;
  updateInterval?: number; // milliseconds
}

export function useLocationTracking({ userId, userType, enabled = true, updateInterval = 30000 }: UseLocationTrackingOptions) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateLocationOnServer = async (locationData: LocationData) => {
    try {
      await apiRequest("/api/location/update", {
        method: "POST",
        body: JSON.stringify({
          userId,
          userType,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
        }),
      });
    } catch (error) {
      console.error("Failed to update location on server:", error);
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser");
      return;
    }

    if (!enabled) return;

    setIsTracking(true);
    setError(null);

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
          accuracy: position.coords.accuracy,
        };
        setLocation(locationData);
        updateLocationOnServer(locationData);
      },
      (error) => {
        setError(`Error getting location: ${error.message}`);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 minute
      }
    );

    // Start watching position changes
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
          accuracy: position.coords.accuracy,
        };
        setLocation(locationData);
      },
      (error) => {
        setError(`Error tracking location: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000, // 30 seconds
      }
    );

    // Set up periodic server updates
    updateIntervalRef.current = setInterval(() => {
      if (location) {
        updateLocationOnServer(location);
      }
    }, updateInterval);
  };

  const stopTracking = () => {
    setIsTracking(false);
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, userId, userType]);

  // Update server when location changes
  useEffect(() => {
    if (location && isTracking) {
      updateLocationOnServer(location);
    }
  }, [location]);

  return {
    location,
    error,
    isTracking,
    startTracking,
    stopTracking,
  };
}

// Hook for calculating arrival estimates
export function useArrivalEstimate(fromUserId: string, toLocation: { lat: string; lng: string } | null) {
  const [estimate, setEstimate] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (!fromUserId || !toLocation) {
      setEstimate(null);
      return;
    }

    const calculateEstimate = async () => {
      setIsCalculating(true);
      try {
        const response = await apiRequest(`/api/location/estimate/${fromUserId}?lat=${toLocation.lat}&lng=${toLocation.lng}`);
        const data = await response.json();
        setEstimate(data.estimatedMinutes);
      } catch (error) {
        console.error("Failed to calculate arrival estimate:", error);
        setEstimate(null);
      } finally {
        setIsCalculating(false);
      }
    };

    calculateEstimate();
    
    // Update estimate every 30 seconds
    const interval = setInterval(calculateEstimate, 30000);
    
    return () => clearInterval(interval);
  }, [fromUserId, toLocation?.lat, toLocation?.lng]);

  return { estimate, isCalculating };
}