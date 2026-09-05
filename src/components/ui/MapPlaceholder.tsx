import React, { useEffect, useState } from 'react';
import { ViewStyle } from 'react-native';
import { InteractiveMap, MapWorkerMarker } from '../map/InteractiveMap';
import { workerService } from '../../services';
import { useLocation } from '../../context/LocationContext';

interface MapPlaceholderProps {
  height?: number;
  locationName?: string;
  workerCount?: number;
  showWorkers?: boolean;
  latitude?: number;
  longitude?: number;
  isGps?: boolean;
  isLoadingLocation?: boolean;
  locationError?: string | null;
  onRetryGps?: () => void;
  onSelectManualLocation?: () => void;
  workers?: MapWorkerMarker[];
  trackingWorker?: {
    name: string;
    skill: string;
    latitude: number;
    longitude: number;
    updatedAt?: string;
  };
  onWorkerSelect?: (workerId: string) => void;
  style?: ViewStyle;
}

export const MapPlaceholder: React.FC<MapPlaceholderProps> = ({
  height = 180,
  locationName,
  workerCount,
  showWorkers = true,
  latitude,
  longitude,
  isGps = false,
  isLoadingLocation = false,
  locationError,
  onRetryGps,
  onSelectManualLocation,
  workers: customWorkers,
  trackingWorker,
  onWorkerSelect,
  style,
}) => {
  const { currentLocation } = useLocation();
  const effectiveLat = latitude ?? currentLocation?.latitude;
  const effectiveLng = longitude ?? currentLocation?.longitude;
  const effectiveIsGps = isGps || !!currentLocation?.isGPS;
  const effectiveLocationName =
    locationName ||
    (currentLocation ? `${currentLocation.placeName || ''}, ${currentLocation.city || ''}` : 'Your Location');

  const [activeWorkers, setActiveWorkers] = useState<MapWorkerMarker[]>(customWorkers || []);

  useEffect(() => {
    if (customWorkers) {
      setActiveWorkers(customWorkers);
      return;
    }

    if (!effectiveLat || !effectiveLng) {
      setActiveWorkers([]);
      return;
    }

    if (showWorkers && !trackingWorker) {
      workerService
        .getWorkers({
          customerCoords: { latitude: effectiveLat, longitude: effectiveLng },
        })
        .then((data) => {
          const realWorkers = data.filter(
            (w) => typeof w.latitude === 'number' && typeof w.longitude === 'number'
          );

          const mapped: MapWorkerMarker[] = realWorkers.map((w) => ({
            id: w.id,
            name: w.name,
            skill: w.primarySkill,
            rating: w.rating,
            hourlyRate: w.hourlyRate,
            latitude: w.latitude!,
            longitude: w.longitude!,
            distanceKm: w.distanceKm,
            isAvailable: w.isAvailable,
          }));
          setActiveWorkers(mapped);
        })
        .catch((err) => {
          console.warn('Failed to load workers for map:', err);
        });
    }
  }, [customWorkers, showWorkers, effectiveLat, effectiveLng, trackingWorker]);

  return (
    <InteractiveMap
      height={height}
      centerLatitude={effectiveLat}
      centerLongitude={effectiveLng}
      userLocationName={effectiveLocationName}
      isGps={effectiveIsGps}
      isLoadingLocation={isLoadingLocation}
      locationError={locationError}
      onRetryGps={onRetryGps}
      onSelectManualLocation={onSelectManualLocation}
      workers={showWorkers ? activeWorkers : []}
      trackingWorker={trackingWorker}
      onWorkerSelect={onWorkerSelect}
      style={style}
    />
  );
};
