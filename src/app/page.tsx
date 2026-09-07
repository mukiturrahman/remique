import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { HeroRotator } from "@/components/hero-rotator";
import { HeroVideo } from "@/components/hero-video";
import { WhatsAppMockup, type ChatMessage } from "@/components/whatsapp-mockup";
import { HomeFaq } from "@/components/home-faq";
import { HomePricing } from "@/components/home-pricing";
import { IconArrow, MarkWhatsApp } from "@/components/icons";

/* ── DATA ──────────────────────────────────────────────────────────── */

const HERO_CHAT: ChatMessage[] = [
  { text: "Remind me to pay the electricity bill tomorrow at 10 AM", from: "user", time: "9:14 AM" },
  { text: "✅ Got it. I'll remind you to **pay the electricity bill** tomorrow at 10:00 AM.", from: "bot", time: "9:14 AM" },
  { text: "Actually make it 11 AM", from: "user", time: "9:15 AM" },
  { text: "✏️ Updated. I'll remind you at 11:00 AM instead.", from: "bot", time: "9:15 AM" },
  { text: "আর বিকালে মাকে কল দিতে মনে করিয়ে দিও", from: "user", time: "9:16 AM" },
  { text: "✅ ঠিক আছে, আজ বিকাল ৫:০০ টায় **মাকে কল দেওয়ার** কথা মনে করিয়ে দিবো।", from: "bot", time: "9:16 AM" },
];

const LANGUAGE_EXAMPLES = [
  { lang: "Bangla", script: "bn" as const, text: "কালকে সকালে ওষুধ খেতে মনে করিয়ে দিও" },
  { lang: "Banglish", script: "en" as const, text: "kalke shokal e medicine khete bolo" },
  { lang: "English", script: "en" as const, text: "remind me tomorrow morning to take medicine" },
];

const ALL_FEATURES = [
  { num: 1, title: "Instant confirmation", desc: "Reply comes back in seconds, in your language." },
  { num: 2, title: "Exact time resolution", desc: "\"kalke shokal 10 tay\" becomes one timestamp." },
  { num: 3, title: "Recurring reminders", desc: "Daily, weekly, monthly — describe it in words." },
  { num: 4, title: "Follow-up nudges", desc: "Missed one? Remique sends it again." },
  { num: 5, title: "Multi-language", desc: "Bangla, Banglish, English — or mixed." },
  { num: 6, title: "Signature verification", desc: "Every message verified via Meta HMAC." },
  { num: 7, title: "Priority delivery", desc: "Reminders fire through a priority queue." },
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
      "bg-white text-brand-deep shadow-lift hover: hover:shadow-panel active:shadow-press",
    outline:
      "border border-white/40  text-ink shadow-lift hover:shadow-panel",
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

/* ── PAGE ───────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
        <main className="page-gradient relative">
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-[0.14] mix-blend-overlay" style={{ backgroundImage: "url('/noise.svg')", backgroundSize: "256px" }} />
      <div className="relative z-10">
      <Navbar />

      {/* ── 1. HERO ──────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden pt-32 pb-24 lg:pt-48 lg:pb-36">
        <div className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]">
          <HeroVideo />
        </div>
        {/* Soft overlay to ensure legibility while keeping the gradient colors vibrant */}
        <div className="absolute inset-0 -z-10 bg-white/30 backdrop-blur-[4px]" />

        <div className="mx-auto grid max-w-6xl gap-16 px-5 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:gap-12 lg:items-center">
          
          {/* LEFT COLUMN */}
          <div className="flex flex-col items-start text-left">
            {/* Social proof pill */}
            <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/40 bg-white/40 px-3 py-1.5 shadow-sm backdrop-blur-md">
              <div className="flex -space-x-2">
                {/* Note: In production you would use next/image here, but img works for standard external avatars */}
                <img src="https://i.pravatar.cc/100?img=33" className="h-[26px] w-[26px] rounded-full border-2 border-ground" alt="User avatar" />
                <img src="https://i.pravatar.cc/100?img=47" className="h-[26px] w-[26px] rounded-full border-2 border-ground" alt="User avatar" />
                <img src="https://i.pravatar.cc/100?img=12" className="h-[26px] w-[26px] rounded-full border-2 border-ground" alt="User avatar" />
              </div>
              <span className="pr-1 text-[13px] font-medium text-ink-2">
                +250k people trust Remique to never forget again
              </span>
            </div>

            <h1 className="text-balance font-display text-[clamp(2.5rem,5.2vw,4.2rem)] font-semibold leading-[1.05] tracking-display text-ink drop-shadow-sm">
              Never forget <br className="hidden lg:block" />
              <span className="-ml-1 inline-block"><HeroRotator /></span> <br className="hidden lg:block" />
              again.
            </h1>
            
            <p className="mt-7 max-w-[48ch] text-[clamp(1.05rem,1.5vw,1.2rem)] leading-relaxed text-ink-2 drop-shadow-sm">
              Remique is a WhatsApp AI assistant that remembers for you.
              Text it naturally — in English, Banglish, or <span lang="bn" className="font-bn font-medium text-ink">বাংলা</span>.
              It confirms, schedules, and reminds. You move on.
            </p>

            <div className="mt-8 flex items-center gap-3 text-[14.5px] font-medium text-ink-3">
              <span className="inline-flex items-center gap-1.5">
                <MarkWhatsApp className="h-4 w-4 text-brand" />
                Works on WhatsApp
              </span>
              <span className="text-line-strong">·</span>
              <span>No app to install</span>
            </div>

            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <CtaLink href="/pricing">Get started</CtaLink>
              <CtaLink href="/how-it-works" tone="light">Meet Remique</CtaLink>
            </div>
          </div>
          
          {/* RIGHT COLUMN */}
          <div className="relative mx-auto mt-6 w-full max-w-[420px] lg:mt-0 lg:ml-auto lg:mr-0 lg:max-w-[460px]">
            {/* The bot icon peeking */}
            <div className="absolute -left-6 -top-10 z-10 lg:-left-12 lg:-top-16 drop-shadow-2xl">
              <Image 
                src="/logo.png" 
                alt="Remique Bot" 
                width={120} 
                height={120} 
                className="w-24 h-auto -rotate-12 lg:w-32"
              />
            </div>
            
            {/* The rounded media card containing WhatsAppMockup */}
            <div className="relative rounded-[32px] border border-white/50 bg-white/20 p-2 shadow-2xl backdrop-blur-xl sm:p-3">
              <WhatsAppMockup
                messages={HERO_CHAT}
                accentText=""
              />
            </div>
          </div>

        </div>
      </section>

      {/* ── 2. LANGUAGE STRIP ────────────────────────────────────────── */}
      <section className=" ">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center sm:px-8">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
            Celebrating Bangladesh
          </p>
          <h2 className="mx-auto mt-4 max-w-[20ch] text-balance font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-[1.08] tracking-display text-white">
            Say it the way it comes to you. Any language.
          </h2>
          <p className="mx-auto mt-5 max-w-[52ch] text-[16px] leading-relaxed text-white/80">
            Remique understands Bengali script, Banglish transliteration, and plain English — or all three mixed in one sentence.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {LANGUAGE_EXAMPLES.map((ex) => (
              <div key={ex.lang} className="rounded-2xl border border-white/20 bg-white/10 shadow-xl backdrop-blur-md px-5 py-4 text-left shadow-lift">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-white/60">{ex.lang}</p>
                <p
                  lang={ex.script === "bn" ? "bn" : undefined}
                  className={`mt-2 text-[15px] leading-snug text-white ${ex.script === "bn" ? "font-bn" : ""}`}
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
            <div key={s.step} className="rounded-2xl border border-white/40 bg-white/20 p-6 shadow-xl backdrop-blur-md">
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
      <section className=" ">
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
              <div key={p.title} className="rounded-2xl border border-white/40 bg-white/20 p-6 shadow-xl backdrop-blur-md">
                <h3 className="font-display text-[17px] font-semibold tracking-tight text-ink">{p.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. FEATURE: RELENTLESS ───────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="text-center">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">Relentless</p>
          <h2 className="mx-auto mt-4 max-w-[22ch] text-balance font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-[1.08] tracking-display text-ink">
            Whatever you need to remember, we make sure you don't forget.
          </h2>
          <p className="mx-auto mt-5 max-w-[52ch] text-[16px] leading-relaxed text-ink-2">
            Recurring reminders and follow-up nudges — Remique handles the stuff that slips through the cracks.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {[
            { title: "Recurring reminders", desc: "\"Protidin bikal 5 tay medicine\" — repeats on any schedule you describe." },
            { title: "Follow-up nudges", desc: "Missed a reminder? Remique sends it again. And again." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/40 bg-white/20 p-5 shadow-xl backdrop-blur-md">
              <h3 className="font-display text-[16px] font-semibold tracking-tight text-ink">{f.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <CtaLink href="/how-it-works">See all features</CtaLink>
        </div>
      </section>

      {/* ── 6. PRICING ───────────────────────────────────────────────── */}
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
      </section>

      {/* ── 7. FEATURE GRID ─────────────────────────────────────────── */}
      <section className=" ">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <h2 className="text-center font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-[1.08] tracking-display text-ink">
            Everything you get, in full.
          </h2>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ALL_FEATURES.map((f) => (
              <div key={f.num} className="flex gap-4 rounded-2xl border border-white/40 bg-white/20 p-5 shadow-xl backdrop-blur-md">
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

      {/* ── 8. GREEN CTA BANNER ─────────────────────────────────────── */}
      <section className="px-5 py-20 sm:px-8 lg:py-28">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-white/20 border border-white/40 shadow-2xl backdrop-blur-xl px-6 py-20 text-center sm:px-12 lg:py-28">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-70 mix-blend-soft-light bg-[radial-gradient(120%_120%_at_50%_-10%,rgba(255,255,255,0.5)_0%,transparent_55%)]"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-[16ch] text-balance font-display text-[clamp(2.1rem,4.4vw,3.5rem)] font-semibold leading-[1.02] tracking-display text-ink">
              Your memory has a backup now.
            </h2>
            <p className="mx-auto mt-6 max-w-[44ch] text-[17px] leading-relaxed text-ink-2">
              Pick a plan, pay with bKash, and start texting Remique. That is the whole setup.
            </p>
            <div className="mt-10 flex flex-col items-center gap-5">
              <CtaLink href="/pricing" tone="light">See plan</CtaLink>
              <p className="tabular text-[14.5px] text-ink-2">
                Starts at ৳49/week
                <span className="mx-2 opacity-50">·</span>
                No card needed
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. FAQ ──────────────────────────────────────────────────── */}
      <section className=" ">
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
      </div>
    </main>
  );
}
