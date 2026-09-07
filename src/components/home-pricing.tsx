"use client";

import { useState } from "react";
import { IconArrow, IconCheck, IconLock } from "./icons";

const TIERS = [
  {
    name: "Free",
    tag: "Try it",
    desc: "5 reminders a month to see if Remique fits.",
    monthly: 0,
    yearly: 0,
    features: ["5 reminders per month", "Banglish, English and বাংলা", "Exact time resolution"],
    locked: ["Unlimited reminders", "Recurring reminders", "Save notes"],
  },
  {
    name: "Shuru",
    tag: "Most popular",
    desc: "Unlimited reminders in any language.",
    monthly: 200,
    yearly: 2000,
    popular: true,
    features: ["Unlimited reminders", "Banglish, English and বাংলা", "Recurring reminders", "Save notes and links", "Daily briefing"],
    locked: ["Priority delivery", "Task management"],
  },
  {
    name: "Pro",
    tag: "Full power",
    desc: "Priority delivery, tasks, and every future feature.",
    monthly: 500,
    yearly: 5000,
    features: ["Everything in Shuru", "Priority delivery", "Task management", "Action from images", "Early access"],
  },
];

function formatTaka(n: number) {
  return n === 0 ? "Free" : `৳${n.toLocaleString("en-BD")}`;
}

export function HomePricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <>
      <div className="mt-8 flex justify-center">
        <div className="inline-flex items-center gap-3 rounded-full border border-line bg-ground-2 p-1.5">
          <button
            type="button"
            onClick={() => setYearly(false)}
            className={`rounded-full px-5 py-2 text-[14.5px] font-semibold tracking-tight transition-all duration-200 ${!yearly ? "bg-brand text-white shadow-press" : "text-ink-2 hover:text-ink"}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-[14.5px] font-semibold tracking-tight transition-all duration-200 ${yearly ? "bg-brand text-white shadow-press" : "text-ink-2 hover:text-ink"}`}
          >
            Yearly
            <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">
              2 months free
            </span>
          </button>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {TIERS.map((tier) => {
          const perMonth = yearly && tier.yearly > 0 ? Math.round(tier.yearly / 12) : tier.monthly;
          return (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border bg-ground p-6 transition-shadow duration-200 ${tier.popular ? "border-brand shadow-panel" : "border-line hover:shadow-lift"}`}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white">
                  Most popular
                </span>
              )}
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">{tier.tag}</p>
              <h3 className="mt-2 font-display text-[24px] font-semibold tracking-tight text-ink">{tier.name}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{tier.desc}</p>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-display text-[36px] font-semibold tracking-tight text-ink">{formatTaka(perMonth)}</span>
                {perMonth > 0 && <span className="text-[14.5px] text-ink-3">/month</span>}
              </div>
              {yearly && tier.yearly > 0 && (
                <p className="mt-1 text-[13px] text-ink-3">{formatTaka(tier.yearly)} billed yearly</p>
              )}
              <a
                href="/pricing"
                className={`group mt-6 inline-flex items-center justify-center gap-2.5 rounded-full px-6 py-3.5 font-display text-[15px] font-semibold tracking-tight transition-all duration-200 active:translate-y-px ${tier.popular ? "bg-brand text-white shadow-lift hover:bg-brand-deep hover:shadow-panel active:shadow-press" : "bg-ground-2 text-ink shadow-lift hover:bg-ground-3 hover:shadow-panel active:shadow-press"}`}
              >
                {tier.monthly === 0 ? "Start free" : "Subscribe with"}
                {tier.monthly > 0 && <img src="/bKash-Logo.png" alt="bKash" className="h-[18px] w-[18px] rounded-[3px]" />}
                <IconArrow className="h-[17px] w-[17px] transition-transform duration-300 ease-out group-hover:translate-x-1" />
              </a>
              <ul className="mt-6 flex-1 space-y-3 border-t border-line pt-6">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[14.5px] leading-snug text-ink-2">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    {f}
                  </li>
                ))}
                {tier.locked?.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[14.5px] leading-snug text-ink-3">
                    <IconLock className="mt-0.5 h-4 w-4 shrink-0 text-line-strong" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}
