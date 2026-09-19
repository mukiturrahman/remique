"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { IconArrow } from "@/components/icons";
import { useCopy } from "@/components/lang-provider";

function BillingCancelledInner() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const error = searchParams.get("error");
  const failureReason = error || reason;
  const isUserCancel = failureReason === "cancel";

  const c = useCopy();
  const copy = c.billingCancelled;

  const title = isUserCancel ? copy.titleCancelled : copy.titleIncomplete;
  const desc = isUserCancel
    ? copy.descCancelled
    : failureReason
    ? `${copy.descIncompletePrefix}${failureReason}${copy.descIncompleteSuffix}`
    : copy.descDefault;

  return (
    <div className="flex flex-1 items-center justify-center px-5 py-32 sm:px-8">
      <div className="mx-auto w-full max-w-md rounded-[32px] border border-white/40 bg-white/20 p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 shadow-inner">
          <span className="text-2xl font-bold">⚠️</span>
        </div>

        <p className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
          {copy.badge}
        </p>
        <h1 className="mt-2 font-display text-[26px] font-semibold tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
          {desc}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 font-display text-[15px] font-semibold tracking-tight text-white shadow-lift transition-all duration-200 hover:bg-brand-deep hover:shadow-panel"
          >
            {copy.btnTryAgain}
            <IconArrow className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="text-[14px] font-medium text-ink-3 transition-colors hover:text-ink"
          >
            {copy.btnReturnHome}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BillingCancelledPage() {
  return (
    <main className="page-gradient relative min-h-screen text-ink selection:bg-ink/10">
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.6] mix-blend-overlay"
        style={{ backgroundImage: "url('/noise.svg')", backgroundSize: "256px" }}
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <Suspense fallback={<div className="flex-1" />}>
          <BillingCancelledInner />
        </Suspense>
        <SiteFooter />
      </div>
    </main>
  );
}
