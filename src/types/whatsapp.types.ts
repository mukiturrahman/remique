/**
 * Inbound media as Meta sends it. `id` is an opaque, expiring handle — the
 * bytes are fetched separately via the Graph API, not carried in the webhook.
 * `filename` is present on documents only.
 */
export interface WhatsAppMediaObject {
  id: string;
  mime_type: string;
  sha256?: string;
  caption?: string;
  filename?: string;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry?: Array<{
    id: string;
    changes?: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: {
            body: string;
          };
          image?: WhatsAppMediaObject;
          document?: WhatsAppMediaObject;
          type: string;
        }>;
      };
      field: string;
    }>;
  }>;
}
