import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppMockup, type ChatMessage } from "@/components/whatsapp-mockup";
import { IconArrow } from "@/components/icons";

const STEPS = [
  {
    label: "Step 1",
    title: "Send it like a text",
    desc: "Open WhatsApp. Type your reminder the way you actually think — \"kalke shokal 8 tay exam\" or \"remind me Friday 6pm invoice\". No format, no slash command, no date picker.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-brand">
        <path d="M4.75 19.25V4.75a2 2 0 0 1 2-2h10.5a2 2 0 0 1 2 2v14.5l-3.75-2.5-3.5 2.5-3.5-2.5-3.75 2.5Z" />
        <path d="M9 8.75h6M9 12.25h4" />
      </svg>
    ),
  },
  {
    label: "Step 2",
    title: "Bot already read between the lines",
    desc: "Remique reads your Bangla, Banglish, or English and extracts the task and time. It confirms back in your language so you know it understood.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-brand">
        <circle cx="12" cy="12" r="9.25" />
        <path d="m8.5 12.5 2.5 2.5 5-5" />
      </svg>
    ),
  },
  {
    label: "Step 3",
    title: "Forget it. Completely.",
    desc: "Remique delivers your reminder at the exact time, right inside WhatsApp. You do not need to check anything, open anything, or remember anything.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-brand">
        <path d="M6.5 10.25a5.5 5.5 0 0 1 11 0c0 3.6.9 5.1 1.75 6.1H4.75c.85-1 1.75-2.5 1.75-6.1Z" />
        <path d="M10 19.25a2.25 2.25 0 0 0 4 0" />
      </svg>
    ),
  },
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

const CHASE_FEATURES = [
  {
    title: "Recurring reminders",
    desc: "\"Protidin bikal 5 tay stock check\" — Remique repeats it daily, weekly, or on any schedule you describe in words.",
  },
  {
    title: "Follow-up nudges",
    desc: "Missed a reminder? Remique sends a second message. Then a third. It does not give up until you mark it done.",
  },
  {
    title: "Task management",
    desc: "Say \"todo\" and Remique adds it to your list. Say \"done\" and it checks it off. Say \"list\" and it reads everything back.",
  },
  {
    title: "Notes and memory",
    desc: "\"Note Raj prefers calls after 6pm\" — Remique saves it. Weeks later, say \"notes about Raj\" and it recalls everything.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="bg-ground">
      <Navbar />

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-6 pt-16 sm:px-8 lg:pt-24">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
          How it works
        </p>
        <h1 className="mt-4 max-w-[22ch] text-balance font-display text-[clamp(2.2rem,4.4vw,3.5rem)] font-semibold leading-[1.04] tracking-display text-ink">
          Three steps. The third one is doing nothing.
        </h1>
        <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
          No signup, no tutorial, no learning curve. You text Remique like a friend, and it handles the rest.
        </p>
      </section>

      {/* ── THREE STEPS ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-ground-2 p-6">
              <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-brand-tint">
                {s.icon}
              </span>
              <p className="mt-5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
                {s.label}
              </p>
              <h2 className="mt-2 font-display text-[20px] font-semibold tracking-tight text-ink">
                {s.title}
              </h2>
              <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURE: ACCOUNTABILITY ────────────────────────────────────── */}
      <section className="border-y border-line bg-ground-2">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
                Say so, done
              </p>
              <h2 className="mt-4 max-w-[18ch] text-balance font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-[1.08] tracking-display text-ink">
                An accountability coach that texts you twice a day
              </h2>
              <p className="mt-5 max-w-[46ch] text-[16px] leading-relaxed text-ink-2">
                Morning briefing at the start. Evening summary at the end. Remique keeps your day on track with two messages — one to plan, one to review.
              </p>
            </div>
            <WhatsAppMockup
              messages={ACCOUNTABILITY_CHAT}
              accentText="plan it, forget it"
            />
          </div>
        </div>
      </section>

      {/* ── FEATURE: DAILY BRIEFING ───────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <WhatsAppMockup
              messages={BRIEFING_CHAT}
              accentText="the whole day, one glance"
            />
          </div>
          <div className="order-1 lg:order-2">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
              Daily briefing
            </p>
            <h2 className="mt-4 max-w-[18ch] text-balance font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-[1.08] tracking-display text-ink">
              Your whole day in one message. Before it happens.
            </h2>
            <p className="mt-5 max-w-[46ch] text-[16px] leading-relaxed text-ink-2">
              Every morning, Remique sends you what is coming. Every evening, what got done and what did not. All in one clean message, not a list of push notifications.
            </p>
          </div>
        </div>
      </section>

      {/* ── FEATURE: CHASE MODE ───────────────────────────────────────── */}
      <section className="border-y border-line bg-ground-2">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
            Chase mode
          </p>
          <h2 className="mt-4 max-w-[22ch] text-balance font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-[1.08] tracking-display text-ink">
            Whatever you do, something needs chasing.
          </h2>
          <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-ink-2">
            Recurring tasks, follow-ups, to-do lists, saved notes — Remique handles the stuff that slips through the cracks.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {CHASE_FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-line bg-ground p-6">
                <h3 className="font-display text-[17px] font-semibold tracking-tight text-ink">
                  {f.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 lg:py-28">
        <h2 className="mx-auto max-w-[18ch] text-balance font-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.04] tracking-display text-ink">
          Ready to stop forgetting?
        </h2>
        <p className="mx-auto mt-5 max-w-[44ch] text-[17px] leading-relaxed text-ink-2">
          Pick a plan, open WhatsApp, and start texting. That is the whole onboarding.
        </p>
        <div className="mt-10">
          <Link
            href="/pricing"
            className="group inline-flex items-center gap-2.5 rounded-full bg-brand px-6 py-3.5 font-display text-[16px] font-semibold tracking-tight text-white shadow-lift transition-all duration-200 hover:bg-brand-deep hover:shadow-panel active:translate-y-px active:shadow-press"
          >
            See plans
            <IconArrow className="h-[17px] w-[17px] transition-transform duration-300 ease-out group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
