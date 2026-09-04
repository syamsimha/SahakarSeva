// Supabase Edge Function: password-reset
// Single authoritative password-reset orchestration layer for Sahakar Sathi
// Deploy: supabase functions deploy password-reset --no-verify-jwt

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

// CORS Headers for secure client communication
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// In-memory distributed IP rate limiter (tracks requests per IP)
const ipRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    ipRateLimitMap.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (record.count >= 30) {
    return false; // Max 30 requests per 15 minutes per IP
  }
  record.count++;
  return true;
}

// Constant-time string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Compute HMAC-SHA-256 with server-only secret pepper
async function computeHmacSha256(pepper: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(pepper);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Generate cryptographically secure 6-digit numeric OTP (always exactly 6 digits, including leading zeros)
function generateSecureOtp(): string {
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  const code = randomValues[0] % 1000000;
  return code.toString().padStart(6, '0');
}

// Generate cryptographically secure 32-byte (64 hex characters) reset token
function generateSecureResetToken(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Dispatch OTP email through configured email provider (Resend API)
async function dispatchOtpEmail(
  toEmail: string,
  otpCode: string,
  resendApiKey?: string,
  fromEmail?: string
): Promise<{ accepted: boolean; error?: string }> {
  // If Resend API Key is missing, fail clearly and explicitly — NEVER pretend OTP was sent
  if (!resendApiKey) {
    return {
      accepted: false,
      error: 'Email delivery service is not configured on the server. Please configure the RESEND_API_KEY secret in Supabase.',
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail || 'Sahakar Sathi <auth@sahakarseva.org>',
        to: [toEmail],
        subject: 'Your Password Reset Verification Code - Sahakar Sathi',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #0f172a; margin-top: 0;">Sahakar Sathi Password Reset</h2>
            <p style="color: #475569; font-size: 16px; line-height: 24px;">Hello,</p>
            <p style="color: #475569; font-size: 16px; line-height: 24px;">You requested a password reset for your Sahakar Sathi account. Use the verification code below to complete the request:</p>
            <div style="margin: 28px 0; text-align: center; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px;">
              <span style="font-family: monospace; font-size: 38px; font-weight: 700; letter-spacing: 8px; color: #16a34a;">${otpCode}</span>
            </div>
            <p style="color: #64748b; font-size: 14px;">This code is valid for <strong>10 minutes</strong> and can only be used once.</p>
            <p style="color: #64748b; font-size: 14px;">If you did not request this verification code, please ignore this email. Your password will remain unchanged.</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      console.error('Email provider rejected send request with status:', response.status);
      return { accepted: false, error: 'Email provider rejected delivery request' };
    }

    return { accepted: true };
  } catch (err: any) {
    console.error('Email dispatch network failure occurred');
    return { accepted: false, error: 'Network error communicating with email provider' };
  }
}

serve(async (req: Request) => {
  // Handle CORS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Environment configuration (Service-Role is strictly server-side)
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const serverPepper = Deno.env.get('OTP_PEPPER') || supabaseServiceKey; // Server-only secret pepper
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const emailFrom = Deno.env.get('EMAIL_FROM');

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Initialize Supabase Admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Client IP rate limiting
  const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!checkIpRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: 'Too many requests from this location. Please wait a few minutes before trying again.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { action } = body;

  // Generic success response to avoid account enumeration
  const genericSuccessMessage = 'If an account exists with this email, a 6-digit verification code has been sent.';

  // ---------------------------------------------------------------------------
  // ACTION 1: request-otp
  // ---------------------------------------------------------------------------
  if (action === 'request-otp') {
    const rawEmail = typeof body.email === 'string' ? body.email : '';
    const email = rawEmail.trim().toLowerCase();

    // Server-side email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Server-side Rate Limiting (60s cooldown & max 5 per 15 min per email)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: recentRecords } = await supabaseAdmin
      .from('password_reset_otps')
      .select('id, created_at')
      .eq('email', email)
      .gte('created_at', fifteenMinutesAgo)
      .order('created_at', { ascending: false });

    if (recentRecords && recentRecords.length > 0) {
      const mostRecent = new Date(recentRecords[0].created_at).getTime();
      if (Date.now() - mostRecent < 60 * 1000) {
        return new Response(
          JSON.stringify({ error: 'A verification code was requested recently. Please wait 60 seconds before requesting again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (recentRecords.length >= 5) {
        return new Response(
          JSON.stringify({ error: 'Maximum request limit exceeded. Please wait 15 minutes before trying again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Look up user without revealing whether account exists
    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (!profileData?.id) {
      // User not found: simulate natural delay and return identical generic message
      await new Promise((r) => setTimeout(r, 450 + Math.floor(Math.random() * 150)));
      return new Response(JSON.stringify({ success: true, message: genericSuccessMessage }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = profileData.id;

    // 3. Generate exactly ONE authoritative 6-digit numeric OTP
    const otpCode = generateSecureOtp();
    const otpHmac = await computeHmacSha256(serverPepper, otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry

    // 4. Atomically invalidate previous PENDING records and insert new PENDING record
    // Uses the atomic PostgreSQL function create_pending_password_reset_otp
    let newOtpId: string | null = null;
    const { data: rpcOtpId, error: rpcError } = await supabaseAdmin.rpc(
      'create_pending_password_reset_otp',
      {
        p_email: email,
        p_user_id: userId,
        p_otp_hash: otpHmac,
        p_expires_at: expiresAt,
        p_max_attempts: 5,
      }
    );

    if (!rpcError && rpcOtpId) {
      newOtpId = rpcOtpId;
    } else {
      // Fallback if RPC function not yet initialized in database
      await supabaseAdmin
        .from('password_reset_otps')
        .update({ otp_state: 'INVALIDATED' })
        .eq('email', email)
        .eq('otp_state', 'PENDING');

      const { data: insertedRecord, error: insertError } = await supabaseAdmin
        .from('password_reset_otps')
        .insert({
          email,
          user_id: userId,
          otp_hash: otpHmac,
          otp_state: 'PENDING',
          failed_attempts: 0,
          max_attempts: 5,
          expires_at: expiresAt,
        })
        .select('id')
        .single();

      if (insertError || !insertedRecord) {
        return new Response(JSON.stringify({ error: 'Failed to process password reset request. Please try again.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      newOtpId = insertedRecord.id;
    }

    // 5. Dispatch email with the EXACT same OTP
    const sendResult = await dispatchOtpEmail(email, otpCode, resendApiKey, emailFrom);

    // 6. If email provider rejected or failed, invalidate the OTP record immediately
    if (!sendResult.accepted) {
      if (newOtpId) {
        await supabaseAdmin
          .from('password_reset_otps')
          .update({ otp_state: 'INVALIDATED' })
          .eq('id', newOtpId);
      }

      return new Response(
        JSON.stringify({ error: 'Unable to deliver verification code email at this moment. Please try again later.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return generic success response
    return new Response(JSON.stringify({ success: true, message: genericSuccessMessage }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ---------------------------------------------------------------------------
  // ACTION 2: verify-otp
  // ---------------------------------------------------------------------------
  if (action === 'verify-otp') {
    const rawEmail = typeof body.email === 'string' ? body.email : '';
    const email = rawEmail.trim().toLowerCase();
    const rawOtp = typeof body.otp === 'string' ? body.otp.trim() : '';

    // Validate email and exactly 6-digit numeric OTP
    if (!email || !/^[0-9]{6}$/.test(rawOtp)) {
      return new Response(JSON.stringify({ error: 'Please enter a valid 6-digit verification code.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Find newest active PENDING record
    const { data: record } = await supabaseAdmin
      .from('password_reset_otps')
      .select('*')
      .eq('email', email)
      .eq('otp_state', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!record) {
      return new Response(JSON.stringify({ error: 'The verification code entered is invalid or has expired.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = Date.now();
    const expiresTime = new Date(record.expires_at).getTime();

    // 2. Check Expiry
    if (now > expiresTime) {
      await supabaseAdmin
        .from('password_reset_otps')
        .update({ otp_state: 'EXPIRED' })
        .eq('id', record.id);

      return new Response(JSON.stringify({ error: 'This verification code has expired. Please request a new code.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Check Attempts
    if (record.failed_attempts >= record.max_attempts) {
      await supabaseAdmin
        .from('password_reset_otps')
        .update({ otp_state: 'INVALIDATED' })
        .eq('id', record.id);

      return new Response(
        JSON.stringify({ error: 'Maximum verification attempts exceeded. Please request a new code.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Compute HMAC and compare using constant-time comparison
    const submittedHmac = await computeHmacSha256(serverPepper, rawOtp);
    const isMatch = timingSafeEqual(submittedHmac, record.otp_hash);

    if (!isMatch) {
      const newAttempts = record.failed_attempts + 1;
      const nextState = newAttempts >= record.max_attempts ? 'INVALIDATED' : 'PENDING';

      await supabaseAdmin
        .from('password_reset_otps')
        .update({
          failed_attempts: newAttempts,
          otp_state: nextState,
        })
        .eq('id', record.id);

      if (nextState === 'INVALIDATED') {
        return new Response(
          JSON.stringify({ error: 'Maximum verification attempts exceeded. Please request a new code.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const remaining = record.max_attempts - newAttempts;
      return new Response(
        JSON.stringify({ error: `Incorrect verification code. ${remaining} attempt(s) remaining.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Correct OTP: Generate 64-character hex reset authorization token
    const rawResetToken = generateSecureResetToken();
    const tokenHmac = await computeHmacSha256(serverPepper, rawResetToken);
    const tokenExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 6. Atomic conditional state transition: PENDING -> VERIFIED
    // Guarantees concurrent requests cannot double-verify the same OTP
    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from('password_reset_otps')
      .update({
        otp_state: 'VERIFIED',
        verified_at: new Date().toISOString(),
        reset_token_hash: tokenHmac,
        reset_token_expires_at: tokenExpiry,
      })
      .eq('id', record.id)
      .eq('otp_state', 'PENDING')
      .gt('expires_at', new Date().toISOString())
      .lt('failed_attempts', record.max_attempts)
      .select('id');

    if (updateError || !updatedRows || updatedRows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Verification could not be completed. Please request a new code.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return raw resetToken ONLY once to client (never logged)
    return new Response(
      JSON.stringify({
        success: true,
        resetToken: rawResetToken,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ---------------------------------------------------------------------------
  // ACTION 3: reset-password
  // ---------------------------------------------------------------------------
  if (action === 'reset-password') {
    const rawResetToken = typeof body.resetToken === 'string' ? body.resetToken.trim() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    // Validate 64-character hex reset token format
    if (!rawResetToken || !/^[0-9a-fA-F]{64}$/.test(rawResetToken)) {
      return new Response(JSON.stringify({ error: 'Invalid or missing password reset authorization.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate password policy server-side
    if (!newPassword || newPassword.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters long.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenHmac = await computeHmacSha256(serverPepper, rawResetToken);

    // 1. Fail-Closed Atomic Claim:
    // Mark authorization as USED BEFORE attempting Supabase Admin password update
    const { data: claimedRecords, error: claimError } = await supabaseAdmin
      .from('password_reset_otps')
      .update({
        otp_state: 'USED',
        used_at: new Date().toISOString(),
        reset_token_hash: null,
      })
      .eq('reset_token_hash', tokenHmac)
      .eq('otp_state', 'VERIFIED')
      .gt('reset_token_expires_at', new Date().toISOString())
      .select('id, user_id');

    if (claimError || !claimedRecords || claimedRecords.length === 0) {
      return new Response(
        JSON.stringify({ error: 'This password reset session has expired or already been used. Please start a new request.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimedRecords[0].user_id;

    // 2. Perform password update via Supabase Auth Admin API
    const { error: adminAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (adminAuthError) {
      console.error('Admin API password update failed for user ID:', userId);
      // FAIL CLOSED: Token remains permanently USED and cannot be retried
      return new Response(
        JSON.stringify({
          error: 'Unable to update password at this time. For your security, please initiate a new password reset request.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Invalidate any remaining active OTP records for that user
    await supabaseAdmin
      .from('password_reset_otps')
      .update({ otp_state: 'INVALIDATED' })
      .eq('user_id', userId)
      .neq('id', claimedRecords[0].id)
      .in('otp_state', ['PENDING', 'VERIFIED']);

    return new Response(JSON.stringify({ success: true, message: 'Password updated successfully.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Unknown action
  return new Response(JSON.stringify({ error: 'Unknown action requested' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
