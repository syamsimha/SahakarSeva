export interface LocationCoords {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  pincode: string;
}

export const defaultLocations: Record<string, LocationCoords> = {
  indiranagar: {
    latitude: 12.9784,
    longitude: 77.6408,
    address: 'Indiranagar, 100 Feet Road, Bengaluru',
    city: 'Bengaluru',
    pincode: '560038',
  },
  koramangala: {
    latitude: 12.9352,
    longitude: 77.6245,
    address: 'Koramangala 4th Block, Bengaluru',
    city: 'Bengaluru',
    pincode: '560034',
  },
  whitefield: {
    latitude: 12.9698,
    longitude: 77.7500,
    address: 'ITPL Main Road, Whitefield, Bengaluru',
    city: 'Bengaluru',
    pincode: '560066',
  },
};

class LocationService {
  private currentLocation: LocationCoords = defaultLocations.indiranagar;

  async getCurrentLocation(): Promise<LocationCoords> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(this.currentLocation), 100);
    });
  }

  async setLocation(key: keyof typeof defaultLocations): Promise<LocationCoords> {
    this.currentLocation = defaultLocations[key] || defaultLocations.indiranagar;
    return this.currentLocation;
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
