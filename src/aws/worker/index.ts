import type { SQSEvent } from 'aws-lambda';
import { normalizePhoneNumber } from '../../lib/date-normalizer';
import { claimInboundMessage, runMessagePipeline } from '../../lib/message-pipeline';
import { WhatsAppApiError } from '../../lib/whatsapp';

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

      if (!message || message.type !== 'text') {
        console.log(`[Remique] SQS Worker ignoring non-text message: ${record.messageId}`);
        continue;
      }

      const whatsappMessageId = message.id;
      const rawSenderNumber = message.from;
      const formattedPhoneNumber = normalizePhoneNumber(rawSenderNumber);
      const messageText = message.text?.body?.trim() || '';
      const profileName = contact?.profile?.name || 'User';

      // 1. Claim the inbound message (DB write)
      const claimed = await claimInboundMessage({
        whatsappMessageId,
        rawSenderNumber,
        formattedPhoneNumber,
        messageText,
        profileName,
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
