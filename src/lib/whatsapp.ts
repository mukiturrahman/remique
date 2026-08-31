import { env } from './env';

export interface SendWhatsAppResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

/**
 * Sends a free-form WhatsApp text message (for use inside the 24-hour customer service window)
 */
export async function sendWhatsAppMessage(
  toPhoneNumber: string,
  textBody: string
): Promise<SendWhatsAppResponse> {
  const url = `https://graph.facebook.com/v22.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toPhoneNumber.replace('+', ''),
    type: 'text',
    text: {
      preview_url: false,
      body: textBody,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`WhatsApp API Error: ${JSON.stringify(errorData)}`);
  }

  return response.json();
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
  const url = `https://graph.facebook.com/v22.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

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

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toPhoneNumber.replace('+', ''),
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`WhatsApp API Template Error: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}
