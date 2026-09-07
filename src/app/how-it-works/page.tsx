import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
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

const CHASE_FEATURES = [
  {
    title: "Recurring reminders",
    desc: "\"Protidin bikal 5 tay stock check\" — Remique repeats it daily, weekly, or on any schedule you describe in words.",
  },
  {
    title: "Follow-up nudges",
    desc: "Missed a reminder? Remique sends a second message. Then a third. It does not give up until you mark it done.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="page-gradient relative min-h-screen text-ink selection:bg-ink/10">
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-[0.6] mix-blend-overlay" style={{ backgroundImage: "url('/noise.svg')", backgroundSize: "256px" }} />
      <div className="relative z-10">
      <Navbar />

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-6 pt-32 sm:px-8 lg:pt-40">
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
            <div key={s.label} className="rounded-2xl border border-white/40 bg-white/20 p-6 shadow-xl backdrop-blur-md">
              <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-white/20">
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

      {/* ── FEATURE: CHASE MODE ───────────────────────────────────────── */}
      <section className="">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
            Relentless
          </p>
          <h2 className="mt-4 max-w-[22ch] text-balance font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-[1.08] tracking-display text-ink">
            Whatever you need to remember, we make sure you don't forget.
          </h2>
          <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-ink-2">
            Recurring tasks, follow-up nudges — Remique handles the stuff that slips through the cracks.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {CHASE_FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/40 bg-white/20 p-6 shadow-xl backdrop-blur-md">
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
    </div>
    </main>
  );
}
