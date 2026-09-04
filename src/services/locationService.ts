import { databaseService } from './db/databaseService';

export type LocationMode = 'GPS' | 'MANUAL';

export interface ManualAddressDetails {
  houseFlat: string;
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
}

export interface LocationCoords {
  latitude?: number;
  longitude?: number;
  address: string;
  city: string;
  pincode: string;
  isGps?: boolean;
  locationMode?: LocationMode;
  manualDetails?: ManualAddressDetails;
  coordinatesAvailable?: boolean;
}

export const defaultLocations: Record<string, LocationCoords> = {
  indiranagar: {
    latitude: 12.9784,
    longitude: 77.6408,
    address: 'Indiranagar, 100 Feet Road, Bengaluru',
    city: 'Bengaluru',
    pincode: '560038',
    isGps: false,
    locationMode: 'MANUAL',
    coordinatesAvailable: true,
  },
  koramangala: {
    latitude: 12.9352,
    longitude: 77.6245,
    address: 'Koramangala 4th Block, Bengaluru',
    city: 'Bengaluru',
    pincode: '560034',
    isGps: false,
    locationMode: 'MANUAL',
    coordinatesAvailable: true,
  },
  whitefield: {
    latitude: 12.9698,
    longitude: 77.7500,
    address: 'ITPL Main Road, Whitefield, Bengaluru',
    city: 'Bengaluru',
    pincode: '560066',
    isGps: false,
    locationMode: 'MANUAL',
    coordinatesAvailable: true,
  },
  hsr: {
    latitude: 12.9121,
    longitude: 77.6446,
    address: 'HSR Layout Sector 1, Bengaluru',
    city: 'Bengaluru',
    pincode: '560102',
    isGps: false,
    locationMode: 'MANUAL',
    coordinatesAvailable: true,
  },
  malleshwaram: {
    latitude: 13.0031,
    longitude: 77.5643,
    address: 'Sampige Road, Malleshwaram, Bengaluru',
    city: 'Bengaluru',
    pincode: '560003',
    isGps: false,
    locationMode: 'MANUAL',
    coordinatesAvailable: true,
  },
};

class LocationService {
  private currentLocation: LocationCoords | null = null;

  constructor() {
    this.initSavedLocation();
  }

  private initSavedLocation() {
    try {
      const saved = databaseService.getActiveLocation();
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          ((typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') ||
            parsed.locationMode === 'MANUAL' ||
            parsed.address)
        ) {
          this.currentLocation = parsed;
        }
      }
    } catch {
      // Ignore
    }
  }

  async getCurrentLocation(): Promise<LocationCoords | null> {
    return this.currentLocation;
  }

  async setLocation(key: keyof typeof defaultLocations): Promise<LocationCoords> {
    const selected = defaultLocations[key] || defaultLocations.indiranagar;
    this.currentLocation = {
      ...selected,
      isGps: false,
      locationMode: 'MANUAL',
      coordinatesAvailable: true,
    };
    databaseService.setActiveLocation(JSON.stringify(this.currentLocation));
    return this.currentLocation;
  }

  async setCustomLocation(coords: LocationCoords): Promise<LocationCoords> {
    const isGps = coords.isGps ?? false;
    this.currentLocation = {
      ...coords,
      isGps,
      locationMode: coords.locationMode || (isGps ? 'GPS' : 'MANUAL'),
      coordinatesAvailable:
        coords.coordinatesAvailable ??
        (typeof coords.latitude === 'number' && typeof coords.longitude === 'number'),
    };
    databaseService.setActiveLocation(JSON.stringify(this.currentLocation));
    return this.currentLocation;
  }

  async setManualLocation(input: {
    houseFlat: string;
    street: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  }): Promise<LocationCoords> {
    const parts = [
      input.houseFlat,
      input.street,
      input.area,
      input.city,
      input.state,
      input.pincode ? `PIN: ${input.pincode}` : '',
    ].filter(Boolean);

    const fullAddress = parts.join(', ');
    const hasValidCoords =
      typeof input.latitude === 'number' &&
      typeof input.longitude === 'number' &&
      !isNaN(input.latitude) &&
      !isNaN(input.longitude);

    const manualCoords: LocationCoords = {
      address: fullAddress,
      city: input.city || 'Local Area',
      pincode: input.pincode || '',
      isGps: false,
      locationMode: 'MANUAL',
      coordinatesAvailable: hasValidCoords,
      latitude: hasValidCoords ? input.latitude : undefined,
      longitude: hasValidCoords ? input.longitude : undefined,
      manualDetails: {
        houseFlat: input.houseFlat,
        street: input.street,
        area: input.area,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
      },
    };

    this.currentLocation = manualCoords;
    databaseService.setActiveLocation(JSON.stringify(manualCoords));
    return manualCoords;
  }

  /**
   * Safe optional geocoding for manual addresses.
   * If offline, timeout, or geocoder unavailable, returns null gracefully without throwing.
   */
  async geocodeAddress(addressQuery: string): Promise<{ latitude: number; longitude: number } | null> {
    if (!addressQuery || !addressQuery.trim()) return null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}&limit=1`,
        {
          headers: { 'User-Agent': 'SahakarSeva-Cooperative-App' },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lon)) {
            return { latitude: lat, longitude: lon };
          }
        }
      }
    } catch {
      // Offline, network timeout, or geocoder unavailable
    }
    return null;
  }

  /**
   * Requests real GPS coordinates from browser/device Geolocation API
   */
  async requestLiveGpsLocation(): Promise<{ success: boolean; coords?: LocationCoords; error?: string; errorCode?: string }> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return {
        success: false,
        error: 'Geolocation is not supported by your device or browser.',
        errorCode: 'UNSUPPORTED',
      };
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: 'GPS request timed out. Please select location manually or verify browser location permissions.',
          errorCode: 'TIMEOUT',
        });
      }, 12000);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(timeoutId);
          const { latitude, longitude } = position.coords;

          // Required development logging
          console.log('[GPS SUCCESS] Latitude:', latitude, 'Longitude:', longitude);

          // Reverse geocode to resolve actual street/city/district
          let address = `GPS Location (${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°)`;
          let city = 'Current Area';
          let pincode = '';

          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
              { headers: { 'User-Agent': 'SahakarSeva-Cooperative-App' } }
            );
            if (res.ok) {
              const data = await res.json();
              if (data.display_name) {
                address = data.display_name.split(',').slice(0, 3).join(', ');
              }
              if (data.address) {
                city =
                  data.address.city ||
                  data.address.town ||
                  data.address.village ||
                  data.address.suburb ||
                  data.address.neighbourhood ||
                  data.address.state_district ||
                  data.address.state ||
                  'Current Area';
                pincode = data.address.postcode || '';
              }
            }
          } catch {
            // Geocoder service offline or rate-limited; preserve accurate GPS coordinates
          }

          const liveCoords: LocationCoords = {
            latitude,
            longitude,
            address,
            city,
            pincode,
            isGps: true,
            locationMode: 'GPS',
            coordinatesAvailable: true,
          };

          this.currentLocation = liveCoords;
          databaseService.setActiveLocation(JSON.stringify(liveCoords));
          resolve({ success: true, coords: liveCoords });
        },
        (err) => {
          clearTimeout(timeoutId);
          console.warn('[GPS ERROR]', err.code, err.message);
          let message = 'Failed to acquire GPS location.';
          let code = 'UNKNOWN';

          if (err.code === err.PERMISSION_DENIED) {
            code = 'PERMISSION_DENIED';
            message = 'GPS location permission denied. Enable browser location or enter your address manually.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            code = 'POSITION_UNAVAILABLE';
            message = 'Location signal is unavailable on your device. Please enter your address manually.';
          } else if (err.code === err.TIMEOUT) {
            code = 'TIMEOUT';
            message = 'GPS location request timed out. Please check signal or enter your address manually.';
          }

          resolve({ success: false, error: message, errorCode: code });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  /**
   * Watch live GPS position updates continuously (e.g. while moving)
   */
  watchLiveGpsLocation(
    onUpdate: (coords: LocationCoords) => void,
    onError?: (error: string) => void
  ): () => void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      onError?.('Geolocation not supported');
      return () => {};
    }

    try {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('[GPS UPDATE] Latitude:', latitude, 'Longitude:', longitude);

          const updated: LocationCoords = {
            ...(this.currentLocation || {
              address: `GPS Location (${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°)`,
              city: 'Current Area',
              pincode: '',
            }),
            latitude,
            longitude,
            isGps: true,
            locationMode: 'GPS',
            coordinatesAvailable: true,
          };

          this.currentLocation = updated;
          databaseService.setActiveLocation(JSON.stringify(updated));
          onUpdate(updated);
        },
        (err) => {
          console.warn('[GPS WATCH ERROR]', err.message);
          onError?.(err.message);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    } catch (e: any) {
      console.warn('Failed to register watchPosition', e);
      return () => {};
    }
  }

  calculateDistance(lat1?: number, lon1?: number, lat2?: number, lon2?: number): number {
    if (
      lat1 == null ||
      lon1 == null ||
      lat2 == null ||
      lon2 == null ||
      isNaN(lat1) ||
      isNaN(lon1) ||
      isNaN(lat2) ||
      isNaN(lon2)
    ) {
      return 0;
    }
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }
}

export const locationService = new LocationService();
