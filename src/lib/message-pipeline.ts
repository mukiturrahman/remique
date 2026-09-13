import { eq, and, gte, gt, sql } from 'drizzle-orm';
import { db } from '../db';
import { messages, users, conversationStates, reminders, facts, notes, documents } from '../db/schema';
import { processIncomingUserMessage } from './reminder-service';
import { markReadAndShowTyping, WhatsAppApiError } from './whatsapp';
import { replyToUser } from './conversation-log';
import { checkQuota } from './usage';

const MAX_MESSAGES_PER_HOUR = 100;

export type PipelineStatus =
  | 'processed'
  | 'already_processed'
  | 'not_claimable'
  | 'no_user'
  | 'blocked'
  | 'rate_limited'
  | 'quota_exceeded'
  | 'operator_action_required'
  | 'permanent_failure'
  | 'transient_failure';

export interface PipelineResult {
  status: PipelineStatus;
  retryable: boolean;
  error?: string;
}

export type PipelineMessage = typeof messages.$inferSelect & { user: typeof users.$inferSelect | null };

export async function loadPipelineMessage(messageId: string): Promise<PipelineMessage | null> {
  const result = await db.query.messages.findFirst({
    where: eq(messages.id, messageId),
    with: { user: true },
  });
  return result ?? null;
}

export async function runMessagePipeline(message: PipelineMessage): Promise<PipelineResult> {
  if (message.processedAt) {
    return { status: 'already_processed', retryable: false };
  }

  const user = message.user;

  if (!user) {
    console.error(`[Remique] pipeline: message ${message.id} has no linked user`);
    await db.update(messages)
      .set({ processedAt: new Date(), processingError: 'No linked user' })
      .where(eq(messages.id, message.id));
    return { status: 'no_user', retryable: false };
  }

  if (user.blockedAt) {
    if (!user.blockNoticeSentAt) {
      try {
        await replyToUser(
          user,
          'Your access to Remique is paused right now. ' +
            'If you think that is a mistake, reply here and a human will look. 🔒'
        );
        await db.update(users).set({ blockNoticeSentAt: new Date() }).where(eq(users.id, user.id));
      } catch (notifyError: any) {
        console.error('[Remique] Failed to send block notice:', notifyError?.message);
      }
    }

    await db.update(messages)
      .set({ processedAt: new Date(), processingError: 'Blocked' })
      .where(eq(messages.id, message.id));

    console.warn(`[Remique] Blocked user message dropped userId=${user.id}`);
    return { status: 'blocked', retryable: false };
  }

  const now = new Date();
  const isLapsed = user.planTier !== 'free' && user.planTier !== 'permanent' && user.planExpiresAt && user.planExpiresAt < now;

  if (isLapsed) {
    const expiredDays = (now.getTime() - user.planExpiresAt!.getTime()) / (1000 * 60 * 60 * 24);
    const inGracePeriod = expiredDays <= 7;
    const textLower = message.messageText.toLowerCase().trim();
    
    if (textLower === 'switch to free plan' && !inGracePeriod) {
      // Downgrade confirmation intent
      await db.insert(conversationStates).values({
        userId: user.id,
        pendingIntent: 'DOWNGRADE_TO_FREE_CONFIRM',
        pendingData: {},
        expiresAt: new Date(now.getTime() + 10 * 60 * 1000), // 10 min
      }).onConflictDoUpdate({
        target: conversationStates.userId,
        set: {
          pendingIntent: 'DOWNGRADE_TO_FREE_CONFIRM',
          pendingData: {},
          expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
        },
      });

      await replyToUser(
        user,
        "⚠️ WARNING: Switching to the free plan will permanently delete all your existing Reminders, Facts, Notes, and Documents. You cannot undo this. Reply 'confirm' to proceed, or anything else to cancel."
      );
      
      await db.update(messages).set({ processedAt: new Date(), processingError: null }).where(eq(messages.id, message.id));
      return { status: 'processed', retryable: false };
    }

    // Check if confirming downgrade
    const activeState = await db.query.conversationStates.findFirst({
      where: and(eq(conversationStates.userId, user.id), gt(conversationStates.expiresAt, now)),
    });

    if (activeState?.pendingIntent === 'DOWNGRADE_TO_FREE_CONFIRM') {
      await db.delete(conversationStates).where(eq(conversationStates.userId, user.id));
      
      if (textLower === 'confirm') {
        // Wipe data
        await db.delete(reminders).where(eq(reminders.userId, user.id));
        await db.delete(facts).where(eq(facts.userId, user.id));
        await db.delete(notes).where(eq(notes.userId, user.id));
        await db.delete(documents).where(eq(documents.userId, user.id));
        
        await db.update(users).set({ 
          planTier: 'free', 
          lapseNoticeSentAt: null, 
          planExpiresAt: null,
          planPeriod: null
        }).where(eq(users.id, user.id));
        
        await replyToUser(user, "You have been successfully moved to the Free plan. Your previous data has been deleted.");
        await db.update(messages).set({ processedAt: new Date(), processingError: null }).where(eq(messages.id, message.id));
        return { status: 'processed', retryable: false };
      } else {
        await replyToUser(user, "Downgrade cancelled.");
        await db.update(messages).set({ processedAt: new Date(), processingError: null }).where(eq(messages.id, message.id));
        return { status: 'processed', retryable: false };
      }
    }

    // Normal lapsed behavior
    if (!user.lapseNoticeSentAt) {
      await replyToUser(
        user,
        "Your package has expired. Please renew it to continue using Remique."
      );
      await db.update(users).set({ lapseNoticeSentAt: new Date() }).where(eq(users.id, user.id));
    }
    
    if (!inGracePeriod) {
       await replyToUser(
        user,
        "Your grace period has ended. If you wish to switch to the free plan, reply with 'switch to free plan'."
       );
    }

    await db.update(messages)
      .set({ processedAt: new Date(), processingError: 'Unsubscribed' })
      .where(eq(messages.id, message.id));

    console.warn(`[Remique] Unsubscribed or lapsed user message dropped userId=${user.id}`);
    return { status: 'processed', retryable: false };
  } else if (user.planTier === 'free') {
      // It is a free user. Continue normally, subject to free quotas.
  }

  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const typing = markReadAndShowTyping(message.whatsappMessageId);

  const [claimResult, recentCountResult, activeState, quota] = await Promise.all([
    db.update(messages)
      .set({ attempts: sql`${messages.attempts} + 1` })
      .where(and(eq(messages.id, message.id), eq(messages.attempts, message.attempts)))
      .returning({ id: messages.id }),
      
    db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(
        eq(messages.userId, user.id),
        eq(messages.direction, 'INBOUND'),
        gte(messages.createdAt, oneHourAgo)
      )),
      
    db.query.conversationStates.findFirst({
      where: and(eq(conversationStates.userId, user.id), gt(conversationStates.expiresAt, now)),
    }),
    
    checkQuota(user),
  ]);

  const claimCount = claimResult.length;
  const recentCount = Number(recentCountResult[0].count);

  if (claimCount === 0) {
    await typing;
    return { status: 'not_claimable', retryable: false };
  }

  if (recentCount > MAX_MESSAGES_PER_HOUR) {
    console.warn(
      `[Remique] Rate limit hit userId=${user.id} count=${recentCount} messageId=${message.id}`
    );

    if (recentCount === MAX_MESSAGES_PER_HOUR + 1) {
      try {
        await replyToUser(
          user,
          "You've sent a lot of messages in a short time, so I'm pausing for a bit. " +
            'Try again in an hour and I will pick straight back up. ⏳'
        );
      } catch (notifyError: any) {
        console.error('[Remique] Failed to send rate-limit notice:', notifyError?.message);
      }
    }

    await db.update(messages)
      .set({ processedAt: new Date(), processingError: 'Rate limited' })
      .where(eq(messages.id, message.id));

    await typing;
    return { status: 'rate_limited', retryable: false };
  }

  if (!quota.allowed) {
    console.warn(
      `[Remique] Quota exceeded userId=${user.id} window=${quota.window} ` +
        `used=${quota.used} cap=${quota.cap} messageId=${message.id}`
    );

    const quotaWindowAgo = new Date(
      now.getTime() - (quota.window === 'daily' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000)
    );
    const alreadyToldRecently = await db.query.messages.findFirst({
      where: and(
        eq(messages.userId, user.id),
        eq(messages.direction, 'INBOUND'),
        eq(messages.processingError, 'Quota exceeded'),
        gte(messages.createdAt, quotaWindowAgo)
      ),
      columns: { id: true },
    });

    if (!alreadyToldRecently) {
      try {
        const when = quota.window === 'daily' ? 'today' : 'this week';
        await replyToUser(
          user,
          `You have used up your Remique allowance for ${when}. ` +
            'It refills on a rolling basis, so try again a little later. ⏳'
        );
      } catch (notifyError: any) {
        console.error('[Remique] Failed to send quota notice:', notifyError?.message);
      }
    }

    await db.update(messages)
      .set({ processedAt: new Date(), processingError: 'Quota exceeded' })
      .where(eq(messages.id, message.id));

    await typing;
    return { status: 'quota_exceeded', retryable: false };
  }

  try {
    await processIncomingUserMessage(user, message as any, activeState as any);
    await typing;

    await db.update(messages)
      .set({ processedAt: new Date(), processingError: null })
      .where(eq(messages.id, message.id));

    return { status: 'processed', retryable: false };
  } catch (error: any) {
    await typing;
    return recordFailure(message.id, error);
  }
}

async function recordFailure(messageId: string, error: any): Promise<PipelineResult> {
  const failureClass = error instanceof WhatsAppApiError ? error.failureClass : 'transient';
  const errorMessage = error?.message?.slice(0, 500) ?? 'Unknown processing error';

  console.error(
    `[Remique] pipeline failed messageId=${messageId} class=${failureClass} error=${error?.message}`
  );

  try {
    await db.update(messages)
      .set({
        processingError: errorMessage,
        ...(failureClass === 'permanent' ? { processedAt: new Date() } : {}),
      })
      .where(eq(messages.id, messageId));
  } catch (dbError: any) {
    console.error('[Remique] Failed to record processing error:', dbError?.message);
  }

  if (failureClass === 'operator') {
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

export interface InboundMedia {
  mediaId: string;
  mediaType: string;
  mediaMimeType: string;
  mediaFilename: string | null;
}

export interface InboundMessageInput {
  whatsappMessageId: string;
  buttonReplyId?: string | null;
  rawSenderNumber: string;
  formattedPhoneNumber: string;
  messageText: string;
  profileName: string;
  media?: InboundMedia | null;
}

export async function claimInboundMessage(
  input: InboundMessageInput,
  allowUserRaceRetry = true
): Promise<PipelineMessage | null> {
  try {
    // Upsert User
    let user = await db.query.users.findFirst({
        where: eq(users.whatsappId, input.rawSenderNumber)
    });

    if (!user) {
        try {
            const insertedUsers = await db.insert(users).values({
                whatsappId: input.rawSenderNumber,
                phoneNumber: input.formattedPhoneNumber,
                name: input.profileName,
                timezone: 'Asia/Dhaka',
            }).returning();
            user = insertedUsers[0];
        } catch (e: any) {
             if (e.code === '23505' && allowUserRaceRetry) { // Unique violation
                return claimInboundMessage(input, false);
             }
             throw e;
        }
    }

    const insertedMessages = await db.insert(messages).values({
      whatsappMessageId: input.whatsappMessageId,
      direction: 'INBOUND',
      messageText: input.messageText,
      buttonReplyId: input.buttonReplyId ?? null,
      mediaId: input.media?.mediaId ?? null,
      mediaType: input.media?.mediaType ?? null,
      mediaMimeType: input.media?.mediaMimeType ?? null,
      mediaFilename: input.media?.mediaFilename ?? null,
      userId: user.id
    }).returning();
    
    return { ...insertedMessages[0], user } as PipelineMessage;

  } catch (error: any) {
    if (error.code === '23505') { // Unique violation on whatsappMessageId
        const existing = await db.query.messages.findFirst({
            where: eq(messages.whatsappMessageId, input.whatsappMessageId),
            with: { user: true }
        });
        if (existing) {
            if (existing.processedAt) return null;
            console.warn(`[Remique] Reprocessing unanswered message ${input.whatsappMessageId}`);
            return existing as PipelineMessage;
        }
    }
    throw error;
  }
}
