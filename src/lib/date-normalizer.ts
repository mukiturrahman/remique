import { DateTime } from 'luxon';

export interface ValidatedDateResult {
  isValid: boolean;
  scheduledAtUtc?: Date;
  scheduledAtLocalFormatted?: string;
  errorMessage?: string;
}

export function validateAndNormalizeDate(
  isoString: string | null | undefined,
  userTimezone: string = 'Asia/Dhaka'
): ValidatedDateResult {
  if (!isoString) {
    return {
      isValid: false,
      errorMessage: 'Missing date/time information.',
    };
  }

  // Parse ISO string in user's timezone (default Asia/Dhaka)
  const targetDate = DateTime.fromISO(isoString, { zone: userTimezone });
  if (!targetDate.isValid) {
    return {
      isValid: false,
      errorMessage: 'Invalid date/time format.',
    };
  }

  const now = DateTime.now().setZone(userTimezone);

  // Past date detection (allowing 30s buffer for network latency)
  if (targetDate < now.minus({ seconds: 30 })) {
    return {
      isValid: false,
      errorMessage: 'The requested time has already passed. Please specify a future time.',
    };
  }

  // Far future sanity check (> 3 years)
  if (targetDate > now.plus({ years: 3 })) {
    return {
      isValid: false,
      errorMessage: 'Reminders cannot be scheduled more than 3 years in advance.',
    };
  }

  return {
    isValid: true,
    scheduledAtUtc: targetDate.toUTC().toJSDate(),
    scheduledAtLocalFormatted: targetDate.toFormat("cccc, LLL d 'at' h:mm a"),
  };
}

/**
 * Normalizes phone numbers to standard E.164 format (+880 for Bangladesh)
 */
export function normalizePhoneNumber(rawNumber: string): string {
  const cleaned = rawNumber.replace(/\D/g, '');
  
  // If it starts with 880 (e.g. 8801712345678)
  if (cleaned.startsWith('880') && cleaned.length === 13) {
    return `+${cleaned}`;
  }
  // If it starts with 01 (e.g. 01712345678)
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    return `+880${cleaned.substring(1)}`;
  }
  // If standard E.164 already
  if (rawNumber.startsWith('+')) {
    return rawNumber;
  }
  return `+${cleaned}`;
}
