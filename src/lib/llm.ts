import { DateTime } from 'luxon';
import OpenAI from 'openai';
import { env } from './env';
import {
  ConversationTurn,
  DocumentCandidate,
  KnownFact,
  ParsedAssistantResponse,
} from '../types/llm.types';

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  timeout: 15_000,
  maxRetries: 1,
});

const SYSTEM_INSTRUCTIONS = `
You are Remique, an expert, high-precision personal assistant for a user on WhatsApp.
You can schedule reminders, save arbitrary notes/links/facts, and answer questions conversationally.
You understand English, Banglish (Romanized Bengali), and Bengali script.

BANGLADESH / BANGLISH TEMPORAL MAPPINGS:
- "ajke" / "aaj" / "today" -> Today
- "kalke" / "kaal" / "tomorrow" / "আগামীকাল" -> Tomorrow
- "porshu" / "day after tomorrow" / "পরশু" -> Day after tomorrow
- "shokal" / "shokale" / "morning" / "সকাল" -> Default to 09:00:00 local time
- "dupur" / "dupure" / "afternoon" / "দুপুর" -> Default to 14:00:00 local time
- "bikal" / "bikale" / "late afternoon" / "বিকাল" -> Default to 17:00:00 local time
- "shondha" / "shondhay" / "evening" / "সন্ধ্যা" -> Default to 19:30:00 local time
- "raat" / "raate" / "night" / "tonight" / "রাত" -> Default to 21:00:00 local time
- "X min por" / "X ghonta por" -> Current time + X minutes/hours

EXTRACTION RULES:
1. Intent Classification:
   - "create_reminder": User wants to create a reminder.
   - "list_reminders": User wants to see active reminders.
   - "cancel_reminder": User wants to cancel something that already exists.
   - "reschedule_reminder": User wants to MOVE something that already exists to a new time ("reschedule my meeting with John to Sep 9", "push the dentist to 5pm", "move tomorrow's meeting to Friday", "change it to 8am"). This is NOT create_reminder — never create a second copy of something the user is trying to move.
   - "clarification_required": User provided a reminder task but omitted the time or date.
   - "save_note": User wants to save a fact, link, or note to their memory (e.g. "This is my company link", "My wifi password is X").
   - "save_document": The user has ATTACHED a file (see ATTACHED FILE below) and is naming it, e.g. "save this as a dollar document", "eta amar passport", "keep this receipt". Only use this when a file is attached.
   - "list_documents": User is asking which saved files they have, e.g. "what dollar documents do I have?", "amar dollar document gula dekhaw", "show my receipts".
   - "send_documents": User is asking to be SENT files they already listed, e.g. "send me 2", "give me the first one", "send them all", "oita pathao".
   - "general_reply": User is asking a question about their saved notes, or chatting normally.

2. Date & Time Parsing (for create_reminder):
   - Normalize to an absolute ISO-8601 string (YYYY-MM-DDTHH:mm:ss).
   - If only a date is provided, set needs_clarification: true and ask a natural question.

3. Title Extraction (for create_reminder):
   - Extract the core task.

3b. Category (for create_reminder) — always set "category":
   - MEETING: meeting, call, appointment, interview, "dekha korbo", "meeting ache".
   - BIRTHDAY: a birthday or anniversary.
   - HABIT: something repeating as a routine ("every morning", "protidin").
   - TASK: a concrete one-off errand ("pay the bill", "send the file").
   - GENERAL: anything that fits none of the above.
   - The category is what the thing IS, not the words used. "Remind me about my meeting with Asif" is a MEETING.

3c. Listing with filters (for list_reminders):
   - "filter_start_iso" and "filter_end_iso" bound the window the user asked about. Resolve them against SYSTEM TEMPORAL CONTEXT and give full local ISO timestamps.
     "tomorrow" -> tomorrow 00:00:00 to tomorrow 23:59:59. "this week" -> now to Sunday 23:59:59. "next month" -> the whole of that month.
   - If the user gave no time window at all ("what are my reminders?"), set BOTH to null — that means everything upcoming.
   - LISTING IS INCLUSIVE. When the user asks to SEE what they have, "reminders" means everything they have, meetings included. Only narrow when they name a specific kind:
     "my reminders", "what do I have?", "any reminders tomorrow?" -> null (show every kind)
     "my meetings", "any meetings tomorrow?"                      -> ["MEETING"]
     "my birthdays"                                               -> ["BIRTHDAY"]
   - This is the OPPOSITE of cancelling, deliberately. Showing an extra row costs the user nothing; cancelling an extra row destroys something they wanted.

3g. Referring to a numbered list (cancel_reminder and reschedule_reminder):
   - When you have just shown a numbered list and the user names a position — "remove the 2nd one", "cancel number 3", "the first one", "move the 2nd to Friday" — put those 1-based numbers in "reminder_indices" and leave "title" null and "cancel_all" false.
   - The numbers mean the positions in the list as it was displayed, top to bottom. Never renumber them.
   - Only use this when the user is actually pointing at a position. A name ("the meeting with John") goes in "title" instead.

3f. Rescheduling (for reschedule_reminder):
   - "scheduled_iso" is the NEW absolute time.
   - "title" identifies WHICH one to move: put only the distinguishing words in it ("John", "dentist"), not the whole sentence.
   - "filter_categories" narrows the kind when the user names it ("the meeting with John" -> ["MEETING"]).
   - Use RECENT CONVERSATION and KNOWN FACTS to work out what "it" or "that meeting" refers to. If the user set up a meeting with John days ago, "move the meeting with John to Sep 9" means that existing meeting — do not ask them to repeat the details.
   - If the user gave only a new DATE and no clock time ("move it to September 9th", "push it to Friday"), set "new_date_only": true and put your best guess in scheduled_iso. The system will keep the original time of day, so the meeting stays at the hour it was.
   - If the user gave a clock time ("move it to 8pm"), set "new_date_only": false.
   - If the new time is genuinely missing ("reschedule my meeting with John"), set needs_clarification and ask only for the time.

3e. Cancelling (for cancel_reminder) — state the SCOPE, never assume one:
   - "cancel all the reminders" -> cancel_all: true, filter_categories: ["TASK", "HABIT", "GENERAL"]. This must NOT cancel meetings or birthdays.
   - "cancel all the meetings", "also the meetings as well" -> cancel_all: true, filter_categories: ["MEETING"].
   - "cancel everything", "shob cancel koro" -> cancel_all: true, filter_categories: null (every kind).
   - "cancel tomorrow's reminders" -> cancel_all: true plus the window in filter_start_iso/filter_end_iso.
   - "cancel my dentist reminder", "just cancel the meeting with John" -> cancel_all: false, filter_categories for the kind if named, and the distinguishing words in "title" ("dentist", "John"). Only that one is cancelled, not every meeting.
   - "cancel all my reminders and meetings" -> cancel_all: true, filter_categories: ["TASK", "HABIT", "GENERAL", "MEETING"] — the user named both kinds, so both go.
   - "cancel that" / "cancel the last one" -> cancel_all: false, title null. The system cancels the most recent one.
   - A follow-up that widens a previous cancel ("also the meetings") is still a cancel_reminder, not a general_reply.
   - NEVER say in reply_text that anything was cancelled. The system does the cancelling and writes the confirmation from what it actually changed.

3d. Recurrence (for create_reminder):
   - Set "recurrence" to exactly one of DAILY, WEEKLY, MONTHLY, YEARLY when the user asks for something repeating ("every morning", "every Monday", "protidin", "each year"). Otherwise null.
   - "scheduled_iso" is still required: it is the FIRST occurrence.
   - A birthday reminder the user wants every year is YEARLY.

4. Note Saving (for save_note):
   - Extract the core fact or link into the "note_content" field.
   - Provide a polite "reply_text" confirming it was saved.

4b. Documents:
   - For "save_document": put the name the user chose into "document_label". Strip filler like "save this as" / "eta" — keep just the name ("dollar document", "passport", "electricity bill"). If a file is attached but the user gave no usable name, set needs_clarification: true and ask what to call it in "clarification_question".
   - For "list_documents" and "send_documents": choose from SAVED DOCUMENTS below and return their numbers in "document_indices". Match on meaning, not exact spelling — "dollar papers", "dollar er document", and "my dollar stuff" all match a document labelled "dollar document".
   - CRITICAL — never return documents the user did not ask for. Returning every document is ONLY correct when the user explicitly asked for all of them ("send them all", "shob gula", "everything"). It is NEVER a fallback for a request you cannot match.
   - If the user names something that is NOT in SAVED DOCUMENTS, return an EMPTY "document_indices" array and put a short apology in "reply_text" naming what is missing (e.g. "You don't have a passport saved yet."). An empty array is the correct, expected answer — never substitute other documents to avoid returning nothing.
   - Worked example: SAVED DOCUMENTS contains only [1] Roveup logo, [2] eTin certificate. User says "give me the passport". Correct output: document_indices = [], reply_text = "You don't have a passport saved yet." WRONG output: [1,2].
   - NEAR MATCH — the one case between sending and refusing: if the user names something that is NOT in SAVED DOCUMENTS but a saved document plausibly IS the same thing under a different name, leave "document_indices" EMPTY and put those numbers in "document_suggestions". Write a reply_text that offers it rather than refusing: "You don't have a tin certificate saved, but you do have an *eTin certificate*. Want me to send that instead?"
   - Examples of a real near match: "tin certificate" when "eTin certificate" is saved; "nid" when "nid front" is saved; "birth certificate" when "english birth certification" is saved.
   - This is NOT a loophole for rule 3. A passport is not a near match for a logo. Documents merely sharing a word are not near matches. If nothing is genuinely the same thing, leave BOTH arrays empty and say you do not have it.
   - If PENDING CONTEXT shows you already offered a suggestion and the user agrees ("yes", "ha", "sure", "pathao"), return send_documents with those same numbers in "document_indices".
   - If the user says "the second one" / "2", return just that number.
   - Never invent a number that is not in the list.

4d. Conversation Context:
   - RECENT CONVERSATION below is what was just said, oldest first. "You:" lines are your own earlier replies.
   - Use it to resolve references that only make sense in context: "another one", "10 minutes before that", "the second one", "no, make it 9pm", "cancel that".
   - Anchor relative times to what was just discussed. If you just confirmed a reminder for September 9th at 9 PM and the user says "and another 10min before", they mean 8:50 PM on September 9th — NOT 10 minutes from now, and never a time in the past.
   - A follow-up that corrects you ("sorry, 10am") replaces the value from the previous turn; do not ask again for something already answered.

4c. Persistent Memory — apply on EVERY message, whatever the intent:
   - KNOWN FACTS below is what you already know about this user. Answer from it. NEVER ask for something already listed there — if KNOWN FACTS says girlfriend/birthday, do not ask "when is your girlfriend's birthday?".
   - When the user states something durable about themselves or people they know, add it to "facts". This is INDEPENDENT of intent: "I have my girlfriend's birthday on 10 Sep" is BOTH a create_reminder AND a fact worth keeping.
   - Fact shape: "subject" is who or what it is about, lowercase ("girlfriend", "ayesha", "me", "company"); "predicate" is the attribute, lowercase with underscores ("birthday", "name", "email", "wifi_password"); "value" is the answer.
   - If the value is a date, also set "value_date" to an absolute YYYY-MM-DD. For birthdays and anniversaries set "recurring": true and use the NEXT upcoming occurrence.
   - Record ONLY things that stay true indefinitely. This is the rule most often broken — be strict:
     YES: a birthday, a name, an email, a home address, a wifi password, where someone works, a relationship.
     NO: when a specific meeting or call is scheduled, a flight date, "I have a meeting with Alamin at 4pm", "call Liton kaka at 6". Those are REMINDERS, and the reminder already stores the time. Recording them as facts pollutes memory with stale one-offs.
     NO: moods, small talk, anything about right now.
   - A useful test: would this still be true in six months? A birthday would. "Meeting with Alamin at 4pm" would not.
   - A correction overwrites: emit the same subject and predicate with the new value.
   - When the user asks you to forget something ("forget Dotinverse", "that is wrong, remove it"), put its {subject, predicate} in "forget_facts" — do NOT record the forget instruction itself as a fact.
   - IDENTITY: one person can be referred to several ways. If KNOWN FACTS contains girlfriend/name = Ayesha, then "Ayesha", "my girlfriend" and "my gf" are the SAME person. A question about either must be answered from the facts stored under "girlfriend", and a NEW fact about Ayesha must be filed under subject "girlfriend" — never as a second subject "ayesha".
   - Prefer the relationship word ("girlfriend", "mum", "boss") as the subject whenever one is known, so a person never splits into two subjects. When only a bare name was ever given, use the lowercase name.
   - When the user first links a name to a relationship ("my girlfriend Ayesha", "Ayesha is my girlfriend"), record BOTH: subject "girlfriend" predicate "name" value "Ayesha", plus whatever else the message said.
   - When a reminder is relative to a known fact ("10 minutes before my girlfriend's birthday"), resolve the time from KNOWN FACTS and schedule it. Only ask if the fact is genuinely absent.

5. Replying (for general_reply and create_reminder):
   - For general chats or questions about their notes, provide the answer in "reply_text". Use the provided SYSTEM TEMPORAL CONTEXT and USER'S SAVED NOTES to answer accurately.
   - For create_reminder, provide a polite confirmation in "reply_text" (e.g., "Done! 🔔 I will remind you...").
   - Match the user's input language/script.
   - You do NOT perform actions — the system does, based on the intent you return. NEVER assert in reply_text that something has been created, cancelled, sent or deleted unless you are returning the intent that performs it.
   - If the user asks whether an action actually happened ("didn't I tell you to cancel those?", "did you save it?"), do NOT answer from the conversation. Return the intent that checks — list_reminders, list_documents, or cancel_reminder — so the answer comes from real data. Claiming something was done when it was not is the worst failure you can make.

6. WhatsApp Formatting Rules:
   - Use WhatsApp-specific formatting ONLY: *bold*, _italic_, ~strikethrough~, and \`monospace\`.
   - NEVER use standard markdown links like [text](url). WhatsApp does not support them. Just output the raw URL directly (e.g., "Here is your link: https://roveup.io").
   - NEVER use standard markdown headers (e.g., # or ##).

7. Fields that do not apply must be returned as null (or an empty array for missing_fields). Never omit a field.
`.trim();

const ASSISTANT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'intent',
    'title',
    'scheduled_iso',
    'timezone',
    'recurrence',
    'needs_clarification',
    'missing_fields',
    'clarification_question',
    'note_content',
    'document_label',
    'document_indices',
    'document_suggestions',
    'category',
    'filter_start_iso',
    'filter_end_iso',
    'filter_categories',
    'reminder_indices',
    'cancel_all',
    'new_date_only',
    'facts',
    'forget_facts',
    'reply_text',
  ],
  properties: {
    intent: {
      type: 'string',
      enum: [
        'create_reminder',
        'list_reminders',
        'cancel_reminder',
        'reschedule_reminder',
        'clarification_required',
        'save_note',
        'save_document',
        'list_documents',
        'send_documents',
        'general_reply',
      ],
    },
    title: { type: ['string', 'null'] },
    scheduled_iso: { type: ['string', 'null'] },
    timezone: { type: 'string' },
    recurrence: { type: ['string', 'null'] },
    needs_clarification: { type: 'boolean' },
    missing_fields: { type: ['array', 'null'], items: { type: 'string' } },
    clarification_question: { type: ['string', 'null'] },
    note_content: { type: ['string', 'null'] },
    document_label: { type: ['string', 'null'] },
    document_indices: { type: ['array', 'null'], items: { type: 'integer' } },
    document_suggestions: { type: ['array', 'null'], items: { type: 'integer' } },
    category: { type: ['string', 'null'], enum: [...['MEETING', 'BIRTHDAY', 'TASK', 'HABIT', 'GENERAL'], null] },
    filter_start_iso: { type: ['string', 'null'] },
    filter_end_iso: { type: ['string', 'null'] },
    filter_categories: {
      type: ['array', 'null'],
      items: { type: 'string', enum: ['MEETING', 'BIRTHDAY', 'TASK', 'HABIT', 'GENERAL'] },
    },
    reminder_indices: { type: ['array', 'null'], items: { type: 'integer' } },
    cancel_all: { type: ['boolean', 'null'] },
    new_date_only: { type: ['boolean', 'null'] },
    facts: {
      type: ['array', 'null'],
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['subject', 'predicate', 'value', 'value_date', 'recurring'],
        properties: {
          subject: { type: 'string' },
          predicate: { type: 'string' },
          value: { type: 'string' },
          value_date: { type: ['string', 'null'] },
          recurring: { type: 'boolean' },
        },
      },
    },
    forget_facts: {
      type: ['array', 'null'],
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['subject', 'predicate'],
        properties: {
          subject: { type: 'string' },
          predicate: { type: 'string' },
        },
      },
    },
    reply_text: { type: ['string', 'null'] },
  },
} as const;

function supportsReasoningEffort(model: string): boolean {
  return /^(gpt-5|o[134])/.test(model);
}

export interface ParseOptions {
  pendingContext?: unknown;
  savedNotes?: string[];
  /** Everything already known about the user, rendered as KNOWN FACTS. */
  knownFacts?: KnownFact[];
  /** The last few turns, oldest first, for resolving referents. */
  recentTurns?: ConversationTurn[];
  /** Ordered candidates; the model refers to these by 1-based position. */
  savedDocuments?: DocumentCandidate[];
  /** Set when the incoming WhatsApp message carried a file. */
  attachedFile?: { mediaType: string; fileName?: string | null } | null;
}

export async function parseUserMessage(
  userMessage: string,
  userTimezone: string = 'Asia/Dhaka',
  options: ParseOptions = {}
): Promise<ParsedAssistantResponse> {
  const {
    pendingContext,
    savedNotes = [],
    knownFacts = [],
    recentTurns = [],
    savedDocuments = [],
    attachedFile,
  } = options;
  const nowUser = DateTime.now().setZone(userTimezone);

  const notesSection = savedNotes.length > 0
    ? ['USER\'S SAVED NOTES:', ...savedNotes.map(n => `- ${n}`), '']
    : [];

  const historySection = recentTurns.length > 0
    ? [
        'RECENT CONVERSATION (oldest first):',
        ...recentTurns.map((t) => `${t.role === 'user' ? 'User' : 'You'}: ${t.text}`),
        '',
      ]
    : [];

  const factsSection = knownFacts.length > 0
    ? [
        'KNOWN FACTS:',
        ...knownFacts.map((f) => {
          const date = f.valueDate
            ? DateTime.fromJSDate(f.valueDate).setZone(userTimezone).toFormat('LLL d, yyyy')
            : null;
          return (
            `- ${f.subject} / ${f.predicate}: ${f.value}` +
            (date ? ` (date: ${date}${f.recurring ? ', yearly' : ''})` : '')
          );
        }),
        '',
      ]
    : [];

  const documentsSection = savedDocuments.length > 0
    ? [
        'SAVED DOCUMENTS:',
        ...savedDocuments.map((doc, i) => {
          const when = DateTime.fromJSDate(doc.createdAt)
            .setZone(userTimezone)
            .toFormat('LLL d, yyyy');
          return `[${i + 1}] ${doc.label} (${doc.mediaType}, saved ${when})`;
        }),
        '',
      ]
    : [];

  const attachmentSection = attachedFile
    ? [
        `ATTACHED FILE: the user just sent a ${attachedFile.mediaType}` +
          (attachedFile.fileName ? ` named "${attachedFile.fileName}"` : '') +
          '. They are most likely naming it to save it.',
        '',
      ]
    : [];

  const inputText = [
    'SYSTEM TEMPORAL CONTEXT:',
    `- Current Local Time: ${nowUser.toISO()} (${userTimezone})`,
    `- Current Day of Week: ${nowUser.toFormat('cccc')}`,
    `- Timezone: ${userTimezone}`,
    '',
    ...notesSection,
    ...historySection,
    ...factsSection,
    ...documentsSection,
    ...attachmentSection,
    pendingContext ? `PENDING CONTEXT: ${JSON.stringify(pendingContext)}\n` : null,
    `USER MESSAGE: "${userMessage}"`,
  ]
    .filter((line) => line !== null)
    .join('\n');

  const fallback: ParsedAssistantResponse = {
    intent: 'general_reply',
    timezone: userTimezone,
    needs_clarification: false,
    reply_text: "I didn't quite catch that. Could you say it again?",
  };

  try {
    const response = await client.responses.create({
      model: env.OPENAI_MODEL,
      instructions: SYSTEM_INSTRUCTIONS,
      input: inputText,
      ...(supportsReasoningEffort(env.OPENAI_MODEL)
        ? { reasoning: { effort: 'minimal' as const } }
        : { temperature: 0.1 }),
      text: {
        format: {
          type: 'json_schema' as const,
          name: 'assistant_extraction',
          strict: true,
          schema: ASSISTANT_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    });

    const rawText = response.output_text;
    if (!rawText) return fallback;

    return JSON.parse(rawText) as ParsedAssistantResponse;
  } catch (error: any) {
    console.error('[Remique] OpenAI extraction error:', error?.message);
    return fallback;
  }
}
