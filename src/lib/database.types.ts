export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = 'customer' | 'worker' | 'admin';
export type WorkerVerificationStatus = 'pending' | 'under_review' | 'verified' | 'rejected' | 'changes_required';
export type DocumentType = 'aadhaar' | 'skill_certificate' | 'police_verification' | 'society_endorsement';
export type BookingStatus = 'requested' | 'accepted' | 'on_the_way' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'completed' | 'refunded';
export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'cash';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: AppRole;
          full_name: string;
          phone: string | null;
          email: string | null;
          avatar_url: string | null;
          address: string | null;
          city: string | null;
          pincode: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: AppRole;
          full_name: string;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          address?: string | null;
          city?: string | null;
          pincode?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: AppRole;
          full_name?: string;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          address?: string | null;
          city?: string | null;
          pincode?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      customer_profiles: {
        Row: {
          id: string;
          saved_addresses: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          saved_addresses?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          saved_addresses?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      worker_profiles: {
        Row: {
          id: string;
          primary_skill: string;
          all_skills: string[];
          cooperative_name: string;
          cooperative_id: string | null;
          experience_years: number;
          certifications: string[];
          rating: number;
          review_count: number;
          completed_jobs_count: number;
          hourly_rate: number;
          base_rate: number;
          is_available: boolean;
          service_area: string | null;
          service_radius_km: number;
          languages: string[];
          about: string | null;
          verification_status: WorkerVerificationStatus;
          welfare_member_id: string | null;
          bank_account_linked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          primary_skill: string;
          all_skills?: string[];
          cooperative_name: string;
          cooperative_id?: string | null;
          experience_years?: number;
          certifications?: string[];
          rating?: number;
          review_count?: number;
          completed_jobs_count?: number;
          hourly_rate?: number;
          base_rate?: number;
          is_available?: boolean;
          service_area?: string | null;
          service_radius_km?: number;
          languages?: string[];
          about?: string | null;
          verification_status?: WorkerVerificationStatus;
          welfare_member_id?: string | null;
          bank_account_linked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          primary_skill?: string;
          all_skills?: string[];
          cooperative_name?: string;
          cooperative_id?: string | null;
          experience_years?: number;
          certifications?: string[];
          rating?: number;
          review_count?: number;
          completed_jobs_count?: number;
          hourly_rate?: number;
          base_rate?: number;
          is_available?: boolean;
          service_area?: string | null;
          service_radius_km?: number;
          languages?: string[];
          about?: string | null;
          verification_status?: WorkerVerificationStatus;
          welfare_member_id?: string | null;
          bank_account_linked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      worker_documents: {
        Row: {
          id: string;
          worker_id: string;
          document_name: string;
          document_type: DocumentType;
          status: 'uploaded' | 'verified' | 'rejected';
          file_url: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          worker_id: string;
          document_name: string;
          document_type: DocumentType;
          status?: 'uploaded' | 'verified' | 'rejected';
          file_url?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          worker_id?: string;
          document_name?: string;
          document_type?: DocumentType;
          status?: 'uploaded' | 'verified' | 'rejected';
          file_url?: string | null;
          uploaded_at?: string;
        };
        Relationships: [];
      };
      admin_profiles: {
        Row: {
          id: string;
          federation_name: string;
          society_registration_no: string;
          admin_designation: string;
          zone_assigned: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          federation_name: string;
          society_registration_no: string;
          admin_designation: string;
          zone_assigned?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          federation_name?: string;
          society_registration_no?: string;
          admin_designation?: string;
          zone_assigned?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      app_role: AppRole;
      worker_verification_status: WorkerVerificationStatus;
      document_type: DocumentType;
      booking_status: BookingStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
