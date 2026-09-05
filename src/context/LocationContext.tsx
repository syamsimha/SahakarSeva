import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  LocationCoords,
  locationService,
  defaultLocations,
  getFederationName,
  getCooperativeAct,
  getApexBankName,
  getGovtDeptHeading,
  getClusterName,
} from '../services/locationService';

export {
  getFederationName,
  getCooperativeAct,
  getApexBankName,
  getGovtDeptHeading,
  getClusterName,
};

interface LocationContextType {
  currentLocation: LocationCoords;
  federationName: string;
  cooperativeAct: string;
  apexBankName: string;
  govtHeading: string;
  clusterName: string;
  isLocating: boolean;
  locationError: string | null;
  detectLiveGPS: () => Promise<LocationCoords>;
  modifyPlaceName: (newPlaceName: string, newCity?: string, newAddress?: string, newState?: string) => Promise<LocationCoords>;
  setCustomLocation: (location: Partial<LocationCoords>) => Promise<LocationCoords>;
  selectPresetLocation: (key: string) => Promise<LocationCoords>;
  searchPlaces: (query: string) => Promise<LocationCoords[]>;
  isLocationModalOpen: boolean;
  openLocationModal: () => void;
  closeLocationModal: () => void;
  defaultLocations: Record<string, LocationCoords>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<LocationCoords>(defaultLocations.visakhapatnam || defaultLocations.indiranagar);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);

  useEffect(() => {
    locationService.getCurrentLocation().then(setCurrentLocation);
    const unsubscribe = locationService.subscribe((loc) => {
      setCurrentLocation(loc);
    });
    return () => unsubscribe();
  }, []);

  const detectLiveGPS = async (): Promise<LocationCoords> => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const loc = await locationService.detectLiveGPS();
      setCurrentLocation(loc);
      return loc;
    } catch (err: any) {
      const msg = err.message || 'Failed to detect GPS location.';
      setLocationError(msg);
      throw err;
    } finally {
      setIsLocating(false);
    }
  };

  const modifyPlaceName = async (
    newPlaceName: string,
    newCity?: string,
    newAddress?: string,
    newState?: string
  ): Promise<LocationCoords> => {
    const updated = await locationService.modifyPlaceName(newPlaceName, newCity, newAddress, newState);
    setCurrentLocation(updated);
    return updated;
  };

  const setCustomLocation = async (location: Partial<LocationCoords>): Promise<LocationCoords> => {
    const updated = await locationService.setCustomLocation(location);
    setCurrentLocation(updated);
    return updated;
  };

  const selectPresetLocation = async (key: string): Promise<LocationCoords> => {
    const updated = await locationService.setLocation(key);
    setCurrentLocation(updated);
    return updated;
  };

  const searchPlaces = async (query: string): Promise<LocationCoords[]> => {
    return locationService.searchPlaces(query);
  };

  const openLocationModal = () => setIsLocationModalOpen(true);
  const closeLocationModal = () => setIsLocationModalOpen(false);

  return (
    <LocationContext.Provider
      value={{
        currentLocation,
        federationName: getFederationName(currentLocation),
        cooperativeAct: getCooperativeAct(currentLocation),
        apexBankName: getApexBankName(currentLocation),
        govtHeading: getGovtDeptHeading(currentLocation),
        clusterName: getClusterName(currentLocation),
        isLocating,
        locationError,
        detectLiveGPS,
        modifyPlaceName,
        setCustomLocation,
        selectPresetLocation,
        searchPlaces,
        isLocationModalOpen,
        openLocationModal,
        closeLocationModal,
        defaultLocations,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
