"use client";

import { FaqAccordion } from "./faq-accordion";

const TOP_FAQS = [
  { q: "What is Remique?", a: "Remique is a WhatsApp AI assistant that sets reminders, saves notes, and manages your to-do list. You text it naturally — in English, Banglish, or Bangla — and it handles the rest." },
  { q: "Do I need to install an app?", a: "No. Remique runs entirely inside WhatsApp. You add it as a contact and start texting. There is nothing to download." },
  { q: "What languages does it understand?", a: "English, Banglish (Bangla written in English letters), and Bengali script. You can mix all three in one sentence." },
  { q: "How does payment work?", a: "You pay with bKash. Pick a plan, scan the QR or enter the payment number, and your subscription starts immediately. No card needed." },
  { q: "Can I try it for free?", a: "Yes. The Free plan gives you 5 reminders per month with full language support." },
];

export function HomeFaq() {
  return <FaqAccordion items={TOP_FAQS} />;
}
