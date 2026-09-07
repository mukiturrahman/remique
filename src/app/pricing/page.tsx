"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { IconArrow, IconCheck } from "@/components/icons";

const FEATURES = [
  "Unlimited reminders",
  "Banglish, English and বাংলা",
  "Exact time resolution",
  "Confirmation in your language",
  "Recurring reminders",
  "Follow-up nudges",
];

const ALL_FEATURES = [
  { num: 1, title: "Instant confirmation", desc: "Reply comes back in seconds, in the language you wrote in." },
  { num: 2, title: "Exact time resolution", desc: "\"in 5 minutes\", \"kalke shokal 10 tay\" — all become one timestamp." },
  { num: 3, title: "Recurring reminders", desc: "Daily, weekly, monthly — describe the pattern in words." },
  { num: 4, title: "Follow-up nudges", desc: "Missed a reminder? Remique sends it again." },
  { num: 5, title: "Multi-language support", desc: "Bangla, Banglish, English — or all three mixed." },
  { num: 6, title: "HMAC signature verification", desc: "Every message verified before Remique acts." },
  { num: 7, title: "Priority delivery", desc: "Reminders fire through a priority queue." },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<"weekly" | "monthly">("monthly");
  
  const weeklyPrice = 49;
  const monthlyPrice = 190;

  const isWeekly = billing === "weekly";
  const price = isWeekly ? weeklyPrice : monthlyPrice;
  const periodLabel = isWeekly ? "/week" : "/month";

  return (
    <main className="page-gradient relative min-h-screen text-ink selection:bg-ink/10">
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-[0.6] mix-blend-overlay" style={{ backgroundImage: "url('/noise.svg')", backgroundSize: "256px" }} />
      <div className="relative z-10">
      <Navbar />

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-6 pt-32 text-center sm:px-8 lg:pt-40">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
          Pricing
        </p>
        <h1 className="mx-auto mt-4 max-w-[22ch] text-balance font-display text-[clamp(2.2rem,4.4vw,3.5rem)] font-semibold leading-[1.04] tracking-display text-ink">
          Cheaper than the late fee it saves you.
        </h1>
        <p className="mx-auto mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
          No card, no hassle. Subscribe with bKash and start using Remique in under a minute.
        </p>

        {/* billing toggle */}
        <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/40 bg-white/20 p-1.5 shadow-sm backdrop-blur-md">
          <button
            type="button"
            onClick={() => setBilling("weekly")}
            className={`rounded-full px-5 py-2 text-[14.5px] font-semibold tracking-tight transition-all duration-200 ${
              isWeekly
                ? "bg-brand text-white shadow-press"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-5 py-2 text-[14.5px] font-semibold tracking-tight transition-all duration-200 ${
              !isWeekly
                ? "bg-brand text-white shadow-press"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            Monthly
          </button>
        </div>
      </section>

      {/* ── TIER CARD ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-[400px]">
          <div className="relative flex flex-col rounded-[32px] border border-white/40 bg-white/20 p-6 shadow-2xl backdrop-blur-xl transition-shadow duration-200">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
              Pro
            </p>
            <h3 className="mt-2 font-display text-[24px] font-semibold tracking-tight text-ink">
              Remique Pro
            </h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
              Unlimited reminders in any language.
            </p>

            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="font-display text-[36px] font-semibold tracking-tight text-ink">
                ৳{price.toLocaleString("en-BD")}
              </span>
              <span className="text-[14.5px] text-ink-3">{periodLabel}</span>
            </div>

            <a
              href="#pricing"
              className="group mt-6 inline-flex items-center justify-center gap-2.5 rounded-full bg-brand px-6 py-3.5 font-display text-[15px] font-semibold tracking-tight text-white shadow-lift transition-all duration-200 hover:bg-brand-deep hover:shadow-panel active:translate-y-px active:shadow-press"
            >
              Subscribe with
              <img src="/bKash-Logo.png" alt="bKash" className="h-[18px] w-[18px] rounded-[3px]" />
              <IconArrow className="h-[17px] w-[17px] transition-transform duration-300 ease-out group-hover:translate-x-1" />
            </a>

            <ul className="mt-6 flex-1 space-y-3 pt-6">
              {FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-[14.5px] leading-snug text-ink-2"
                >
                  <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
                  <span
                    lang={f.includes("বাংলা") ? "bn" : undefined}
                    className={f.includes("বাংলা") ? "font-bn" : undefined}
                  >
                    {f}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-8 flex items-center justify-center gap-2.5 text-[14px] text-ink-3">
          <img src="/bKash-Logo.png" alt="bKash" className="h-5 w-5 rounded-[4px]" />
          All payments processed securely through bKash
        </p>
      </section>

      {/* ── FEATURE GRID ──────────────────────────────────────────────── */}
      <section className="">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <h2 className="text-center font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-[1.08] tracking-display text-ink">
            Everything you get, in full.
          </h2>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ALL_FEATURES.map((f) => (
              <div key={f.num} className="flex gap-4 rounded-2xl border border-white/40 bg-white/20 p-5 shadow-xl backdrop-blur-md">
                <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 font-mono text-[13px] font-semibold text-ink-3">
                  {f.num}
                </span>
                <div>
                  <h3 className="font-display text-[15px] font-semibold tracking-tight text-ink">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
    </main>
  );
}
