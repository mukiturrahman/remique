import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  verifyQStashRequest,
  scheduleDelayedReminder,
  isWithinQStashWindow,
} from '@/lib/qstash';
import { deleteDocument } from '@/lib/storage';

// Recovery pass. Nothing here is the happy path — every branch exists because
// the primary QStash delivery can be lost, rejected, or never created at all.
// Driven by a QStash Schedule (see README / ops notes) roughly every minute.
export const runtime = 'nodejs';
export const maxDuration = 60;

// Grace period before an unprocessed message is considered stuck. Must exceed
// the worst-case in-flight QStash delivery so a normal message is never swept
// while its first attempt is still running.
const STUCK_MESSAGE_GRACE_MS = 5 * 60 * 1000;

// A reminder left in PROCESSING beyond this had its worker die mid-flight.
const STUCK_PROCESSING_MS = 10 * 60 * 1000;

// An upload the user never named. Generous enough that someone who gets
// distracted mid-conversation and comes back later still finds their file.
const ORPHAN_DOCUMENT_MS = 24 * 60 * 60 * 1000;

// Bounded batches so one sweep cannot exceed maxDuration or stampede QStash.
const BATCH = 25;

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const auth = await verifyQStashRequest(
      request.headers.get('upstash-signature'),
      rawBody,
      request.url
    );

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const now = new Date();
    const result = {
      replayedMessages: 0,
      scheduledDeferred: 0,
      requeuedOverdue: 0,
      resetStuckProcessing: 0,
      deletedOrphanDocuments: 0,
      errors: [] as string[],
    };

    // ── 1. Inbound messages that were never answered ────────────────────
    // (Obsolete: This is now handled 100% by AWS SQS automatic retries and DLQs.
    // SQS guarantees at-least-once delivery, so we no longer need a manual sweeper
    // for inbound messages.)

    // ── 2. Reminders deferred past the QStash window ────────────────────
    // Written with a null qstashMessageId at creation time; claim them once
    // they come into range.
    const deferred = await prisma.reminder.findMany({
      where: { status: 'SCHEDULED', qstashMessageId: null },
      orderBy: { scheduledAt: 'asc' },
      take: BATCH,
      select: { id: true, scheduledAt: true },
    });

    for (const reminder of deferred) {
      if (!isWithinQStashWindow(reminder.scheduledAt, now)) continue;

      try {
        const qstashMessageId = await scheduleDelayedReminder(
          reminder.id,
          reminder.scheduledAt,
          { replay: true }
        );
        if (qstashMessageId) {
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { qstashMessageId },
          });
          result.scheduledDeferred++;
        }
      } catch (err: any) {
        result.errors.push(`deferred reminder ${reminder.id}: ${err?.message}`);
      }
    }

    // ── 3. Reminders that are already due but never fired ────────────────
    // QStash dropped or never received the callback. Send now, late.
    const overdue = await prisma.reminder.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { lte: now }, attempts: { lt: 5 } },
      orderBy: { scheduledAt: 'asc' },
      take: BATCH,
      select: { id: true },
    });

    for (const reminder of overdue) {
      try {
        const qstashMessageId = await scheduleDelayedReminder(reminder.id, now, {
          replay: true,
        });
        if (qstashMessageId) {
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { qstashMessageId },
          });
          result.requeuedOverdue++;
        }
      } catch (err: any) {
        result.errors.push(`overdue reminder ${reminder.id}: ${err?.message}`);
      }
    }

    // ── 4. Reminders wedged in PROCESSING ────────────────────────────────
    // The worker claimed them and then died. Return them to SCHEDULED so the
    // overdue pass above can pick them up on the next sweep.
    const reset = await prisma.reminder.updateMany({
      where: {
        status: 'PROCESSING',
        updatedAt: { lte: new Date(now.getTime() - STUCK_PROCESSING_MS) },
        attempts: { lt: 5 },
      },
      data: { status: 'SCHEDULED', qstashMessageId: null },
    });
    result.resetStuckProcessing = reset.count;

    // ── 5. Documents uploaded but never named ───────────────────────────
    // The user sent a file, was asked what to call it, and never answered.
    // The bytes were stored before the label existed (Meta media IDs expire),
    // so without this pass every abandoned upload bills S3 forever.
    const orphans = await prisma.document.findMany({
      where: {
        label: null,
        createdAt: { lte: new Date(now.getTime() - ORPHAN_DOCUMENT_MS) },
      },
      take: BATCH,
      select: { id: true, s3Key: true },
    });

    for (const orphan of orphans) {
      try {
        // S3 first. A failed delete here leaves the row, so the next sweep
        // retries — the reverse order would orphan the object permanently.
        await deleteDocument(orphan.s3Key);
        await prisma.document.delete({ where: { id: orphan.id } });
        result.deletedOrphanDocuments++;
      } catch (err: any) {
        result.errors.push(`orphan document ${orphan.id}: ${err?.message}`);
      }
    }

    const didWork =
      result.deletedOrphanDocuments > 0 ||
      result.replayedMessages > 0 ||
      result.scheduledDeferred > 0 ||
      result.requeuedOverdue > 0 ||
      result.resetStuckProcessing > 0 ||
      result.errors.length > 0;

    if (didWork) {
      console.log(
        `[Remique] sweep replayedMessages=${result.replayedMessages} ` +
          `scheduledDeferred=${result.scheduledDeferred} ` +
          `requeuedOverdue=${result.requeuedOverdue} ` +
          `resetStuckProcessing=${result.resetStuckProcessing} ` +
          `deletedOrphanDocuments=${result.deletedOrphanDocuments} ` +
          `errors=${result.errors.length}`
      );
      for (const err of result.errors) {
        console.error(`[Remique] sweep error: ${err}`);
      }
    }

    return NextResponse.json({ status: 'ok', ...result }, { status: 200 });
  } catch (error: any) {
    console.error('[Remique] sweep failed:', error?.message);
    return NextResponse.json({ status: 'error', error: error?.message }, { status: 500 });
  }
}
