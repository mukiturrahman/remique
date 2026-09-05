import type { User } from '@prisma/client';
import { prisma } from './db';
import {
  sendWhatsAppMedia,
  sendWhatsAppMessage,
  type SendWhatsAppResponse,
} from './whatsapp';

/**
 * Every reply the bot sends, written back to `messages` as OUTBOUND.
 *
 * Without this the conversation history is one-sided: the next turn can see
 * "And another 10min before" but not the "Done! I will remind you about your
 * girlfriend's birthday on September 9th" that it refers to, which is exactly
 * the referent the model needs to resolve it.
 *
 * OUTBOUND rows are written with `processedAt` already set. Nothing consumes
 * unprocessed outbound messages today, but leaving it null would make these
 * rows indistinguishable from an inbound message awaiting a reply.
 */
async function logOutbound(
  userId: string,
  response: SendWhatsAppResponse,
  text: string
): Promise<void> {
  const whatsappMessageId = response?.messages?.[0]?.id;

  // No id means Meta accepted the call but told us nothing we can key on.
  // The reply still reached the user; it just cannot join the history.
  if (!whatsappMessageId) return;

  try {
    await prisma.message.create({
      data: {
        userId,
        whatsappMessageId,
        direction: 'OUTBOUND',
        messageText: text,
        processedAt: new Date(),
      },
    });
  } catch (error: any) {
    // The message is already delivered. Losing our copy of it degrades future
    // context, but throwing here would fail a turn that actually succeeded.
    console.warn(`[Remique] Failed to log outbound message: ${error?.message}`);
  }
}

/** Sends a text reply and records it in the conversation history. */
export async function replyToUser(user: User, text: string): Promise<SendWhatsAppResponse> {
  const response = await sendWhatsAppMessage(user.phoneNumber, text);
  await logOutbound(user.id, response, text);
  return response;
}

/**
 * Sends a stored file and records it.
 *
 * The history entry is a text description rather than the file itself — what
 * later turns need is "you already sent them the eTin certificate", not the
 * bytes.
 */
export async function replyWithMedia(
  user: User,
  params: {
    mediaType: 'image' | 'document';
    link: string;
    caption?: string;
    filename?: string;
  }
): Promise<SendWhatsAppResponse> {
  const response = await sendWhatsAppMedia(user.phoneNumber, params);
  const label = params.caption ?? params.filename ?? params.mediaType;
  await logOutbound(user.id, response, `[sent ${params.mediaType}: ${label}]`);
  return response;
}
