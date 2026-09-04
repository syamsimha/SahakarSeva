import React, { useEffect, useState } from 'react';
import { ViewStyle } from 'react-native';
import { InteractiveMap, MapWorkerMarker } from '../map/InteractiveMap';
import { workerService } from '../../services';

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
  const [activeWorkers, setActiveWorkers] = useState<MapWorkerMarker[]>(customWorkers || []);

  useEffect(() => {
    if (customWorkers) {
      setActiveWorkers(customWorkers);
      return;
    }

    if (!latitude || !longitude) {
      setActiveWorkers([]);
      return;
    }

    if (showWorkers && !trackingWorker) {
      workerService
        .getWorkers({
          customerCoords: { latitude, longitude },
        })
        .then((data) => {
          // Use only real workers who have genuine stored coordinates in the database
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
        });
    }
  }, [customWorkers, showWorkers, latitude, longitude, trackingWorker]);

  return (
    <InteractiveMap
      height={height}
      centerLatitude={latitude}
      centerLongitude={longitude}
      userLocationName={locationName}
      isGps={isGps}
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
