"use client";

import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";

export default function TermsPage() {
  return (
    <main className="page-gradient relative min-h-screen text-ink selection:bg-ink/10">
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-[0.6] mix-blend-overlay" style={{ backgroundImage: "url('/noise.svg')", backgroundSize: "256px" }} />
      <div className="relative z-10">
        <Navbar />

        <article className="mx-auto max-w-3xl px-5 pt-32 pb-24 sm:px-8 lg:pt-40">
          <header className="mb-12">
            <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-display text-ink">
              Terms of Service
            </h1>
            <p className="mt-4 text-ink-2">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </header>

          <div className="space-y-8 text-[16px] leading-relaxed text-ink-2">
            <section>
              <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight text-ink">1. Acceptance of Terms</h2>
              <p className="mb-4">
                By accessing and using Remique ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight text-ink">2. Description of Service</h2>
              <p className="mb-4">
                Remique is an AI-powered WhatsApp assistant designed to parse text messages and schedule reminders. The Service depends on third-party platforms, primarily WhatsApp (Meta). We are not affiliated with, endorsed, or sponsored by WhatsApp Inc.
              </p>
            </section>

            <section>
              <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight text-ink">3. Subscriptions and Payments</h2>
              <p className="mb-4">
                Certain features of Remique require a paid subscription. Payments are processed via bKash. By subscribing, you agree to the pricing terms presented at checkout. Subscriptions are billed on a recurring basis (e.g., weekly, monthly) depending on your selected plan. You may cancel at any time, but no refunds will be provided for partial periods.
              </p>
            </section>

            <section>
              <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight text-ink">4. User Responsibilities</h2>
              <p className="mb-4">
                You agree not to use the Service for any unlawful purpose or in any way that interrupts, damages, or impairs the Service. You are responsible for any data charges or fees incurred from your mobile provider while using WhatsApp to interact with Remique.
              </p>
            </section>

            <section>
              <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight text-ink">5. Limitation of Liability</h2>
              <p className="mb-4">
                Remique is provided on an "as is" and "as available" basis. While we strive for high reliability, we do not guarantee that reminders will always be delivered exactly on time due to potential network latency, AI misinterpretation, or third-party service outages. Remique shall not be liable for any indirect, incidental, or consequential damages arising from missed reminders or service downtime.
              </p>
            </section>

            <section>
              <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight text-ink">6. Modifications to the Service</h2>
              <p className="mb-4">
                We reserve the right to modify or discontinue the Service (or any part thereof) with or without notice at any time. We may also update these Terms periodically; continued use of the Service constitutes acceptance of any changes.
              </p>
            </section>

            <section>
              <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight text-ink">7. Contact Information</h2>
              <p className="mb-4">
                For any questions regarding these Terms, please contact us at support@remique.app.
              </p>
            </section>
          </div>
        </article>

        <SiteFooter />
      </div>
    </main>
  );
}
