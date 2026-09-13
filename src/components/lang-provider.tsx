"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { COPY, isLang, type Copy, type Lang } from "@/lib/i18n/copy";

const STORAGE_KEY = "remique-lang";

/** Bangla is the default: it is the first language of most people Remique is for. */
const DEFAULT_LANG: Lang = "bn";

type LangContextValue = { lang: Lang; setLang: (next: Lang) => void };

/**
 * Undefined outside a provider, which is what keeps the pages that do not opt
 * in — /pricing, /faq, /how-it-works, /use-cases — rendering English.
 */
const LangContext = createContext<LangContextValue | undefined>(undefined);

const NO_PROVIDER: LangContextValue = { lang: "en", setLang: () => {} };

export function LangProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

    // The server renders the default, so a returning visitor's stored choice
    // can only be applied after hydration.
    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            if (isLang(stored) && stored !== DEFAULT_LANG) setLangState(stored);
        } catch {
            // Storage blocked. The toggle still works, it just won't persist.
        }
    }, []);

    const setLang = useCallback((next: Lang) => {
        setLangState(next);
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // As above.
        }
    }, []);

    useEffect(() => {
        try {
            document.documentElement.lang = lang;
        } catch {
            // Document not available
        }
    }, [lang]);

    return (
        <LangContext.Provider value={{ lang, setLang }}>
            <div lang={lang}>{children}</div>
        </LangContext.Provider>
    );
}

/** The active language, plus a setter. Falls back to English with no provider. */
export function useLang(): LangContextValue {
    return useContext(LangContext) ?? NO_PROVIDER;
}

/** The dictionary for the active language. */
export function useCopy(): Copy {
    return COPY[useLang().lang];
}
