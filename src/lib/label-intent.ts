/**
 * Deciding whether a reply to "what should I call this?" is actually a name.
 *
 * Kept free of database and env imports so every rule here is unit-testable.
 * The model makes the first call (label_reply / label_choice); these functions
 * are the deterministic backstop that stops a sentence like "remind me to
 * repair my watch" from ever being saved as a filename.
 */
import type {
  AssistantIntent,
  LabelChoice,
  ParsedAssistantResponse,
} from '../types/llm.types';

/** Waiting for the name of a stored, unlabeled file. */
export const LABEL_DOCUMENT = 'label_document';
/** Asked "do what you said, name the file, or something else?". */
export const LABEL_OR_REQUEST = 'label_or_request';
/**
 * The user tapped "Something else". Nothing is pending except the unnamed
 * file, which is re-asked about once their next message is handled.
 */
export const AWAITING_REQUEST = 'awaiting_request';

export const BUTTON_LABEL_REQUEST = 'lblreq';
export const BUTTON_LABEL_NAME = 'lblname';
export const BUTTON_LABEL_ELSE = 'lblelse';

const LABEL_BUTTON_ACTIONS = [BUTTON_LABEL_REQUEST, BUTTON_LABEL_NAME, BUTTON_LABEL_ELSE] as const;
type LabelButtonAction = (typeof LABEL_BUTTON_ACTIONS)[number];

/** Meta rejects a button whose title is longer than this. */
const BUTTON_TITLE_MAX = 20;

const MAX_LABEL_WORDS = 6;
const MAX_LABEL_CHARS = 60;
/** Upper bound on a name the user explicitly chose, however long. */
const MAX_CHOSEN_LABEL_CHARS = 100;

/** "call it X", "save this as X", "this is my X", "eta amar X". */
const LABEL_FILLER =
  /^(?:please\s+)?(?:call|name|label|save)\s+(?:it|this|that)(?:\s+as)?\s+|^(?:it'?s|its|this is|that is|eta|eita|oita)\s+(?:(?:my|amar)\s+)?/i;

/**
 * Words a request or question starts with. A label almost never does: nobody
 * names a file "set..." or "what...". Checked after the filler is stripped, so
 * "call it watch pic" is not caught by "call".
 */
const COMMAND_START =
  /^(?:remind|reminder|set|schedule|cancel|delete|remove|reschedule|move|push|change|show|list|send|give|share|save|note|add|call|text|message|book|what|what's|whats|when|where|who|why|how|which|do|does|did|is|are|am|can|could|will|would|should|i|i'm|im|i'll|ill|we|you|please|hey|hi|hello|thanks|thank|ok|okay|yes|yeah|no|nope|sure)\b/i;

/**
 * Signals of a request anywhere in the message: "remind me", Banglish and
 * Bangla imperatives, and a day or clock time. Bangla script has no \b word
 * boundaries in JS regex, so those alternatives are matched bare.
 */
const COMMAND_ANYWHERE =
  /\bremind me\b|\bmone kor|\b(?:koro|korio|koiro|koren|dio|diyo|dao|daw|pathao|pathan|dekhao|dekhaw|bolo)\b|মনে করি|করো|পাঠাও|দেখাও|\b(?:tomorrow|tonight|today|kalke|ajke|porshu)\b|\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i;

/** Anything aimed at a reminder or a note, which discarding must never touch. */
const REMINDER_SUBJECT =
  /\b(?:reminder|reminders|remind|reminding|alarm|meeting|meetings|appointment|schedule|event|note|notes)\b/i;

/** Explicitly getting rid of something, in English, Banglish and Bangla. */
const DISCARD_VERB =
  /\b(?:do\s*n[o']?t|don'?t|dont|never)\s+(?:save|keep|store)\b|\b(?:delete|remove|discard|erase|unsave)\b|\bno need to (?:save|keep|store)\b|save\s+ko?ro\s*na|rakho\s*na|muche\s+fel|delete\s+kor|সেভ\s*কোরো\s*না|মুছে/i;

const MISTAKE_PHRASE =
  /\b(?:by\s+)?mistake(?:nly)?\b|\bwrong (?:image|photo|file|one|pic)\b|\baccident(?:al|ally)?\b|bhul kore/i;

/** Confirms a mistake phrase is about the upload, not something else. */
const UPLOAD_WORD = /\b(?:save[d]?|keep|kept|upload(?:ed)?|sent|send|share[d]?|attach(?:ed)?)\b/i;

const INTENT_BUTTON_TITLES: Partial<Record<AssistantIntent, string>> = {
  create_reminder: 'Set reminder',
  clarification_required: 'Set reminder',
  reschedule_reminder: 'Move reminder',
  cancel_reminder: 'Cancel reminder',
  list_reminders: 'Show my schedule',
  save_note: 'Save note',
  list_documents: 'Show my files',
  send_documents: 'Send file',
  recall_memory: 'Answer that',
  cancel_subscription: 'Cancel plan',
};

/** "image" for photos, "file" for everything else. */
export function fileNoun(mediaType: string | null | undefined): string {
  return mediaType === 'image' ? 'image' : 'file';
}

/** Strips naming filler, wrapping quotes and trailing full stops. */
export function stripLabelFiller(text: string): string {
  return text
    .trim()
    .replace(LABEL_FILLER, '')
    .replace(/^["'*_`]+|["'*_`]+$/g, '')
    .replace(/[.!]+$/, '')
    .trim();
}

/** True when the message reads as a request or question rather than a name. */
export function hasCommandSignal(text: string): boolean {
  const stripped = stripLabelFiller(text);
  return (
    /\?\s*$/.test(text.trim()) || COMMAND_START.test(stripped) || COMMAND_ANYWHERE.test(stripped)
  );
}

/** A short noun phrase with no sign of being a request. */
export function looksLikeLabel(text: string): boolean {
  const label = stripLabelFiller(text);
  if (!label || label.length > MAX_LABEL_CHARS) return false;
  if (label.split(/\s+/).length > MAX_LABEL_WORDS) return false;
  return !hasCommandSignal(text);
}

export type LabelDecision = { kind: 'name'; label: string } | { kind: 'ask' };

/**
 * Whether a reply to "what should I call this?" is the name.
 *
 * `confirmed` is set when the user already said they want to name the file
 * (tapped "Name the image"). Their next message is then taken as the name, so
 * a label like "tomorrow's ticket" cannot loop them back into the question.
 */
export function decideLabelReply(
  parsed: Pick<ParsedAssistantResponse, 'intent' | 'label_reply' | 'document_label'>,
  userMessage: string,
  confirmed = false
): LabelDecision {
  const candidate = stripLabelFiller(parsed.document_label?.trim() || userMessage);

  if (confirmed) {
    if (parsed.label_reply === 'other_request' || !candidate) return { kind: 'ask' };
    return { kind: 'name', label: candidate.slice(0, MAX_CHOSEN_LABEL_CHARS) };
  }

  if (parsed.label_reply === 'name') {
    // The model's cleaned name must look like one, and the raw message must
    // not read as a command it happened to pull a noun out of.
    return looksLikeLabel(candidate) && !hasCommandSignal(userMessage)
      ? { kind: 'name', label: candidate }
      : { kind: 'ask' };
  }

  if (parsed.label_reply) return { kind: 'ask' };

  // No verdict: the model skipped the field. Only a reply that is nothing but
  // a name, and that the model did not read as an action, is taken.
  const passive = parsed.intent === 'save_document' || parsed.intent === 'general_reply';
  return passive && looksLikeLabel(candidate) ? { kind: 'name', label: candidate } : { kind: 'ask' };
}

/**
 * Asking for the file to be thrown away, rather than named.
 *
 * Deliberately narrow: this deletes data, so it needs an explicit discard verb
 * aimed at the file, or an admission of a mistaken upload. Anything naming a
 * reminder is a reminder request and is left well alone.
 */
export function looksLikeDiscard(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || REMINDER_SUBJECT.test(trimmed)) return false;
  if (DISCARD_VERB.test(trimmed)) return true;
  return MISTAKE_PHRASE.test(trimmed) && UPLOAD_WORD.test(trimmed);
}

/** What the user picked after "do that, name the file, or something else?". */
export function resolveLabelChoice(
  parsed: Pick<ParsedAssistantResponse, 'label_choice'>,
  isAffirmative: boolean,
  isDiscard = false
): LabelChoice {
  // The plain reading of "delete it" wins over the model's verdict: the cost
  // of getting this wrong is saving a file they asked you to throw away.
  if (isDiscard) return 'discard';
  if (parsed.label_choice) return parsed.label_choice;
  // No verdict. A bare "yes" to a question that led with their own request
  // most plausibly agrees to that request; anything else is handled fresh.
  return isAffirmative ? 'do_request' : 'something_else';
}

/** Button title for the request, or null when there is nothing to offer. */
export function requestButtonTitle(
  parsed: Pick<ParsedAssistantResponse, 'intent' | 'request_button_title'>
): string | null {
  const fromModel = parsed.request_button_title?.trim();
  if (fromModel && fromModel.length <= BUTTON_TITLE_MAX) return fromModel;
  return INTENT_BUTTON_TITLES[parsed.intent] ?? null;
}

/** "Set reminder" / "Name the image" / "Something else". */
export function labelChoiceButtons(
  documentId: string,
  requestTitle: string | null,
  mediaType: string | null | undefined
): Array<{ id: string; title: string }> {
  const buttons: Array<{ id: string; title: string }> = [];
  const title = requestTitle?.trim();

  if (title) {
    buttons.push({ id: `${BUTTON_LABEL_REQUEST}:${documentId}`, title: title.slice(0, BUTTON_TITLE_MAX) });
  }
  buttons.push({ id: `${BUTTON_LABEL_NAME}:${documentId}`, title: `Name the ${fileNoun(mediaType)}` });
  buttons.push({ id: `${BUTTON_LABEL_ELSE}:${documentId}`, title: 'Something else' });

  return buttons;
}

/** Splits a label-choice button id, or null for any other button. */
export function parseLabelButton(
  buttonReplyId: string
): { action: LabelButtonAction; documentId: string } | null {
  const [action, documentId] = buttonReplyId.split(':');
  if (!documentId || !(LABEL_BUTTON_ACTIONS as readonly string[]).includes(action)) return null;
  return { action: action as LabelButtonAction, documentId };
}

/**
 * A name the user gave when choosing to name the file, or null when what they
 * said only points at the file ("name the image") rather than naming it.
 */
export function chosenLabel(label: string | null | undefined): string | null {
  const cleaned = stripLabelFiller(label ?? '');
  if (!cleaned) return null;
  if (/^(?:the\s+)?(?:it|this|that|image|file|photo|picture|pic|document|doc)$/i.test(cleaned)) {
    return null;
  }
  return cleaned.slice(0, MAX_CHOSEN_LABEL_CHARS);
}

/** Used when the model gave no question of its own. */
export function labelClarificationFallback(
  userMessage: string,
  mediaType: string | null | undefined,
  offerRequest: boolean
): string {
  const said = userMessage.trim();
  const quoted = said.length > 120 ? `${said.slice(0, 117)}...` : said;
  const noun = fileNoun(mediaType);
  return offerRequest
    ? `Got it, you said "${quoted}". Do you want me to do that, name the ${noun} you shared, or something else?`
    : `Got it, you said "${quoted}". Is that the name for the ${noun} you shared, or did you mean something else?`;
}

/**
 * The PENDING CONTEXT line for the prompt.
 *
 * The raw pending data for a naming question is just a document id, which
 * tells the model nothing. These say in words what the bot is waiting for.
 */
export function describePendingContext(
  pendingIntent: string | null | undefined,
  pendingData: unknown
): string | null {
  const data = (pendingData && typeof pendingData === 'object' ? pendingData : {}) as Record<
    string,
    unknown
  >;
  const noun = fileNoun(typeof data.mediaType === 'string' ? data.mediaType : null);

  if (pendingIntent === LABEL_DOCUMENT) {
    return (
      `PENDING CONTEXT: You just asked the user what to call the ${noun} they sent. ` +
      `You are waiting for its name. Set "label_reply" for USER MESSAGE.` +
      (data.confirmed
        ? ' They already said they want to name it, so USER MESSAGE is the name unless it is plainly a different request.'
        : '')
    );
  }

  if (pendingIntent === LABEL_OR_REQUEST) {
    const original = typeof data.originalMessage === 'string' ? data.originalMessage : '';
    return (
      `PENDING CONTEXT: The user sent a ${noun} and you asked what to call it. ` +
      `Instead of a name they said: ${JSON.stringify(original)}. ` +
      `You asked whether they want you to do that, name the ${noun}, or something else. ` +
      `USER MESSAGE is their answer. Set "label_choice".`
    );
  }

  if (pendingIntent === AWAITING_REQUEST) {
    return 'PENDING CONTEXT: You asked the user what they would like to do. Handle USER MESSAGE normally.';
  }

  if (!pendingData) return null;

  // Internal bookkeeping for the re-ask, not something the model should reason about.
  const { deferredDocumentId: _deferred, ...rest } = data;
  return `PENDING CONTEXT: ${JSON.stringify(typeof pendingData === 'object' ? rest : pendingData)}`;
}
