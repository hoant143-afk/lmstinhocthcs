/**
 * Utility to decode Google ID Token JWT on client-side
 * Safe fallback for static hosting deployments (e.g. Vercel)
 */
export interface GoogleJwtPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  iat?: number;
  exp?: number;
}

export function decodeGoogleCredential(credential: string): GoogleJwtPayload | null {
  try {
    if (!credential || typeof credential !== 'string') return null;
    const parts = credential.split('.');
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.warn('[JWT] Could not decode credential payload:', e);
    return null;
  }
}
