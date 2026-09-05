export type AssistantIntent =
  | 'create_reminder'
  | 'list_reminders'
  | 'cancel_reminder'
  | 'clarification_required'
  | 'save_note'
  | 'general_reply';

export interface ParsedAssistantResponse {
  intent: AssistantIntent;
  title?: string | null;
  scheduled_iso?: string | null;
  timezone: string;
  recurrence?: string | null;
  needs_clarification: boolean;
  missing_fields?: string[] | null;
  clarification_question?: string | null;
  note_content?: string | null;
  reply_text?: string | null;
}
