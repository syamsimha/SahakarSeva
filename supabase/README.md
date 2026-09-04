# Sahakar Sathi — Production-Grade Authentication & Supabase Setup Guide

This directory contains the database schema, RBAC rules, triggers, and Edge Functions for the Sahakar Sathi application.

---

## 1. Prerequisites & Environment Setup
1. Create a Supabase project at [https://supabase.com](https://supabase.com).
2. Go to **Project Settings** -> **API** to locate:
   - **Project URL**
   - **Project API Anon Key** (public client key)
   - **Service Role Key** (server-only secret key — **NEVER** expose to the frontend!)
3. In the project root, configure `.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## 2. Mandatory Authentication Settings in Supabase Dashboard
To support immediate login after registration without custom triggers on `auth.users`:
1. Go to **Authentication** -> **Providers** -> **Email**:
   - Ensure **Enable Email provider** is turned **ON**.
   - **Disable "Confirm email"** (Toggle OFF mandatory email confirmation). This allows new users to immediately log in with their registered credentials.
2. Go to **Authentication** -> **URL Configuration**:
   - Set **Site URL** to your production URL (or `http://localhost:8081` for development).
   - Add your redirect schemes to **Redirect URLs** (e.g., `sahakarseva://*`).

---

## 3. Database Schema Initialization

### Step A: Canonical Database Schema
1. In your Supabase dashboard, open the **SQL Editor**.
2. Run [`schema.sql`](./schema.sql):
   - Sets up all application tables: `profiles`, `worker_profiles`, `customer_profiles`, `admin_profiles`, `worker_documents`, bookings, reviews, and audit logs.
   - Sets up the canonical `public.password_reset_otps` table:
     ```sql
     CREATE TABLE IF NOT EXISTS public.password_reset_otps (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       email TEXT NOT NULL,
       user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       otp_hash TEXT NOT NULL,
       otp_state TEXT NOT NULL DEFAULT 'PENDING' CHECK (otp_state IN ('PENDING', 'VERIFIED', 'EXPIRED', 'INVALIDATED', 'USED')),
       failed_attempts INTEGER NOT NULL DEFAULT 0,
       max_attempts INTEGER NOT NULL DEFAULT 5,
       created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
       expires_at TIMESTAMPTZ NOT NULL,
       verified_at TIMESTAMPTZ,
       reset_token_hash TEXT,
       reset_token_expires_at TIMESTAMPTZ,
       used_at TIMESTAMPTZ
     );
     ```
   - Sets up Row Level Security (RLS) on `password_reset_otps` with **no public policies** (strictly managed by the Edge Function service-role client).
   - Sets up `handle_new_user` trigger for automated profile creation upon sign up.

### Step B: Database Functions & Profile Self-Healing
1. In the **SQL Editor**, verify that the following helper functions from [`schema.sql`](./schema.sql) are active:
   - `public.create_pending_password_reset_otp(p_email, p_user_id, p_otp_hash, p_expires_at, p_max_attempts)`: Atomically invalidates existing PENDING records and creates a new PENDING record in a single transaction. Strictly restricted to `service_role`.
   - `public.sync_current_user_profile()`: Security definer helper that safely re-links an existing profile with a mismatched UUID to `auth.uid()`, updating `customer_profiles`, `worker_profiles`, and `admin_profiles` via `ON UPDATE CASCADE`.
2. If fixing an existing instance with profile UUID mismatches or trigger failures, run [`fix_profiles_trigger.sql`](./fix_profiles_trigger.sql).

### Step C: Seed Initial Data
1. In the **SQL Editor**, run [`seed.sql`](./seed.sql) to populate cooperative trade categories and service items.

---

## 4. Controlled One-Time Migration for Existing Users
> [!IMPORTANT]
> This query must be executed **ONCE** to confirm existing test accounts created while email confirmation was required. It is kept separate from `schema.sql` so it does **NOT** run automatically whenever the schema is deployed.

Run in **SQL Editor**:
```sql
UPDATE auth.users
SET email_confirmed_at = timezone('utc'::text, now())
WHERE email_confirmed_at IS NULL;
```

---

## 5. Single Authoritative Password-Reset Layer (Supabase Edge Function)

The Supabase Edge Function located at:
`supabase/functions/password-reset/index.ts`
is the **ONLY** password-reset orchestration layer.

```
Frontend (Sahakar Sathi App)
     ↓ supabase.functions.invoke('password-reset', ...)
Supabase Edge Function
     ↓
PostgreSQL password_reset_otps (State machine)
     ↓
Email Provider (Resend API / SMTP)
```

### Deploy the Edge Function
```bash
supabase functions deploy password-reset --no-verify-jwt
```

### Configure Edge Function Secrets
Set the required secrets in Supabase via CLI or Dashboard (**Settings** -> **Edge Functions**):
```bash
# 1. Server-side Secret Pepper (Never stored in DB, never exposed to client)
supabase secrets set OTP_PEPPER="your-secure-random-64-character-hex-pepper"

# 2. Resend API Key for authoritative email delivery
supabase secrets set RESEND_API_KEY="re_123456789abcdef"

# 3. Sender email address
supabase secrets set EMAIL_FROM="Sahakar Sathi <auth@yourdomain.org>"
```

---

## 6. Security Architecture & Policies

### Exactly ONE Authoritative OTP
- The server generates a single cryptographically secure 6-digit numeric OTP using `crypto.getRandomValues()`.
- The OTP is HMAC-SHA-256 hashed with the server-only `OTP_PEPPER`.
- The exact OTP generated is sent via the email provider and verified against the stored hash using constant-time comparison (`timingSafeEqual`).
- Supabase Auth's `resetPasswordForEmail()` and `{{ .Token }}` are **NOT** used, preventing dual-token conflicts.

### Provider Acceptance vs. Inbox Delivery
- When an email dispatch request is sent to the provider (e.g. Resend), provider acceptance (HTTP 200) indicates that the provider has accepted the message for delivery. It does not guarantee delivery to the user's inbox (e.g., if spam filters or invalid inboxes intervene).
- If the provider rejects or fails immediately (HTTP 4xx/5xx or network error):
  - The newly created OTP is atomically marked `INVALIDATED`.
  - No success message is returned to the client.
  - Plaintext OTPs and secrets are never logged.

### Fail-Closed Password Update Sequence
- Upon successful OTP verification, a 32-byte (64 hex characters) reset authorization token is generated, hashed, and returned to the client memory.
- When `reset-password` is called:
  1. The token is claimed atomically: `VERIFIED` &rarr; `USED`, `reset_token_hash = NULL`, `used_at = now()`.
  2. The password is updated via `supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword })`.
  3. **FAIL-CLOSED GUARANTEE**: If the password update fails, the token remains permanently `USED`. It is **never** restored to `VERIFIED` or made reusable. The client receives a safe error advising them to start a fresh reset request.

### Zero Account Enumeration
- `request-otp` returns the exact same generic message:
  `"If an account exists with this email, a 6-digit verification code has been sent."`
  regardless of whether the account exists, with simulated latency for non-existent accounts.

---

## 7. Testing OTP & Password Recovery

1. **Request OTP**:
   From the app's "Forgot Password" screen, enter your registered email and press "Send OTP".
2. **Verify Cooldown**:
   Notice the 60-second cooldown timer. Attempting to resend within 60 seconds is blocked on both client and server.
3. **Verify OTP**:
   Enter the 6-digit code received. After 5 incorrect attempts, the code is invalidated.
4. **Update Password**:
   Enter and confirm a new password matching complexity requirements (min 8 chars, mixed case, number).
5. **Sign In**:
   Sign in immediately with the new password.
