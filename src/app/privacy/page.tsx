"use client";

import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";

export default function PrivacyPage() {
  return (
    <main className="page-gradient relative min-h-screen text-ink selection:bg-ink/10">
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-[0.6] mix-blend-overlay" style={{ backgroundImage: "url('/noise.svg')", backgroundSize: "256px" }} />
      <div className="relative z-10">
        <Navbar />

        <article className="mx-auto max-w-3xl px-5 pt-32 pb-24 sm:px-8 lg:pt-40">
          <header className="mb-12">
            <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-display text-ink">
              Privacy Policy
            </h1>
            <p className="mt-4 text-ink-2">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </header>

          <div className="space-y-8 text-[16px] leading-relaxed text-ink-2">
            <section>
              <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight text-ink">1. Information We Collect</h2>
              <p className="mb-4">
                Remique collects information to provide and improve our WhatsApp reminder service. When you use Remique, we collect:
              </p>
              <ul className="list-inside list-disc space-y-2">
                <li><strong>WhatsApp Phone Number:</strong> To identify your account and send reminders.</li>
                <li><strong>Message Content:</strong> The text you send us to set reminders, which we process to extract tasks and times.</li>
                <li><strong>Payment Information:</strong> When you subscribe via bKash, we collect necessary transaction identifiers. We do not store your bKash PIN or sensitive financial details.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight text-ink">2. How We Use Your Information</h2>
              <p className="mb-4">We use your information exclusively to:</p>
              <ul className="list-inside list-disc space-y-2">
                <li>Provide, operate, and maintain the Remique service.</li>
                <li>Process your text messages using AI to extract reminder intent.</li>
                <li>Send you timely reminders and follow-up nudges on WhatsApp.</li>
                <li>Manage your subscription and process payments.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight text-ink">3. Data Sharing and Security</h2>
              <p className="mb-4">
                We do not sell your personal data to third parties. We share your data only with trusted service providers necessary to operate the service (e.g., Meta/WhatsApp for messaging, OpenAI for intent extraction, and payment processors). We use HMAC signature verification to ensure all incoming messages are authentically from Meta.
              </p>
            </section>

            <section>
              <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight text-ink">4. Data Retention</h2>
              <p className="mb-4">
                We retain your phone number and reminder data for as long as your account is active. Once a reminder is completed, the specific text may be retained temporarily for service improvement and debugging before being anonymized or deleted.
              </p>
            </section>

            <section>
              <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight text-ink">5. Contact Us</h2>
              <p className="mb-4">
                If you have any questions about this Privacy Policy, please contact us at support@remique.app.
              </p>
            </section>
          </div>
        </article>

        <SiteFooter />
      </div>
    </main>
  );
}
