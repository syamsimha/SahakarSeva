import { databaseService } from './db/databaseService';

export type LocationMode = 'GPS' | 'MANUAL';

export interface ManualAddressDetails {
  houseFlat?: string;
  flatBuilding?: string;
  street?: string;
  streetArea?: string;
  area?: string;
  landmark?: string;
  city: string;
  state?: string;
  pincode: string;
}

export interface LocationCoords {
  latitude?: number;
  longitude?: number;
  address: string;
  city: string;
  pincode: string;
  placeName?: string;
  area?: string;
  state?: string;
  isGPS?: boolean;
  isGps?: boolean;
  locationMode?: LocationMode;
  manualDetails?: ManualAddressDetails;
  coordinatesAvailable?: boolean;
}

export const defaultLocations: Record<string, LocationCoords> = {
  visakhapatnam: {
    latitude: 17.6868,
    longitude: 83.2185,
    address: 'RK Beach Road, Pandurangapuram, Visakhapatnam',
    placeName: 'Visakhapatnam Beach Road',
    area: 'RK Beach Corridor',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    pincode: '530003',
    isGPS: false,
    isGps: false,
    locationMode: 'MANUAL',
    coordinatesAvailable: true,
  },
  hyderabad: {
    latitude: 17.4483,
    longitude: 78.3915,
    address: 'Hitech City Main Road, Madhapur, Hyderabad',
    placeName: 'Hitech City & Madhapur',
    area: 'Madhapur Tech Hub',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500081',
    isGPS: false,
    isGps: false,
    locationMode: 'MANUAL',
    coordinatesAvailable: true,
  },
  mumbai: {
    latitude: 19.076,
    longitude: 72.8777,
    address: 'Bandra West, Linking Road, Mumbai',
    placeName: 'Bandra West',
    area: 'Bandra West Zone',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
    isGPS: false,
    isGps: false,
    locationMode: 'MANUAL',
    coordinatesAvailable: true,
  },
  delhi: {
    latitude: 28.6139,
    longitude: 77.209,
    address: 'Connaught Place, Central Delhi, New Delhi',
    placeName: 'Connaught Place',
    area: 'Inner Circle CP',
    city: 'New Delhi',
    state: 'Delhi NCR',
    pincode: '110001',
    isGPS: false,
    isGps: false,
    locationMode: 'MANUAL',
    coordinatesAvailable: true,
  },
  chennai: {
    latitude: 13.0827,
    longitude: 80.2707,
    address: 'T. Nagar, Usman Road, Chennai',
    placeName: 'T. Nagar',
    area: 'Usman Road Commercial Hub',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600017',
    isGPS: false,
    isGps: false,
    locationMode: 'MANUAL',
    coordinatesAvailable: true,
  },
  indiranagar: {
    latitude: 12.9784,
    longitude: 77.6408,
    address: 'Indiranagar, 100 Feet Road, Bengaluru',
    placeName: 'Indiranagar',
    area: 'Indiranagar 100ft Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    isGPS: false,
    isGps: false,
    locationMode: 'MANUAL',
    coordinatesAvailable: true,
  },
  koramangala: {
    latitude: 12.9352,
    longitude: 77.6245,
    address: 'Koramangala 4th Block, 80 Feet Road, Bengaluru',
    placeName: 'Koramangala',
    area: '4th Block',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560034',
    isGPS: false,
    isGps: false,
    locationMode: 'MANUAL',
    coordinatesAvailable: true,
  },
  whitefield: {
    latitude: 12.9698,
    longitude: 77.7500,
    address: 'ITPL Main Road, Whitefield, Bengaluru',
    placeName: 'Whitefield',
    area: 'ITPL Main Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560066',
    isGPS: false,
    isGps: false,
    locationMode: 'MANUAL',
    coordinatesAvailable: true,
  },
  hsr: {
    latitude: 12.9121,
    longitude: 77.6446,
    address: 'HSR Layout Sector 1, Bengaluru',
    placeName: 'HSR Layout',
    area: 'Sector 1',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560102',
    isGPS: false,
    isGps: false,
    locationMode: 'MANUAL',
    coordinatesAvailable: true,
  },
  malleshwaram: {
    latitude: 13.0031,
    longitude: 77.5643,
    address: 'Sampige Road, Malleshwaram, Bengaluru',
    placeName: 'Malleshwaram',
    area: 'Sampige Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560003',
    isGPS: false,
    isGps: false,
    locationMode: 'MANUAL',
    coordinatesAvailable: true,
  },
  pune: {
    latitude: 18.5204,
    longitude: 73.8567,
    address: 'FC Road, Shivajinagar, Pune',
    placeName: 'Shivajinagar & FC Road',
    area: 'Shivajinagar',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411005',
    isGPS: false,
    isGps: false,
    locationMode: 'MANUAL',
    coordinatesAvailable: true,
  },
  kolkata: {
    latitude: 22.5726,
    longitude: 88.3639,
    address: 'Salt Lake Sector V, Bidhannagar, Kolkata',
    placeName: 'Salt Lake Sector V',
    area: 'Sector V IT Corridor',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700091',
    isGPS: false,
    isGps: false,
    locationMode: 'MANUAL',
    coordinatesAvailable: true,
  },
};

export const getFederationName = (loc?: LocationCoords): string => {
  if (!loc) return 'National Labour Cooperative Federation';
  const region = loc.state || loc.city || 'State';
  return `${region} State Labour Cooperative Federation`;
};

export const getCooperativeAct = (loc?: LocationCoords): string => {
  if (!loc) return 'Cooperative Societies Act';
  const region = loc.state || loc.city || 'State';
  return `${region} State Labour Cooperative Societies Act`;
};

export const getApexBankName = (loc?: LocationCoords): string => {
  if (!loc) return 'State Apex Cooperative Bank';
  const region = loc.state || loc.city || 'State';
  return `${region} State Apex Cooperative Bank`;
};

export const getGovtDeptHeading = (loc?: LocationCoords): string => {
  if (!loc) return 'DEPARTMENT OF COOPERATION • GOVERNMENT OF INDIA';
  const region = (loc.state || loc.city || 'INDIA').toUpperCase();
  return `DEPARTMENT OF COOPERATION • GOVERNMENT OF ${region}`;
};

export const getClusterName = (loc?: LocationCoords): string => {
  if (!loc) return 'Urban Labour Cluster';
  return `${loc.placeName || loc.city} Urban Cluster`;
};

export type LocationListener = (loc: LocationCoords) => void;

class LocationService {
  private currentLocation: LocationCoords;
  private listeners: Set<LocationListener> = new Set();

  constructor() {
    let initial: LocationCoords = { ...defaultLocations.visakhapatnam };
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
          initial = parsed;
        }
      }
    } catch {
      // Ignore
    }
    this.currentLocation = initial;
  }

  subscribe(listener: LocationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentLocation);
      } catch (err) {
        console.error('Error in location listener:', err);
      }
    });
  }

  async getCurrentLocation(): Promise<LocationCoords> {
    return this.currentLocation;
  }

  async setLocation(key: string | keyof typeof defaultLocations): Promise<LocationCoords> {
    if (defaultLocations[key as keyof typeof defaultLocations]) {
      this.currentLocation = { ...defaultLocations[key as keyof typeof defaultLocations] };
    }
    databaseService.setActiveLocation(JSON.stringify(this.currentLocation));
    this.notify();
    return this.currentLocation;
  }

  async setCustomLocation(location: Partial<LocationCoords>): Promise<LocationCoords> {
    this.currentLocation = {
      ...this.currentLocation,
      ...location,
      latitude: location.latitude ?? this.currentLocation.latitude,
      longitude: location.longitude ?? this.currentLocation.longitude,
      address: location.address || this.currentLocation.address,
      placeName: location.placeName || location.area || this.currentLocation.placeName,
      area: location.area || this.currentLocation.area,
      city: location.city || this.currentLocation.city,
      state: location.state || this.currentLocation.state,
      pincode: location.pincode || this.currentLocation.pincode,
      isGPS: location.isGPS ?? location.isGps ?? false,
      isGps: location.isGps ?? location.isGPS ?? false,
      locationMode: location.locationMode || this.currentLocation.locationMode || 'MANUAL',
      coordinatesAvailable:
        location.coordinatesAvailable ??
        (location.latitude != null && location.longitude != null),
    };
    databaseService.setActiveLocation(JSON.stringify(this.currentLocation));
    this.notify();
    return this.currentLocation;
  }

  async setManualLocation(input: {
    houseFlat?: string;
    flatBuilding?: string;
    street?: string;
    streetArea?: string;
    area?: string;
    city: string;
    state?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  }): Promise<LocationCoords> {
    const streetPart = input.street || input.streetArea || '';
    const housePart = input.houseFlat || input.flatBuilding || '';
    const fullAddress = [housePart, streetPart, input.area, input.city, input.pincode]
      .filter(Boolean)
      .join(', ');

    const hasValidCoords =
      typeof input.latitude === 'number' &&
      typeof input.longitude === 'number' &&
      !isNaN(input.latitude) &&
      !isNaN(input.longitude);

    const manualCoords: LocationCoords = {
      address: fullAddress,
      city: input.city || 'Local Area',
      pincode: input.pincode || '',
      placeName: input.area || input.city,
      area: input.area || streetPart,
      state: input.state || '',
      isGPS: false,
      isGps: false,
      locationMode: 'MANUAL',
      coordinatesAvailable: hasValidCoords,
      latitude: hasValidCoords ? input.latitude : undefined,
      longitude: hasValidCoords ? input.longitude : undefined,
      manualDetails: {
        houseFlat: housePart,
        flatBuilding: housePart,
        street: streetPart,
        streetArea: streetPart,
        area: input.area,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
      },
    };

    this.currentLocation = manualCoords;
    databaseService.setActiveLocation(JSON.stringify(manualCoords));
    this.notify();
    return manualCoords;
  }

  async modifyPlaceName(
    newPlaceName: string,
    newCity?: string,
    newAddress?: string,
    newState?: string
  ): Promise<LocationCoords> {
    this.currentLocation = {
      ...this.currentLocation,
      placeName: newPlaceName.trim(),
      city: newCity ? newCity.trim() : this.currentLocation.city,
      state: newState ? newState.trim() : this.currentLocation.state,
      address: newAddress
        ? newAddress.trim()
        : `${newPlaceName.trim()}, ${newCity || this.currentLocation.city}`,
    };
    databaseService.setActiveLocation(JSON.stringify(this.currentLocation));
    this.notify();
    return this.currentLocation;
  }

  async geocodeAddress(
    addressQuery: string
  ): Promise<{ latitude: number; longitude: number } | null> {
    if (!addressQuery || !addressQuery.trim()) return null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          addressQuery
        )}&limit=1`,
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

  async detectLiveGPS(): Promise<LocationCoords> {
    const res = await this.requestLiveGpsLocation();
    if (res.success && res.coords) {
      return res.coords;
    }
    throw new Error(res.error || 'Failed to acquire GPS location.');
  }

  async requestLiveGpsLocation(): Promise<{
    success: boolean;
    coords?: LocationCoords;
    error?: string;
    errorCode?: string;
  }> {
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
          error:
            'GPS request timed out. Please select location manually or verify browser location permissions.',
          errorCode: 'TIMEOUT',
        });
      }, 12000);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(timeoutId);
          const { latitude, longitude } = position.coords;
          console.log('[GPS SUCCESS] Latitude:', latitude, 'Longitude:', longitude);

          let address = `GPS Location (${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°)`;
          let city = 'Current Area';
          let pincode = '';
          let state = '';
          let placeName = 'Detected Location';
          let area = 'Local Area';

          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
              { headers: { 'User-Agent': 'SahakarSeva-Cooperative-App' } }
            );
            if (res.ok) {
              const data = await res.json();
              if (data.display_name) {
                address = data.display_name;
              }
              if (data.address) {
                const addr = data.address;
                const road = addr.road || addr.street || '';
                const neighbourhood =
                  addr.neighbourhood || addr.suburb || addr.residential || '';
                city =
                  addr.city ||
                  addr.town ||
                  addr.village ||
                  addr.state_district ||
                  'Current Area';
                state = addr.state || '';
                pincode = addr.postcode || '';
                area = neighbourhood || road || city;
                placeName = area ? `${area}, ${city}` : city;
              }
            }
          } catch {
            // Offline fallback
          }

          const liveCoords: LocationCoords = {
            latitude,
            longitude,
            address,
            city,
            state,
            pincode,
            placeName,
            area,
            isGPS: true,
            isGps: true,
            locationMode: 'GPS',
            coordinatesAvailable: true,
          };

          this.currentLocation = liveCoords;
          databaseService.setActiveLocation(JSON.stringify(liveCoords));
          this.notify();
          resolve({ success: true, coords: liveCoords });
        },
        (err) => {
          clearTimeout(timeoutId);
          console.warn('[GPS ERROR]', err.code, err.message);
          let message = 'Failed to acquire GPS location.';
          let code = 'UNKNOWN';

          if (err.code === err.PERMISSION_DENIED) {
            code = 'PERMISSION_DENIED';
            message =
              'GPS location permission denied. Enable browser location or enter your address manually.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            code = 'POSITION_UNAVAILABLE';
            message =
              'Location signal is unavailable on your device. Please enter your address manually.';
          } else if (err.code === err.TIMEOUT) {
            code = 'TIMEOUT';
            message =
              'GPS location request timed out. Please check signal or enter your address manually.';
          }

          resolve({ success: false, error: message, errorCode: code });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

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
          console.log('[GPS WATCH UPDATE] Latitude:', latitude, 'Longitude:', longitude);

          const updated: LocationCoords = {
            ...this.currentLocation,
            latitude,
            longitude,
            isGPS: true,
            isGps: true,
            locationMode: 'GPS',
            coordinatesAvailable: true,
          };

          this.currentLocation = updated;
          databaseService.setActiveLocation(JSON.stringify(updated));
          this.notify();
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

  async searchPlaces(query: string): Promise<LocationCoords[]> {
    if (!query || query.trim().length < 2) {
      return Object.values(defaultLocations);
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          query
        )}&limit=6&addressdetails=1`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'SahakarSeva-Cooperative-App',
          },
        }
      );

      if (res.ok) {
        const results = await res.json();
        return results.map((item: any) => {
          const addr = item.address || {};
          const road = addr.road || addr.street || '';
          const neighbourhood =
            addr.neighbourhood || addr.suburb || addr.residential || '';
          const city =
            addr.city || addr.town || addr.village || addr.county || item.name || '';
          const state = addr.state || '';
          const pincode = addr.postcode || '';

          const placeName = neighbourhood
            ? `${neighbourhood}, ${city}`
            : item.name || city;

          return {
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            address: item.display_name,
            placeName,
            area: neighbourhood || road || placeName,
            city: city || 'Urban Area',
            state,
            pincode,
            isGPS: false,
            isGps: false,
            locationMode: 'MANUAL' as LocationMode,
            coordinatesAvailable: true,
          };
        });
      }
    } catch {
      // Local fallback filter if search API is unreachable
      const q = query.toLowerCase();
      return Object.values(defaultLocations).filter(
        (l) =>
          l.address.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          (l.placeName && l.placeName.toLowerCase().includes(q))
      );
    }

    return Object.values(defaultLocations);
  }

  calculateDistance(
    lat1?: number,
    lon1?: number,
    lat2?: number,
    lon2?: number
  ): number {
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
