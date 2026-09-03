# SahakarSeva - Supabase Setup Guide

This directory contains the database schema, RBAC rules, triggers, and seed data for the SahakarSeva application.

## Prerequisites
1. Create a Supabase project at [https://supabase.com](https://supabase.com).
2. Go to **Project Settings** -> **API** to locate:
   - **Project URL**
   - **Project API Anon Key** (public)
   - *Never copy the `service_role` key into the mobile application!*

## Database Initialization
1. In your Supabase project dashboard, open the **SQL Editor** from the left navigation.
2. Click **New Query**.
3. Copy and paste the entire contents of [`schema.sql`](./schema.sql) and click **Run**.
   - This sets up all enums, tables, foreign keys, triggers, and Row Level Security (RLS) policies.
4. Open a second query, copy and paste [`seed.sql`](./seed.sql), and click **Run**.
   - This seeds initial service categories and common services.

## Authentication Settings in Supabase Dashboard
1. Go to **Authentication** -> **Providers** -> **Email**:
   - Ensure **Enable Email provider** is turned **ON**.
   - (For local testing) You can optionally turn off **"Confirm email"** to allow immediate logins right after registration.
2. Go to **Authentication** -> **URL Configuration**:
   - Ensure the Site URL is set appropriately for your deployment (or `http://localhost:8081` for Expo web).

## Mobile App Environment Configuration
In the project root, edit `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Restart the Expo development server after updating `.env`.
