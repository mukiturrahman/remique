"use client";

import { useState } from "react";
import { IconCheck, IconLock, IconArrow } from "./icons";

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
    name: "Shuru",
    tag: "Start here",
    desc: "Reminders in English, Banglish and বাংলা. Nothing else to think about.",
    monthly: 200,
    yearly: 2000,
    features: [
      "Unlimited reminders",
      "Banglish, English and বাংলা",
      "Exact time resolution",
      "Confirmation in your language",
      "Recurring reminders",
    ],
    locked: [
      "Save notes and links",
      "Recall saved memories",
      "Priority delivery",
      "Task management",
    ],
  },
  {
    name: "Plus",
    tag: "Most popular",
    desc: "Reminders plus a memory bank. Save links, notes and recall them when you need them.",
    monthly: 350,
    yearly: 3500,
    popular: true,
    features: [
      "Everything in Shuru",
      "Save notes and links",
      "Recall saved memories",
      "Search by meaning",
      "Daily briefing",
    ],
    locked: ["Priority delivery", "Task management"],
  },
  {
    name: "Pro",
    tag: "Full power",
    desc: "Priority delivery, task management, and every feature Remique will ever ship.",
    monthly: 500,
    yearly: 5000,
    features: [
      "Everything in Plus",
      "Priority delivery",
      "Task management",
      "Action from images",
      "Early access to new features",
    ],
  },
];

function formatTaka(amount: number) {
  return `৳${amount.toLocaleString("en-BD")}`;
}

export function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="border-t border-line bg-ground-2">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-14 lg:py-16 sm:px-8">
        <div className="text-center">
          <h2 className="mx-auto max-w-[20ch] text-balance font-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.04] tracking-display text-ink">
            Pick your plan. Pay with bKash.
          </h2>
          <p className="mx-auto mt-5 max-w-[48ch] text-[17px] leading-relaxed text-ink-2">
            No card, no hassle. Subscribe with bKash and start using Remique in
            under a minute.
          </p>

          {/* billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-line bg-ground p-1.5">
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
        </div>

        {/* tier cards */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => {
            const price = yearly ? tier.yearly : tier.monthly;
            const perMonth = yearly
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

                {/* price */}
                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-display text-[36px] font-semibold tracking-tight text-ink">
                    {formatTaka(perMonth)}
                  </span>
                  <span className="text-[14.5px] text-ink-3">/month</span>
                </div>
                {yearly && (
                  <p className="mt-1 text-[13px] text-ink-3">
                    {formatTaka(price)} billed yearly
                  </p>
                )}

                {/* subscribe button */}
                <a
                  href="#pricing"
                  className={`group mt-6 inline-flex items-center justify-center gap-2.5 rounded-full px-6 py-3.5 font-display text-[15px] font-semibold tracking-tight transition-all duration-200 active:translate-y-px ${
                    tier.popular
                      ? "bg-brand text-white shadow-lift hover:bg-brand-bamboo hover:shadow-panel active:shadow-press"
                      : "bg-ground-2 text-ink shadow-lift hover:bg-ground-3 hover:shadow-panel active:shadow-press"
                  }`}
                >
                  Subscribe with
                  <img src="/bKash-Logo.png" alt="bKash" className="h-[18px] w-[18px] rounded-[3px]" />
                  <IconArrow className="h-[17px] w-[17px] transition-transform duration-300 ease-out group-hover:translate-x-1" />
                </a>

                {/* features */}
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

        {/* bkash trust line */}
        <p className="mt-10 flex items-center justify-center gap-2.5 text-[14px] text-ink-3">
          <img src="/bKash-Logo.png" alt="bKash" className="h-5 w-5 rounded-[4px]" />
          All payments processed securely through bKash
        </p>
      </div>
    </section>
  );
}
