import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { createHmac, timingSafeEqual } from 'crypto';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

// We do NOT import Prisma or anything heavy here.
// This must stay extremely fast and lightweight.

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL || '';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;

  // 1. Handshake Verification (GET)
  if (method === 'GET') {
    const queryParams = event.queryStringParameters || {};
    const mode = queryParams['hub.mode'];
    const token = queryParams['hub.verify_token'];
    const challenge = queryParams['hub.challenge'];

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
      console.log('[Remique] WhatsApp Webhook Handshake verified successfully.');
      return {
        statusCode: 200,
        body: challenge,
        headers: { 'Content-Type': 'text/plain' },
      };
    }

    console.warn('[Remique] Webhook verification failed. Invalid token.');
    return { statusCode: 403, body: 'Forbidden' };
  }

  // 2. Incoming Webhook (POST)
  if (method === 'POST') {
    try {
      // API Gateway / Lambda Function URL base64-encodes binary/compressed payloads,
      // but usually raw text for JSON. We must extract the exact raw body for HMAC.
      const rawBody = event.isBase64Encoded && event.body
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : (event.body || '');

      // Cryptographically verify this request is genuinely from Meta
      const signatureHeader = event.headers['x-hub-signature-256'];
      
      if (WHATSAPP_APP_SECRET) {
        if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
          console.warn('[Remique] Missing or malformed x-hub-signature-256 header.');
          return { statusCode: 403, body: 'Invalid signature' };
        }

        const expectedHmac = createHmac('sha256', WHATSAPP_APP_SECRET)
          .update(rawBody, 'utf8')
          .digest('hex');
        
        const expectedSignature = `sha256=${expectedHmac}`;

        try {
          const isValid = timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expectedSignature));
          if (!isValid) {
            console.warn('[Remique] Signature mismatch.');
            return { statusCode: 403, body: 'Invalid signature' };
          }
        } catch {
          // Buffers differ in length
          return { statusCode: 403, body: 'Invalid signature' };
        }
      } else {
        console.warn('[Remique] WHATSAPP_APP_SECRET not set, skipping HMAC check (dev only).');
      }

      const payload = JSON.parse(rawBody);
      const entry = payload?.entry?.[0];
      const change = entry?.changes?.[0]?.value;
      const message = change?.messages?.[0];

      // If event is not an incoming text message (e.g. delivery receipt), ignore and return 200.
      // We still return 200 so Meta doesn't retry delivery receipts unnecessarily.
      if (!message || message.type !== 'text') {
        return { statusCode: 200, body: 'ignored' };
      }

      const whatsappMessageId = message.id;
      const rawSenderNumber = message.from;

      if (!SQS_QUEUE_URL) {
        console.error('[Remique] SQS_QUEUE_URL is not configured.');
        return { statusCode: 500, body: 'Server configuration error' };
      }

      // Enqueue to SQS FIFO
      // Using rawSenderNumber as MessageGroupId ensures messages from the same user are processed in order
      await sqsClient.send(new SendMessageCommand({
        QueueUrl: SQS_QUEUE_URL,
        MessageBody: rawBody,
        MessageGroupId: rawSenderNumber,
        MessageDeduplicationId: whatsappMessageId, // Meta's ID is globally unique for deduplication
      }));

      // Acknowledge quickly to Meta
      return { statusCode: 200, body: 'accepted' };

    } catch (error: any) {
      console.error('[Remique] Webhook handler error:', error?.message, error);
      // Return 500 so Meta will retry if SQS enqueue failed or JSON parse failed.
      return { statusCode: 500, body: 'Internal Server Error' };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
