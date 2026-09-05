import { Prisma, type Message, type User } from '@prisma/client';
import { prisma } from './db';
import { processIncomingUserMessage } from './reminder-service';
import { markReadAndShowTyping, sendWhatsAppMessage, WhatsAppApiError } from './whatsapp';

/**
 * The single implementation of "answer one inbound WhatsApp message".
 *
 * Both entry points run this exact code: the webhook (inline, via `after()`,
 * which is the fast path) and /api/jobs/process-message (the QStash retry /
 * sweeper replay path). Keeping it in one place is what makes it safe for the
 * webhook to do the work itself — the retry path cannot drift from it.
 */

// Per-user abuse ceiling. Every inbound message costs an OpenAI call, three DB
// writes and a WhatsApp send, so an unthrottled sender can drain the OpenAI
// quota on their own. Counted against the [userId, direction, createdAt] index.
const MAX_MESSAGES_PER_HOUR = 30;

export type PipelineStatus =
  | 'processed'
  | 'already_processed'
  | 'not_claimable'
  | 'no_user'
  | 'rate_limited'
  | 'operator_action_required'
  | 'permanent_failure'
  | 'transient_failure';

export interface PipelineResult {
  status: PipelineStatus;
  /** True only when running the message again can still produce a reply. */
  retryable: boolean;
  error?: string;
}

export type PipelineMessage = Message & { user: User | null };

export function loadPipelineMessage(messageId: string): Promise<PipelineMessage | null> {
  return prisma.message.findUnique({
    where: { id: messageId },
    include: { user: true },
  });
}

export async function runMessagePipeline(message: PipelineMessage): Promise<PipelineResult> {
  if (message.processedAt) {
    return { status: 'already_processed', retryable: false };
  }

  const user = message.user;

  if (!user) {
    console.error(`[Remique] pipeline: message ${message.id} has no linked user`);
    await prisma.message.update({
      where: { id: message.id },
      data: { processedAt: new Date(), processingError: 'No linked user' },
    });
    return { status: 'no_user', retryable: false };
  }

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Fired first and never awaited on the reply path. The user sees "typing…"
  // while the LLM parse runs, which is the difference between a thread that
  // looks dead for four seconds and one that reacts immediately.
  const typing = markReadAndShowTyping(message.whatsappMessageId);

  // One wall-clock round trip for three independent reads/writes that all have
  // to happen before the LLM call. Issued together because this runs on the
  // user's critical path now, not in a background worker.
  const [claim, recentCount, activeState] = await Promise.all([
    // Optimistic claim on `attempts`. A Meta webhook retry (or a sweeper replay
    // racing an in-flight QStash delivery) that lands while the first attempt is
    // still running loses this update and bails out instead of replying twice.
    prisma.message.updateMany({
      where: { id: message.id, processedAt: null, attempts: message.attempts },
      data: { attempts: { increment: 1 } },
    }),
    prisma.message.count({
      where: {
        userId: user.id,
        direction: 'INBOUND',
        createdAt: { gte: oneHourAgo },
      },
    }),
    prisma.conversationState.findFirst({
      where: { userId: user.id, expiresAt: { gt: now } },
    }),
  ]);

  if (claim.count === 0) {
    // Someone else owns this message right now, or it was answered between the
    // read and the claim. Either way, acking is correct.
    await typing;
    return { status: 'not_claimable', retryable: false };
  }

  // ── Per-user rate limit ──────────────────────────────────────────
  // Checked before the LLM call so a flood costs one COUNT query, not one LLM call.
  if (recentCount > MAX_MESSAGES_PER_HOUR) {
    console.warn(
      `[Remique] Rate limit hit userId=${user.id} count=${recentCount} messageId=${message.id}`
    );

    // Tell them once, on the message that crosses the line. Replying to every
    // throttled message would just move the cost from OpenAI to WhatsApp.
    if (recentCount === MAX_MESSAGES_PER_HOUR + 1) {
      try {
        await sendWhatsAppMessage(
          user.phoneNumber,
          "You've sent a lot of messages in a short time, so I'm pausing for a bit. " +
            'Try again in an hour and I will pick straight back up. ⏳'
        );
      } catch (notifyError: any) {
        console.error('[Remique] Failed to send rate-limit notice:', notifyError?.message);
      }
    }

    await prisma.message.update({
      where: { id: message.id },
      data: { processedAt: new Date(), processingError: 'Rate limited' },
    });

    await typing;
    return { status: 'rate_limited', retryable: false };
  }

  try {
    await processIncomingUserMessage(user, message.messageText, activeState);
    await typing;

    // Only now is the message truly answered.
    await prisma.message.update({
      where: { id: message.id },
      data: { processedAt: new Date(), processingError: null },
    });

    return { status: 'processed', retryable: false };
  } catch (error: any) {
    await typing;
    return recordFailure(message.id, error);
  }
}

async function recordFailure(messageId: string, error: any): Promise<PipelineResult> {
  // Anything that is not a classified WhatsApp error is treated as transient.
  const failureClass = error instanceof WhatsAppApiError ? error.failureClass : 'transient';
  const errorMessage = error?.message?.slice(0, 500) ?? 'Unknown processing error';

  console.error(
    `[Remique] pipeline failed messageId=${messageId} class=${failureClass} error=${error?.message}`
  );

  try {
    await prisma.message.update({
      where: { id: messageId },
      data: {
        processingError: errorMessage,
        // Only a genuinely bad request is burned. An 'operator' failure
        // (expired token, missing permission, unapproved template) leaves
        // processedAt null so the message can be replayed once it is fixed.
        ...(failureClass === 'permanent' ? { processedAt: new Date() } : {}),
      },
    });
  } catch (dbError: any) {
    console.error('[Remique] Failed to record processing error:', dbError?.message);
  }

  if (failureClass === 'operator') {
    // Retrying now cannot help, so there is nothing to hand back to QStash —
    // but the message stays unprocessed and replayable by the sweeper.
    console.error(
      '[Remique] ACTION REQUIRED: WhatsApp credentials/config rejected. ' +
        'Message left unprocessed for replay. Check /api/health?deep=1'
    );
    return { status: 'operator_action_required', retryable: false, error: errorMessage };
  }

  if (failureClass === 'permanent') {
    return { status: 'permanent_failure', retryable: false, error: errorMessage };
  }

  return { status: 'transient_failure', retryable: true, error: errorMessage };
}

export interface InboundMessageInput {
  whatsappMessageId: string;
  rawSenderNumber: string;
  formattedPhoneNumber: string;
  messageText: string;
  profileName: string;
}

/**
 * Writes the inbound message and returns it with its user attached.
 *
 * Returns null only for a message we have already answered. A row that exists
 * with processedAt = null means a previous attempt died before replying, so the
 * existing row is handed back and processed again — Meta's retry must not be
 * dropped as a duplicate.
 */
export async function claimInboundMessage(
  input: InboundMessageInput,
  allowUserRaceRetry = true
): Promise<PipelineMessage | null> {
  try {
    return await prisma.message.create({
      data: {
        whatsappMessageId: input.whatsappMessageId,
        direction: 'INBOUND',
        messageText: input.messageText,
        user: {
          connectOrCreate: {
            where: { whatsappId: input.rawSenderNumber },
            create: {
              whatsappId: input.rawSenderNumber,
              phoneNumber: input.formattedPhoneNumber,
              name: input.profileName,
              timezone: 'Asia/Dhaka',
            },
          },
        },
      },
      include: { user: true },
    });
  } catch (error) {
    const isUniqueViolation =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

    if (!isUniqueViolation) throw error;

    const existing = await prisma.message.findUnique({
      where: { whatsappMessageId: input.whatsappMessageId },
      include: { user: true },
    });

    if (existing) {
      if (existing.processedAt) return null;
      console.warn(`[Remique] Reprocessing unanswered message ${input.whatsappMessageId}`);
      return existing;
    }

    // The collision was on whatsappId, not on the message: two messages from a
    // brand new sender landed at once and both tried to create the user. The
    // user exists now, so the same insert succeeds on the second pass.
    if (allowUserRaceRetry) {
      return claimInboundMessage(input, false);
    }

    throw error;
  }
}
