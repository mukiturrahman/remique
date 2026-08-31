export type ReminderIntent = 
  | 'create_reminder'
  | 'list_reminders'
  | 'cancel_reminder'
  | 'clarification_required'
  | 'unknown';

export interface GeminiReminderOutput {
  intent: ReminderIntent;
  title?: string | null;
  scheduled_iso?: string | null; // e.g. "2026-09-01T10:00:00"
  timezone: string;
  recurrence?: string | null;
  needs_clarification: boolean;
  missing_fields?: string[] | null;
  clarification_question?: string | null;
  confirmation_phrase?: string | null;
}
