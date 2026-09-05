import { Linking, Platform } from 'react-native';

export interface PhoneParseResult {
  raw: string;
  normalized: string;
  display: string;
  telUrl: string;
  isValid: boolean;
}

/**
 * Normalizes phone numbers safely.
 * Handles formats like:
 * - "+91 98765 43210" -> "+919876543210"
 * - "+919876543210"   -> "+919876543210"
 * - "9876543210"      -> "+919876543210" (Indian 10-digit mobile)
 * - "09876543210"     -> "+919876543210" (Indian with leading zero)
 * - "+1 (555) 234-5678" -> "+15552345678" (International)
 */
export function normalizePhoneNumber(phoneInput?: string | null): PhoneParseResult {
  if (!phoneInput || typeof phoneInput !== 'string') {
    return { raw: '', normalized: '', display: '', telUrl: '', isValid: false };
  }

  const raw = phoneInput.trim();
  if (!raw) {
    return { raw: '', normalized: '', display: '', telUrl: '', isValid: false };
  }

  // Remove common punctuation: spaces, dashes, dots, parentheses
  const cleaned = raw.replace(/[\s\-\.\(\)]/g, '');

  let normalized = '';

  if (cleaned.startsWith('+')) {
    // E.164 format: + followed by digits
    const digitsOnly = cleaned.slice(1).replace(/\D/g, '');
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      normalized = '+' + digitsOnly;
    }
  } else {
    // Digits only
    const digitsOnly = cleaned.replace(/\D/g, '');

    if (digitsOnly.length === 10) {
      // 10-digit Indian number: prefix with +91
      normalized = '+91' + digitsOnly;
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
      // 11-digit starting with 0: e.g. 09876543210 -> +919876543210
      normalized = '+91' + digitsOnly.slice(1);
    } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      // 12-digit starting with 91: e.g. 919876543210 -> +919876543210
      normalized = '+' + digitsOnly;
    } else if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      // General international / landline number
      normalized = '+' + digitsOnly;
    }
  }

  const isValid = /^(\+[1-9]\d{6,14})$/.test(normalized);

  if (!isValid) {
    return { raw, normalized: '', display: raw, telUrl: '', isValid: false };
  }

  // Nicely format display for Indian numbers
  let display = normalized;
  if (normalized.startsWith('+91') && normalized.length === 13) {
    display = `+91 ${normalized.slice(3, 8)} ${normalized.slice(8)}`;
  }

  return {
    raw,
    normalized,
    display,
    telUrl: `tel:${normalized}`,
    isValid: true,
  };
}

/**
 * Triggers a real telephone call action using the device or browser.
 * For Web: Navigates window.location.href or creates a tel: anchor to open OS telephony app.
 * For Mobile: Uses React Native Linking.openURL with the tel: URI.
 */
export async function triggerPhoneCall(phoneInput?: string | null): Promise<{
  success: boolean;
  telUrl?: string;
  error?: string;
}> {
  const parseResult = normalizePhoneNumber(phoneInput);
  if (!parseResult.isValid || !parseResult.telUrl) {
    return {
      success: false,
      error: 'Worker phone number is invalid or unavailable.',
    };
  }

  const { telUrl } = parseResult;

  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Standard browser way to invoke tel: without popup blockers
      try {
        window.location.href = telUrl;
      } catch {
        const a = window.document.createElement('a');
        a.href = telUrl;
        a.target = '_self';
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
      }
      return { success: true, telUrl };
    }

    // Native Mobile (Expo / React Native)
    const canOpen = await Linking.canOpenURL(telUrl);
    if (canOpen) {
      await Linking.openURL(telUrl);
      return { success: true, telUrl };
    } else {
      await Linking.openURL(telUrl);
      return { success: true, telUrl };
    }
  } catch (err: any) {
    if (typeof window !== 'undefined') {
      window.location.href = telUrl;
      return { success: true, telUrl };
    }
    return {
      success: false,
      telUrl,
      error: err?.message || 'Failed to open phone dialer.',
    };
  }
}
