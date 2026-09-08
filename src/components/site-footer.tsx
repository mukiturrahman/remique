"use client";

import Link from "next/link";
import Image from "next/image";
import { MarkWhatsApp } from "./icons";
import { useCopy } from "./lang-provider";

export function SiteFooter() {
    const c = useCopy();

    return (
        <footer className="px-5 pb-10 sm:px-8">
            <div className="mx-auto max-w-6xl rounded-[32px] border border-white/20 bg-white/10 px-8 py-14 shadow-2xl backdrop-blur-xl sm:px-12">
                <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                    {/* brand */}
                    <div className="sm:col-span-2 lg:col-span-1">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-80"
                        >
                            <Image
                                src="/logo.png"
                                alt={c.footer.logoAlt}
                                width={48}
                                height={38}
                                className="h-8 w-auto object-contain"
                            />
                            <span className="font-display text-[19px] font-semibold tracking-tight text-white">
                                Remique
                            </span>
                        </Link>
                        <p className="mt-5 max-w-[28ch] text-[15px] leading-relaxed text-white/70">
                            {c.footer.tagline}
                        </p>
                    </div>

                    {/* product */}
                    <div>
                        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-white/50">
                            {c.footer.product}
                        </p>
                        <ul className="mt-5 space-y-3">
                            {[
                                { href: "/how-it-works", label: c.footer.howItWorks },
                                { href: "/use-cases", label: c.footer.useCases },
                                { href: "/pricing", label: c.footer.pricing },
                            ].map((l) => (
                                <li key={l.href}>
                                    <Link
                                        href={l.href}
                                        className="text-[15px] text-white/80 transition-colors hover:text-white"
                                    >
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* support */}
                    <div>
                        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-white/50">
                            {c.footer.support}
                        </p>
                        <ul className="mt-5 space-y-3">
                            {[
                                { href: "/faq", label: c.footer.faq },
                                { href: "mailto:support@remique.com", label: c.footer.contact },
                            ].map((l) => (
                                <li key={l.href}>
                                    <Link
                                        href={l.href}
                                        className="text-[15px] text-white/80 transition-colors hover:text-white"
                                    >
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* connect */}
                    <div>
                        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-white/50">
                            {c.footer.connect}
                        </p>
                        <div className="mt-5 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-white/20">
                            <MarkWhatsApp className="h-4 w-4" />
                            <span>{c.footer.chatOnWhatsApp}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
                    <p className="text-[14px] text-white/60">
                        &copy; {new Date().getFullYear()} Remique. {c.footer.rights}
                    </p>
                    <div className="flex items-center gap-6 text-[14px] text-white/60">
                        <Link href="/privacy" className="transition-colors hover:text-white">
                            {c.footer.privacy}
                        </Link>
                        <Link href="/terms" className="transition-colors hover:text-white">
                            {c.footer.terms}
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
