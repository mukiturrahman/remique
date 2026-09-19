"use client";

import { useCopy } from "./lang-provider";

export function ScrollingQuotations() {
  const c = useCopy();
  const { eyebrow, headline, quotes } = c.quotesSection;

  // Duplicate for a continuous seamless marquee loop
  const marqueeList = [...quotes, ...quotes];

  return (
    <section className="relative overflow-hidden py-14 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
          {eyebrow}
        </p>
        <h2 className="mx-auto mt-4 max-w-[32ch] text-balance font-display text-[clamp(1.7rem,3.8vw,2.8rem)] font-semibold leading-[1.12] tracking-display text-ink">
          {headline}
        </h2>
      </div>

      {/* Scrolling Ticker */}
      <div className="relative mt-10 w-full overflow-hidden py-12 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
        <div className="scrolling-quotations-track flex gap-6 px-4">
          {marqueeList.map((item, idx) => {
            const originalIndex = (idx % quotes.length) + 1;
            return (
              <div
                key={`${item.author}-${idx}`}
                className="flex w-[310px] sm:w-[370px] shrink-0 flex-col justify-between rounded-2xl border border-white/45 bg-white/25 p-6 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-white/75 hover:bg-white/35 hover:shadow-2xl"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className="font-serif text-3xl font-bold leading-none text-brand/80 select-none"
                      aria-hidden="true"
                    >
                      “
                    </span>
                    <span className="rounded-full bg-brand/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-brand">
                      #{originalIndex}
                    </span>
                  </div>
                  <p className="mt-3 text-[15.5px] sm:text-[16.5px] font-medium leading-relaxed text-ink">
                    {item.quote}
                  </p>
                </div>

                <div className="mt-6 border-t border-white/30 pt-4">
                  <p className="font-display text-[15px] font-semibold tracking-tight text-ink">
                    {item.author}
                  </p>
                  {item.source ? (
                    <p className="mt-0.5 text-[12.5px] font-medium text-ink-3">
                      {item.source}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
