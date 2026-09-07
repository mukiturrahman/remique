import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { HeroRotator } from "@/components/hero-rotator";
import { WhatsAppMockup, type ChatMessage } from "@/components/whatsapp-mockup";
import { HomeFaq } from "@/components/home-faq";
import { HomePricing } from "@/components/home-pricing";
import { IconArrow, IconCheck, MarkWhatsApp } from "@/components/icons";

/* ── DATA ──────────────────────────────────────────────────────────── */

const HERO_CHAT: ChatMessage[] = [
  { text: "todo প্রিয়ার জন্য গিফট কিনো 🎁", from: "user", time: "9:14 AM" },
  { text: "✅ তোমার লিস্টে যোগ হয়েছে: **প্রিয়ার জন্য গিফট কেনা** (#3)", from: "bot", time: "9:14 AM" },
  { text: "note রাজ ৬টার পরে কল পছন্দ করে", from: "user", time: "9:15 AM" },
  { text: "📝 সেভ হয়েছে। যেকোনো সময় বলো **রাজ-এর নোটস**।", from: "bot", time: "9:15 AM" },
  { text: "actually গিফট-এর কাজটা শুক্রবারে করো", from: "user", time: "9:16 AM" },
  { text: "✏️ আপডেট: **প্রিয়ার জন্য গিফট কেনা**, শুক্রবারের মধ্যে।", from: "bot", time: "9:16 AM" },
];

const LANGUAGE_EXAMPLES = [
  { lang: "Bangla", script: "bn" as const, text: "কালকে সকালে ওষুধ খেতে মনে করিয়ে দিও" },
  { lang: "Banglish", script: "en" as const, text: "kalke shokal e medicine khete bolo" },
  { lang: "English", script: "en" as const, text: "remind me tomorrow morning to take medicine" },
];

const ACCOUNTABILITY_CHAT: ChatMessage[] = [
  { text: "🌅 শুভ সকাল! আজকের প্ল্যান:\n\n• সকাল ৮টা — ওষুধ খাওয়া\n• সকাল ১০টা — ডাক্তারের অ্যাপয়েন্টমেন্ট\n• বিকাল ৫টা — স্টক চেক", from: "bot", time: "7:00 AM" },
  { text: "ধন্যবাদ! ডাক্তারের টা ১১টায় করো", from: "user", time: "7:02 AM" },
  { text: "✏️ আপডেট: **ডাক্তারের অ্যাপয়েন্টমেন্ট** এখন সকাল ১১:০০ টায়।", from: "bot", time: "7:02 AM" },
];

const BRIEFING_CHAT: ChatMessage[] = [
  { text: "📋 আজকের সামারি:\n\n✅ ওষুধ খাওয়া — done\n⏰ ডাক্তারের অ্যাপয়েন্টমেন্ট — ১১:০০ AM\n⏰ স্টক চেক — ৫:০০ PM\n📝 ২টা নোট সেভ করা আছে", from: "bot", time: "6:30 PM" },
  { text: "স্টক চেক done", from: "user", time: "6:31 PM" },
  { text: "✅ মার্ক করা হয়েছে: **স্টক চেক** — done!", from: "bot", time: "6:31 PM" },
];

const REVIEWS = [
  {
    name: "সাবরিনা",
    role: "Medical Student",
    text: "আমি প্রতিদিন ওষুধ খেতে ভুলে যেতাম। Remique দিয়ে একবার সেট করেছি, এখন প্রতিদিন সময়মতো মনে করিয়ে দেয়।",
    lang: "bn" as const,
  },
  {
    name: "Kamal",
    role: "Small Business Owner",
    text: "I run a shop and have 15 things to remember daily. Remique handles stock checks, supplier calls, and payment reminders. Better than any to-do app.",
    lang: "en" as const,
  },
  {
    name: "ফারজানা",
    role: "Working Mother",
    text: "বাচ্চার স্কুলের ফি, ডাক্তারের অ্যাপয়েন্টমেন্ট, বিদ্যুৎ বিল — সব Remique-এ সেট করে রেখেছি। মাথা থেকে চিন্তা নেমে গেছে।",
    lang: "bn" as const,
  },
];

const ALL_FEATURES = [
  { num: 1, title: "Instant confirmation", desc: "Reply comes back in seconds, in your language." },
  { num: 2, title: "Exact time resolution", desc: "\"kalke shokal 10 tay\" becomes one timestamp." },
  { num: 3, title: "Recurring reminders", desc: "Daily, weekly, monthly — describe it in words." },
  { num: 4, title: "Follow-up nudges", desc: "Missed one? Remique sends it again." },
  { num: 5, title: "Save notes and links", desc: "Say \"note\" and Remique saves it for later." },
  { num: 6, title: "Daily briefing", desc: "Morning plan + evening summary." },
  { num: 7, title: "Task management", desc: "To-do lists managed in plain words." },
  { num: 8, title: "Multi-language", desc: "Bangla, Banglish, English — or mixed." },
  { num: 9, title: "Signature verification", desc: "Every message verified via Meta HMAC." },
  { num: 10, title: "Action from images", desc: "Send a photo, Remique extracts the task." },
  { num: 11, title: "Priority delivery", desc: "Pro reminders fire through a priority queue." },
  { num: 12, title: "Early access", desc: "New features ship to Pro first." },
];

/* ── HELPERS ────────────────────────────────────────────────────────── */

function CtaLink({
  href,
  children,
  tone = "brand",
}: {
  href: string;
  children: React.ReactNode;
  tone?: "brand" | "light" | "outline";
}) {
  const styles = {
    brand:
      "bg-brand text-white shadow-lift hover:bg-brand-deep hover:shadow-panel active:shadow-press",
    light:
      "bg-white text-brand-deep shadow-lift hover:bg-ground-2 hover:shadow-panel active:shadow-press",
    outline:
      "border border-line bg-ground text-ink shadow-lift hover:shadow-panel",
  } as const;

  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2.5 rounded-full px-6 py-3.5 font-display text-[16px] font-semibold tracking-tight transition-all duration-200 active:translate-y-px ${styles[tone]}`}
    >
      {children}
      <IconArrow className="h-[17px] w-[17px] transition-transform duration-300 ease-out group-hover:translate-x-1" />
    </Link>
  );
}

function Stars() {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-4 w-4 text-[#F59E0B]" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/* ── PAGE ───────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <main className="bg-ground">
      <Navbar />

      {/* ── 1. HERO ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(80%_65%_at_18%_0%,var(--brand-tint)_0%,transparent_62%)]"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:pb-32 lg:pt-24">
          <div>
            <h1 className="max-w-[20ch] text-balance font-display text-[clamp(2.5rem,5.4vw,4.05rem)] font-semibold leading-[1.05] tracking-display text-ink">
              Never forget{" "}
              <HeroRotator />
              {" "}again.
            </h1>
            <p className="mt-7 max-w-[48ch] text-[clamp(1.05rem,1.6vw,1.2rem)] leading-relaxed text-ink-2">
              Remique is a WhatsApp AI assistant that remembers for you.
              Text it naturally — in English, Banglish, or{" "}
              <span lang="bn" className="font-bn font-medium text-ink">বাংলা</span>.
              It confirms, schedules, and reminds. You move on.
            </p>
            <div className="mt-5 flex items-center gap-3 text-[14.5px] text-ink-3">
              <span className="inline-flex items-center gap-1.5">
                <MarkWhatsApp className="h-4 w-4 text-ink-3" />
                Works on WhatsApp
              </span>
              <span className="text-line-strong">·</span>
              <span>No app to install</span>
            </div>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <CtaLink href="/pricing">Start for free</CtaLink>
              <CtaLink href="/how-it-works" tone="outline">How it works</CtaLink>
            </div>
          </div>
          <WhatsAppMockup
            messages={HERO_CHAT}
            accentText="your brain, off the hook"
            className="lg:pl-2"
          />
        </div>
      </section>

      {/* ── 2. LANGUAGE STRIP ────────────────────────────────────────── */}
      <section className="border-y border-line bg-ground-2">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center sm:px-8">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
            Celebrating Bangladesh
          </p>
          <h2 className="mx-auto mt-4 max-w-[20ch] text-balance font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-[1.08] tracking-display text-ink">
            Say it the way it comes to you. Any language.
          </h2>
          <p className="mx-auto mt-5 max-w-[52ch] text-[16px] leading-relaxed text-ink-2">
            Remique understands Bengali script, Banglish transliteration, and plain English — or all three mixed in one sentence.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {LANGUAGE_EXAMPLES.map((ex) => (
              <div key={ex.lang} className="rounded-2xl border border-line bg-ground px-5 py-4 text-left shadow-lift">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-brand">{ex.lang}</p>
                <p
                  lang={ex.script === "bn" ? "bn" : undefined}
                  className={`mt-2 text-[15px] leading-snug text-ink ${ex.script === "bn" ? "font-bn" : ""}`}
                >
                  {ex.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. HOW IT WORKS ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="text-center">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
            How it works
          </p>
          <h2 className="mx-auto mt-4 max-w-[22ch] text-balance font-display text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.04] tracking-display text-ink">
            Three steps. The third one is doing nothing.
          </h2>
          <p className="mx-auto mt-5 max-w-[48ch] text-[17px] leading-relaxed text-ink-2">
            No signup, no tutorial, no learning curve. Text Remique like a friend.
          </p>
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {[
            {
              step: "Step 1",
              title: "Send it like a text",
              desc: "Open WhatsApp. Type your reminder the way you actually think. No format, no slash command, no date picker.",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-brand">
                  <path d="M4.75 19.25V4.75a2 2 0 0 1 2-2h10.5a2 2 0 0 1 2 2v14.5l-3.75-2.5-3.5 2.5-3.5-2.5-3.75 2.5Z" />
                  <path d="M9 8.75h6M9 12.25h4" />
                </svg>
              ),
            },
            {
              step: "Step 2",
              title: "Bot already read between the lines",
              desc: "Remique reads your Bangla, Banglish, or English and extracts task + time. Confirms back in your language.",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-brand">
                  <circle cx="12" cy="12" r="9.25" />
                  <path d="m8.5 12.5 2.5 2.5 5-5" />
                </svg>
              ),
            },
            {
              step: "Step 3",
              title: "Forget it. Completely.",
              desc: "Remique delivers your reminder at the exact time, right inside WhatsApp. You do not need to remember anything.",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-brand">
                  <path d="M6.5 10.25a5.5 5.5 0 0 1 11 0c0 3.6.9 5.1 1.75 6.1H4.75c.85-1 1.75-2.5 1.75-6.1Z" />
                  <path d="M10 19.25a2.25 2.25 0 0 0 4 0" />
                </svg>
              ),
            },
          ].map((s) => (
            <div key={s.step} className="rounded-2xl border border-line bg-ground-2 p-6">
              <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-brand-tint">
                {s.icon}
              </span>
              <p className="mt-5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">{s.step}</p>
              <h3 className="mt-2 font-display text-[20px] font-semibold tracking-tight text-ink">{s.title}</h3>
              <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <CtaLink href="/how-it-works">Learn more</CtaLink>
        </div>
      </section>

      {/* ── 4. PROBLEM ───────────────────────────────────────────────── */}
      <section className="border-y border-line bg-ground-2">
        <div className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 lg:py-28">
          <h2 className="mx-auto max-w-[20ch] text-balance font-display text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.04] tracking-display text-ink">
            Every reminder app fails the same way: you stop opening it.
          </h2>
          <p className="mx-auto mt-6 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
            Notification-based reminders depend on you opening another app, checking another list, clearing another badge. Remique lives where you already are — WhatsApp.
          </p>
          <div className="mt-10 grid gap-6 text-left sm:grid-cols-3">
            {[
              { title: "Other apps need you to open them.", body: "Calendar alerts, to-do lists, phone alarms — they all assume you will switch apps. You won't." },
              { title: "Notifications get swiped away.", body: "A push notification competes with fifty others. A WhatsApp message sits in the chat you already check thirty times a day." },
              { title: "You already text yourself reminders.", body: "Pinned chats, starred messages, notes in WhatsApp — you are already using it as a to-do list. Remique just makes it work." },
            ].map((p) => (
              <div key={p.title} className="rounded-2xl border border-line bg-ground p-6">
                <h3 className="font-display text-[17px] font-semibold tracking-tight text-ink">{p.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. FEATURE: ACCOUNTABILITY COACH ─────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">Say so, done</p>
            <h2 className="mt-4 max-w-[18ch] text-balance font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-[1.08] tracking-display text-ink">
              An accountability coach that texts you twice a day.
            </h2>
            <p className="mt-5 max-w-[46ch] text-[16px] leading-relaxed text-ink-2">
              Morning briefing at the start. Evening summary at the end. Remique keeps your day on track with two messages — one to plan, one to review.
            </p>
            <div className="mt-8">
              <CtaLink href="/how-it-works">See how</CtaLink>
            </div>
          </div>
          <WhatsAppMockup messages={ACCOUNTABILITY_CHAT} accentText="plan it, forget it" />
        </div>
      </section>

      {/* ── 6. FEATURE: DAILY BRIEFING ───────────────────────────────── */}
      <section className="border-y border-line bg-ground-2">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="order-2 lg:order-1">
              <WhatsAppMockup messages={BRIEFING_CHAT} accentText="the whole day, one glance" />
            </div>
            <div className="order-1 lg:order-2">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">Daily briefing</p>
              <h2 className="mt-4 max-w-[18ch] text-balance font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-[1.08] tracking-display text-ink">
                Your whole day in one message. Before it happens.
              </h2>
              <p className="mt-5 max-w-[46ch] text-[16px] leading-relaxed text-ink-2">
                Every morning, Remique sends you what is coming. Every evening, what got done and what did not. All in one clean message.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. FEATURE: CHASE MODE ───────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="text-center">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">Chase mode</p>
          <h2 className="mx-auto mt-4 max-w-[22ch] text-balance font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-[1.08] tracking-display text-ink">
            Whatever you do, something needs chasing.
          </h2>
          <p className="mx-auto mt-5 max-w-[52ch] text-[16px] leading-relaxed text-ink-2">
            Recurring tasks, follow-ups, to-do lists, saved notes — Remique handles the stuff that slips through the cracks.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Recurring reminders", desc: "\"Protidin bikal 5 tay stock check\" — repeats on any schedule you describe." },
            { title: "Follow-up nudges", desc: "Missed a reminder? Remique sends it again. And again." },
            { title: "Task management", desc: "Say \"todo\" to add, \"done\" to check off, \"list\" to read back." },
            { title: "Notes and memory", desc: "\"Note Raj prefers calls after 6pm\" — recalled weeks later in one message." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-line bg-ground-2 p-5">
              <h3 className="font-display text-[16px] font-semibold tracking-tight text-ink">{f.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <CtaLink href="/how-it-works">See all features</CtaLink>
        </div>
      </section>

      {/* ── 8. TESTIMONIALS ──────────────────────────────────────────── */}
      <section className="border-y border-line bg-ground-2">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="text-center">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">Testimonials</p>
            <h2 className="mx-auto mt-4 max-w-[22ch] text-balance font-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.04] tracking-display text-ink">
              Rated five stars by people who used to forget things.
            </h2>
            <p className="mx-auto mt-5 max-w-[48ch] text-[17px] leading-relaxed text-ink-2">
              Real people, real reminders, real relief.
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {REVIEWS.map((r) => {
              const isBn = r.lang === "bn";
              return (
                <div key={r.name} className="flex flex-col rounded-2xl border border-line bg-ground p-6">
                  <Stars />
                  <p
                    lang={isBn ? "bn" : undefined}
                    className={`mt-4 flex-1 text-[15px] leading-relaxed text-ink-2 ${isBn ? "font-bn" : ""}`}
                  >
                    &ldquo;{r.text}&rdquo;
                  </p>
                  <div className="mt-5 flex items-center gap-3 border-t border-line pt-5">
                    <span className="inline-grid h-9 w-9 place-items-center rounded-full bg-brand-tint font-display text-[13px] font-semibold text-brand">
                      {r.name[0]}
                    </span>
                    <div>
                      <p lang={isBn ? "bn" : undefined} className={`text-[14px] font-semibold text-ink ${isBn ? "font-bn" : ""}`}>{r.name}</p>
                      <p className="text-[13px] text-ink-3">{r.role}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-10 text-center">
            <CtaLink href="/testimonials" tone="outline">Read more reviews</CtaLink>
          </div>
        </div>
      </section>

      {/* ── 9. PRICING ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="text-center">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">Pricing</p>
          <h2 className="mx-auto mt-4 max-w-[22ch] text-balance font-display text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.04] tracking-display text-ink">
            Cheaper than the late fee it saves you.
          </h2>
          <p className="mx-auto mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
            No card, no hassle. Subscribe with bKash and start using Remique in under a minute.
          </p>
        </div>
        <HomePricing />
        <div className="mt-10 text-center">
          <CtaLink href="/pricing">See full pricing</CtaLink>
        </div>
      </section>

      {/* ── 10. FEATURE GRID ─────────────────────────────────────────── */}
      <section className="border-y border-line bg-ground-2">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <h2 className="text-center font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-[1.08] tracking-display text-ink">
            Everything you get, in full.
          </h2>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ALL_FEATURES.map((f) => (
              <div key={f.num} className="flex gap-4 rounded-2xl border border-line bg-ground p-5">
                <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-tint font-mono text-[13px] font-semibold text-brand">
                  {f.num}
                </span>
                <div>
                  <h3 className="font-display text-[15px] font-semibold tracking-tight text-ink">{f.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 11. GREEN CTA BANNER ─────────────────────────────────────── */}
      <section className="px-5 py-20 sm:px-8 lg:py-28">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-[linear-gradient(158deg,var(--brand)_0%,var(--brand-deep)_58%)] px-6 py-20 text-center sm:px-12 lg:py-28">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-70 mix-blend-soft-light bg-[radial-gradient(120%_120%_at_50%_-10%,rgba(255,255,255,0.5)_0%,transparent_55%)]"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-[16ch] text-balance font-display text-[clamp(2.1rem,4.4vw,3.5rem)] font-semibold leading-[1.02] tracking-display text-white">
              Your memory has a backup now.
            </h2>
            <p className="mx-auto mt-6 max-w-[44ch] text-[17px] leading-relaxed text-brand-tint">
              Pick a plan, pay with bKash, and start texting Remique. That is the whole setup.
            </p>
            <div className="mt-10 flex flex-col items-center gap-5">
              <CtaLink href="/pricing" tone="light">See plans</CtaLink>
              <p className="tabular text-[14.5px] text-brand-tint">
                Starts at ৳200/month
                <span className="mx-2 opacity-50">·</span>
                No card needed
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 12. FAQ ──────────────────────────────────────────────────── */}
      <section className="border-t border-line bg-ground-2">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="text-center">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">FAQ</p>
            <h2 className="mx-auto mt-4 max-w-[20ch] text-balance font-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.04] tracking-display text-ink">
              Fair questions, straight answers.
            </h2>
          </div>
          <div className="mx-auto mt-14 max-w-3xl">
            <HomeFaq />
          </div>
          <div className="mt-10 text-center">
            <CtaLink href="/faq" tone="outline">See all questions</CtaLink>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
