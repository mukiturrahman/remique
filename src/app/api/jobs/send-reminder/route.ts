import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { db } from '@/db';
import { reminders, messages, users } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import {
  sendWhatsAppButtons,
  sendWhatsAppTemplate,
  WhatsAppApiError,
} from '@/lib/whatsapp';
import { reminderActionButtons } from '@/lib/reminder-service';
import { deliveryMessage } from '@/lib/reminder-voice';
import { DateTime } from 'luxon';
import { verifyQStashRequest } from '@/lib/qstash';
import { nextOccurrence } from '@/lib/recurrence';

export const runtime = 'nodejs';
export const maxDuration = 60;

// How far ahead of its scheduled time a delivery may legitimately arrive.
// QStash fires a little early under load; anything beyond this is a stale
// callback for a reminder that has since been moved.
const EARLY_DELIVERY_GRACE_MS = 2 * 60 * 1000;

export async function POST(request: NextRequest) {
  let reminderId: string | undefined;

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('upstash-signature');

    // Use the canonical app URL for signature verification, as Vercel's request.url 
    // can sometimes resolve to internal/branch domains and cause signature mismatch.
    const expectedUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/jobs/send-reminder`;
    const auth = await verifyQStashRequest(signature, rawBody, expectedUrl);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = JSON.parse(rawBody) as { reminderId: string };
    reminderId = parsed.reminderId;

    if (!reminderId) {
      return NextResponse.json({ error: 'Missing reminderId' }, { status: 400 });
    }

    const reminder = await db.query.reminders.findFirst({
      where: eq(reminders.id, reminderId),
      with: { user: true },
    });

    if (
      !reminder ||
      reminder.status === 'SENT' ||
      reminder.status === 'DONE' ||
      reminder.status === 'CANCELLED'
    ) {
      return NextResponse.json({ status: 'already_completed' }, { status: 200 });
    }

    // A delivery for a time that has since moved. Cancelling the old QStash
    // message is best-effort, so this is the backstop: refuse to send early and
    // leave the row SCHEDULED for its real delivery (or the sweeper).
    if (reminder.scheduledAt.getTime() - Date.now() > EARLY_DELIVERY_GRACE_MS) {
      console.log(
        `[Remique] Ignoring stale delivery for ${reminderId}; ` +
          `now due ${reminder.scheduledAt.toISOString()}`
      );
      return NextResponse.json({ status: 'not_due_yet' }, { status: 200 });
    }

    // Claim the reminder atomically. The sweeper can re-enqueue a delivery that
    // QStash also still holds, so two workers may race for the same row — the
    // conditional update guarantees only one of them sends.
    const claimResult = await db.update(reminders).set({ status: 'PROCESSING', attempts: sql`${reminders.attempts} + 1` }).where(and(eq(reminders.id, reminderId), eq(reminders.status, 'SCHEDULED')));
    const claim = { count: claimResult.count };

    if (claim.count === 0) {
      return NextResponse.json({ status: 'not_claimable' }, { status: 200 });
    }

    // A blocked or lapsed user must never receive another send — otherwise a recurring
    // reminder keeps relaying itself indefinitely, as paid template sends once
    // it falls outside the 24-hour service window. Cancelling rather than
    // silently skipping stops the recurrence chain here (no next occurrence is
    // queued below) and keeps this delivery visible in the dashboard's
    // past-reminders list instead of vanishing without a trace.
    //
    // Free users are delivered to: reminders are what the Free plan includes,
    // and the monthly limit is enforced when they are created, not here.
    const now = new Date();
    const isLapsed = reminder.user.planTier !== 'free' && reminder.user.planTier !== 'permanent' && reminder.user.planExpiresAt && reminder.user.planExpiresAt < now;
    if (reminder.user.blockedAt || isLapsed) {
      await db.update(reminders).set({ status: 'CANCELLED', errorMessage: reminder.user.blockedAt ? 'User is blocked' : 'User is unsubscribed' }).where(eq(reminders.id, reminderId));
      return NextResponse.json({ status: reminder.user.blockedAt ? 'user_blocked' : 'user_unsubscribed' }, { status: 200 });
    }

    // Check 24-Hour Customer Service Window
    const lastInbound = await db.query.messages.findFirst({
      where: and(eq(messages.userId, reminder.userId!), eq(messages.direction, 'INBOUND')),
      orderBy: [desc(messages.createdAt)],
    });

    const isWithin24h =
      lastInbound &&
      DateTime.now().diff(DateTime.fromJSDate(lastInbound.createdAt), 'hours').hours < 24;

    // ─────────────────────────────────────────────────────────────────
    // Send the reminder — handle delivery failure gracefully
    // ─────────────────────────────────────────────────────────────────
    try {
      if (isWithin24h) {
        // Buttons only work inside the customer service window; a template
        // sent outside it can only carry buttons the template itself declares,
        // which is a Meta review cycle rather than a payload change.
        await sendWhatsAppButtons(
          reminder.user.phoneNumber,
          deliveryMessage(reminder, reminder.user.name),
          reminderActionButtons(reminder.id)
        );
      } else {
        await sendWhatsAppTemplate(
          reminder.user.phoneNumber,
          'reminder_alert',
          'en',
          [reminder.title]
        );
      }
    } catch (sendError: any) {
      const failureClass =
        sendError instanceof WhatsAppApiError ? sendError.failureClass : 'transient';
      const errorMessage = sendError.message?.slice(0, 500) ?? 'Unknown delivery error';

      console.error(
        `[Remique] Failed to deliver reminder ${reminderId} class=${failureClass}: ${sendError.message}`
      );

      // Only a genuinely bad request is terminal. Transient and operator
      // failures go back to SCHEDULED so the sweeper can retry them once the
      // rate limit clears or the credentials are fixed. The attempts counter
      // bounds how long that goes on.
      await db.update(reminders).set(
        failureClass === 'permanent'
          ? { status: 'FAILED', errorMessage }
          : { status: 'SCHEDULED', qstashMessageId: null, errorMessage }
      ).where(eq(reminders.id, reminderId));

      if (failureClass === 'operator') {
        console.error(
          '[Remique] ACTION REQUIRED: reminder delivery rejected by Meta. ' +
            'Reminder left SCHEDULED for the sweeper to retry.'
        );
        return NextResponse.json({ status: 'operator_action_required' }, { status: 200 });
      }

      if (failureClass === 'permanent') {
        return NextResponse.json({ status: 'delivery_failed', error: errorMessage }, { status: 200 });
      }

      return NextResponse.json({ status: 'delivery_failed', error: errorMessage }, { status: 500 });
    }

    // Mark as SENT
    await db.update(reminders).set({ status: 'SENT', sentAt: new Date() }).where(eq(reminders.id, reminderId));

    // A recurring reminder is a chain of one-shots: each delivery lays down the
    // next link. Written with a null qstashMessageId so the sweeper claims it
    // once it comes into range, rather than duplicating scheduling logic here.
    //
    // Deliberately after the SENT write and wrapped: this reminder has already
    // reached the user, and a failure to lay the next link must not undo that
    // or hand QStash a retry that would deliver it twice.
    if (reminder.recurrenceRule) {
      try {
        const next = nextOccurrence(
          reminder.scheduledAt,
          reminder.recurrenceRule,
          reminder.timezone
        );

        if (next) {
          const [repeat] = await db.insert(reminders).values({
              userId: reminder.userId!,
              title: reminder.title,
              originalMessage: reminder.originalMessage,
              scheduledAt: next,
              timezone: reminder.timezone,
              category: reminder.category,
              recurrenceRule: reminder.recurrenceRule,
              // Not a new request, so it does not count toward the Free limit.
              source: 'recurrence',
              status: 'SCHEDULED',
            }).returning();
          console.log(
            `[Remique] Recurring reminder ${reminderId} (${reminder.recurrenceRule}) ` +
              `queued next as ${repeat.id} for ${next.toISOString()}`
          );
        }
      } catch (repeatError: any) {
        console.error(
          `[Remique] Failed to queue next occurrence for ${reminderId}: ${repeatError?.message}`
        );
      }
    }

    console.log(`[Remique] Reminder successfully delivered: ${reminderId}`);
    return NextResponse.json({ status: 'sent', reminderId }, { status: 200 });
  } catch (error: any) {
    console.error('[Remique] Error dispatching scheduled reminder:', error);

    // Always clean up stuck PROCESSING records in the outer catch
    if (reminderId) {
      try {
        await db.update(reminders).set({
            status: 'FAILED',
            errorMessage: error.message?.slice(0, 500) ?? 'Unexpected error',
          }).where(eq(reminders.id, reminderId));
      } catch (dbError) {
        console.error('[Remique] Failed to mark reminder as FAILED in DB:', dbError);
      }
    }

    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
