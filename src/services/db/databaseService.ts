import { AppUser, WorkerProfile, Booking, Review, Customer, SupportRequest } from '../../types';
import { mockWorkers, mockBookings, mockCustomer, mockWorkerUser, mockAdminUser, mockReviews } from '../../data';

const STORAGE_KEYS = {
  SESSION: 'sahakar_auth_session',
  USERS: 'sahakar_users',
  WORKERS: 'sahakar_workers',
  BOOKINGS: 'sahakar_bookings',
  REVIEWS: 'sahakar_reviews',
  LOCATION: 'sahakar_active_location',
  SUPPORT_REQUESTS: 'sahakar_support_requests',
};

// Real coordinates in Bengaluru for seed workers
const WORKER_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'worker-101': { lat: 12.9784, lng: 77.6408 }, // Suresh Kumar (Ulsoor / Indiranagar)
  'worker-102': { lat: 12.9609, lng: 77.6387 }, // Manjunatha Gowda (Domlur)
  'worker-103': { lat: 12.9352, lng: 77.6245 }, // Radha Bai (Koramangala)
  'worker-104': { lat: 12.9719, lng: 77.6412 }, // Anand Viswakarma (Indiranagar / Mysore Rd)
  'worker-105': { lat: 12.9850, lng: 77.6050 }, // Mohd. Rafiq (Shivaji Nagar)
  'worker-106': { lat: 12.9560, lng: 77.7010 }, // Sunita Devi (Marathahalli)
  'worker-107': { lat: 13.0160, lng: 77.6780 }, // Praveen Yadav (Ramamurthy Nagar)
  'worker-108': { lat: 12.9698, lng: 77.7500 }, // Whitefield worker
  'worker-109': { lat: 12.9121, lng: 77.6446 }, // HSR Layout worker
  'worker-110': { lat: 13.0031, lng: 77.5643 }, // Malleshwaram worker
};

class StorageAdapter {
  private memoryStore: Record<string, string> = {};

  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Ignore security/sandbox storage errors
    }
    return this.memoryStore[key] || null;
  }

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Ignore
    }
    this.memoryStore[key] = value;
  }

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {
      // Ignore
    }
    delete this.memoryStore[key];
  }
}

export const storage = new StorageAdapter();

class DatabaseService {
  private supabaseUrl: string = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  private supabaseAnonKey: string = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  private broadcastChannel: any = null;

  constructor() {
    this.initBroadcastChannel();
    this.initializeData();
  }

  public isSupabaseConfigured(): boolean {
    return Boolean(this.supabaseUrl && this.supabaseAnonKey);
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new (window as any).BroadcastChannel('sahakar_live_channel');
      } catch {
        // ignore
      }
    }
  }

  public broadcastUpdate(type: string, data?: any) {
    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type, data, timestamp: Date.now() });
      }
    } catch {
      // ignore
    }
  }

  public onBroadcastUpdate(callback: (event: any) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handleBcMessage = (msg: any) => {
      if (msg?.data) callback(msg.data);
    };
    if (this.broadcastChannel) {
      this.broadcastChannel.addEventListener('message', handleBcMessage);
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.BOOKINGS) {
        callback({ type: 'BOOKING_UPDATED' });
      } else if (e.key === STORAGE_KEYS.SUPPORT_REQUESTS) {
        callback({ type: 'SUPPORT_REQUEST_UPDATED' });
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      if (this.broadcastChannel) {
        this.broadcastChannel.removeEventListener('message', handleBcMessage);
      }
      window.removeEventListener('storage', handleStorageEvent);
    };
  }

  private initializeData() {
    // Seed workers if not stored
    if (!storage.getItem(STORAGE_KEYS.WORKERS)) {
      const seededWorkers = mockWorkers.map((w) => {
        const coords = WORKER_COORDINATES[w.id] || { lat: 12.9784, lng: 77.6408 };
        return {
          ...w,
          latitude: coords.lat,
          longitude: coords.lng,
        };
      });
      storage.setItem(STORAGE_KEYS.WORKERS, JSON.stringify(seededWorkers));
    }

    // Real bookings start empty for the user flow. No 2024 mock bookings seeded.
    if (!storage.getItem(STORAGE_KEYS.BOOKINGS)) {
      storage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify([]));
    }

    // Seed reviews if not stored
    if (!storage.getItem(STORAGE_KEYS.REVIEWS)) {
      storage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(mockReviews));
    }

    // Seed users if not stored
    if (!storage.getItem(STORAGE_KEYS.USERS)) {
      const initialUsers: AppUser[] = [mockCustomer, mockWorkerUser, mockAdminUser];
      storage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initialUsers));
    }
  }

  // ==================== AUTH & SESSION ====================

  async getSession(): Promise<AppUser | null> {
    const raw = storage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async setSession(user: AppUser | null): Promise<void> {
    if (!user) {
      storage.removeItem(STORAGE_KEYS.SESSION);
    } else {
      storage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
    }
  }

  async clearSession(): Promise<void> {
    storage.removeItem(STORAGE_KEYS.SESSION);
  }

  async updateUser(updatedUser: AppUser): Promise<AppUser> {
    const users = await this.getUsers();
    const index = users.findIndex((u) => u.id === updatedUser.id);
    if (index >= 0) {
      users[index] = updatedUser;
    } else {
      users.push(updatedUser);
    }
    storage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    // Update active session if this is the current user
    const session = await this.getSession();
    if (session && session.id === updatedUser.id) {
      await this.setSession(updatedUser);
    }

    return updatedUser;
  }

  async getUsers(): Promise<AppUser[]> {
    const raw = storage.getItem(STORAGE_KEYS.USERS);
    if (!raw) return [mockCustomer, mockWorkerUser, mockAdminUser];
    try {
      return JSON.parse(raw);
    } catch {
      return [mockCustomer, mockWorkerUser, mockAdminUser];
    }
  }

  async addCustomerSavedAddress(customerId: string, address: { title: string; address: string }): Promise<void> {
    const users = await this.getUsers();
    const userIndex = users.findIndex((u) => u.id === customerId);
    if (userIndex >= 0 && users[userIndex].role === 'customer') {
      const cust = users[userIndex] as any;
      cust.savedAddresses = cust.savedAddresses || [];
      cust.savedAddresses.push({
        id: `addr-${Date.now()}`,
        title: address.title,
        address: address.address,
        isDefault: false,
      });
      storage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  }

  // ==================== WORKERS ====================

  async getWorkers(): Promise<WorkerProfile[]> {
    const raw = storage.getItem(STORAGE_KEYS.WORKERS);
    let workers: WorkerProfile[] = [];
    if (!raw) {
      workers = [...mockWorkers];
    } else {
      try {
        workers = JSON.parse(raw);
      } catch {
        workers = [...mockWorkers];
      }
    }

    return workers.map((w) => {
      if (w.latitude === undefined || w.longitude === undefined) {
        const coords = WORKER_COORDINATES[w.id];
        if (coords) {
          return { ...w, latitude: coords.lat, longitude: coords.lng };
        }
      }
      return w;
    });
  }

  async getWorkerById(id: string): Promise<WorkerProfile | undefined> {
    const workers = await this.getWorkers();
    return workers.find((w) => w.id === id);
  }

  async updateWorker(updated: WorkerProfile): Promise<WorkerProfile> {
    const workers = await this.getWorkers();
    const index = workers.findIndex((w) => w.id === updated.id);
    if (index >= 0) {
      workers[index] = updated;
    } else {
      workers.push(updated);
    }
    storage.setItem(STORAGE_KEYS.WORKERS, JSON.stringify(workers));
    return updated;
  }

  async updateWorkerAvailability(workerId: string, isAvailable: boolean): Promise<boolean> {
    const worker = await this.getWorkerById(workerId);
    if (worker) {
      worker.isAvailable = isAvailable;
      await this.updateWorker(worker);
      return true;
    }
    return false;
  }

  async updateWorkerLocation(workerId: string, latitude: number, longitude: number): Promise<boolean> {
    const worker = await this.getWorkerById(workerId);
    if (worker) {
      worker.latitude = latitude;
      worker.longitude = longitude;
      await this.updateWorker(worker);
      return true;
    }
    return false;
  }

  // ==================== BOOKINGS ====================

  async getBookings(): Promise<Booking[]> {
    // 1. If Supabase is configured, fetch live bookings from Supabase
    if (this.isSupabaseConfigured()) {
      try {
        const response = await fetch(
          `${this.supabaseUrl}/rest/v1/bookings?select=*&order=created_at.desc`,
          {
            headers: {
              apikey: this.supabaseAnonKey,
              Authorization: `Bearer ${this.supabaseAnonKey}`,
            },
          }
        );
        if (response.ok) {
          const rows = await response.json();
          if (Array.isArray(rows) && rows.length > 0) {
            return rows.map(mapSupabaseRowToBooking);
          }
        }
      } catch (err) {
        console.warn('Supabase getBookings error:', err);
      }
    }

    // 2. Persistent storage fallback
    const raw = storage.getItem(STORAGE_KEYS.BOOKINGS);
    if (!raw) return [];
    try {
      const parsed: Booking[] = JSON.parse(raw);
      // Remove legacy 2024 mock seed bookings from active real-user flow
      return parsed.filter((b) => !b.id.startsWith('bk-2024-'));
    } catch {
      return [];
    }
  }

  async getBookingById(id: string): Promise<Booking | undefined> {
    if (this.isSupabaseConfigured()) {
      try {
        const response = await fetch(
          `${this.supabaseUrl}/rest/v1/bookings?id=eq.${encodeURIComponent(id)}&select=*`,
          {
            headers: {
              apikey: this.supabaseAnonKey,
              Authorization: `Bearer ${this.supabaseAnonKey}`,
            },
          }
        );
        if (response.ok) {
          const rows = await response.json();
          if (Array.isArray(rows) && rows.length > 0) {
            return mapSupabaseRowToBooking(rows[0]);
          }
        }
      } catch (err) {
        console.warn('Supabase getBookingById error:', err);
      }
    }

    const bookings = await this.getBookings();
    return bookings.find((b) => b.id === id);
  }

  async saveBooking(booking: Booking): Promise<Booking> {
    const raw = storage.getItem(STORAGE_KEYS.BOOKINGS);
    let bookings: Booking[] = [];
    try {
      bookings = raw ? JSON.parse(raw) : [];
    } catch {
      bookings = [];
    }

    // Filter out legacy 2024 mock bookings
    bookings = bookings.filter((b) => !b.id.startsWith('bk-2024-'));

    const index = bookings.findIndex((b) => b.id === booking.id);
    if (index >= 0) {
      bookings[index] = booking;
    } else {
      bookings.unshift(booking);
    }
    storage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));

    // Broadcast across tabs/windows in real time
    this.broadcastUpdate('BOOKING_UPDATED', booking);

    // If Supabase is configured, persist to remote Supabase database
    if (this.isSupabaseConfigured()) {
      try {
        const payload = mapBookingToSupabaseRow(booking);
        await fetch(`${this.supabaseUrl}/rest/v1/bookings`, {
          method: 'POST',
          headers: {
            apikey: this.supabaseAnonKey,
            Authorization: `Bearer ${this.supabaseAnonKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn('Supabase saveBooking error:', err);
      }
    }

    return booking;
  }

  async updateBookingWorkerLocation(
    bookingId: string,
    latitude: number,
    longitude: number
  ): Promise<Booking | null> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return null;

    const updatedAt = new Date().toISOString();
    booking.workerLocation = {
      latitude,
      longitude,
      updatedAt,
    };

    const saved = await this.saveBooking(booking);

    // If Supabase is configured, send fast PATCH for live worker coordinates
    if (this.isSupabaseConfigured()) {
      try {
        await fetch(
          `${this.supabaseUrl}/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}`,
          {
            method: 'PATCH',
            headers: {
              apikey: this.supabaseAnonKey,
              Authorization: `Bearer ${this.supabaseAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              worker_lat: latitude,
              worker_lng: longitude,
              worker_location_updated_at: updatedAt,
            }),
          }
        );
      } catch (err) {
        console.warn('Supabase updateBookingWorkerLocation error:', err);
      }
    }

    return saved;
  }

  // ==================== REVIEWS ====================

  async getReviews(): Promise<Review[]> {
    const raw = storage.getItem(STORAGE_KEYS.REVIEWS);
    if (!raw) return [...mockReviews];
    try {
      return JSON.parse(raw);
    } catch {
      return [...mockReviews];
    }
  }

  async addReview(review: Review): Promise<Review> {
    const reviews = await this.getReviews();
    reviews.unshift(review);
    storage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
    return review;
  }

  // ==================== ACTIVE LOCATION ====================

  getActiveLocation(): string | null {
    return storage.getItem(STORAGE_KEYS.LOCATION);
  }

  setActiveLocation(locationJson: string): void {
    storage.setItem(STORAGE_KEYS.LOCATION, locationJson);
  }

  // ==================== SUPPORT REQUESTS ====================

  async getSupportRequests(customerId?: string): Promise<SupportRequest[]> {
    // 1. If Supabase is configured, fetch live support requests from Supabase
    if (this.isSupabaseConfigured()) {
      try {
        const queryParam = customerId ? `?select=*&customer_id=eq.${customerId}&order=created_at.desc` : '?select=*&order=created_at.desc';
        const response = await fetch(
          `${this.supabaseUrl}/rest/v1/support_requests${queryParam}`,
          {
            headers: {
              apikey: this.supabaseAnonKey,
              Authorization: `Bearer ${this.supabaseAnonKey}`,
            },
          }
        );
        if (response.ok) {
          const rows = await response.json();
          if (Array.isArray(rows) && rows.length > 0) {
            return rows.map(mapSupabaseRowToSupportRequest);
          }
        }
      } catch (err) {
        console.warn('Supabase getSupportRequests error:', err);
      }
    }

    // 2. Persistent storage fallback
    const raw = storage.getItem(STORAGE_KEYS.SUPPORT_REQUESTS);
    if (!raw) return [];
    try {
      const all: SupportRequest[] = JSON.parse(raw);
      if (customerId) {
        return all.filter((r) => r.customerId === customerId);
      }
      return all;
    } catch {
      return [];
    }
  }

  async getSupportRequestById(id: string): Promise<SupportRequest | null> {
    const all = await this.getSupportRequests();
    return all.find((r) => r.id === id || r.ticketCode === id) || null;
  }

  async createSupportRequest(request: Omit<SupportRequest, 'id' | 'ticketCode' | 'status' | 'createdAt' | 'updatedAt'> & {
    id?: string;
    ticketCode?: string;
    status?: SupportRequest['status'];
    createdAt?: string;
  }): Promise<SupportRequest> {
    const now = new Date().toISOString();
    const id = request.id || `sr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const currentYear = new Date().getFullYear();
    const ticketCode = request.ticketCode || `TKT-${currentYear}-${randomSuffix}`;

    const newRequest: SupportRequest = {
      id,
      ticketCode,
      customerId: request.customerId,
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      customerEmail: request.customerEmail,
      bookingId: request.bookingId,
      bookingCode: request.bookingCode,
      category: request.category,
      subject: request.subject,
      message: request.message,
      status: request.status || 'OPEN',
      createdAt: request.createdAt || now,
      updatedAt: now,
    };

    // Save to local storage
    const raw = storage.getItem(STORAGE_KEYS.SUPPORT_REQUESTS);
    let all: SupportRequest[] = [];
    if (raw) {
      try {
        all = JSON.parse(raw);
      } catch {
        all = [];
      }
    }
    all.unshift(newRequest);
    storage.setItem(STORAGE_KEYS.SUPPORT_REQUESTS, JSON.stringify(all));

    // Broadcast across tabs/windows in real time
    this.broadcastUpdate('SUPPORT_REQUEST_CREATED', newRequest);

    // If Supabase is configured, persist to remote Supabase database
    if (this.isSupabaseConfigured()) {
      try {
        const payload = mapSupportRequestToSupabaseRow(newRequest);
        await fetch(`${this.supabaseUrl}/rest/v1/support_requests`, {
          method: 'POST',
          headers: {
            apikey: this.supabaseAnonKey,
            Authorization: `Bearer ${this.supabaseAnonKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn('Supabase createSupportRequest error:', err);
      }
    }

    return newRequest;
  }
}

export const databaseService = new DatabaseService();

// ==================== SUPABASE DATA MAPPERS ====================

function mapBookingToSupabaseRow(booking: Booking): any {
  return {
    id: booking.id,
    booking_code: booking.bookingCode,
    customer_id: booking.customerId,
    customer_name: booking.customerName,
    customer_phone: booking.customerPhone,
    worker_id: booking.workerId,
    worker_name: booking.workerName,
    worker_skill: booking.workerSkill,
    worker_phone: booking.workerPhone,
    cooperative_name: booking.cooperativeName,
    category_id: booking.categoryId,
    service_title: booking.serviceTitle,
    scheduled_date: booking.scheduledDate,
    scheduled_time_slot: booking.scheduledTimeSlot,
    status: booking.status,
    address_line: booking.serviceLocation.addressLine,
    landmark: booking.serviceLocation.landmark || '',
    city: booking.serviceLocation.city,
    pincode: booking.serviceLocation.pincode,
    customer_lat: booking.serviceLocation.latitude ?? null,
    customer_lng: booking.serviceLocation.longitude ?? null,
    location_mode: booking.serviceLocation.locationMode || 'MANUAL',
    manual_details: booking.serviceLocation.manualDetails || null,
    instructions: booking.instructions || '',
    estimated_amount: booking.estimatedAmount,
    final_amount: booking.finalAmount || booking.estimatedAmount,
    welfare_cess_amount: booking.welfareCessAmount,
    is_emergency: Boolean(booking.isEmergency),
    is_priority: Boolean(booking.isPriority),
    worker_lat: booking.workerLocation?.latitude || null,
    worker_lng: booking.workerLocation?.longitude || null,
    worker_location_updated_at: booking.workerLocation?.updatedAt || null,
    payment_method: booking.paymentMethod || 'upi',
    payment_status: booking.paymentStatus || 'pending',
    has_rated: Boolean(booking.hasRated),
    status_history: booking.statusHistory || [],
    completed_at: booking.completedAt || null,
    created_at: booking.createdAt,
    updated_at: new Date().toISOString(),
  };
}

function mapSupabaseRowToBooking(row: any): Booking {
  const hasLat = row.customer_lat != null && !isNaN(Number(row.customer_lat));
  const hasLng = row.customer_lng != null && !isNaN(Number(row.customer_lng));

  return {
    id: row.id,
    bookingCode: row.booking_code,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    workerId: row.worker_id,
    workerName: row.worker_name,
    workerSkill: row.worker_skill,
    workerPhone: row.worker_phone,
    cooperativeName: row.cooperative_name,
    categoryId: row.category_id,
    serviceTitle: row.service_title,
    scheduledDate: row.scheduled_date,
    scheduledTimeSlot: row.scheduled_time_slot,
    status: row.status,
    serviceLocation: {
      addressLine: row.address_line,
      landmark: row.landmark,
      city: row.city,
      pincode: row.pincode,
      latitude: hasLat ? Number(row.customer_lat) : undefined,
      longitude: hasLng ? Number(row.customer_lng) : undefined,
      locationMode: row.location_mode || (hasLat ? 'GPS' : 'MANUAL'),
      manualDetails: row.manual_details || undefined,
    },
    instructions: row.instructions,
    estimatedAmount: Number(row.estimated_amount),
    finalAmount: row.final_amount ? Number(row.final_amount) : undefined,
    welfareCessAmount: Number(row.welfare_cess_amount),
    isEmergency: Boolean(row.is_emergency),
    isPriority: Boolean(row.is_priority),
    workerLocation:
      row.worker_lat != null && row.worker_lng != null
        ? {
            latitude: Number(row.worker_lat),
            longitude: Number(row.worker_lng),
            updatedAt: row.worker_location_updated_at,
          }
        : undefined,
    completedAt: row.completed_at || undefined,
    createdAt: row.created_at,
    statusHistory: Array.isArray(row.status_history) ? row.status_history : [],
    hasRated: Boolean(row.has_rated),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
  };
}

function mapSupportRequestToSupabaseRow(req: SupportRequest): any {
  return {
    id: req.id,
    ticket_code: req.ticketCode,
    customer_id: req.customerId,
    customer_name: req.customerName,
    customer_phone: req.customerPhone || null,
    customer_email: req.customerEmail || null,
    booking_id: req.bookingId || null,
    booking_code: req.bookingCode || null,
    category: req.category,
    subject: req.subject,
    message: req.message,
    status: req.status,
    created_at: req.createdAt,
    updated_at: req.updatedAt,
  };
}

function mapSupabaseRowToSupportRequest(row: any): SupportRequest {
  return {
    id: row.id,
    ticketCode: row.ticket_code,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone || undefined,
    customerEmail: row.customer_email || undefined,
    bookingId: row.booking_id || undefined,
    bookingCode: row.booking_code || undefined,
    category: row.category,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
