"use client";

import { useState } from "react";
import { IconArrow, IconCheck } from "./icons";

const FEATURES = [
  "Unlimited reminders",
  "Banglish, English and বাংলা",
  "Exact time resolution",
  "Confirmation in your language",
  "Recurring reminders",
  "Follow-up nudges",
];

export function HomePricing() {
  const [billing, setBilling] = useState<"weekly" | "monthly">("monthly");
  
  const weeklyPrice = 49;
  const monthlyPrice = 190;

  const isWeekly = billing === "weekly";
  const price = isWeekly ? weeklyPrice : monthlyPrice;
  const periodLabel = isWeekly ? "/week" : "/month";

  return (
    <>
      <div className="mt-8 flex justify-center">
        <div className="inline-flex items-center gap-3 rounded-full border border-line bg-ground-2 p-1.5">
          <button
            type="button"
            onClick={() => setBilling("weekly")}
            className={`rounded-full px-5 py-2 text-[14.5px] font-semibold tracking-tight transition-all duration-200 ${isWeekly ? "bg-brand text-white shadow-press" : "text-ink-2 hover:text-ink"}`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-5 py-2 text-[14.5px] font-semibold tracking-tight transition-all duration-200 ${!isWeekly ? "bg-brand text-white shadow-press" : "text-ink-2 hover:text-ink"}`}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="mt-10 mx-auto max-w-[400px]">
        <div className="relative flex flex-col rounded-2xl border border-brand bg-ground p-6 shadow-panel transition-shadow duration-200">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">Pro</p>
          <h3 className="mt-2 font-display text-[24px] font-semibold tracking-tight text-ink">Remique Pro</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">Unlimited reminders in any language.</p>
          
          <div className="mt-5 flex items-baseline gap-1.5">
            <span className="font-display text-[36px] font-semibold tracking-tight text-ink">৳{price.toLocaleString("en-BD")}</span>
            <span className="text-[14.5px] text-ink-3">{periodLabel}</span>
          </div>

          <a
            href="/pricing"
            className="group mt-6 inline-flex items-center justify-center gap-2.5 rounded-full bg-brand px-6 py-3.5 font-display text-[15px] font-semibold tracking-tight text-white shadow-lift transition-all duration-200 hover:bg-brand-deep hover:shadow-panel active:translate-y-px active:shadow-press"
          >
            Subscribe with
            <img src="/bKash-Logo.png" alt="bKash" className="h-[18px] w-[18px] rounded-[3px]" />
            <IconArrow className="h-[17px] w-[17px] transition-transform duration-300 ease-out group-hover:translate-x-1" />
          </a>
          
          <ul className="mt-6 flex-1 space-y-3 border-t border-line pt-6">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[14.5px] leading-snug text-ink-2">
                <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <span lang={f.includes("বাংলা") ? "bn" : undefined} className={f.includes("বাংলা") ? "font-bn" : undefined}>
                  {f}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
