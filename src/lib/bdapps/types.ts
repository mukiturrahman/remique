/**
 * Type definitions for the bdApps bKash Subscription SDK.
 * Reference: https://bdappsandroid.com/bdapps_bkash.html#implementation
 */

export interface BdappsAuthorizeRequest {
  apiKey: string;
  requestId: string;    // Exactly 15 digits
  requestTime: string;  // UTC ISO-8601 string (e.g. 2026-09-08T17:22:15.123Z)
  signature: string;    // SHA-512(apiKey + "|" + requestTime + "|" + apiSecret)
  redirectUrl: string;  // Encoded URL where user returns after authorization
}

export interface BdappsCallbackParams {
  status?: string;
  statusCode?: string;
  statusDetail?: string;
  requestId?: string;
  subscriberId?: string;
  frequency?: string;
  error?: string;
  errorCode?: string;
}

export interface BdappsSubscriptionNotification {
  version?: string;
  applicationId?: string;
  subscriberId?: string;
  status?: 'REGISTERED' | 'UNREGISTERED' | string;
  frequency?: string;
  timeStamp?: string;
  requestId?: string;
}

export type BdappsPlanPeriod = 'weekly' | 'monthly';

export interface BdappsPlanConfig {
  period: BdappsPlanPeriod;
  amount: number;
  currency: string;
  durationDays: number;
  label: string;
}

export const BDAPPS_PLANS: Record<BdappsPlanPeriod, BdappsPlanConfig> = {
  weekly: {
    period: 'weekly',
    amount: 49,
    currency: 'BDT',
    durationDays: 7,
    label: 'Weekly',
  },
  monthly: {
    period: 'monthly',
    amount: 190,
    currency: 'BDT',
    durationDays: 30,
    label: 'Monthly',
  },
};

export interface InitiateBdappsSubscriptionParams {
  phoneNumber?: string;
  userId?: string;
  planPeriod?: BdappsPlanPeriod | string;
  redirectUrl?: string;
}

export interface InitiateBdappsSubscriptionResult {
  success: boolean;
  authorizationUrl?: string;
  requestId?: string;
  user?: {
    id: string;
    phoneNumber: string;
  };
  error?: string;
}

export interface HandleBdappsCallbackResult {
  success: boolean;
  requestId?: string;
  subscriberId?: string;
  user?: {
    id: string;
    phoneNumber: string;
  };
  redirectUrl: string;
  error?: string;
  errorCode?: string;
}

export interface HandleBdappsWebhookResult {
  success: boolean;
  status: string;
  subscriberId?: string;
  requestId?: string;
  actionTaken: 'ACTIVATED' | 'CANCELLED' | 'IGNORED' | 'ERROR';
  error?: string;
}

export const BDAPPS_ERROR_CODES: Record<string, string> = {
  E1001: 'Error occurred. Please try again.',
  E1002: 'Invalid signature.',
  E1003: 'Invalid time format.',
  E1004: 'Request timeout.',
  E1005: 'Invalid request ID (must be exactly 15 characters).',
  E1006: 'Invalid API key.',
  E1007: 'Unauthorized.',
  E1008: 'Service is not allowed for the application. Contact administrator.',
  E1009: 'Invalid request.',
  E1010: 'Service is not allowed for the SP. Contact administrator.',
  E1011: 'SDK is not enabled for this application. Contact administrator.',
  E1012: 'Please start from the beginning.',
};

