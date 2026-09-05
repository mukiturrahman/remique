import { env } from './env';

export interface SendWhatsAppResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

/**
 * Structured error for any non-2xx response from the WhatsApp Cloud API.
 * Carries Meta's error code so callers can distinguish "retry will help"
 * (rate limit, transient) from "retry is pointless" (bad token, bad number).
 */
export class WhatsAppApiError extends Error {
  readonly httpStatus: number;
  readonly code?: number;
  readonly subcode?: number;
  readonly errorType?: string;
  readonly errorDetails?: string;
  readonly fbtraceId?: string;
  readonly rawBody: string;

  constructor(params: {
    label: string;
    httpStatus: number;
    code?: number;
    subcode?: number;
    errorType?: string;
    errorMessage?: string;
    errorDetails?: string;
    fbtraceId?: string;
    rawBody: string;
  }) {
    super(
      `WhatsApp API Error (${params.label}): http=${params.httpStatus} code=${params.code ?? '-'} ` +
        `subcode=${params.subcode ?? '-'} type=${params.errorType ?? '-'} ` +
        `message=${params.errorMessage ?? params.rawBody.slice(0, 300)}` +
        (params.errorDetails ? ` details=${params.errorDetails}` : '')
    );
    this.name = 'WhatsAppApiError';
    this.httpStatus = params.httpStatus;
    this.code = params.code;
    this.subcode = params.subcode;
    this.errorType = params.errorType;
    this.errorDetails = params.errorDetails;
    this.fbtraceId = params.fbtraceId;
    this.rawBody = params.rawBody;
  }

  /**
   * How this failure should be handled:
   *
   *  - 'transient': retrying the identical request may succeed. Let QStash retry.
   *  - 'operator':  broken credentials or configuration. Retrying now is useless,
   *                 but a human can fix it — so the message must stay replayable.
   *  - 'permanent': the request itself is bad (bad recipient, malformed payload).
   *                 No retry, no replay.
   */
  get failureClass(): 'transient' | 'operator' | 'permanent' {
    const code = this.code ?? -1;

    if (this.httpStatus >= 500) return 'transient';
    if (this.httpStatus === 429) return 'transient';
    // 130429 = throughput limit, 131048 = spam rate limit, 131056 = pair rate limit,
    // 133016 = temporarily blocked, 1/2/4 = transient/unknown API errors.
    if ([1, 2, 4, 130429, 131048, 131056, 133016].includes(code)) return 'transient';

    // Credential and configuration problems. 190 = expired/invalid access token,
    // 200/10/3 = missing permission, 2500 = invalid OAuth request,
    // 102/104 = session or token absent.
    if ([3, 10, 102, 104, 190, 200, 2500].includes(code)) return 'operator';
    if (this.errorType === 'OAuthException') return 'operator';

    // Template configuration (132xxx) and phone-number registration (133xxx)
    // are also fixable by the operator, not by retrying.
    if (code >= 132000 && code < 134000) return 'operator';

    return 'permanent';
  }

  /** True when retrying the exact same request could plausibly succeed. */
  get isRetryable(): boolean {
    return this.failureClass === 'transient';
  }
}

const GRAPH_BASE = 'https://graph.facebook.com/v22.0';

/**
 * Single exit point to the Graph API so every failure gets logged the same way:
 * one flat line, no nested object that Vercel's log viewer will collapse to `{…}`.
 */
async function postToWhatsApp(
  label: string,
  payload: Record<string, unknown>
): Promise<SendWhatsAppResponse> {
  const url = `${GRAPH_BASE}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  const rawBody = await response.text();

  if (!response.ok) {
    let metaError: any = undefined;
    try {
      metaError = JSON.parse(rawBody)?.error;
    } catch {
      // Non-JSON body (gateway HTML, empty response) — rawBody is logged as-is below.
    }

    const details =
      typeof metaError?.error_data?.details === 'string'
        ? metaError.error_data.details
        : undefined;

    // Flat, single-line, greppable. This is the line that tells you which
    // Meta error you are actually hitting.
    console.error(
      `[Remique][WhatsApp] ${label} FAILED ` +
        `http=${response.status} ` +
        `code=${metaError?.code ?? '-'} ` +
        `subcode=${metaError?.error_subcode ?? '-'} ` +
        `type=${metaError?.type ?? '-'} ` +
        `fbtrace=${metaError?.fbtrace_id ?? '-'} ` +
        `message=${JSON.stringify(metaError?.message ?? null)} ` +
        `details=${JSON.stringify(details ?? null)} ` +
        `raw=${rawBody.slice(0, 500)}`
    );

    throw new WhatsAppApiError({
      label,
      httpStatus: response.status,
      code: metaError?.code,
      subcode: metaError?.error_subcode,
      errorType: metaError?.type,
      errorMessage: metaError?.message,
      errorDetails: details,
      fbtraceId: metaError?.fbtrace_id,
      rawBody,
    });
  }

  return JSON.parse(rawBody) as SendWhatsAppResponse;
}

/**
 * Sends a free-form WhatsApp text message (for use inside the 24-hour customer service window)
 */
export async function sendWhatsAppMessage(
  toPhoneNumber: string,
  textBody: string
): Promise<SendWhatsAppResponse> {
  return postToWhatsApp('text', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toPhoneNumber.replace('+', ''),
    type: 'text',
    text: {
      preview_url: false,
      body: textBody,
    },
  });
}

/**
 * Marks the inbound message as read and shows the "typing…" bubble in the
 * user's chat.
 *
 * This is a perceived-latency fix, not a real one: the parse and the reply still
 * take as long as they take, but the user sees the bot react within a few
 * hundred milliseconds instead of staring at a silent thread. Meta clears the
 * indicator as soon as the real reply lands, or after 25 seconds.
 *
 * Never throws — a failed indicator must not cost anyone their reminder.
 */
export async function markReadAndShowTyping(inboundMessageId: string): Promise<void> {
  try {
    await postToWhatsApp('typing_indicator', {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: inboundMessageId,
      typing_indicator: { type: 'text' },
    });
  } catch (error: any) {
    console.warn(`[Remique][WhatsApp] typing indicator failed: ${error?.message}`);
  }
}

/**
 * Sends an approved WhatsApp Utility Template message (required when message is sent outside the 24h window)
 */
export async function sendWhatsAppTemplate(
  toPhoneNumber: string,
  templateName: string = 'reminder_alert',
  languageCode: string = 'en',
  bodyParameters: string[] = []
): Promise<SendWhatsAppResponse> {
  const components =
    bodyParameters.length > 0
      ? [
          {
            type: 'body',
            parameters: bodyParameters.map((param) => ({
              type: 'text',
              text: param,
            })),
          },
        ]
      : undefined;

  return postToWhatsApp(`template:${templateName}`, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toPhoneNumber.replace('+', ''),
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  });
}

export type WhatsAppTokenStatus =
  | { ok: true; phoneNumberId: string; displayPhoneNumber?: string; verifiedName?: string }
  | { ok: false; httpStatus: number; code?: number; error: string };

/**
 * Cheap liveness probe for WHATSAPP_TOKEN. Reads the phone number the app is
 * configured against — no message is sent, so this is safe to poll.
 * Catches an expired token before a real user does.
 */
export async function checkWhatsAppToken(): Promise<WhatsAppTokenStatus> {
  const url =
    `${GRAPH_BASE}/${env.WHATSAPP_PHONE_NUMBER_ID}` +
    `?fields=id,display_phone_number,verified_name`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
    cache: 'no-store',
  });

  const rawBody = await response.text();

  if (!response.ok) {
    let metaError: any = undefined;
    try {
      metaError = JSON.parse(rawBody)?.error;
    } catch {
      // Non-JSON body — surfaced via rawBody below.
    }

    console.error(
      `[Remique][WhatsApp] token-check FAILED ` +
        `http=${response.status} code=${metaError?.code ?? '-'} ` +
        `type=${metaError?.type ?? '-'} ` +
        `message=${JSON.stringify(metaError?.message ?? null)} ` +
        `raw=${rawBody.slice(0, 300)}`
    );

    return {
      ok: false,
      httpStatus: response.status,
      code: metaError?.code,
      error: metaError?.message ?? rawBody.slice(0, 300),
    };
  }

  const body = JSON.parse(rawBody) as {
    id: string;
    display_phone_number?: string;
    verified_name?: string;
  };

  return {
    ok: true,
    phoneNumberId: body.id,
    displayPhoneNumber: body.display_phone_number,
    verifiedName: body.verified_name,
  };
}
