import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppMockup, type ChatMessage } from "@/components/whatsapp-mockup";
import { IconArrow } from "@/components/icons";

type Persona = {
  name: string;
  role: string;
  desc: string;
  chat: ChatMessage[];
  accent: string;
};

const PERSONAS: Persona[] = [
  {
    name: "রাফিক",
    role: "Student",
    desc: "Exam prep, assignment deadlines, class schedules — Rafiq types in Banglish and Remique handles the rest.",
    accent: "no more missed deadlines",
    chat: [
      { text: "Kalke shokal 8 tay math exam er preparation shuru korte mone koriye dio", from: "user", time: "10:30 PM" },
      { text: "Done! 🔔 কালকে সকাল ৮:০০ AM এ **Math exam preparation শুরু** এর reminder পাঠিয়ে দিব।", from: "bot", time: "10:30 PM" },
      { text: "also wednesday 2pm assignment submit", from: "user", time: "10:31 PM" },
      { text: "Done! 🔔 Wednesday ২:০০ PM এ **Assignment submit** এর reminder পাঠিয়ে দিব।", from: "bot", time: "10:31 PM" },
    ],
  },
  {
    name: "তানিয়া",
    role: "Freelancer",
    desc: "Client invoices, follow-ups, project deadlines — Tania never lets a deliverable slip.",
    accent: "clients stay impressed",
    chat: [
      { text: "Remind me Friday at 6 PM to send the invoice to Karim bhai", from: "user", time: "2:15 PM" },
      { text: "Done! 🔔 Friday ৬:০০ PM এ **Send invoice to Karim bhai** এর reminder পাঠিয়ে দিব।", from: "bot", time: "2:15 PM" },
      { text: "also follow up with Nadia on the logo next Monday", from: "user", time: "2:16 PM" },
      { text: "Done! 🔔 Next Monday সকাল ৯:০০ AM এ **Follow up with Nadia on the logo** এর reminder পাঠিয়ে দিব।", from: "bot", time: "2:16 PM" },
    ],
  },
  {
    name: "আরিফ",
    role: "Business Owner",
    desc: "Daily stock checks, supplier calls, staff reminders — Arif runs his shop with a WhatsApp chat.",
    accent: "the shop runs itself",
    chat: [
      { text: "Protidin bikal 5 tay stock check korte bolo", from: "user", time: "9:00 AM" },
      { text: "Done! 🔔 প্রতিদিন বিকাল ৫:০০ PM এ **Stock check** এর reminder পাঠিয়ে দিব।", from: "bot", time: "9:00 AM" },
      { text: "shokal 10 tay staff meeting", from: "user", time: "9:01 AM" },
      { text: "Done! 🔔 আজ সকাল ১০:০০ AM এ **Staff meeting** এর reminder পাঠিয়ে দিব।", from: "bot", time: "9:01 AM" },
    ],
  },
  {
    name: "নুসরাত",
    role: "Parent",
    desc: "School fees, doctor visits, family birthdays — Nusrat never forgets what matters most.",
    accent: "family things, handled",
    chat: [
      { text: "পরশু সকালে বাচ্চার স্কুলে পেমেন্ট দিতে মনে করিয়ে দিও", from: "user", time: "8:45 PM" },
      { text: "ঠিক আছে! 🔔 পরশু সকাল ৯:০০ টায় **বাচ্চার স্কুলে পেমেন্ট দেওয়া** এর কথা মনে করিয়ে দেওয়া হবে।", from: "bot", time: "8:45 PM" },
      { text: "আর প্রতি মাসের ১ তারিখে বিদ্যুৎ বিল দিতে বলো", from: "user", time: "8:46 PM" },
      { text: "ঠিক আছে! 🔔 প্রতি মাসের ১ তারিখ সকাল ৯:০০ টায় **বিদ্যুৎ বিল দেওয়া** এর কথা মনে করিয়ে দেওয়া হবে।", from: "bot", time: "8:46 PM" },
    ],
  },
];

export default function UseCasesPage() {
  return (
    <main className="bg-ground">
      <Navbar />

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-6 pt-16 sm:px-8 lg:pt-24">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
          Use cases
        </p>
        <h1 className="mt-4 max-w-[20ch] text-balance font-display text-[clamp(2.2rem,4.4vw,3.5rem)] font-semibold leading-[1.04] tracking-display text-ink">
          Built for every kind of life.
        </h1>
        <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
          Students, freelancers, business owners, parents — same WhatsApp, same Remique, different lives.
        </p>
      </section>

      {/* ── PERSONA SECTIONS ──────────────────────────────────────────── */}
      {PERSONAS.map((p, i) => {
        const even = i % 2 === 0;
        return (
          <section
            key={p.name}
            className={`${even ? "bg-ground" : "border-y border-line bg-ground-2"}`}
          >
            <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
              <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                <div className={even ? "" : "order-2 lg:order-1"}>
                  {even ? (
                    <>
                      <PersonaInfo persona={p} />
                    </>
                  ) : (
                    <WhatsAppMockup
                      messages={p.chat}
                      accentText={p.accent}
                    />
                  )}
                </div>
                <div className={even ? "" : "order-1 lg:order-2"}>
                  {even ? (
                    <WhatsAppMockup
                      messages={p.chat}
                      accentText={p.accent}
                    />
                  ) : (
                    <PersonaInfo persona={p} />
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 lg:py-28">
        <h2 className="mx-auto max-w-[18ch] text-balance font-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.04] tracking-display text-ink">
          Whatever your life looks like, Remique fits in.
        </h2>
        <p className="mx-auto mt-5 max-w-[44ch] text-[17px] leading-relaxed text-ink-2">
          Start texting. Remique adapts to you.
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
      </section>

      <SiteFooter />
    </main>
  );
}

function PersonaInfo({ persona }: { persona: Persona }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="inline-grid h-12 w-12 place-items-center rounded-full bg-brand-tint font-display text-[18px] font-semibold text-brand">
          {persona.name[0]}
        </span>
        <div>
          <p lang="bn" className="font-bn font-display text-[17px] font-semibold tracking-tight text-ink">
            {persona.name}
          </p>
          <p className="text-[14px] text-ink-3">{persona.role}</p>
        </div>
      </div>
      <p className="mt-5 max-w-[44ch] text-[16px] leading-relaxed text-ink-2">
        {persona.desc}
      </p>
    </div>
  );
}
