"use client";

import { useCopy, useLang } from "./lang-provider";
import type { Lang } from "@/lib/i18n/copy";

/**
 * Segmented pill, styled after the weekly/monthly control in home-pricing so
 * the page keeps one vocabulary for "pick one of two".
 */
export function LangToggle({ className = "" }: { className?: string }) {
    const { lang, setLang } = useLang();
    const c = useCopy();

    const options: { value: Lang; short: string; full: string }[] = [
        { value: "bn", short: c.lang.bn, full: c.lang.bnFull },
        { value: "en", short: c.lang.en, full: c.lang.enFull },
    ];

    return (
        <div
            role="group"
            aria-label={c.lang.groupLabel}
            className={`inline-flex items-center rounded-full border border-white/40 bg-white/20 p-1 shadow-sm backdrop-blur-md ${className}`}
        >
            {options.map((option) => {
                const active = lang === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        lang={option.value}
                        onClick={() => setLang(option.value)}
                        aria-pressed={active}
                        aria-label={option.full}
                        className={`rounded-full px-3 py-1.5 text-[13.5px] font-semibold tracking-tight transition-all duration-200 ${
                            active ? "bg-brand text-white shadow-press" : "text-ink-2 hover:text-ink"
                        }`}
                    >
                        {option.short}
                    </button>
                );
            })}
        </div>
    );
}
