import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { FaqAccordion } from "@/components/faq-accordion";
import { IconArrow } from "@/components/icons";

const FAQ_ITEMS = [
  {
    q: "What is Remique?",
    a: "Remique is a WhatsApp AI assistant that sets and manages your reminders. You text it naturally — in English, Banglish, or Bangla — and it handles the rest.",
  },
  {
    q: "Do I need to install an app?",
    a: "No. Remique runs entirely inside WhatsApp. You add it as a contact and start texting. There is nothing to download.",
  },
  {
    q: "What languages does it understand?",
    a: "English, Banglish (Bangla written in English letters), and Bengali script. You can mix all three in one sentence — Remique will figure it out.",
  },
  {
    q: "How does payment work?",
    a: "You pay with bKash. Pick a plan, scan the QR or enter the payment number, and your subscription starts immediately. No card needed.",
  },
  {
    q: "Can I try it for free?",
    a: "Yes. The Free plan gives you 5 reminders per month with full language support. Enough to see if it fits your life before upgrading.",
  },
  {
    q: "Is my data safe?",
    a: "Every message is verified with Meta's HMAC signature before Remique processes it. Your reminders are stored securely and are never shared with third parties.",
  },
  {
    q: "What happens if I miss a reminder?",
    a: "On the Pro plan, Remique sends follow-up nudges. If you do not mark a reminder as done, it will message you again until you respond.",
  },
  {
    q: "Can I set recurring reminders?",
    a: "Yes. Say \"every day at 5pm check stock\" or \"protidin bikal 5 tay stock check\" — Remique will repeat it on the schedule you describe. Works on the Shuru plan and above.",
  },

  {
    q: "Can I cancel anytime?",
    a: "Yes. There is no lock-in. Cancel through bKash or message Remique to stop your subscription. You keep access until the current billing period ends.",
  },
];

export default function FaqPage() {
  return (
    <main className="page-gradient relative min-h-screen text-ink selection:bg-ink/10">
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-[0.6] mix-blend-overlay" style={{ backgroundImage: "url('/noise.svg')", backgroundSize: "256px" }} />
      <div className="relative z-10">
      <Navbar />

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-6 pt-32 text-center sm:px-8 lg:pt-40">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
          FAQ
        </p>
        <h1 className="mx-auto mt-4 max-w-[20ch] text-balance font-display text-[clamp(2.2rem,4.4vw,3.5rem)] font-semibold leading-[1.04] tracking-display text-ink">
          Fair questions, straight answers.
        </h1>
        <p className="mx-auto mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
          Everything you might want to know before you start texting Remique.
        </p>
      </section>

      {/* ── ACCORDION ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-5 py-14 sm:px-8 lg:py-20">
        <FaqAccordion items={FAQ_ITEMS} />
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="">
        <div className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 lg:py-28">
          <h2 className="mx-auto max-w-[18ch] text-balance font-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.04] tracking-display text-ink">
            Still have questions?
          </h2>
          <p className="mx-auto mt-5 max-w-[44ch] text-[17px] leading-relaxed text-ink-2">
            Text Remique on WhatsApp. It answers those too.
          </p>
          <div className="mt-10">
            <Link
              href="/pricing"
              className="group inline-flex items-center gap-2.5 rounded-full bg-brand px-6 py-3.5 font-display text-[16px] font-semibold tracking-tight text-white shadow-lift transition-all duration-200 hover:bg-brand-deep hover:shadow-panel active:translate-y-px active:shadow-press"
            >
              Get started
              <IconArrow className="h-[17px] w-[17px] transition-transform duration-300 ease-out group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
    </main>
  );
}
