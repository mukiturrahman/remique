"use client";

import { useState } from "react";

type FaqItem = { q: string; a: string };

function Item({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="font-display text-[17px] font-semibold tracking-tight text-ink">
          {item.q}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          className={`h-5 w-5 shrink-0 text-ink-3 transition-transform duration-300 ${
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
          <p className="pb-5 text-[15.5px] leading-relaxed text-ink-2">
            {item.a}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y-0">
      {items.map((item, i) => (
        <Item key={i} item={item} />
      ))}
    </div>
  );
}
