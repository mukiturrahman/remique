import { DateTime } from 'luxon';
import { env } from './env';
import { GeminiReminderOutput } from '../types/gemini.types';

export async function parseReminderWithGemini(
  userMessage: string,
  userTimezone: string = 'Asia/Dhaka',
  pendingContext?: any
): Promise<GeminiReminderOutput> {
  const nowUser = DateTime.now().setZone(userTimezone);
  const currentIso = nowUser.toISO();
  const currentDay = nowUser.toFormat('cccc');

  const systemInstructionText = `
You are Remique, an expert, high-precision reminder parser for a WhatsApp assistant in Bangladesh.
Your sole job is to extract structured reminder parameters from the user's message in English, Banglish (Romanized Bengali), or Bengali script.

SYSTEM TEMPORAL CONTEXT:
- Current Local Time: ${currentIso} (${userTimezone})
- Current Day of Week: ${currentDay}
- Timezone: ${userTimezone} (UTC+6)

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
   - "list_reminders": User wants to see active reminders (e.g. "amr reminder gula dekhaw", "show my reminders").
   - "cancel_reminder": User wants to cancel a reminder.
   - "clarification_required": User provided a task but omitted the time or date.
   - "unknown": Chit-chat or unrecognized text.

2. Date & Time Parsing:
   - Normalize to an absolute ISO-8601 string (YYYY-MM-DDTHH:mm:ss) in ${userTimezone} timezone.
   - If only date is provided (e.g. "Kalke Aovin k call dite mone koriye dio"), set needs_clarification: true, missing_fields: ["time"], and ask a natural question in the user's language (e.g. "Sure! Kalke kon shomoy reminder dibo?").

3. Title Extraction:
   - Extract the core task and remove command preambles ("Remind me to", "Mone koriye dio", "Reminder dao").
   - E.g., "Kalke shokal 10 tay Aovin k call dite mone koriye dio" -> Title: "Call Aovin".

4. Confirmation Phrase:
   - Generate a short, polite confirmation matching the user's input language/script:
   - English: "Done! 🔔 Remique will remind you tomorrow at 10:00 AM to Call Aovin."
   - Banglish: "Done! 🔔 Kalke shokal 10:00 AM e Call Aovin er reminder pathiye dibo."
   - Bengali: "ঠিক আছে! 🔔 আগামীকাল সকাল ১০:০০ টায় আপনাকে Call Aovin এর কথা মনে করিয়ে দেওয়া হবে।"
`;

  const contentsText = pendingContext
    ? `PENDING CONTEXT: ${JSON.stringify(pendingContext)}\nNEW USER MESSAGE: "${userMessage}"`
    : `USER MESSAGE: "${userMessage}"`;

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstructionText }],
    },
    contents: [
      {
        parts: [{ text: contentsText }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          intent: {
            type: 'STRING',
            enum: ['create_reminder', 'list_reminders', 'cancel_reminder', 'clarification_required', 'unknown'],
          },
          title: { type: 'STRING', nullable: true },
          scheduled_iso: { type: 'STRING', nullable: true },
          timezone: { type: 'STRING' },
          recurrence: { type: 'STRING', nullable: true },
          needs_clarification: { type: 'BOOLEAN' },
          missing_fields: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            nullable: true,
          },
          clarification_question: { type: 'STRING', nullable: true },
          confirmation_phrase: { type: 'STRING', nullable: true },
        },
        required: ['intent', 'needs_clarification', 'timezone'],
      },
    },
  };

  try {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': env.GEMINI_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error:', errText);
      return {
        intent: 'unknown',
        timezone: userTimezone,
        needs_clarification: false,
      };
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return {
        intent: 'unknown',
        timezone: userTimezone,
        needs_clarification: false,
      };
    }

    return JSON.parse(rawText) as GeminiReminderOutput;
  } catch (error: any) {
    console.error('Gemini extraction error:', error);
    return {
      intent: 'unknown',
      timezone: userTimezone,
      needs_clarification: false,
    };
  }
}
