"use client";

import { useEffect, useRef, useState } from "react";
import { MarkRemique } from "./icons";

/**
 * The page's one authored motion moment: Remique reading a real sentence and
 * handing back an exact time. Content renders complete on the server, so the
 * thread is readable with no JavaScript and under prefers-reduced-motion; the
 * animation only replays what is already there.
 */

type Turn = {
  id: string;
  /** what the user types */
  message: string;
  /** the script the message is in, for correct shaping and screen readers */
  lang: "en" | "bn";
  /** how it reads in the composer's language chip */
  label: string;
  /** what Remique extracts, mirroring the parser's own fields */
  task: string;
  when: string;
  /** Remique's confirmation, in the language the user wrote in */
  reply: string;
};

const TURNS: Turn[] = [
  {
    id: "banglish",
    message: "Kalke shokal 10 tay Aovin ke call dite mone koriye dio",
    lang: "en",
    label: "Banglish",
    task: "Call Aovin",
    when: "Tomorrow · 10:00 AM",
    reply: "Done! 🔔 Kalke shokal 10:00 AM e *Call Aovin* er reminder pathiye dibo.",
  },
  {
    id: "english",
    message: "Remind me tomorrow at 9 AM to take my medicine",
    lang: "en",
    label: "English",
    task: "Take medicine",
    when: "Tomorrow · 9:00 AM",
    reply: "Done! 🔔 Remique will remind you tomorrow at 9:00 AM to *Take medicine*.",
  },
  {
    id: "bangla",
    message: "পরশু রাতে বিদ্যুৎ বিল দিতে মনে করিয়ে দিও",
    lang: "bn",
    label: "বাংলা",
    task: "বিদ্যুৎ বিল দেওয়া",
    when: "পরশু · রাত ৯:০০",
    reply:
      "ঠিক আছে! 🔔 পরশু রাত ৯:০০ টায় আপনাকে *বিদ্যুৎ বিল দেওয়া* এর কথা মনে করিয়ে দেওয়া হবে।",
  },
  {
    id: "relative",
    message: "Remind me in 30 minutes to check the oven",
    lang: "en",
    label: "English",
    task: "Check the oven",
    when: "In 30 minutes",
    reply: "Done! 🔔 Remique will remind you in 30 minutes to *Check the oven*.",
  },
];

type Phase = "typing" | "sent" | "reading" | "parsed" | "replied";

const ORDER: Phase[] = ["typing", "sent", "reading", "parsed", "replied"];

function rank(phase: Phase) {
  return ORDER.indexOf(phase);
}

/** Remique's confirmations use WhatsApp's own *bold* markers. */
function Formatted({ text, lang }: { text: string; lang: Turn["lang"] }) {
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <span lang={lang === "bn" ? "bn" : undefined} className={lang === "bn" ? "font-bn" : undefined}>
      {parts.map((part, i) =>
        part.startsWith("*") && part.endsWith("*") ? (
          <strong key={i} className="font-semibold text-ink">
            {part.slice(1, -1)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export function LiveThread() {
  /** the turn being typed into the composer */
  const [index, setIndex] = useState(0);
  /** the turn the thread body is showing — never empty, so the panel always reads */
  const [shownIndex, setShownIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("replied");
  const [typed, setTyped] = useState(TURNS[0].message);
  /** the demo can run at all (motion allowed, JS present) */
  const [enabled, setEnabled] = useState(false);
  /** the visitor's own stop/play choice — WCAG 2.2.2 */
  const [playing, setPlaying] = useState(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const animating = enabled && playing;
  const turn = TURNS[index];
  const shown = TURNS[shownIndex];

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    // Type the *next* message while the completed one stays on screen.
    setEnabled(true);
    setIndex(1);
    setTyped("");
    setPhase("typing");
  }, []);

  /** Stopping settles on the exchange currently shown, never mid-type. */
  const toggle = () => {
    setPlaying((was) => {
      if (was) {
        setIndex(shownIndex);
        setTyped(TURNS[shownIndex].message);
        setPhase("replied");
      }
      return !was;
    });
  };

  useEffect(() => {
    if (!animating) return;

    const clear = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    const at = (ms: number, fn: () => void) => {
      timers.current.push(setTimeout(fn, ms));
    };

    if (phase === "typing") {
      const chars = Array.from(turn.message);
      chars.forEach((_, i) => {
        at(90 + i * 34, () => setTyped(chars.slice(0, i + 1).join("")));
      });
      at(90 + chars.length * 34 + 380, () => {
        setShownIndex(index);
        setPhase("sent");
      });
    } else if (phase === "sent") {
      at(420, () => setPhase("reading"));
    } else if (phase === "reading") {
      at(880, () => setPhase("parsed"));
    } else if (phase === "parsed") {
      at(620, () => setPhase("replied"));
    } else if (phase === "replied") {
      at(3400, () => {
        setIndex((i) => (i + 1) % TURNS.length);
        setTyped("");
        setPhase("typing");
      });
    }

    return clear;
  }, [phase, index, animating, turn.message]);

  // While the next message is being typed, the previous exchange stays whole.
  const holding = phase === "typing";
  const showBubble = holding || rank(phase) >= rank("sent");
  const showParse = holding || rank(phase) >= rank("parsed");
  const showReply = holding || rank(phase) >= rank("replied");
  const isBn = shown.lang === "bn";
  const typingIsBn = turn.lang === "bn";

  return (
    <div className="rounded-[26px] border border-line bg-ground shadow-panel">
      {/* thread header */}
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <MarkRemique className="h-9 w-9 shrink-0 text-brand" />
        <div className="min-w-0">
          <p className="font-display text-[15px] font-semibold leading-none tracking-tight text-ink">
            Remique
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] leading-none text-ink-3">
            <span className="pulse inline-block h-1.5 w-1.5 rounded-full bg-brand" />
            online
          </p>
        </div>
        <span className="ml-auto rounded-full bg-ground-2 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.09em] text-ink-3">
          {shown.label}
        </span>
        {enabled && (
          <button
            type="button"
            onClick={toggle}
            aria-pressed={!playing}
            className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-ink-3 transition-colors before:absolute before:-inset-2 before:content-[''] hover:border-line-strong hover:text-ink"
          >
            <span className="sr-only">
              {playing ? "Pause the example conversation" : "Play the example conversation"}
            </span>
            {playing ? (
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-3 w-3">
                <rect x="4" y="3.5" width="2.5" height="9" rx="1" />
                <rect x="9.5" y="3.5" width="2.5" height="9" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-3 w-3">
                <path d="M5 3.6v8.8a.8.8 0 0 0 1.22.68l7-4.4a.8.8 0 0 0 0-1.36l-7-4.4A.8.8 0 0 0 5 3.6Z" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/*
        The body's text changes every second or two while the loop runs, so a
        live region would narrate the demo without end. It is marked decorative
        and one settled exchange is given as a static equivalent instead.
      */}
      <p className="sr-only">
        Example conversation. Someone writes, in Banglish: “Kalke shokal 10 tay Aovin
        ke call dite mone koriye dio.” Remique reads the task as “Call Aovin” and the
        time as tomorrow at 10:00 AM, then replies to confirm it in the same language.
      </p>

      {/* thread body */}
      <div
        aria-hidden="true"
        className="min-h-[244px] space-y-3 px-5 py-5 sm:min-h-[252px]"
      >
        {showBubble && (
          <div key={`${shown.id}-msg`} className="rise flex justify-end">
            <p
              lang={isBn ? "bn" : undefined}
              className={`max-w-[85%] rounded-2xl rounded-br-md bg-brand px-3.5 py-2.5 text-[15px] leading-snug text-white ${
                isBn ? "font-bn" : ""
              }`}
            >
              {shown.message}
            </p>
          </div>
        )}

        {showParse && (
          <div key={`${shown.id}-parse`} className="rise flex justify-start">
            <div className="w-full max-w-[92%] rounded-2xl border border-brand/25 bg-brand-tint p-3">
              <p className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.13em] text-brand">
                what Remique read
              </p>
              <dl className="grid gap-2 sm:grid-cols-[auto_1fr] sm:gap-x-4">
                <dt className="font-mono text-[11px] uppercase tracking-[0.09em] text-brand-deep sm:pt-0.5">
                  task
                </dt>
                <dd
                  lang={isBn ? "bn" : undefined}
                  className={`text-[14.5px] font-medium leading-snug text-ink ${isBn ? "font-bn" : ""}`}
                >
                  {shown.task}
                </dd>
                <dt className="font-mono text-[11px] uppercase tracking-[0.09em] text-brand-deep sm:pt-0.5">
                  when
                </dt>
                <dd
                  lang={isBn ? "bn" : undefined}
                  className={`tabular text-[14.5px] font-medium leading-snug text-signal-ink ${
                    isBn ? "font-bn" : ""
                  }`}
                >
                  {shown.when}
                </dd>
              </dl>
            </div>
          </div>
        )}

        {showReply && (
          <div key={`${shown.id}-reply`} className="rise flex justify-start">
            <p className="max-w-[88%] rounded-2xl rounded-bl-md bg-ground-3 px-3.5 py-2.5 text-[15px] leading-snug text-ink-2">
              <Formatted text={shown.reply} lang={shown.lang} />
            </p>
          </div>
        )}

        {phase === "reading" && (
          <div className="flex justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ground-3 px-3 py-2">
              <span className="pulse h-1.5 w-1.5 rounded-full bg-ink-3" />
              <span
                className="pulse h-1.5 w-1.5 rounded-full bg-ink-3"
                style={{ animationDelay: "180ms" }}
              />
              <span
                className="pulse h-1.5 w-1.5 rounded-full bg-ink-3"
                style={{ animationDelay: "360ms" }}
              />
            </span>
          </div>
        )}
      </div>

      {/* composer */}
      <div
        aria-hidden="true"
        className="flex items-center gap-2.5 border-t border-line px-5 py-3.5"
      >
        <div className="min-h-[42px] flex-1 rounded-full border border-line bg-ground-2 px-4 py-2.5">
          <p
            lang={typingIsBn && phase === "typing" ? "bn" : undefined}
            className={`text-[14.5px] leading-snug ${
              phase === "typing" && typed ? "text-ink" : "text-ink-3"
            } ${typingIsBn ? "font-bn" : ""}`}
          >
            {phase === "typing" ? (
              <>
                {typed || <span className="text-ink-3">Type a message</span>}
                <span className="caret ml-px inline-block h-[1.05em] w-px translate-y-[0.18em] bg-brand" />
              </>
            ) : (
              <span className="text-ink-3">Type a message</span>
            )}
          </p>
        </div>
        <span
          aria-hidden="true"
          className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-brand text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
            <path
              d="M4 12h13M11.5 6.5 17 12l-5.5 5.5"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}
