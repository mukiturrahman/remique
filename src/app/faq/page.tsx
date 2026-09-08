"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { FaqAccordion } from "@/components/faq-accordion";
import { IconArrow } from "@/components/icons";
import { useCopy } from "@/components/lang-provider";

export default function FaqPage() {
  const c = useCopy();
  const page = c.faqPage;

  return (
    <main className="page-gradient relative min-h-screen text-ink selection:bg-ink/10">
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-[0.6] mix-blend-overlay" style={{ backgroundImage: "url('/noise.svg')", backgroundSize: "256px" }} />
      <div className="relative z-10">
        <Navbar />

        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 pb-6 pt-32 text-center sm:px-8 lg:pt-40">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
            {page.eyebrow}
          </p>
          <h1 className="mx-auto mt-4 max-w-[20ch] text-balance font-display text-[clamp(2.2rem,4.4vw,3.5rem)] font-semibold leading-[1.04] tracking-display text-ink">
            {page.title}
          </h1>
          <p className="mx-auto mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
            {page.sub}
          </p>
        </section>

        {/* ── ACCORDION ─────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-3xl px-5 py-14 sm:px-8 lg:py-20">
          <FaqAccordion items={page.items} />
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <section className="">
          <div className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 lg:py-28">
            <h2 className="mx-auto max-w-[18ch] text-balance font-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.04] tracking-display text-ink">
              {page.cta.title}
            </h2>
            <p className="mx-auto mt-5 max-w-[44ch] text-[17px] leading-relaxed text-ink-2">
              {page.cta.sub}
            </p>
            <div className="mt-10">
              <Link
                href="/pricing"
                className="group inline-flex items-center gap-2.5 rounded-full bg-brand px-6 py-3.5 font-display text-[16px] font-semibold tracking-tight text-white shadow-lift transition-all duration-200 hover:bg-brand-deep hover:shadow-panel active:translate-y-px active:shadow-press"
              >
                {page.cta.button}
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
