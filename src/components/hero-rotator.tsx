"use client";

import { useState, useEffect, useCallback } from "react";

const PHRASES = [
  "the electricity bill",
  "school fees",
  "your 3pm meeting",
  "Ma's birthday",
  "the tax deadline",
];

const DISPLAY_MS = 2600;
const FADE_MS = 350;

export function HeroRotator() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const advance = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setIndex((i) => (i + 1) % PHRASES.length);
      setVisible(true);
    }, FADE_MS);
  }, []);

  useEffect(() => {
    const id = setInterval(advance, DISPLAY_MS + FADE_MS);
    return () => clearInterval(id);
  }, [advance]);

  return (
    <span
      className={`inline-block bg-brand-tint px-2 decoration-brand transition-[opacity,transform] duration-[350ms] ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
      }`}
    >
      {PHRASES[index]}
    </span>
  );
}
