import { DateTime } from 'luxon';
import OpenAI from 'openai';
import { env } from './env';
import { ParsedAssistantResponse } from '../types/llm.types';

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
   - "cancel_reminder": User wants to cancel a reminder.
   - "clarification_required": User provided a reminder task but omitted the time or date.
   - "save_note": User wants to save a fact, link, or note to their memory (e.g. "This is my company link", "My wifi password is X").
   - "general_reply": User is asking a question about their saved notes, or chatting normally.

2. Date & Time Parsing (for create_reminder):
   - Normalize to an absolute ISO-8601 string (YYYY-MM-DDTHH:mm:ss).
   - If only a date is provided, set needs_clarification: true and ask a natural question.

3. Title Extraction (for create_reminder):
   - Extract the core task.

4. Note Saving (for save_note):
   - Extract the core fact or link into the "note_content" field.
   - Provide a polite "reply_text" confirming it was saved.

5. Replying (for general_reply and create_reminder):
   - For general chats or questions about their notes, provide the answer in "reply_text". Use the provided SYSTEM TEMPORAL CONTEXT and USER'S SAVED NOTES to answer accurately.
   - For create_reminder, provide a polite confirmation in "reply_text" (e.g., "Done! 🔔 I will remind you...").
   - Match the user's input language/script.

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
    'reply_text',
  ],
  properties: {
    intent: {
      type: 'string',
      enum: [
        'create_reminder',
        'list_reminders',
        'cancel_reminder',
        'clarification_required',
        'save_note',
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
    reply_text: { type: ['string', 'null'] },
  },
} as const;

function supportsReasoningEffort(model: string): boolean {
  return /^(gpt-5|o[134])/.test(model);
}

export async function parseUserMessage(
  userMessage: string,
  userTimezone: string = 'Asia/Dhaka',
  pendingContext?: unknown,
  savedNotes: string[] = []
): Promise<ParsedAssistantResponse> {
  const nowUser = DateTime.now().setZone(userTimezone);

  const notesSection = savedNotes.length > 0 
    ? ['USER\'S SAVED NOTES:', ...savedNotes.map(n => `- ${n}`), ''] 
    : [];

  const inputText = [
    'SYSTEM TEMPORAL CONTEXT:',
    `- Current Local Time: ${nowUser.toISO()} (${userTimezone})`,
    `- Current Day of Week: ${nowUser.toFormat('cccc')}`,
    `- Timezone: ${userTimezone}`,
    '',
    ...notesSection,
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
