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
   * True when retrying the exact same request could plausibly succeed.
   * Everything else (auth, bad recipient, template problems) is permanent.
   */
  get isRetryable(): boolean {
    if (this.httpStatus >= 500) return true;
    if (this.httpStatus === 429) return true;
    // 130429 = throughput limit, 131056 = pair rate limit, 131048 = spam rate limit,
    // 133016 = temporarily blocked, 500/2 = unknown transient API error.
    return [1, 2, 4, 130429, 131048, 131056, 133016].includes(this.code ?? -1);
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
