"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { IconCheck, IconArrow } from "@/components/icons";
import { useCopy } from "@/components/lang-provider";

function BillingSuccessInner() {
  const searchParams = useSearchParams();
  const displayId = searchParams.get("requestId") || searchParams.get("trxID");
  const c = useCopy();
  const copy = c.billingSuccess;

  return (
    <div className="flex flex-1 items-center justify-center px-5 py-32 sm:px-8">
      <div className="mx-auto w-full max-w-md rounded-[32px] border border-white/40 bg-white/20 p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand shadow-inner">
          <IconCheck className="h-8 w-8 text-brand" />
        </div>

        <p className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
          {copy.badge}
        </p>
        <h1 className="mt-2 font-display text-[28px] font-semibold tracking-tight text-ink">
          {copy.title}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          {copy.desc}
        </p>

        {displayId && (
          <div className="mt-6 rounded-2xl border border-white/30 bg-white/30 p-3.5 text-left">
            <span className="block font-mono text-[11px] uppercase tracking-wider text-ink-3">
              {copy.refLabel}
            </span>
            <span className="font-mono text-[14px] font-semibold text-ink">
              {displayId}
            </span>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <a
            href="https://wa.me/8801853501469?text=Hi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 font-display text-[15px] font-semibold tracking-tight text-white shadow-lift transition-all duration-200 hover:bg-brand-deep hover:shadow-panel"
          >
            {copy.ctaWhatsApp}
            <IconArrow className="h-4 w-4" />
          </a>
          <Link
            href="/"
            className="text-[14px] font-medium text-ink-3 transition-colors hover:text-ink"
          >
            {copy.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <main className="page-gradient relative min-h-screen text-ink selection:bg-ink/10">
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.6] mix-blend-overlay"
        style={{ backgroundImage: "url('/noise.svg')", backgroundSize: "256px" }}
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <Suspense fallback={<div className="flex-1" />}>
          <BillingSuccessInner />
        </Suspense>
        <SiteFooter />
      </div>
    </main>
  );
}
