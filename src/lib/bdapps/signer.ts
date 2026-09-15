import crypto from 'crypto';
import { env } from '../env';

let requestIdSequence = crypto.randomInt(0, 900);

/**
 * Generates a 15-character numeric requestId as mandated by bdApps SDK:
 * Format: YYMMDDHHmmss + 3-digit sequence (100-999).
 */
export function generateRequestId(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  const base =
    pad(date.getUTCFullYear() % 100) +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds());

  requestIdSequence = (requestIdSequence + 1) % 900;
  const suffix = String(100 + requestIdSequence).padStart(3, '0');
  const requestId = base + suffix;

  if (requestId.length !== 15) {
    throw new Error(`[bdApps] Generated requestId must be exactly 15 chars, got: ${requestId}`);
  }

  return requestId;
}

/**
 * Computes the SHA-512 lowercase hex signature:
 * Signature formula: SHA512(apiKey + "|" + requestTime + "|" + apiSecret)
 */
export function generateBdappsSignature(
  apiKey: string,
  requestTime: string,
  apiSecret: string
): string {
  const source = `${apiKey}|${requestTime}|${apiSecret}`;
  return crypto.createHash('sha512').update(source, 'utf8').digest('hex').toLowerCase();
}

/**
 * Constructs the signed bdApps bKash subscription authorization URL.
 */
export function buildBdappsAuthorizationUrl(params: {
  apiKey?: string;
  apiSecret?: string;
  redirectUrl: string;
  requestId?: string;
  requestTime?: string;
  authBaseUrl?: string;
}): {
  url: string;
  requestId: string;
  requestTime: string;
  signature: string;
} {
  const apiKey = params.apiKey || env.BDAPPS_API_KEY;
  const apiSecret = params.apiSecret || env.BDAPPS_API_SECRET;
  const authBaseUrl = (params.authBaseUrl || env.BDAPPS_AUTH_URL).replace(/\/+$/, '');

  if (!apiKey || !apiSecret) {
    throw new Error(
      '[bdApps] Missing credentials. Please configure BDAPPS_API_KEY and BDAPPS_API_SECRET in your environment.'
    );
  }

  const requestId = params.requestId || generateRequestId();
  const requestTime = params.requestTime || new Date().toISOString();
  const signature = generateBdappsSignature(apiKey, requestTime, apiSecret);

  const query = new URLSearchParams({
    apiKey,
    requestId,
    requestTime,
    signature,
    redirectUrl: params.redirectUrl,
  });

  return {
    url: `${authBaseUrl}?${query.toString()}`,
    requestId,
    requestTime,
    signature,
  };
}
