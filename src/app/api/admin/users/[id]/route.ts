import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Since onDelete: 'cascade' is set on all related tables (reminders, facts,
    // notes, messages, documents, usage_events, subscriptions, payments, etc.),
    // deleting the user will cleanly wipe all their data from the database.
    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
