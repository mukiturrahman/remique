"use client";

import { useState } from "react";
import { IconArrow, IconCheck } from "./icons";
import { useCopy, useLang } from "./lang-provider";

export function HomePricing() {
  const [billing, setBilling] = useState<"weekly" | "monthly">("monthly");
  const { lang } = useLang();
  const c = useCopy();

  const weeklyPrice = 49;
  const monthlyPrice = 190;

  const isWeekly = billing === "weekly";
  const price = isWeekly ? weeklyPrice : monthlyPrice;
  const periodLabel = isWeekly ? c.pricing.perWeek : c.pricing.perMonth;

  return (
    <>
      <div className="mt-8 flex justify-center">
        <div className="inline-flex items-center gap-3 rounded-full border border-white/40 bg-white/20 p-1.5 shadow-sm backdrop-blur-md">
          <button
            type="button"
            onClick={() => setBilling("weekly")}
            className={`rounded-full px-5 py-2 text-[14.5px] font-semibold tracking-tight transition-all duration-200 ${isWeekly ? "bg-brand text-white shadow-press" : "text-ink-2 hover:text-ink"}`}
          >
            {c.pricing.weekly}
          </button>
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-5 py-2 text-[14.5px] font-semibold tracking-tight transition-all duration-200 ${!isWeekly ? "bg-brand text-white shadow-press" : "text-ink-2 hover:text-ink"}`}
          >
            {c.pricing.monthly}
          </button>
        </div>
      </div>

      <div className="mt-10 mx-auto max-w-[400px]">
        <div className="relative flex flex-col rounded-[32px] border border-white/40 bg-white/20 p-6 shadow-2xl backdrop-blur-xl transition-shadow duration-200">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">{c.pricing.tier}</p>
          <h3 className="mt-2 font-display text-[24px] font-semibold tracking-tight text-ink">{c.pricing.planName}</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{c.pricing.planDesc}</p>

          <div className="mt-5 flex items-baseline gap-1.5">
            <span className="font-display text-[36px] font-semibold tracking-tight text-ink">৳{price.toLocaleString("en-BD")}</span>
            <span className="text-[14.5px] text-ink-3">{periodLabel}</span>
          </div>

          <a
            href="/pricing"
            className="group mt-6 inline-flex items-center justify-center gap-2.5 rounded-full bg-brand px-6 py-3.5 font-display text-[15px] font-semibold tracking-tight text-white shadow-lift transition-all duration-200 hover:bg-brand-deep hover:shadow-panel active:translate-y-px active:shadow-press"
          >
            {c.pricing.subscribeWith}
            <img src="/bKash-Logo.png" alt="bKash" className="h-[18px] w-[18px] rounded-[3px]" />
            <IconArrow className="h-[17px] w-[17px] transition-transform duration-300 ease-out group-hover:translate-x-1" />
          </a>

          <ul className="mt-6 flex-1 space-y-3 border-t border-white/30 pt-6">
            {c.pricing.features.map((f) => {
              // In English the one Bengali word needs its own face; in Bangla
              // the whole page is already set in it.
              const needsBanglaFace = lang === "en" && f.includes("বাংলা");
              return (
                <li key={f} className="flex items-start gap-2.5 text-[14.5px] leading-snug text-ink-2">
                  <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span lang={needsBanglaFace ? "bn" : undefined} className={needsBanglaFace ? "font-bn" : undefined}>
                    {f}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
