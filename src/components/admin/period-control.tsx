'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

/**
 * The control that rewrites the sentence.
 *
 * A client component for one reason: the sentence is the surface's authored
 * moment, and a plain link makes it arrive as a page blink. `useTransition`
 * keeps the current sentence on screen and marks which period is being
 * fetched, so the change reads as a rewrite rather than a reload. The links
 * stay real `<a>` elements, so this works with JavaScript off — it just loses
 * the pending state.
 */
export function PeriodControl({
  periods,
  current,
}: {
  // Hrefs arrive precomputed: a function prop would not cross the server /
  // client boundary.
  periods: Array<{ key: string; label: string; href: string }>;
  current: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <nav
      aria-label="Reporting period"
      aria-busy={pending || undefined}
      className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-line pb-3"
    >
      {periods.map(({ key, label, href }) => {
        const active = key === current;
        return (
          <a
            key={key}
            href={href}
            aria-current={active ? 'page' : undefined}
            onClick={(event) => {
              // Let modifier-clicks and middle-clicks open a new tab.
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
              event.preventDefault();
              startTransition(() => router.push(href));
            }}
            className={
              active
                ? 'rounded-full bg-brand-tint px-3 py-1.5 text-[14px] font-medium text-brand-deep'
                : 'rounded-full px-3 py-1.5 text-[14px] text-ink-3 transition-colors hover:bg-ground-2 hover:text-ink'
            }
          >
            {label}
          </a>
        );
      })}

      {/* The pending mark sits in the control, not over the page: the old
          sentence stays readable while the new one is being fetched. */}
      <span
        aria-hidden="true"
        className={`ml-2 h-1.5 w-1.5 rounded-full bg-brand transition-opacity duration-200 ${
          pending
            ? 'animate-[remique-pulse_1.4s_ease-in-out_infinite] opacity-100 motion-reduce:animate-none'
            : 'opacity-0'
        }`}
      />
    </nav>
  );
}
