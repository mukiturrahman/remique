import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { IconArrow } from "@/components/icons";

type Review = {
  name: string;
  role: string;
  stars: number;
  text: string;
  lang: "en" | "bn";
};

const REVIEWS: Review[] = [
  {
    name: "সাবরিনা",
    role: "Medical Student",
    stars: 5,
    text: "আমি প্রতিদিন ওষুধ খেতে ভুলে যেতাম। Remique দিয়ে একবার সেট করেছি, এখন প্রতিদিন সময়মতো মনে করিয়ে দেয়। Life saver!",
    lang: "bn",
  },
  {
    name: "Kamal",
    role: "Small Business Owner",
    stars: 5,
    text: "I run a shop and have 15 things to remember daily. Remique handles stock checks, supplier calls, and payment reminders. Better than any to-do app I've tried.",
    lang: "en",
  },
  {
    name: "ফারজানা",
    role: "Working Mother",
    stars: 5,
    text: "বাচ্চার স্কুলের ফি, ডাক্তারের অ্যাপয়েন্টমেন্ট, বিদ্যুৎ বিল — সব Remique-এ সেট করে রেখেছি। মাথা থেকে চিন্তা নেমে গেছে।",
    lang: "bn",
  },
  {
    name: "Rahat",
    role: "Freelance Designer",
    stars: 5,
    text: "Client follow-ups used to fall through the cracks. Now I just text Remique 'follow up with Nadia Friday' and forget about it. Simple and it actually works.",
    lang: "en",
  },
  {
    name: "তানভীর",
    role: "University Student",
    stars: 5,
    text: "Banglish e likhle bujhe jai — eta best part. 'Kalke shokal exam prep' likhle shob bujhe niye reminder set kore dey.",
    lang: "en",
  },
  {
    name: "Priya",
    role: "HR Manager",
    stars: 5,
    text: "Managing team deadlines and my own schedule was chaos. Remique is like having a personal secretary on WhatsApp. The daily briefing alone is worth it.",
    lang: "en",
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`h-4 w-4 ${i < count ? "text-[#F59E0B]" : "text-line"}`}
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialsPage() {
  return (
    <main className="bg-ground">
      <Navbar />

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-6 pt-16 text-center sm:px-8 lg:pt-24">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
          Testimonials
        </p>
        <h1 className="mx-auto mt-4 max-w-[22ch] text-balance font-display text-[clamp(2.2rem,4.4vw,3.5rem)] font-semibold leading-[1.04] tracking-display text-ink">
          Rated five stars by people who used to forget things.
        </h1>
        <p className="mx-auto mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
          Real people, real reminders, real relief. Here is what they say.
        </p>
      </section>

      {/* ── REVIEWS GRID ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {REVIEWS.map((r) => {
            const isBn = r.lang === "bn";
            return (
              <div
                key={r.name}
                className="flex flex-col rounded-2xl border border-line bg-ground-2 p-6"
              >
                <Stars count={r.stars} />
                <p
                  lang={isBn ? "bn" : undefined}
                  className={`mt-4 flex-1 text-[15px] leading-relaxed text-ink-2 ${
                    isBn ? "font-bn" : ""
                  }`}
                >
                  &ldquo;{r.text}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3 border-t border-line pt-5">
                  <span className="inline-grid h-9 w-9 place-items-center rounded-full bg-brand-tint font-display text-[13px] font-semibold text-brand">
                    {r.name[0]}
                  </span>
                  <div>
                    <p
                      lang={isBn ? "bn" : undefined}
                      className={`text-[14px] font-semibold text-ink ${
                        isBn ? "font-bn" : ""
                      }`}
                    >
                      {r.name}
                    </p>
                    <p className="text-[13px] text-ink-3">{r.role}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="border-t border-line bg-ground-2">
        <div className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 lg:py-28">
          <h2 className="mx-auto max-w-[18ch] text-balance font-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.04] tracking-display text-ink">
            Join the people who stopped forgetting.
          </h2>
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
    </main>
  );
}
