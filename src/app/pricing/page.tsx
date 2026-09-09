"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { IconArrow, IconCheck } from "@/components/icons";
import { useCopy, useLang } from "@/components/lang-provider";

export default function PricingPage() {
  const [billing, setBilling] = useState<"weekly" | "monthly">("monthly");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { lang } = useLang();
  const c = useCopy();
  const page = c.pricingPage;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const phoneParam = params.get("phone");
      const errorParam = params.get("error");
      if (phoneParam) {
        setPhone(phoneParam);
        setShowModal(true);
      }
      if (errorParam) {
        setError(decodeURIComponent(errorParam));
        setShowModal(true);
      }
    }
  }, []);
  
  const weeklyPrice = 49;
  const monthlyPrice = 190;

  const isWeekly = billing === "weekly";
  const price = isWeekly ? weeklyPrice : monthlyPrice;
  const periodLabel = isWeekly ? page.perWeek : page.perMonth;

  async function handleCheckout(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!phone.trim() || !email.trim()) {
      setError(page.modal.errorEmpty);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/bdapps/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone.trim(),
          email: email.trim(),
          planPeriod: billing,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.authorizationUrl) {
        throw new Error(data.error || page.modal.errorFailed);
      }

      // Redirect to bdApps bKash hosted authorization page
      window.location.href = data.authorizationUrl;
    } catch (err: any) {
      setError(err?.message || page.modal.errorGeneric);
      setLoading(false);
    }
  }

  return (
    <main className="page-gradient relative min-h-screen text-ink selection:bg-ink/10">
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-[0.6] mix-blend-overlay" style={{ backgroundImage: "url('/noise.svg')", backgroundSize: "256px" }} />
      <div className="relative z-10">
        <Navbar />

        {/* ── PHONE MODAL ────────────────────────────────────────────────── */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[28px] border border-white/40 bg-ground p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="/bKash-Logo.png" alt="bKash" className="h-6 w-6 rounded-[4px]" />
                  <h3 className="font-display text-[18px] font-semibold text-ink">
                    {page.modal.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError(null);
                  }}
                  className="text-ink-3 hover:text-ink text-xl font-medium"
                >
                  ✕
                </button>
              </div>

              <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
                {page.modal.desc}
              </p>

              <form onSubmit={handleCheckout} className="mt-5 space-y-4">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-3 mb-1.5">
                    {page.modal.phoneLabel}
                  </label>
                  <input
                    type="tel"
                    placeholder={page.modal.phonePlaceholder}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    className="w-full rounded-xl border border-white/30 bg-white/40 px-4 py-3 text-[15px] font-medium text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-3 mb-1.5">
                    {page.modal.emailLabel}
                  </label>
                  <input
                    type="email"
                    placeholder={page.modal.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full rounded-xl border border-white/30 bg-white/40 px-4 py-3 text-[15px] font-medium text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    required
                  />
                </div>

                {error && (
                  <p className="text-[13px] text-red-500 font-medium">
                    {error}
                  </p>
                )}

                <div className="rounded-xl bg-brand/5 border border-brand/10 p-3 text-[13px] text-ink-2 flex justify-between items-center">
                  <span>{page.modal.selectedPlan}</span>
                  <span className="font-semibold text-ink">
                    ৳{price} {periodLabel}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-brand py-3.5 font-display text-[15px] font-semibold text-white shadow-lift transition-all hover:bg-brand-deep disabled:opacity-60"
                >
                  {loading ? page.modal.connecting : page.modal.proceed}
                  {!loading && <IconArrow className="h-4 w-4" />}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 pb-6 pt-28 text-center sm:px-8 lg:pt-36">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
            {page.eyebrow}
          </p>
          <h1 className="mx-auto mt-4 max-w-[22ch] text-balance font-display text-[clamp(2.2rem,4.4vw,3.5rem)] font-semibold leading-[1.04] tracking-display text-ink">
            {page.title}
          </h1>
          <p className="mx-auto mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
            {page.sub}
          </p>

          {/* billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/40 bg-white/20 p-1.5 shadow-sm backdrop-blur-md">
            <button
              type="button"
              onClick={() => setBilling("weekly")}
              className={`rounded-full px-5 py-2 text-[14.5px] font-semibold tracking-tight transition-all duration-200 ${
                isWeekly
                  ? "bg-brand text-white shadow-press"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              {page.weekly}
            </button>
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`rounded-full px-5 py-2 text-[14.5px] font-semibold tracking-tight transition-all duration-200 ${
                !isWeekly
                  ? "bg-brand text-white shadow-press"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              {page.monthly}
            </button>
          </div>
        </section>

        {/* ── TIER CARD ─────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <div className="mx-auto max-w-[400px]">
            <div className="relative flex flex-col rounded-[32px] border border-white/40 bg-white/20 p-6 shadow-2xl backdrop-blur-xl transition-shadow duration-200">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
                {page.tier}
              </p>
              <h3 className="mt-2 font-display text-[24px] font-semibold tracking-tight text-ink">
                {page.planName}
              </h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
                {page.planDesc}
              </p>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-display text-[36px] font-semibold tracking-tight text-ink">
                  ৳{price.toLocaleString("en-BD")}
                </span>
                <span className="text-[14.5px] text-ink-3">{periodLabel}</span>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="group mt-6 inline-flex items-center justify-center gap-2.5 rounded-full bg-brand px-6 py-3.5 font-display text-[15px] font-semibold tracking-tight text-white shadow-lift transition-all duration-200 hover:bg-brand-deep hover:shadow-panel active:translate-y-px active:shadow-press"
              >
                {page.subscribeWith}
                <img src="/bKash-Logo.png" alt="bKash" className="h-[18px] w-[18px] rounded-[3px]" />
                <IconArrow className="h-[17px] w-[17px] transition-transform duration-300 ease-out group-hover:translate-x-1" />
              </button>

              <ul className="mt-6 flex-1 space-y-3 pt-6">
                {page.features.map((f) => {
                  const needsBanglaFace = lang === "en" && f.includes("বাংলা");
                  return (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-[14.5px] leading-snug text-ink-2"
                    >
                      <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
                      <span
                        lang={needsBanglaFace ? "bn" : undefined}
                        className={needsBanglaFace ? "font-bn" : undefined}
                      >
                        {f}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <p className="mt-8 flex items-center justify-center gap-2.5 text-[14px] text-ink-3">
            <img src="/bKash-Logo.png" alt="bKash" className="h-5 w-5 rounded-[4px]" />
            {page.trust}
          </p>
        </section>

        {/* ── FEATURE GRID ──────────────────────────────────────────────── */}
        <section className="">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:py-14 lg:py-16 sm:px-8">
            <h2 className="text-center font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-[1.08] tracking-display text-ink">
              {page.allFeaturesTitle}
            </h2>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {page.allFeatures.map((f) => (
                <div key={f.num} className="flex gap-4 rounded-2xl border border-white/40 bg-white/20 p-5 shadow-xl backdrop-blur-md">
                  <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 font-mono text-[13px] font-semibold text-ink-3">
                    {f.num}
                  </span>
                  <div>
                    <h3 className="font-display text-[15px] font-semibold tracking-tight text-ink">
                      {f.title}
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
                      {f.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
