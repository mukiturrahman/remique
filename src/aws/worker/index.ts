import type { SQSEvent } from 'aws-lambda';
import { normalizePhoneNumber } from '../../lib/date-normalizer';
import { claimInboundMessage, runMessagePipeline } from '../../lib/message-pipeline';
import { WhatsAppApiError } from '../../lib/whatsapp';

// Must match ACCEPTED_MESSAGE_TYPES in the webhook Lambda.
const ACCEPTED_MESSAGE_TYPES = new Set(['text', 'image', 'document']);

export const handler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    let rawBody = '';
    try {
      rawBody = record.body;
      const payload = JSON.parse(rawBody);

      const entry = payload?.entry?.[0];
      const change = entry?.changes?.[0]?.value;
      const message = change?.messages?.[0];
      const contact = change?.contacts?.[0];

      // Kept in sync with the webhook's allowlist.
      if (!message || !ACCEPTED_MESSAGE_TYPES.has(message.type)) {
        console.log(
          `[Remique] SQS Worker ignoring unsupported type "${message?.type}": ${record.messageId}`
        );
        continue;
      }

      const whatsappMessageId = message.id;
      const rawSenderNumber = message.from;
      const formattedPhoneNumber = normalizePhoneNumber(rawSenderNumber);
      const profileName = contact?.profile?.name || 'User';

      // For media, the caption carries the user's intent ("save this as a
      // dollar document"). An empty caption is normal and means the label has
      // to be asked for on the next turn.
      const media = message.type === 'image' ? message.image
        : message.type === 'document' ? message.document
        : null;

      const messageText = (
        message.type === 'text' ? message.text?.body : media?.caption
      )?.trim() || '';

      // 1. Claim the inbound message (DB write)
      const claimed = await claimInboundMessage({
        whatsappMessageId,
        rawSenderNumber,
        formattedPhoneNumber,
        messageText,
        profileName,
        media: media
          ? {
              mediaId: media.id,
              mediaType: message.type,
              mediaMimeType: media.mime_type,
              mediaFilename: media.filename ?? null,
            }
          : null,
      });

      if (!claimed) {
        // null means the message exists and processedAt is NOT null
        // i.e., it has already been processed successfully.
        console.log(`[Remique] SQS Worker duplicate message dropped: ${whatsappMessageId}`);
        continue;
      }

      // 2. Run the processing pipeline
      const result = await runMessagePipeline(claimed);

      if (result.retryable) {
        // Throwing an error forces SQS to retry the message (up to maxReceiveCount)
        throw new Error(`Transient failure in message pipeline: ${result.error || 'Unknown error'}`);
      }

    } catch (error: any) {
      console.error(`[Remique] SQS Worker failed to process record ${record.messageId}:`, error);
      
      // If the error was explicitly thrown by the pipeline as retryable, rethrow it so SQS retries.
      // If it's a structural error (like JSON parse failure), we probably shouldn't retry,
      // but throwing will put it in the DLQ eventually, which is safe for investigation.
      throw error;
    }
  }
};
