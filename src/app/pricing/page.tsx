"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { IconArrow, IconCheck, IconLock } from "@/components/icons";

type Tier = {
  name: string;
  tag: string;
  desc: string;
  monthly: number;
  yearly: number;
  popular?: boolean;
  features: string[];
  locked?: string[];
};

const TIERS: Tier[] = [
  {
    name: "Free",
    tag: "Try it",
    desc: "5 reminders a month. Enough to see if Remique fits your life.",
    monthly: 0,
    yearly: 0,
    features: [
      "5 reminders per month",
      "Banglish, English and বাংলা",
      "Exact time resolution",
      "Confirmation in your language",
    ],
    locked: [
      "Unlimited reminders",
      "Recurring reminders",
      "Save notes and links",
      "Daily briefing",
      "Task management",
    ],
  },
  {
    name: "Shuru",
    tag: "Most popular",
    desc: "Unlimited reminders in any language. Everything you need.",
    monthly: 200,
    yearly: 2000,
    popular: true,
    features: [
      "Unlimited reminders",
      "Banglish, English and বাংলা",
      "Exact time resolution",
      "Confirmation in your language",
      "Recurring reminders",
      "Save notes and links",
      "Daily briefing",
    ],
    locked: [
      "Priority delivery",
      "Task management",
    ],
  },
  {
    name: "Pro",
    tag: "Full power",
    desc: "Priority delivery, task management, and every feature Remique will ever ship.",
    monthly: 500,
    yearly: 5000,
    features: [
      "Everything in Shuru",
      "Priority delivery",
      "Task management",
      "Action from images",
      "Early access to new features",
      "Follow-up nudges",
    ],
  },
];

const ALL_FEATURES = [
  { num: 1, title: "Instant confirmation", desc: "Reply comes back in seconds, in the language you wrote in." },
  { num: 2, title: "Exact time resolution", desc: "\"in 5 minutes\", \"kalke shokal 10 tay\" — all become one timestamp." },
  { num: 3, title: "Recurring reminders", desc: "Daily, weekly, monthly — describe the pattern in words." },
  { num: 4, title: "Follow-up nudges", desc: "Missed a reminder? Remique sends it again." },
  { num: 5, title: "Save notes and links", desc: "Say \"note\" and Remique saves it. Say \"notes about X\" to recall." },
  { num: 6, title: "Daily briefing", desc: "Morning plan and evening summary in one message." },
  { num: 7, title: "Task management", desc: "To-do lists you manage in plain words." },
  { num: 8, title: "Multi-language support", desc: "Bangla, Banglish, English — or all three mixed." },
  { num: 9, title: "HMAC signature verification", desc: "Every message verified before Remique acts." },
  { num: 10, title: "Action from images", desc: "Send a photo and Remique extracts the task." },
  { num: 11, title: "Priority delivery", desc: "Reminders fire through a priority queue." },
  { num: 12, title: "Early access", desc: "Every new feature ships to Pro first." },
];

function formatTaka(amount: number) {
  if (amount === 0) return "Free";
  return `৳${amount.toLocaleString("en-BD")}`;
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <main className="bg-ground">
      <Navbar />

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-6 pt-16 text-center sm:px-8 lg:pt-24">
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
        <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-line bg-ground-2 p-1.5">
          <button
            type="button"
            onClick={() => setYearly(false)}
            className={`rounded-full px-5 py-2 text-[14.5px] font-semibold tracking-tight transition-all duration-200 ${
              !yearly
                ? "bg-brand text-white shadow-press"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-[14.5px] font-semibold tracking-tight transition-all duration-200 ${
              yearly
                ? "bg-brand text-white shadow-press"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            Yearly
            <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">
              2 months free
            </span>
          </button>
        </div>
      </section>

      {/* ── TIER CARDS ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => {
            const price = yearly ? tier.yearly : tier.monthly;
            const perMonth = yearly && tier.yearly > 0
              ? Math.round(tier.yearly / 12)
              : tier.monthly;

            return (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-2xl border bg-ground p-6 transition-shadow duration-200 ${
                  tier.popular
                    ? "border-brand shadow-panel"
                    : "border-line hover:shadow-lift"
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white">
                    Most popular
                  </span>
                )}

                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
                  {tier.tag}
                </p>
                <h3 className="mt-2 font-display text-[24px] font-semibold tracking-tight text-ink">
                  {tier.name}
                </h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
                  {tier.desc}
                </p>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-display text-[36px] font-semibold tracking-tight text-ink">
                    {formatTaka(perMonth)}
                  </span>
                  {perMonth > 0 && (
                    <span className="text-[14.5px] text-ink-3">/month</span>
                  )}
                </div>
                {yearly && price > 0 && (
                  <p className="mt-1 text-[13px] text-ink-3">
                    {formatTaka(price)} billed yearly
                  </p>
                )}

                <a
                  href="#pricing"
                  className={`group mt-6 inline-flex items-center justify-center gap-2.5 rounded-full px-6 py-3.5 font-display text-[15px] font-semibold tracking-tight transition-all duration-200 active:translate-y-px ${
                    tier.popular
                      ? "bg-brand text-white shadow-lift hover:bg-brand-deep hover:shadow-panel active:shadow-press"
                      : "bg-ground-2 text-ink shadow-lift hover:bg-ground-3 hover:shadow-panel active:shadow-press"
                  }`}
                >
                  {tier.monthly === 0 ? "Start free" : "Subscribe with"}
                  {tier.monthly > 0 && (
                    <img src="/bKash-Logo.png" alt="bKash" className="h-[18px] w-[18px] rounded-[3px]" />
                  )}
                  <IconArrow className="h-[17px] w-[17px] transition-transform duration-300 ease-out group-hover:translate-x-1" />
                </a>

                <ul className="mt-6 flex-1 space-y-3 border-t border-line pt-6">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-[14.5px] leading-snug text-ink-2"
                    >
                      <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      <span
                        lang={f.includes("বাংলা") ? "bn" : undefined}
                        className={f.includes("বাংলা") ? "font-bn" : undefined}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                  {tier.locked?.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-[14.5px] leading-snug text-ink-3"
                    >
                      <IconLock className="mt-0.5 h-4 w-4 shrink-0 text-line-strong" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-8 flex items-center justify-center gap-2.5 text-[14px] text-ink-3">
          <img src="/bKash-Logo.png" alt="bKash" className="h-5 w-5 rounded-[4px]" />
          All payments processed securely through bKash
        </p>
      </section>

      {/* ── FEATURE GRID ──────────────────────────────────────────────── */}
      <section className="border-t border-line bg-ground-2">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <h2 className="text-center font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-[1.08] tracking-display text-ink">
            Everything you get, in full.
          </h2>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ALL_FEATURES.map((f) => (
              <div key={f.num} className="flex gap-4 rounded-2xl border border-line bg-ground p-5">
                <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-tint font-mono text-[13px] font-semibold text-brand">
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
    </main>
  );
}
