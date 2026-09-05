import { LiveThread } from "@/components/live-thread";
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

const BOT_WHATSAPP_LINK = "https://wa.me/8801853501469?text=Hi";
const BOT_NUMBER = "+880 1853-501469";

/**
 * The vocabulary Remique resolves before it schedules or saves anything. These are
 * the parser's own mappings (src/lib/llm.ts), not illustrative examples.
 */
const timeWords: { word: string; bengali: string; resolves: string }[] = [
  { word: "kalke · kaal", bengali: "আগামীকাল", resolves: "Tomorrow" },
  { word: "porshu", bengali: "পরশু", resolves: "Day after tomorrow" },
  { word: "shokal", bengali: "সকাল", resolves: "9:00 AM" },
  { word: "dupur", bengali: "দুপুর", resolves: "2:00 PM" },
  { word: "bikal", bengali: "বিকাল", resolves: "5:00 PM" },
  { word: "shondha", bengali: "সন্ধ্যা", resolves: "7:30 PM" },
  { word: "raat", bengali: "রাত", resolves: "9:00 PM" },
  { word: "30 min por", bengali: "৩০ মিনিট পর", resolves: "Now + 30 minutes" },
];

const steps: { title: string; desc: string }[] = [
  {
    title: "You send a message",
    desc: "Text Remique the way you would text a friend. There are no commands to learn and no format to get right.",
  },
  {
    title: "It gets read properly",
    desc: "The parser pulls out the task and resolves the time against Dhaka's clock. If you left the time out, Remique asks — in the language you wrote in.",
  },
  {
    title: "It arrives on time",
    desc: "Your reminders arrive exactly on time, and your saved links and notes are recalled the moment you ask for them.",
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
    desc: "A reply comes straight back in the language you wrote in, so you know it is locked in before you put the phone down.",
  },
  {
    Icon: IconExactTime,
    title: "Resolved to one exact moment",
    desc: "“in 5 minutes”, “next Friday at 3 PM” and “kalke shokal 10 tay” all end up as a single timestamp.",
  },
  {
    Icon: IconLedger,
    title: "Manage tasks and memories in plain words",
    desc: "Ask to see your reminders, save a company link, or recall a note. No menus, no reference numbers.",
  },
  {
    Icon: IconRing,
    title: "Queued to fire on time",
    desc: "Delivery is scheduled through Upstash QStash, so the message goes out when it says it will.",
  },
  {
    Icon: IconVerified,
    title: "Verified before it acts",
    desc: "Every inbound message is checked against Meta's HMAC signature before Remique does anything with it.",
  },
  {
    Icon: IconScripts,
    title: "Asks when something is missing",
    desc: "Give it a task with no time on it and Remique asks for the time — in the language you wrote in — then schedules it.",
  },
];

function WhatsAppButton({
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
      href={BOT_WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex items-center gap-2.5 rounded-full px-6 py-3.5 font-display text-[16px] font-semibold tracking-tight transition-[background-color,box-shadow,transform] duration-200 ease-out active:translate-y-px ${tones[tone]} ${className}`}
    >
      <MarkWhatsApp className="h-[18px] w-[18px]" />
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
            href="#language"
            className="hidden rounded-md text-[14.5px] font-medium text-ink-2 transition-colors hover:text-ink sm:block"
          >
            Language
          </a>
          <a
            href={BOT_WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 font-display text-[14.5px] font-semibold tracking-tight text-white transition-colors duration-200 hover:bg-brand-deep sm:ml-0"
          >
            <MarkWhatsApp className="h-4 w-4" />
            Open WhatsApp
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
            <h1 className="max-w-[16ch] text-balance font-display text-[clamp(2.5rem,5.4vw,4.05rem)] font-semibold leading-[1] tracking-display text-ink">
              Text it however you type. Remique reminds you on time.
            </h1>

            <p className="mt-7 max-w-[46ch] text-[clamp(1.05rem,1.6vw,1.2rem)] leading-relaxed text-ink-2">
              An AI assistant and memory bank that lives inside WhatsApp — written in English, Banglish or{" "}
              <span lang="bn" className="font-bn font-medium text-ink">
                বাংলা
              </span>
              . Nothing to install, no account to make.
            </p>

            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <WhatsAppButton>Open WhatsApp</WhatsAppButton>
              <p className="text-[14.5px] leading-snug text-ink-3">
                <span className="tabular font-medium text-ink-2">{BOT_NUMBER}</span>
                <span className="mx-2 text-line-strong">·</span>
                Free to use
              </p>
            </div>
          </div>

          <div className="lg:pl-4">
            <LiveThread />
          </div>
        </div>
      </section>

      {/* ── THE LANGUAGE PROOF ────────────────────────────────────────── */}
      <section id="language" className="border-y border-line bg-ground-2">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div className="lg:sticky lg:top-[100px] lg:self-start">
              <h2 className="max-w-[16ch] text-balance font-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.04] tracking-display text-ink">
                It already knows what shokal means.
              </h2>
              <p className="mt-6 max-w-measure text-[17px] leading-relaxed text-ink-2">
                Most assistants want a date picker. Remique carries the words people
                actually use, and resolves each one against Dhaka&rsquo;s clock before
                anything gets scheduled.
              </p>
              <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-ground px-3.5 py-2 font-mono text-[12px] tracking-tight text-ink-3">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                Asia/Dhaka · UTC+6
              </p>
            </div>

            <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
              {timeWords.map((t) => (
                <div key={t.word} className="bg-ground px-5 py-5">
                  <dt className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="font-display text-[19px] font-semibold tracking-tight text-ink">
                      {t.word}
                    </span>
                    <span lang="bn" className="font-bn text-[17px] leading-none text-ink-3">
                      {t.bengali}
                    </span>
                  </dt>
                  <dd className="tabular mt-2.5 flex items-center gap-2 font-mono text-[13px] text-ink-2">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                      className="h-3.5 w-3.5 shrink-0 text-brand"
                    >
                      <path
                        d="M2.5 8h10M9 4.5 12.5 8 9 11.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {t.resolves}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <h2 className="max-w-[18ch] text-balance font-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.04] tracking-display text-ink">
          Three seconds of typing, and it is handled.
        </h2>

        <ol className="mt-14 grid gap-x-10 md:grid-cols-3">
          {steps.map((s) => (
            <li
              key={s.title}
              className="border-t border-line pt-6 [&:not(:first-child)]:mt-8 md:[&:not(:first-child)]:mt-0"
            >
              <h3 className="font-display text-[20px] font-semibold tracking-tight text-ink">
                {s.title}
              </h3>
              <p className="mt-3 max-w-measure text-[15.5px] leading-relaxed text-ink-2">
                {s.desc}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── CAPABILITIES ──────────────────────────────────────────────── */}
      <section className="border-t border-line bg-ground">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div className="lg:sticky lg:top-[100px] lg:self-start">
              <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-brand-tint text-brand">
                <IconScripts className="h-6 w-6" />
              </span>
              <h2 className="mt-7 max-w-[15ch] text-balance font-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.04] tracking-display text-ink">
                Built for the way Bangladesh types.
              </h2>
              <p className="mt-6 max-w-measure text-[17px] leading-relaxed text-ink-2">
                English, Banglish and{" "}
                <span lang="bn" className="font-bn font-medium text-ink">
                  বাংলা
                </span>{" "}
                — one at a time or mixed inside a single sentence. Remique answers in
                whichever you used, and works the same anywhere else in the world.
              </p>
              <div className="mt-9">
                <WhatsAppButton>Send your first message</WhatsAppButton>
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
              Open WhatsApp, ask a question, save a note, or set a reminder. That is the whole setup.
            </p>
            <div className="mt-10 flex flex-col items-center gap-5">
              <WhatsAppButton tone="light">Open WhatsApp</WhatsAppButton>
              <p className="tabular text-[14.5px] text-brand-tint">
                {BOT_NUMBER}
                <span className="mx-2 opacity-50">·</span>
                No account, no install
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
            href={BOT_WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="tabular rounded-md text-[14.5px] font-medium text-brand underline decoration-brand/30 transition-colors hover:decoration-brand"
          >
            {BOT_NUMBER}
          </a>
        </div>
      </footer>
    </main>
  );
}
