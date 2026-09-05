# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: everyday WhatsApp users in Bangladesh who think and type in a mix of Bangla, Banglish (Romanized Bengali), and English. They already live in WhatsApp all day; they do not want to install, learn, or sign up for a reminder app. Typical job: capture a thing they must not forget in the two seconds they have — a medicine dose, a call to a relative, an oven, a payment — while already in a chat thread.

Secondary (confirmed by the page's existing framing): the same behavior anywhere else in the world, in English. Bangladesh-first, globally readable.

## Product Purpose

Remique turns a plain WhatsApp message into a scheduled reminder that fires back on WhatsApp at the right moment. Success = the user sends one natural sentence, gets a confirmation in seconds, and receives the reminder on time, without ever leaving WhatsApp.

## Positioning

The mechanism a neighbor could not truthfully copy: natural-language reminder parsing tuned specifically for Bangla / Banglish / Bengali-script temporal idiom, running inside WhatsApp with zero install and zero account. The parser carries an explicit Bangladeshi time model — `kalke`, `porshu`, `shokal` → 09:00, `dupur` → 14:00, `bikal` → 17:00, `shondha` → 19:30, `raat` → 21:00, `X ghonta por` — and replies in the same language and script the user wrote in.

## Operating Context

- Entry point is a WhatsApp thread with the bot number **+880 1853-501469** (`https://wa.me/8801853501469?text=Hi`). No web app, no dashboard, no login.
- Timezone default `Asia/Dhaka` (UTC+6).
- Interaction is pure chat: create, list ("amr reminder gula dekhaw" / "show my reminders"), cancel, and a clarification turn when the user gives a task but no time.
- The landing page's only job is to get a first-time visitor into that WhatsApp thread.

## Capabilities and Constraints

Confirmed capabilities (from source):
- Intents: `create_reminder`, `list_reminders`, `cancel_reminder`, `clarification_required`, `unknown`.
- Language: English, Banglish, Bengali script — including mixed input; confirmation is returned in the user's own language/script.
- Relative and absolute time ("in 30 minutes", "next Friday at 3 PM", "kalke shokal 10 tay").
- Clarification round-trip when time is missing.
- Parsing by OpenAI (`openai`, model `gpt-5-nano`, env-overridable), delivery scheduled through Upstash QStash, storage in Postgres via Prisma, inbound webhooks verified with Meta's HMAC signature.

Constraints:
- Free to use; no account, no pricing tier exists.
- Next.js 15 App Router, React 19, Tailwind 3. The landing page is a single server component at `src/app/page.tsx`.

## Brand Commitments

- Name: **Remique**. Bell mark (🔔) currently used as the logo glyph; not a locked asset.
- Tagline in use: "AI-powered WhatsApp reminder assistant. Built in Bangladesh."
- No locked logo file, no brand palette, no type commitment. The WhatsApp green currently in the code is platform-derived, not a chosen brand color — the user has approved replacing the visual world entirely.
- Voice: direct, friendly, bilingual-comfortable. Never corporate.
- **Standing aesthetic preference (confirmed 2026-09-02, after four re-rolls of concept directions):** the user declined every metaphor-led visual world on two grounds — too conceptual, and too risky to ship to a real user opening it on a phone. The commitment is the conventional modern-SaaS arrangement executed at a named craft bar: **Stripe, Notion, Framer** — bright and spacious, confident typography, colourful illustrative moments, expensive and friendly. Future surfaces inherit this: distinct through craft and detail, not through an adopted foreign visual world.

## Evidence on Hand

- Real: the bot number, the wa.me link, the actual parsing behavior and confirmation strings (mirrored from `src/lib/llm.ts`), the real stack (OpenAI, QStash, Meta HMAC).
- The three demo conversations on the landing page are authored illustrations of real behavior, not transcripts of real users.
- **Absent — must not be fabricated:** user counts, testimonials, reviews, uptime/SLA numbers, press, funding, delivery-rate statistics, partner logos.

## Product Principles

1. Zero friction is the product. Anything that implies install, signup, or configuration is a lie about Remique.
2. The language wedge is the proof. Showing Banglish understood correctly beats any adjective about "AI".
3. Confirmations are instant and in the user's own words — the product speaks back the way the user spoke.
4. Never invent commercial or scale claims; the page has behavior to show, not numbers to quote.

## Accessibility & Inclusion

Mixed-script content (Latin + Bengali) must render with correct `lang` attribution and a font stack that carries Bengali glyphs. Audience is heavily mobile, often on modest devices and networks — page weight and touch-target size are product requirements, not polish.
