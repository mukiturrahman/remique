"use client";

import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { HeroRotator } from "@/components/hero-rotator";
import { HeroVideo } from "@/components/hero-video";
import { WhatsAppMockup, type ChatMessage } from "@/components/whatsapp-mockup";
import { PhoneFrame } from "@/components/phone-frame";
import { HomeFaq } from "@/components/home-faq";
import { HomePricing } from "@/components/home-pricing";
import { useCopy, useLang } from "@/components/lang-provider";
import {
    IconArrow,
    MarkWhatsApp,
    IconInstant,
    IconExactTime,
    IconRepeat,
    IconNudge,
    IconScripts,
    IconVerified,
    IconPriority,
    IconCheckCircle,
} from "@/components/icons";

/* ── DATA ──────────────────────────────────────────────────────────── */

/**
 * Deliberately mixed English and Bangla in both languages: the mixing is what
 * the demo is demonstrating, so it is not translated.
 */
const HERO_CHAT: ChatMessage[] = [
    {
        text: "Remind me to pay the electricity bill tomorrow at 10 AM",
        from: "user",
        time: "9:14 AM",
    },
    {
        text: "✅ Got it. I'll remind you to **pay the electricity bill** tomorrow at 10:00 AM.",
        from: "bot",
        time: "9:14 AM",
    },
    { text: "Actually make it 11 AM", from: "user", time: "9:15 AM" },
    { text: "✏️ Updated. I'll remind you at 11:00 AM instead.", from: "bot", time: "9:15 AM" },
    { text: "আর বিকালে ৫ টায় মাকে কল দিতে মনে করিয়ে দিও", from: "user", time: "9:16 AM" },
    {
        text: "✅ ঠিক আছে, আজ বিকাল ৫:০০ টায় **মাকে কল দেওয়ার** কথা মনে করিয়ে দিবো।",
        from: "bot",
        time: "9:16 AM",
    },
];

/**
 * The language section's own thread: Banglish first, then a sentence that mixes
 * scripts mid-way. Untranslated for the same reason as HERO_CHAT.
 */
const LANGUAGE_CHAT: ChatMessage[] = [
    { text: "kalke shokal e medicine khete bolo", from: "user", time: "9:02 AM" },
    {
        text: "✅ Noted. কাল সকাল ৮:০০ টায় **ওষুধ খাওয়ার** কথা মনে করিয়ে দিবো।",
        from: "bot",
        time: "9:02 AM",
    },
    { text: "আর friday তে gas bill এর কথা মনে করাইও", from: "user", time: "9:03 AM" },
    {
        text: "✅ ঠিক আছে। শুক্রবার সকাল ১০:০০ টায় **গ্যাস বিলের** রিমাইন্ডার সেট করা হলো।",
        from: "bot",
        time: "9:03 AM",
    },
];

/** Icons stay here; their titles and descriptions come from the dictionary. */
const FEATURE_ICONS = [
    IconInstant,
    IconExactTime,
    IconRepeat,
    IconNudge,
    IconScripts,
    IconVerified,
    IconPriority,
];

const STEP_ICONS = [
    <svg
        key="write"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6 text-brand"
    >
        <path d="M4.75 19.25V4.75a2 2 0 0 1 2-2h10.5a2 2 0 0 1 2 2v14.5l-3.75-2.5-3.5 2.5-3.5-2.5-3.75 2.5Z" />
        <path d="M9 8.75h6M9 12.25h4" />
    </svg>,
    <svg
        key="parse"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6 text-brand"
    >
        <circle cx="12" cy="12" r="9.25" />
        <path d="m8.5 12.5 2.5 2.5 5-5" />
    </svg>,
    <svg
        key="ring"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6 text-brand"
    >
        <path d="M6.5 10.25a5.5 5.5 0 0 1 11 0c0 3.6.9 5.1 1.75 6.1H4.75c.85-1 1.75-2.5 1.75-6.1Z" />
        <path d="M10 19.25a2.25 2.25 0 0 0 4 0" />
    </svg>,
];

/* ── HELPERS ────────────────────────────────────────────────────────── */

function CtaLink({
    href,
    children,
    tone = "brand",
    size = "md",
}: {
    href: string;
    children: React.ReactNode;
    tone?: "brand" | "light" | "outline";
    size?: "md" | "lg";
}) {
    const styles = {
        brand: "bg-brand text-white shadow-lift hover:bg-brand-deep hover:shadow-panel active:shadow-press",
        light: "bg-white text-brand-deep shadow-lift hover: hover:shadow-panel active:shadow-press",
        outline:
            "border border-white/40 text-white shadow-lift hover:shadow-panel hover:bg-white/10",
    } as const;

    const sizes = {
        md: "gap-2.5 px-6 py-3.5 text-[16px]",
        lg: "gap-3 px-8 py-[18px] text-[19px]",
    } as const;

    return (
        <Link
            href={href}
            className={`group inline-flex items-center rounded-full font-display font-semibold tracking-tight transition-all duration-200 active:translate-y-px ${sizes[size]} ${styles[tone]}`}
        >
            {children}
            <IconArrow className="h-[17px] w-[17px] transition-transform duration-300 ease-out group-hover:translate-x-1" />
        </Link>
    );
}

/**
 * The hand-drawn arc over the buried section's headline, sweeping from the
 * problem on the left to Remique on the right. Decorative, and desktop only —
 * once the columns stack, a left-to-right arc points at nothing.
 */
function ArrowArc() {
    return (
        <svg
            viewBox="0 0 400 96"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            className="pointer-events-none absolute left-1/2 top-0 hidden w-[min(112%,460px)] -translate-x-1/2 text-brand-deep/45 lg:block"
        >
            <path d="M 8 78 Q 200 -6 372 52" />
            {/* Rotated to sit on the curve's tangent where it ends. */}
            <path d="M -15 -8 L 0 0 L -15 10" transform="translate(372 52) rotate(18.6)" />
        </svg>
    );
}

/**
 * One side of the buried section's before/after. Both illustrations are 2:3, so
 * the frame is too and the artwork fills it edge to edge — no letterboxing, and
 * the two panels still match each other exactly.
 */
function BuriedPanel({ src, alt }: { src: string; alt: string }) {
    return (
        <div className="relative mx-auto aspect-[2/3] w-full max-w-[380px] overflow-hidden rounded-[28px] border border-white/40 shadow-xl">
            <Image
                src={src}
                alt={alt}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 90vw, 32vw"
            />
        </div>
    );
}

/* ── PAGE ───────────────────────────────────────────────────────────── */

export default function HomePage() {
    return <HomeContent />;
}

function HomeContent() {
    const c = useCopy();
    const { lang } = useLang();

    return (
        <main className="page-gradient relative">
            <div
                className="pointer-events-none fixed inset-0 z-[1] opacity-[0.6] mix-blend-overlay"
                style={{ backgroundImage: "url('/noise.svg')", backgroundSize: "256px" }}
            />
            <div className="relative z-10">
                <Navbar />

                {/* ── 1. HERO ──────────────────────────────────────────────────── */}
                <section className="relative isolate overflow-hidden pt-28 pb-14 lg:pt-40 lg:pb-24">
                    <div
                        className="absolute inset-0 -z-10"
                        style={{
                            WebkitMaskImage:
                                "linear-gradient(to bottom, black 80%, transparent 100%)",
                            maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
                        }}
                    >
                        <HeroVideo />
                        {/* Soft overlay to ensure legibility while keeping the gradient colors vibrant */}
                        <div className="absolute inset-0 bg-white/30 backdrop-blur-[4px]" />
                    </div>

                    <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:gap-12 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:gap-12 lg:items-center">
                        {/* LEFT COLUMN */}
                        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                            {/* Social proof pill */}
                            <div className="mb-8 inline-flex max-w-full items-center gap-2.5 rounded-2xl border border-white/40 bg-white/40 px-3 py-1.5 shadow-sm backdrop-blur-md sm:rounded-full">
                                <div className="flex -space-x-2 shrink-0">
                                    {/* Note: In production you would use next/image here, but img works for standard external avatars */}
                                    <img
                                        src="https://i.pravatar.cc/100?img=33"
                                        className="h-[26px] w-[26px] rounded-full border-2 border-ground"
                                        alt={c.hero.avatarAlt}
                                    />
                                    <img
                                        src="https://i.pravatar.cc/100?img=47"
                                        className="h-[26px] w-[26px] rounded-full border-2 border-ground"
                                        alt={c.hero.avatarAlt}
                                    />
                                    <img
                                        src="https://i.pravatar.cc/100?img=12"
                                        className="h-[26px] w-[26px] rounded-full border-2 border-ground"
                                        alt={c.hero.avatarAlt}
                                    />
                                </div>
                                <span className="text-left text-[12px] font-medium leading-snug text-ink-2 sm:text-[13.5px] sm:whitespace-nowrap pr-1">
                                    {c.hero.socialProof}
                                </span>
                            </div>

                            <h1 className="text-balance font-display text-[clamp(2.05rem,5.2vw,4.2rem)] font-semibold leading-[1.05] tracking-display text-ink drop-shadow-sm">
                                {c.hero.headlinePrefix && (
                                    <>
                                        {c.hero.headlinePrefix} <br className="hidden lg:block" />
                                    </>
                                )}
                                <span
                                    className={`inline-block ${c.hero.headlinePrefix ? "-ml-1" : ""}`}
                                >
                                    <HeroRotator />
                                </span>{" "}
                                <br className="hidden lg:block" />
                                {c.hero.headlineSuffix}
                            </h1>

                            <p className="mt-7 max-w-[48ch] text-[clamp(1.05rem,1.5vw,1.2rem)] leading-relaxed text-ink-2 drop-shadow-sm">
                                {c.hero.subBefore}
                                {/* In English this one Bengali word is the point of the
                                    sentence and gets its own face. In Bangla it is just a
                                    word in a Bangla sentence. */}
                                {lang === "en" ? (
                                    <span lang="bn" className="font-bn font-medium text-ink">
                                        বাংলা
                                    </span>
                                ) : (
                                    "বাংলা"
                                )}
                                {c.hero.subAfter}
                            </p>

                            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-3.5 gap-y-2 text-[15.5px] font-medium text-ink-3 sm:text-[17px] lg:justify-start">
                                <span className="inline-flex items-center gap-2">
                                    <MarkWhatsApp className="h-5 w-5 text-brand" />
                                    {c.hero.worksOnWhatsApp}
                                </span>
                                <span className="text-ink-3/45">·</span>
                                <span>{c.hero.noApp}</span>
                            </div>

                            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
                                <CtaLink href="/pricing" size="lg">{c.hero.ctaPrimary}</CtaLink>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="relative mx-auto mt-6 w-full max-w-[420px] lg:mt-0 lg:ml-auto lg:mr-0 lg:max-w-[460px]">
                            {/* The bot icon peeking */}
                            <div className="absolute -left-1 -top-8 z-10 sm:-left-6 sm:-top-10 lg:-left-12 lg:-top-16 drop-shadow-2xl group cursor-pointer">
                                <div className="transition-transform duration-500 ease-out group-hover:scale-125 group-hover:-translate-y-4 group-hover:-rotate-12">
                                    <Image
                                        src="/logo.png"
                                        alt={c.hero.botAlt}
                                        width={120}
                                        height={120}
                                        className="peek w-24 h-auto lg:w-32"
                                    />
                                </div>
                            </div>

                            {/* The rounded media card containing WhatsAppMockup */}
                            <div className="relative rounded-[32px] border border-white/50 bg-white/20 p-2 shadow-2xl backdrop-blur-xl sm:p-3">
                                <WhatsAppMockup messages={HERO_CHAT} animate />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 2. BURIED ────────────────────────────────────────────────── */}
                <section>
                    <div className="mx-auto max-w-6xl px-5 py-12 sm:py-14 lg:py-16 sm:px-8">
                        {/* The two illustrations flank the text; the arc carries the eye
                            from the mess on the left to Remique on the right. */}
                        <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr_1fr] lg:items-center lg:gap-8">
                            <div className="order-2 lg:order-1">
                                <BuriedPanel src="/buriedProblem.png" alt={c.buried.problemAlt} />
                            </div>

                            <div className="relative order-1 text-center lg:order-2 lg:pt-24">
                                <ArrowArc />
                                <h2 className="mx-auto max-w-[18ch] text-balance font-display text-[clamp(1.7rem,3.8vw,3rem)] font-semibold leading-[1.05] tracking-display text-ink">
                                    {c.buried.title}
                                </h2>
                                <p className="mx-auto mt-6 max-w-[42ch] text-[16.5px] leading-relaxed text-ink-2">
                                    {c.buried.body}
                                </p>
                                <p className="mx-auto mt-7 max-w-[40ch] font-display text-[17px] font-semibold leading-snug tracking-tight text-ink">
                                    {c.buried.kicker}
                                </p>
                            </div>

                            {/* The arc does this job on desktop; on a stack it has to
                                point down instead. */}
                            <div className="order-3 mx-auto grid h-14 w-14 place-items-center rounded-full border border-white/40 bg-white/30 shadow-lift backdrop-blur-md lg:hidden">
                                <IconArrow className="h-6 w-6 rotate-90 text-brand-deep" />
                            </div>

                            <div className="order-4 lg:order-3">
                                <BuriedPanel src="/buriedSolution.png" alt={c.buried.solutionAlt} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 3. OVERLOAD ──────────────────────────────────────────────── */}
                <section>
                    <div className="mx-auto grid max-w-6xl gap-12 px-5 py-12 sm:py-14 lg:py-16 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14">
                        {/* object-contain so the artwork is never cropped, whatever
                            proportion it arrives in. */}
                        {/* The source is square, so the frame is too — a 4:3 box just letterboxed it. */}
                        <div className="relative mx-auto aspect-square w-full max-w-[520px] lg:max-w-none">
                            <Image
                                src="/overload.png"
                                alt={c.overload.imageAlt}
                                fill
                                className="object-contain"
                                sizes="(max-width: 1024px) 90vw, 46vw"
                            />
                        </div>

                        <div className="text-center lg:text-left">
                            <h2 className="mx-auto max-w-[22ch] text-balance font-display text-[clamp(1.65rem,3.6vw,2.8rem)] font-semibold leading-[1.08] tracking-display text-ink lg:mx-0">
                                {c.overload.title}
                            </h2>

                            <p className="mx-auto mt-7 max-w-[52ch] text-[16.5px] leading-relaxed text-ink-2 lg:mx-0">
                                {c.overload.body}
                            </p>

                            {/* The turn from diagnosis to fix gets its own beat. */}
                            <p className="mx-auto mt-9 max-w-[48ch] rounded-2xl border border-white/40 border-l-2 border-l-brand bg-white/25 px-6 py-5 text-left font-display text-[17px] font-semibold leading-snug tracking-tight text-ink shadow-lift backdrop-blur-md lg:mx-0">
                                {c.overload.fix}
                            </p>
                        </div>
                    </div>
                </section>

                {/* ── 3.5 PRIVACY ──────────────────────────────────────────────── */}
                <section>
                    <div className="mx-auto grid max-w-6xl gap-12 px-5 py-12 sm:py-14 lg:py-16 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14">
                        <div className="relative mx-auto aspect-square w-full max-w-[520px] lg:max-w-none lg:order-2 group cursor-pointer">
                            <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-110 group-hover:rotate-3 group-hover:-translate-y-2">
                                <Image
                                    src="/officerRemi.png"
                                    alt={c.privacySection.imageAlt}
                                    fill
                                    className="object-contain bob"
                                    sizes="(max-width: 1024px) 90vw, 46vw"
                                />
                            </div>
                        </div>

                        <div className="text-center lg:text-left lg:order-1">
                            <h2 className="mx-auto max-w-[22ch] text-balance font-display text-[clamp(1.65rem,3.6vw,2.8rem)] font-semibold leading-[1.08] tracking-display text-ink lg:mx-0">
                                {c.privacySection.title}
                            </h2>

                            <p className="mx-auto mt-7 max-w-[52ch] text-[16.5px] leading-relaxed text-ink-2 lg:mx-0">
                                {c.privacySection.body}
                            </p>

                            <p className="mx-auto mt-9 max-w-[48ch] rounded-2xl border border-white/40 border-l-2 border-l-brand bg-white/25 px-6 py-5 text-left font-display text-[17px] font-semibold leading-snug tracking-tight text-ink shadow-lift backdrop-blur-md lg:mx-0">
                                {c.privacySection.fix}
                            </p>
                        </div>
                    </div>
                </section>

                {/* ── 4. LANGUAGE STRIP ────────────────────────────────────────── */}
                <section className="overflow-hidden">
                    <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 sm:py-14 sm:px-8 lg:grid-cols-[1fr_0.8fr] lg:gap-16 lg:py-16">
                        {/* LEFT COLUMN */}
                        <div className="text-center lg:text-left">
                            <h2 className="mx-auto max-w-[16ch] text-balance font-display text-[clamp(1.8rem,4.4vw,3.4rem)] font-semibold leading-[1.04] tracking-display text-ink lg:mx-0">
                                {c.languages.title}
                            </h2>
                            {/* Each point is a thing the reader does not have to do, so
                                it gets a check rather than a card. */}
                            <ul className="mt-9 flex flex-col items-center gap-3.5 lg:items-start">
                                {c.languages.points.map((point) => (
                                    <li
                                        key={point}
                                        className="inline-flex max-w-full items-center gap-3 rounded-full border border-white/40 bg-white/25 px-5 py-3 text-left shadow-lift backdrop-blur-md"
                                    >
                                        <IconCheckCircle className="h-[22px] w-[22px] shrink-0 text-brand-deep" />
                                        <span className="text-[16px] leading-snug text-ink">
                                            {point}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="lg:ml-auto lg:mr-0">
                            <PhoneFrame>
                                <WhatsAppMockup messages={LANGUAGE_CHAT} flush />
                            </PhoneFrame>
                        </div>
                    </div>
                </section>

                {/* ── 6. PROBLEM ───────────────────────────────────────────────── */}
                <section className=" ">
                    <div className="mx-auto max-w-6xl px-5 py-12 sm:py-14 lg:py-16 text-center sm:px-8">
                        <h2 className="mx-auto max-w-[20ch] text-balance font-display text-[clamp(1.7rem,4vw,3.2rem)] font-semibold leading-[1.04] tracking-display text-ink">
                            {c.problem.title}
                        </h2>
                        <p className="mx-auto mt-6 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
                            {c.problem.body}
                        </p>
                        <div className="mt-10 grid gap-6 text-left sm:grid-cols-3">
                            {c.problem.cards.map((p) => (
                                <div
                                    key={p.title}
                                    className="rounded-2xl border border-white/40 bg-white/20 p-6 shadow-xl backdrop-blur-md"
                                >
                                    <h3 className="font-display text-[17px] font-semibold tracking-tight text-ink">
                                        {p.title}
                                    </h3>
                                    <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
                                        {p.body}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 7. THE LOOP ─────────────────────────────────────────────── */}
                <section className="mx-auto max-w-6xl px-5 py-12 sm:py-14 lg:py-16 sm:px-8">
                    <div className="text-center">
                        <h2 className="mx-auto max-w-[22ch] text-balance font-display text-[clamp(1.55rem,3.4vw,2.6rem)] font-semibold leading-[1.08] tracking-display text-ink">
                            {c.loop.title}
                        </h2>
                        <p className="mx-auto mt-5 max-w-[52ch] text-[16px] leading-relaxed text-[rgba(11,21,18,0.72)]">
                            {c.loop.sub}
                        </p>
                    </div>

                    <div className="mt-14 text-center">
                        <p className="inline-block max-w-[32ch] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-left text-[15px] leading-snug text-white shadow-lift">
                            {c.loop.sample}
                        </p>
                        <div className="mt-5 flex flex-wrap items-baseline justify-center gap-x-2.5 gap-y-1 font-mono text-[13px] uppercase tracking-[0.09em]">
                            <span className="text-[rgba(11,21,18,0.6)]">{c.loop.repeats}</span>
                            <span className="tabular text-ink">{c.loop.daily}</span>
                            <span className="text-[rgba(11,21,18,0.3)]">·</span>
                            <span className="text-[rgba(11,21,18,0.6)]">{c.loop.at}</span>
                            <span className="tabular font-semibold text-signal-deep">
                                {c.loop.time}
                            </span>
                            <span className="text-[rgba(11,21,18,0.3)]">·</span>
                            <span className="tabular text-[rgba(11,21,18,0.6)]">
                                {c.loop.timezone}
                            </span>
                        </div>
                    </div>
                </section>

                {/* ── 8. PRICING ───────────────────────────────────────────────── */}
                <section className="mx-auto max-w-6xl px-5 py-12 sm:py-14 lg:py-16 sm:px-8">
                    <div className="text-center">
                        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
                            {c.pricing.eyebrow}
                        </p>
                        <h2 className="mx-auto mt-4 max-w-[22ch] text-balance font-display text-[clamp(1.7rem,4vw,3.2rem)] font-semibold leading-[1.04] tracking-display text-ink">
                            {c.pricing.title}
                        </h2>
                        <p className="mx-auto mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
                            {c.pricing.sub}
                        </p>
                    </div>
                    <HomePricing />
                </section>

                {/* ── 9. FULL INDEX ───────────────────────────────────────────── */}
                <section className="mx-auto max-w-6xl px-5 py-12 sm:py-14 lg:py-16 sm:px-8">
                    <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
                        <div className="lg:self-center">
                            <h2 className="max-w-[14ch] text-balance font-display text-[clamp(1.55rem,3.4vw,2.6rem)] font-semibold leading-[1.08] tracking-display text-ink">
                                {c.featuresIndex.title}
                            </h2>
                            <p className="mt-5 max-w-[38ch] text-[16px] leading-relaxed text-[rgba(11,21,18,0.72)]">
                                {c.featuresIndex.body}
                            </p>
                        </div>

                        <ul className="grid sm:grid-cols-2 sm:gap-x-12">
                            {c.featuresIndex.items.map(({ title, desc }, i) => {
                                const Icon = FEATURE_ICONS[i];
                                return (
                                    <li
                                        key={title}
                                        className={`flex gap-4 border-t border-[rgba(11,21,18,0.14)] py-6 first:border-t-0 first:pt-0 ${
                                            i === 1 ? "sm:border-t-0 sm:pt-0" : ""
                                        }`}
                                    >
                                        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-deep" />
                                        <div>
                                            <h3 className="font-display text-[17px] font-semibold tracking-tight text-ink">
                                                {title}
                                            </h3>
                                            <p className="mt-1.5 max-w-[34ch] text-[14.5px] leading-relaxed text-[rgba(11,21,18,0.72)]">
                                                {desc}
                                            </p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </section>

                {/* ── 10. GREEN CTA BANNER ─────────────────────────────────────── */}
                <section className="px-5 py-12 sm:py-14 lg:py-16 sm:px-8">
                    <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-white/20 border border-white/40 shadow-2xl backdrop-blur-xl px-6 py-14 text-center sm:px-12 sm:py-16 lg:py-20">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 opacity-70 mix-blend-soft-light bg-[radial-gradient(120%_120%_at_50%_-10%,rgba(255,255,255,0.5)_0%,transparent_55%)]"
                        />
                        <div className="relative">
                            <h2 className="mx-auto max-w-[16ch] text-balance font-display text-[clamp(1.8rem,4.4vw,3.5rem)] font-semibold leading-[1.02] tracking-display text-white">
                                {c.banner.title}
                            </h2>
                            <p className="mx-auto mt-6 max-w-[44ch] text-[17px] leading-relaxed text-white/80">
                                {c.banner.body}
                            </p>
                            <div className="mt-10 flex flex-col items-center gap-5">
                                <CtaLink href="/pricing" tone="light">
                                    {c.banner.cta}
                                </CtaLink>
                                <p className="tabular text-[14.5px] text-white/80">
                                    {c.banner.priceNote}
                                    <span className="mx-2 opacity-50">·</span>
                                    {c.banner.cardNote}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 11. FAQ ──────────────────────────────────────────────────── */}
                <section className="text-white">
                    <div className="mx-auto max-w-6xl px-5 py-12 sm:py-14 lg:py-16 sm:px-8">
                        <div className="text-center">
                            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
                                {c.faq.eyebrow}
                            </p>
                            <h2 className="mx-auto mt-4 max-w-[20ch] text-balance font-display text-[clamp(1.7rem,3.6vw,3rem)] font-semibold leading-[1.04] tracking-display text-white">
                                {c.faq.title}
                            </h2>
                        </div>
                        <div className="mx-auto mt-14 max-w-3xl">
                            <HomeFaq tone="dark" />
                        </div>
                        <div className="mt-10 text-center">
                            <CtaLink href="/faq" tone="outline">
                                {c.faq.cta}
                            </CtaLink>
                        </div>
                    </div>
                </section>

                <SiteFooter />
            </div>
        </main>
    );
}
