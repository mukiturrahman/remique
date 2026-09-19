"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bubble, ChatHeader, TypingBubble, type ChatMessage } from "./chat-bubble";

/**
 * Replays a thread that is already in the DOM: every message renders on the
 * server and stays in the tree, so the panel reads whole with no JavaScript.
 * The player only controls which slots are visible.
 */

/** How long the bot appears to be typing before its reply lands. */
const TYPING_MS = 1300;
/** Beat after a message lands, before the next one starts. */
const SETTLE_MS = 900;
/** Fade the finished thread out before it replays, so the reset is not a blink. */
const FADE_MS = 450;
/** Beat before the first message, so the panel is never blank for long. */
const OPENING_MS = 400;
/** Hold on the finished thread before it replays. */
const LOOP_HOLD_MS = 3200;

type Phase = { shown: number; typing: boolean; fading?: boolean };

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function ChatPlayer({ messages }: { messages: ChatMessage[] }) {
  // Server state is the settled thread: everything visible, nothing typing.
  const [phase, setPhase] = useState<Phase>({ shown: messages.length, typing: false });
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  // Rewind before paint so hydration never flashes the settled thread.
  useIsomorphicLayoutEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReduced(true);
      return;
    }
    setPhase({ shown: 0, typing: false });
    setPlaying(true);
  }, []);

  useEffect(() => {
    if (!playing || reduced) return;

    const next = messages[phase.shown];

    // Thread finished — hold, fade out, then replay from empty.
    if (!next) {
      timer.current = phase.fading
        ? setTimeout(() => setPhase({ shown: 0, typing: false }), FADE_MS)
        : setTimeout(() => setPhase((p) => ({ ...p, fading: true })), LOOP_HOLD_MS);
      return clear;
    }

    // A bot reply is composed before it lands; the user's own message just sends.
    if (next.from === "bot" && !phase.typing) {
      timer.current = setTimeout(() => setPhase((p) => ({ ...p, typing: true })), SETTLE_MS);
      return clear;
    }

    timer.current = setTimeout(
      () => setPhase((p) => ({ shown: p.shown + 1, typing: false })),
      phase.typing ? TYPING_MS : phase.shown === 0 ? OPENING_MS : SETTLE_MS
    );
    return clear;
  }, [playing, reduced, phase, messages, clear]);

  const toggle = () => {
    clear();
    setPlaying((p) => !p);
  };

  return (
    <div className="overflow-hidden rounded-[20px] shadow-panel">
      <ChatHeader
        action={
          reduced ? null : (
            <button
              type="button"
              onClick={toggle}
              aria-pressed={!playing}
              aria-label={playing ? "Pause the conversation preview" : "Play the conversation preview"}
              className="relative grid h-7 w-7 place-items-center rounded-full text-white/70 transition-colors duration-200 hover:bg-white/15 hover:text-white after:absolute after:-inset-0.5 after:content-['']"
            >
              {playing ? (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" focusable="false">
                  <rect x="6" y="4.5" width="4" height="15" rx="1.2" />
                  <rect x="14" y="4.5" width="4" height="15" rx="1.2" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" focusable="false">
                  <path d="M7.5 4.9c0-.9 1-1.45 1.76-.97l9.2 6.1a1.15 1.15 0 0 1 0 1.94l-9.2 6.1A1.15 1.15 0 0 1 7.5 17.1z" />
                </svg>
              )}
            </button>
          )
        }
      />

      {/* The loop is decorative repetition; the readable copy is the list below.
          A full invisible copy of the thread sets the body height at every
          width, and the playing thread sits on top of it anchored to the
          bottom, so messages stack upward the way a real chat does and the
          panel never resizes. */}
      <div className="wa-chat-bg relative px-3 py-4" aria-hidden="true">
        <div className="invisible space-y-2">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
              <Bubble msg={msg} />
            </div>
          ))}
        </div>

        <div
          className={`absolute inset-x-3 bottom-4 flex flex-col justify-end gap-2 transition-opacity duration-[450ms] ease-out ${
            phase.fading ? "opacity-0" : "opacity-100"
          }`}
        >
          {messages.slice(0, phase.shown).map((msg, i) => (
            <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
              <Bubble msg={msg} className="rise" />
            </div>
          ))}
          {phase.typing && (
            <div className="rise flex justify-start">
              <TypingBubble />
            </div>
          )}
        </div>
      </div>

      <ul className="sr-only">
        {messages.map((msg, i) => (
          <li key={i}>
            {msg.from === "user" ? "You" : "Remique"} at {msg.time}: {msg.text.replace(/\*\*/g, "")}
          </li>
        ))}
      </ul>
    </div>
  );
}
