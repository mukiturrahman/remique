-- Free plan monthly reminder limit.
--
-- Adds reminders.source so the limit counts only reminders the user asked for
-- ('user'), not snoozes ('snooze') or the repeats of a recurring reminder
-- ('recurrence').
--
-- Apply BEFORE deploying the code that reads it: every reminders query selects
-- this column.
--
-- Apply by hand (Supabase SQL editor or psql). Do NOT use `drizzle-kit push`:
-- the live database still has orphaned objects from a discarded bKash branch
-- that the schema file does not declare, and a push would offer to drop them.
--
-- Existing rows need no backfill. Before this change a free user's reminders
-- were cancelled at delivery, so no snooze or recurrence rows exist for them.

ALTER TABLE reminders ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'user';

CREATE INDEX IF NOT EXISTS reminders_user_id_source_created_at_idx
  ON reminders (user_id, source, created_at);
