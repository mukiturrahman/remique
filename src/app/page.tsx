import { LiveThread } from "@/components/live-thread";
import { PricingSection } from "@/components/pricing-section";
import {
  IconArrow,
  IconExactTime,
  IconInstant,
  IconLedger,
  IconRing,
  IconScripts,
  IconVerified,
  MarkRemique,
  MarkWhatsApp,
} from "@/components/icons";

const PRICING_LINK = "#pricing";

const painPoints = [
  "forget to pay the electricity bill",
  "lose a note you saved yesterday",
  "miss your medicine three days in a row",
  "text yourself and still forget",
  "keep reminders in four different apps",
  "miss a meeting because you set the wrong time",
  "forget to call someone back",
  "let a deadline pass because no one reminded you",
];

const problems: { heading: string; body: string }[] = [
  {
    heading: "Your reminders live in five different places.",
    body: "Phone alarm, WhatsApp self-chat, a note on the fridge, a calendar you stopped checking. Nothing talks to anything else.",
  },
  {
    heading: "You text yourself. And still forget.",
    body: "You pin it, star it, save it for later. Then later never comes, and the message is buried under a hundred others.",
  },
  {
    heading: "Every app wants English. You type Banglish.",
    body: "You think in Bangla, type in Banglish, and no reminder app knows what \"kalke shokal\" means. So you translate, or you skip it.",
  },
];

const howItWorks: { step: string; title: string; desc: string }[] = [
  {
    step: "Capture",
    title: "Text it naturally",
    desc: "Write the way you actually type — English, Banglish, or বাংলা. No format, no slash commands, no date picker.",
  },
  {
    step: "Understand",
    title: "Remique reads it properly",
    desc: "It knows \"kalke shokal\" means tomorrow morning. It pulls out the task, resolves the time against Dhaka's clock, and confirms back in your language.",
  },
  {
    step: "Deliver",
    title: "It arrives on time",
    desc: "Your reminder fires exactly when it should. Not a notification you swipe away — a WhatsApp message you actually read.",
  },
];

const capabilities: {
  Icon: typeof IconScripts;
  title: string;
  desc: string;
}[] = [
  {
    Icon: IconInstant,
    title: "Confirmed in seconds",
    desc: "A reply comes straight back in the language you wrote in, so you know it is locked in.",
  },
  {
    Icon: IconExactTime,
    title: "Resolved to one exact moment",
    desc: "\"in 5 minutes\", \"next Friday at 3 PM\", \"kalke shokal 10 tay\" — all become a single timestamp.",
  },
  {
    Icon: IconLedger,
    title: "Manage in plain words",
    desc: "Ask to see your reminders, save a link, or recall a note. No menus, no reference numbers.",
  },
  {
    Icon: IconRing,
    title: "Queued to fire on time",
    desc: "Delivery is scheduled through Upstash QStash. It goes out when it says it will.",
  },
  {
    Icon: IconVerified,
    title: "Verified before it acts",
    desc: "Every message is checked against Meta's HMAC signature before Remique does anything.",
  },
  {
    Icon: IconScripts,
    title: "Asks when something is missing",
    desc: "No time on the task? Remique asks — in the language you wrote in — then schedules it.",
  },
];

const personas: {
  name: string;
  role: string;
  message: string;
  lang: "en" | "bn";
  reply: string;
}[] = [
  {
    name: "Rafiq",
    role: "Student",
    message: "Kalke shokal 8 tay math exam er preparation shuru korte mone koriye dio",
    lang: "en",
    reply: "Done! 🔔 Kalke shokal 8:00 AM e *Math exam preparation shuru* er reminder pathiye dibo.",
  },
  {
    name: "Tania",
    role: "Freelancer",
    message: "Remind me Friday at 6 PM to send the invoice to Karim bhai",
    lang: "en",
    reply: "Done! 🔔 Remique will remind you Friday at 6:00 PM to *Send invoice to Karim bhai*.",
  },
  {
    name: "Arif",
    role: "Business Owner",
    message: "Protidin bikal 5 tay stock check korte bolo",
    lang: "en",
    reply: "Done! 🔔 Protidin bikal 5:00 PM e *Stock check* er reminder pathiye dibo.",
  },
  {
    name: "Nusrat",
    role: "Parent",
    message: "পরশু সকালে বাচ্চার স্কুলে পেমেন্ট দিতে মনে করিয়ে দিও",
    lang: "bn",
    reply: "ঠিক আছে! 🔔 পরশু সকাল ৯:০০ টায় আপনাকে *বাচ্চার স্কুলে পেমেন্ট দেওয়া* এর কথা মনে করিয়ে দেওয়া হবে।",
  },
];

function CtaButton({
  children,
  tone = "brand",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "brand" | "light";
  className?: string;
}) {
  const tones = {
    brand:
      "bg-brand text-white shadow-lift hover:bg-brand-deep hover:shadow-panel active:shadow-press",
    light:
      "bg-white text-brand-deep shadow-lift hover:bg-ground-2 hover:shadow-panel active:shadow-press",
  } as const;

  return (
    <a
      href={PRICING_LINK}
      className={`group inline-flex items-center gap-2.5 rounded-full px-6 py-3.5 font-display text-[16px] font-semibold tracking-tight transition-[background-color,box-shadow,transform] duration-200 ease-out active:translate-y-px ${tones[tone]} ${className}`}
    >
      {children}
      <IconArrow className="h-[17px] w-[17px] transition-transform duration-300 ease-out group-hover:translate-x-1" />
    </a>
  );
}

export default function HomePage() {
  return (
    <main className="bg-ground">
      {/* ── NAV ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-line/70 bg-ground supports-[backdrop-filter]:bg-ground/95 backdrop-blur-xl">
        <nav className="mx-auto flex h-[68px] max-w-6xl items-center gap-4 px-5 sm:px-8">
          <a href="#top" className="flex items-center gap-2.5 rounded-md">
            <MarkRemique className="h-[30px] w-[30px] text-brand" />
            <span className="font-display text-[19px] font-semibold tracking-tight text-ink">
              Remique
            </span>
          </a>
          <a
            href="#how"
            className="ml-auto hidden rounded-md text-[14.5px] font-medium text-ink-2 transition-colors hover:text-ink sm:block"
          >
            How it works
          </a>
          <a
            href="#use-cases"
            className="hidden rounded-md text-[14.5px] font-medium text-ink-2 transition-colors hover:text-ink sm:block"
          >
            Use cases
          </a>
          <a
            href="#pricing"
            className="hidden rounded-md text-[14.5px] font-medium text-ink-2 transition-colors hover:text-ink sm:block"
          >
            Pricing
          </a>
          <a
            href={PRICING_LINK}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 font-display text-[14.5px] font-semibold tracking-tight text-white transition-colors duration-200 hover:bg-brand-deep sm:ml-0"
          >
            Get started
          </a>
        </nav>
      </header>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section id="top" className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(80%_65%_at_18%_0%,var(--brand-tint)_0%,transparent_62%)]"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-32 lg:pt-24">
          <div>
            <h1 className="max-w-[18ch] text-balance font-display text-[clamp(2.5rem,5.4vw,4.05rem)] font-semibold leading-[1] tracking-display text-ink">
              You shouldn&rsquo;t have to{" "}
              <span className="text-brand">{painPoints[0]}</span>
            </h1>

            <p className="mt-7 max-w-[46ch] text-[clamp(1.05rem,1.6vw,1.2rem)] leading-relaxed text-ink-2">
              That&rsquo;s why we built Remique. A WhatsApp AI assistant that remembers
              for you — in English, Banglish, or{" "}
              <span lang="bn" className="font-bn font-medium text-ink">
                বাংলা
              </span>
              .
            </p>

            <div className="mt-5 flex items-center gap-3 text-[14.5px] text-ink-3">
              <span className="inline-flex items-center gap-1.5">
                <MarkWhatsApp className="h-4 w-4 text-ink-3" />
                Works on WhatsApp
              </span>
              <span className="text-line-strong">·</span>
              <span>No app to install</span>
            </div>

            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <CtaButton>Get started</CtaButton>
              <p className="text-[14.5px] leading-snug text-ink-3">
                Starts at{" "}
                <span className="tabular font-medium text-ink-2">
                  ৳200/month
                </span>
                <span className="mx-2 text-line-strong">·</span>
                Pay with bKash
              </p>
            </div>
          </div>

          <div className="lg:pl-4">
            <LiveThread />
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ─────────────────────────────────────────────────── */}
      <div className="border-y border-line bg-ground-2">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-5 sm:px-8">
          {[
            "Built in Bangladesh",
            "English, Banglish & বাংলা",
            "No account needed",
            "Arrives on WhatsApp",
          ].map((item) => (
            <span
              key={item}
              className="flex items-center gap-2 text-[14px] font-medium text-ink-2"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── PROBLEM AMPLIFICATION ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-16 lg:gap-24">
          {problems.map((p) => (
            <div key={p.heading} className="max-w-[52ch]">
              <h2 className="text-balance font-display text-[clamp(1.6rem,3vw,2.4rem)] font-semibold leading-[1.1] tracking-display text-ink">
                {p.heading}
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed text-ink-2">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── EMOTIONAL PIVOT ───────────────────────────────────────────── */}
      <section className="border-y border-line bg-ground-2">
        <div className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 lg:py-28">
          <p className="text-[17px] font-medium text-ink-2">
            Your mind never stops.
          </p>
          <h2 className="mx-auto mt-4 max-w-[18ch] text-balance font-display text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.04] tracking-display text-ink">
            It&rsquo;s not a bad memory. It&rsquo;s overload.
          </h2>
          <p className="mx-auto mt-6 max-w-[44ch] text-[17px] leading-relaxed text-ink-2">
            That&rsquo;s why we built Remique. So you don&rsquo;t have to carry
            everything in your head. You text it once, and it handles the rest.
          </p>
          <div className="mt-10">
            <CtaButton>See how it works</CtaButton>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <h2 className="max-w-[20ch] text-balance font-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.04] tracking-display text-ink">
          Write to it like a friend. It turns it into action.
        </h2>
        <p className="mt-5 max-w-measure text-[17px] leading-relaxed text-ink-2">
          No commands, no formats, no folders. Just natural language on WhatsApp.
        </p>

        <div className="mt-14 grid gap-x-10 md:grid-cols-3">
          {howItWorks.map((s) => (
            <div
              key={s.step}
              className="border-t border-line pt-6 [&:not(:first-child)]:mt-8 md:[&:not(:first-child)]:mt-0"
            >
              <span className="inline-block rounded-full bg-brand-tint px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
                {s.step}
              </span>
              <h3 className="mt-4 font-display text-[20px] font-semibold tracking-tight text-ink">
                {s.title}
              </h3>
              <p className="mt-3 max-w-measure text-[15.5px] leading-relaxed text-ink-2">
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <CtaButton>Get started</CtaButton>
        </div>
      </section>

      {/* ── EASE ──────────────────────────────────────────────────────── */}
      <section className="border-y border-line bg-ground-2">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <h2 className="max-w-[16ch] text-balance font-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.04] tracking-display text-ink">
                As easy as texting a friend.
              </h2>
              <p className="mt-6 max-w-measure text-[17px] leading-relaxed text-ink-2">
                Remique lives inside WhatsApp — the app you already have open.
                No download, no signup, no learning curve. Just open a chat and type.
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                "No new app to install",
                "No account to create",
                "No commands to learn",
                "No date picker to fight",
                "Right inside WhatsApp",
                "Works in your language",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-line bg-ground px-4 py-3.5 text-[15px] font-medium text-ink"
                >
                  <span className="inline-grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-tint">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-brand"
                    >
                      <path
                        d="M3.5 8.5 6.5 11.5 12.5 5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── USE CASES ─────────────────────────────────────────────────── */}
      <section id="use-cases" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <h2 className="max-w-[18ch] text-balance font-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.04] tracking-display text-ink">
          Built for every kind of life.
        </h2>
        <p className="mt-5 max-w-measure text-[17px] leading-relaxed text-ink-2">
          Students, freelancers, business owners, parents — same WhatsApp,
          same Remique, different lives.
        </p>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {personas.map((p) => {
            const isBn = p.lang === "bn";
            return (
              <div
                key={p.name}
                className="rounded-2xl border border-line bg-ground-2 p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-grid h-10 w-10 place-items-center rounded-full bg-brand-tint font-display text-[15px] font-semibold text-brand">
                    {p.name[0]}
                  </span>
                  <div>
                    <p className="font-display text-[15px] font-semibold tracking-tight text-ink">
                      {p.name}
                    </p>
                    <p className="text-[13px] text-ink-3">{p.role}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  <div className="flex justify-end">
                    <p
                      lang={isBn ? "bn" : undefined}
                      className={`max-w-[88%] rounded-2xl rounded-br-md bg-brand px-3.5 py-2.5 text-[14px] leading-snug text-white ${
                        isBn ? "font-bn" : ""
                      }`}
                    >
                      {p.message}
                    </p>
                  </div>
                  <div className="flex justify-start">
                    <p
                      lang={isBn ? "bn" : undefined}
                      className={`max-w-[88%] rounded-2xl rounded-bl-md bg-ground-3 px-3.5 py-2.5 text-[14px] leading-snug text-ink-2 ${
                        isBn ? "font-bn" : ""
                      }`}
                    >
                      {p.reply}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CAPABILITIES ──────────────────────────────────────────────── */}
      <section className="border-t border-line bg-ground-2">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div className="lg:sticky lg:top-[100px] lg:self-start">
              <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-brand-tint text-brand">
                <IconScripts className="h-6 w-6" />
              </span>
              <h2 className="mt-7 max-w-[15ch] text-balance font-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.04] tracking-display text-ink">
                Your memory, with superpowers.
              </h2>
              <p className="mt-6 max-w-measure text-[17px] leading-relaxed text-ink-2">
                English, Banglish and{" "}
                <span lang="bn" className="font-bn font-medium text-ink">
                  বাংলা
                </span>{" "}
                — one at a time or mixed inside a single sentence. Remique answers in
                whichever you used.
              </p>
              <div className="mt-9">
                <CtaButton>Get started</CtaButton>
              </div>
            </div>

            <ul className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
              {capabilities.map(({ Icon, title, desc }) => (
                <li
                  key={title}
                  className="border-t border-line py-6 first:border-t-0 first:pt-0 sm:[&:nth-child(2)]:border-t-0 sm:[&:nth-child(2)]:pt-0"
                >
                  <Icon className="h-5 w-5 text-brand" />
                  <h3 className="mt-3.5 font-display text-[17px] font-semibold tracking-tight text-ink">
                    {title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────── */}
      <PricingSection />

      {/* ── CLOSE ─────────────────────────────────────────────────────── */}
      <section className="px-5 pb-20 sm:px-8 lg:pb-28">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-[linear-gradient(158deg,var(--brand)_0%,var(--brand-deep)_58%)] px-6 py-20 text-center sm:px-12 lg:py-28">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-70 mix-blend-soft-light bg-[radial-gradient(120%_120%_at_50%_-10%,rgba(255,255,255,0.5)_0%,transparent_55%)]"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-[16ch] text-balance font-display text-[clamp(2.1rem,4.4vw,3.5rem)] font-semibold leading-[1.02] tracking-display text-white">
              Your second brain is one message away.
            </h2>
            <p className="mx-auto mt-6 max-w-[44ch] text-[17px] leading-relaxed text-brand-tint">
              Pick a plan, pay with bKash, and start texting Remique. That is the whole setup.
            </p>
            <div className="mt-10 flex flex-col items-center gap-5">
              <CtaButton tone="light">See plans</CtaButton>
              <p className="tabular text-[14.5px] text-brand-tint">
                Starts at ৳200/month
                <span className="mx-2 opacity-50">·</span>
                No card needed
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:px-8">
          <div className="flex items-center gap-2.5">
            <MarkRemique className="h-[26px] w-[26px] text-brand" />
            <span className="font-display text-[16px] font-semibold tracking-tight text-ink">
              Remique
            </span>
          </div>
          <p className="text-[14.5px] leading-relaxed text-ink-3 sm:ml-auto sm:text-right">
            A WhatsApp personal assistant. Built in Bangladesh.
          </p>
          <a
            href={PRICING_LINK}
            className="tabular rounded-md text-[14.5px] font-medium text-brand underline decoration-brand/30 transition-colors hover:decoration-brand"
          >
            View plans
          </a>
        </div>
      </footer>
    </main>
  );
}
