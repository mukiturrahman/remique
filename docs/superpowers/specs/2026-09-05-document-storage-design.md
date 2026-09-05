# Document Storage & Natural-Language Retrieval

**Date:** 2026-09-05
**Status:** Approved, in implementation

## Problem

Remique is text-only. `message.type !== 'text'` is hard-dropped in both the
webhook Lambda and the SQS worker, so an image sent to the bot never reaches the
database at all. Users want to hand the bot a file in natural language ("save
this as a dollar document") and get it back later by asking for it in natural
language ("what dollar documents do I have?").

## Decisions

Three forks were settled before design:

1. **Matching is label-only.** No vision model reads the image. Retrieval
   matches against the label the user supplied at save time. Cheapest path;
   the tradeoff is that a mislabeled document is unfindable.
2. **Bytes live in S3** (`ap-southeast-1`, private bucket). Not Postgres — the
   Neon project is free tier with a 512 MB logical branch limit. Not Meta media
   IDs — those expire after roughly 30 days, so documents would silently rot.
3. **Retrieval lists before it sends.** A query replies with a numbered list;
   the user then asks for specific items. Prevents a broad query from firing a
   dozen media uploads and hitting Meta throughput limits.

Two further calls made from existing codebase patterns rather than asked:

- A bare image with no caption parks in `ConversationState` (15-minute expiry),
  mirroring the existing `clarification_required` flow.
- WhatsApp `document` type (PDF etc.) is accepted alongside `image`; it is the
  identical Meta media API.

## Data model

New `Document` model. `label` is nullable so bytes can be stored before the
name exists — the two-turn flow needs a row to attach the pending label to.

```prisma
model Document {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  label     String?                        // null = awaiting label
  mediaType String   @map("media_type")    // "image" | "document"
  mimeType  String   @map("mime_type")
  fileName  String?  @map("file_name")
  s3Key     String   @map("s3_key")
  sizeBytes Int      @map("size_bytes")
  createdAt DateTime @default(now()) @map("created_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@map("documents")
}
```

Plus `documents Document[]` on `User`, and four nullable media columns on
`Message` (`mediaId`, `mediaType`, `mediaMimeType`, `mediaFilename`) so the
pipeline reads media off the claimed row instead of re-parsing the raw payload.

Additive only. No existing column is altered. Applied with `prisma db push`.

## Ingest

`src/aws/webhook/index.ts` and `src/aws/worker/index.ts` both widen their drop
condition from `!== 'text'` to an allowlist of `text | image | document`.
Everything else (delivery receipts, reactions) is still ignored with a 200.

The webhook change ships as its own commit ahead of everything else: it is the
live ingress for text reminders, so a mistake there breaks the working product,
not just the new feature. SQS `MessageGroupId` and `MessageDeduplicationId`
logic is unchanged — `message.id` and `message.from` are present on all types.

The worker extracts `message.image` / `message.document` (`id`, `mime_type`,
`filename`, `caption`) and passes them to `claimInboundMessage`. `messageText`
becomes the caption, or `''` when absent.

## Modules

**`src/lib/whatsapp-media.ts`** — `getMediaUrl(mediaId)` resolves Meta's media
ID to a short-lived URL; `downloadMedia(url)` fetches it. Both require the
bearer token; the download URL is not public. Errors reuse `WhatsAppApiError`
so an expired token classifies as `operator` and the message stays replayable
rather than losing the document. Hard cap 20 MB.

**`src/lib/storage.ts`** — `putDocument()` writes to
`documents/{userId}/{uuid}.{ext}`; `getDocumentUrl()` returns a presigned GET
with a 15-minute TTL. Meta fetches that URL server-side when sending media back.

**`src/lib/whatsapp.ts`** — gains `sendWhatsAppMedia()`. `postToWhatsApp` is
already generic over its payload, so this is a thin addition.

## Intents

Three new intents (`save_document`, `list_documents`, `send_documents`) and two
schema fields (`document_label`, `document_indices`).

Matching reuses the pattern notes already use: the user's document labels are
injected into the prompt as a compact numbered list, and the model returns
**indices rather than UUIDs**, which removes any chance of id hallucination.
Candidates are capped at the 100 most recent.

`list_documents` writes the ordered result ids into `ConversationState` so a
follow-up "send me 2" resolves against the list actually shown. With no state,
a send request is treated as a fresh query.

## Pipeline

`processIncomingUserMessage()` changes from `(user, userMessage: string, state)`
to `(user, message: PipelineMessage, state)`. It needs the media fields, and
taking the message is the correct boundary — threading a fifth positional
parameter would be worse. Two call sites.

New Flows G/H/I in `reminder-service.ts` alongside existing A–F.

## Orphan cleanup

An image sent and never labeled would leave a row and an S3 object costing
money forever. `/api/jobs/sweep` gains one pass: delete unlabeled documents
older than 24 hours, DB row and S3 object together. This fits the existing
recovery-pass shape, where every branch exists because a primary path can fail.

## Testing

`npm test` is currently dead — it points at a `tests/` directory that does not
exist, and the glob is unquoted. Both are fixed. New tests are pure units with
no network: index-to-id mapping, media-type allowlist, S3 key generation, and
the LLM schema contract.

## Manual infrastructure

Not automatable from here; requires console/IAM access.

1. Private S3 bucket in `ap-southeast-1`, Block Public Access ON.
2. Worker Lambda role: `s3:PutObject` + `s3:GetObject` on the bucket's `/*`.
3. Worker Lambda env: `S3_BUCKET_DOCUMENTS`.
4. Raise worker Lambda timeout to 120s and SQS visibility timeout to 180s.
   Both currently sit at 60s; media download plus S3 put plus OpenAI plus send
   will push p99 past that, and timing out at exactly the visibility boundary
   causes duplicate processing.
5. `npm run build:aws`, re-upload both zips.

## Risks

- The webhook change touches live ingress for all messages, not just documents.
- Label-only matching makes a mislabeled document unfindable. This is the first
  thing to revisit if retrieval disappoints.
- `@aws-sdk/client-s3` must stay out of the Next.js bundle; document flows run
  only in the worker Lambda.
