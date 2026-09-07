/**
 * Session handling for the admin dashboard.
 *
 * Uses Web Crypto rather than `node:crypto` because this module is imported by
 * `src/middleware.ts`, which Next 15.1 runs on the Edge runtime. Web Crypto is
 * global in both Edge and Node 20, so one implementation serves middleware and
 * route handlers alike.
 *
 * Reads `process.env` directly and never imports `src/lib/env.ts`: that module
 * throws in production when unrelated variables are missing, and Edge
 * middleware may not have them. A missing DATABASE_URL must not take the admin
 * panel down with it.
 */

export const ADMIN_COOKIE = 'remique_admin';

/** Twelve hours. Long enough for a working session, short enough to matter. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function password(): string {
  return process.env.ADMIN_PASSWORD ?? '';
}

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? '';
}

/**
 * Whether the admin surface exists at all.
 *
 * When this is false every admin route returns 404 rather than a login form —
 * an unconfigured deployment must not advertise that an admin panel is there.
 */
export function adminConfigured(): boolean {
  return password().length > 0 && secret().length > 0;
}

async function hmacHex(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * `<expiryMs>.<hmacHex>`.
 *
 * The expiry is inside the signed payload, so extending it invalidates the
 * signature. The password itself never enters the cookie.
 */
export async function createSessionToken(now: number = Date.now()): Promise<string> {
  const expiry = String(now + SESSION_TTL_MS);
  return `${expiry}.${await hmacHex(secret(), expiry)}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
  now: number = Date.now()
): Promise<boolean> {
  if (!adminConfigured() || !token) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [expiryRaw, signature] = parts;
  const expiry = Number(expiryRaw);
  if (!Number.isFinite(expiry) || expiry <= now) return false;

  const expected = await hmacHex(secret(), expiryRaw);
  return constantTimeEqual(signature, expected);
}

/**
 * Compares HMACs of the two strings rather than the strings themselves.
 *
 * Both digests are fixed-length hex, so the comparison leaks neither the
 * password's length nor the position of the first differing character.
 */
export async function passwordMatches(submitted: string): Promise<boolean> {
  if (!adminConfigured()) return false;

  const key = secret();
  const [a, b] = await Promise.all([hmacHex(key, submitted), hmacHex(key, password())]);
  return constantTimeEqual(a, b);
}

/**
 * At the `passwordMatches` call site both arguments are fixed-length hex
 * digests by construction. At `verifySessionToken` the signature comes from
 * an attacker-supplied cookie and can be any length — the length check below
 * rejects that case before comparing any characters, so it never leaks
 * digest content one byte at a time.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
