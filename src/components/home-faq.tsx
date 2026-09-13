"use client";

import { FaqAccordion } from "./faq-accordion";
import { useCopy } from "./lang-provider";

export function HomeFaq({ tone = "light" }: { tone?: "light" | "dark" }) {
  return <FaqAccordion items={useCopy().faq.items} tone={tone} />;
}
