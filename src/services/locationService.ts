export interface LocationCoords {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  pincode: string;
  placeName?: string;
  area?: string;
  state?: string;
  isGPS?: boolean;
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

type LocationListener = (loc: LocationCoords) => void;

class LocationService {
  private currentLocation: LocationCoords = { ...defaultLocations.visakhapatnam };
  private listeners: Set<LocationListener> = new Set();
  private customSavedPlaces: LocationCoords[] = [];

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
    this.notify();
    return this.currentLocation;
  }

  async setCustomLocation(location: Partial<LocationCoords>): Promise<LocationCoords> {
    this.currentLocation = {
      latitude: location.latitude ?? this.currentLocation.latitude,
      longitude: location.longitude ?? this.currentLocation.longitude,
      address: location.address || this.currentLocation.address,
      placeName: location.placeName || location.area || this.currentLocation.placeName,
      area: location.area || this.currentLocation.area,
      city: location.city || this.currentLocation.city,
      state: location.state || this.currentLocation.state,
      pincode: location.pincode || this.currentLocation.pincode,
      isGPS: location.isGPS ?? false,
    };
    this.notify();
    return this.currentLocation;
  }

  async modifyPlaceName(newPlaceName: string, newCity?: string, newAddress?: string, newState?: string): Promise<LocationCoords> {
    this.currentLocation = {
      ...this.currentLocation,
      placeName: newPlaceName.trim(),
      city: newCity ? newCity.trim() : this.currentLocation.city,
      state: newState ? newState.trim() : this.currentLocation.state,
      address: newAddress ? newAddress.trim() : `${newPlaceName.trim()}, ${newCity || this.currentLocation.city}`,
    };
    this.notify();
    return this.currentLocation;
  }

  async detectLiveGPS(): Promise<LocationCoords> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        return reject(new Error('Geolocation is not supported by your device/browser.'));
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          try {
            // Reverse Geocode using OpenStreetMap Nominatim
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
              {
                headers: {
                  Accept: 'application/json',
                },
              }
            );

            if (res.ok) {
              const data = await res.json();
              const addr = data.address || {};

              const road = addr.road || addr.street || '';
              const neighbourhood = addr.neighbourhood || addr.suburb || addr.residential || '';
              const city = addr.city || addr.town || addr.village || addr.county || 'Local Area';
              const state = addr.state || '';
              const pincode = addr.postcode || '';

              const placePart = neighbourhood || road || city;
              const placeName = placePart ? `${placePart}, ${city}` : city;

              const fullAddress =
                data.display_name ||
                [road, neighbourhood, city, state, pincode].filter(Boolean).join(', ');

              this.currentLocation = {
                latitude: lat,
                longitude: lon,
                address: fullAddress,
                placeName,
                area: neighbourhood || road || placeName,
                city,
                state,
                pincode,
                isGPS: true,
              };

              this.notify();
              return resolve(this.currentLocation);
            }
          } catch {
            // Fallback if reverse geocode is slow / offline
          }

          this.currentLocation = {
            latitude: lat,
            longitude: lon,
            address: `Live GPS Location (${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E)`,
            placeName: 'My GPS Location',
            area: 'Current Location',
            city: 'Detected Area',
            state: '',
            pincode: '',
            isGPS: true,
          };

          this.notify();
          resolve(this.currentLocation);
        },
        (error) => {
          let errorMsg = 'Failed to acquire GPS location.';
          if (error.code === 1) {
            errorMsg = 'Location permission was denied. Please allow location permissions in your browser or device settings.';
          } else if (error.code === 2) {
            errorMsg = 'Position unavailable. Check if device GPS / location services are turned on.';
          } else if (error.code === 3) {
            errorMsg = 'Location request timed out. Please try again.';
          }
          reject(new Error(errorMsg));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }

  async searchPlaces(query: string): Promise<LocationCoords[]> {
    if (!query || query.trim().length < 2) {
      return Object.values(defaultLocations);
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (res.ok) {
        const results = await res.json();
        return results.map((item: any) => {
          const addr = item.address || {};
          const road = addr.road || addr.street || '';
          const neighbourhood = addr.neighbourhood || addr.suburb || addr.residential || '';
          const city = addr.city || addr.town || addr.village || addr.county || item.name || '';
          const state = addr.state || '';
          const pincode = addr.postcode || '';

          const placeName = neighbourhood ? `${neighbourhood}, ${city}` : item.name || city;

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

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
