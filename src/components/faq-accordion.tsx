"use client";

import { useState } from "react";

type FaqItem = { q: string; a: string };

function Item({ item, tone = "light" }: { item: FaqItem; tone?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  
  const textTitle = tone === "dark" ? "text-white" : "text-ink";
  const textBody = tone === "dark" ? "text-white/80" : "text-ink-2";
  const textIcon = tone === "dark" ? "text-white/60" : "text-ink-3";
  const border = tone === "dark" ? "border-white/20" : "border-line";

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className={`font-display text-[17px] font-semibold tracking-tight ${textTitle}`}>
          {item.q}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          className={`h-5 w-5 shrink-0 transition-transform duration-300 ${textIcon} ${
            open ? "rotate-45" : ""
          }`}
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className={`pb-5 text-[15.5px] leading-relaxed ${textBody}`}>
            {item.a}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FaqAccordion({ items, tone = "light" }: { items: FaqItem[]; tone?: "light" | "dark" }) {
  return (
    <div className="divide-y-0">
      {items.map((item, i) => (
        <Item key={i} item={item} tone={tone} />
      ))}
    </div>
  );
}
