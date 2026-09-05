export type ReminderCategoryValue =
  | 'MEETING'
  | 'BIRTHDAY'
  | 'TASK'
  | 'HABIT'
  | 'GENERAL';

export type AssistantIntent =
  | 'create_reminder'
  | 'list_reminders'
  | 'cancel_reminder'
  | 'reschedule_reminder'
  | 'clarification_required'
  | 'save_note'
  | 'save_document'
  | 'list_documents'
  | 'send_documents'
  | 'general_reply';

/** One durable thing the model learned from this message. */
export interface ExtractedFact {
  subject: string;
  predicate: string;
  value: string;
  /** ISO date (YYYY-MM-DD) when the value is temporal. */
  value_date?: string | null;
  /** True for yearly things like birthdays. */
  recurring?: boolean;
}

/** A fact the user asked to be forgotten, addressed by its key. */
export interface ForgetFactTarget {
  subject: string;
  predicate: string;
}

export interface ParsedAssistantResponse {
  intent: AssistantIntent;
  title?: string | null;
  scheduled_iso?: string | null;
  timezone: string;
  /** DAILY | WEEKLY | MONTHLY | YEARLY, or null for a one-shot. */
  recurrence?: string | null;
  /** What kind of thing a new reminder is about. */
  category?: ReminderCategoryValue | null;
  /** Window the user asked about when listing ("tomorrow", "this week"). */
  filter_start_iso?: string | null;
  filter_end_iso?: string | null;
  /**
   * Which kinds are in scope. The user treats these as peers, not a hierarchy:
   * "reminders" excludes meetings and birthdays. Null means every kind.
   */
  filter_categories?: ReminderCategoryValue[] | null;
  /**
   * 1-based positions from the numbered reminder list the user was last shown.
   * "remove the 2nd one" is only answerable against that exact ordering.
   */
  reminder_indices?: number[] | null;
  /** True when a cancel should sweep every match, not just the latest one. */
  cancel_all?: boolean | null;
  /**
   * Set on a reschedule when the user gave only a new DATE. The existing
   * reminder's time of day is then kept instead of a made-up default.
   */
  new_date_only?: boolean | null;
  needs_clarification: boolean;
  missing_fields?: string[] | null;
  clarification_question?: string | null;
  note_content?: string | null;
  /** Name the user gave a file being saved, e.g. "dollar document". */
  document_label?: string | null;
  /**
   * 1-based positions from the numbered candidate list shown in the prompt.
   * Indices rather than UUIDs so the model cannot hallucinate an id that
   * belongs to another user.
   */
  document_indices?: number[] | null;
  /**
   * Near misses: saved documents that plausibly ARE what was asked for under a
   * different name. Offered for confirmation, never sent outright.
   */
  document_suggestions?: number[] | null;
  /**
   * Facts stated in this message. Populated independently of `intent` — one
   * message can both create a reminder and teach a birthday.
   */
  facts?: ExtractedFact[] | null;
  forget_facts?: ForgetFactTarget[] | null;
  reply_text?: string | null;
}

/** One earlier message, rendered into RECENT CONVERSATION. */
export interface ConversationTurn {
  role: 'user' | 'assistant';
  text: string;
}

/** One row of the KNOWN FACTS block injected into the prompt. */
export interface KnownFact {
  subject: string;
  predicate: string;
  value: string;
  valueDate: Date | null;
  recurring: boolean;
}

/** One row of the numbered document list injected into the prompt. */
export interface DocumentCandidate {
  id: string;
  label: string;
  mediaType: string;
  createdAt: Date;
}
