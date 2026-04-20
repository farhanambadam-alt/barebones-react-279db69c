import { useMemo } from 'react';
import { useLocation_ } from '@/contexts/LocationContext';
import { haversineDistance, formatDistance } from '@/lib/distance';
import type { Salon } from '@/types/salon';

/**
 * Returns a function that computes the dynamic distance string
 * from the user's current location to any salon.
 * Falls back to salon.distance if user location is unavailable.
 */
export function useDynamicDistance() {
  const { location } = useLocation_();
  const userLat = location.lat;
  const userLng = location.lng;

  return useMemo(() => {
    return (salon: Salon): string => {
      if (userLat != null && userLng != null) {
        return formatDistance(haversineDistance(userLat, userLng, salon.lat, salon.lng));
      }
      return salon.distance;
    };
  }, [userLat, userLng]);
}
