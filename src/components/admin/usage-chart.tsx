import { formatCost, formatTokens, type UsageDay } from '@/lib/admin-queries';

/**
 * Thirty Dhaka days of token use.
 *
 * Quiet days are drawn as gaps rather than skipped, so sporadic use does not
 * read as continuous. The bars carry their own `<title>`, which is what a
 * hover reads out — cheaper and more accessible than a tooltip layer, and it
 * keeps this a server component.
 */
export function UsageChart({ days }: { days: UsageDay[] }) {
  const maxTokens = Math.max(...days.map((d) => d.tokens), 0);
  const total = days.reduce((sum, d) => sum + d.tokens, 0);
  // Guarded value is only for the height division below — displaying it instead
  // of the true max would read "peak 1 tokens/day" for a user with no usage.
  const peak = Math.max(1, maxTokens);
  const barWidth = 100 / days.length;

  const busyDays = days.filter((d) => d.tokens > 0);

  if (total === 0) {
    return (
      <p className="border-t border-line pt-4 text-[14px] text-ink-2">
        No model calls in the last 30 days.
      </p>
    );
  }

  // One or two busy days in thirty is not a shape — a bar chart of it is 28
  // invisible stubs and a spike, which reads as a broken render rather than as
  // "they used it twice". Say it instead.
  if (busyDays.length <= 2) {
    return (
      <div className="border-t border-line pt-4">
        <p className="max-w-measure text-[14px] leading-relaxed text-ink-2">
          {busyDays.length === 1 ? 'One day' : 'Two days'} of the last 30 had model calls.
        </p>
        <ul className="mt-3">
          {busyDays.map((day) => (
            <li
              key={day.day}
              className="tabular flex items-baseline justify-between gap-4 border-t border-line py-2.5 font-mono text-[13px] first:border-t-0 first:pt-0"
            >
              <span className="text-ink">{day.day}</span>
              <span className="text-ink-3">
                {formatTokens(day.tokens)} tokens · {formatCost(day.costMicros)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <svg
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
        className="h-[6.5rem] w-full"
        role="img"
        aria-label={`Token use over the last ${days.length} days, peaking at ${maxTokens.toLocaleString()} tokens on one day`}
      >
        {days.map((day, i) => {
          const height = (day.tokens / peak) * 28;
          return (
            <rect
              key={day.day}
              x={i * barWidth + barWidth * 0.18}
              y={day.tokens > 0 ? 29 - Math.max(height, 0.5) : 28.6}
              width={barWidth * 0.64}
              // Quiet days keep a hairline stub so thirty days read as a
              // series rather than as one bar floating in an empty box.
              height={day.tokens > 0 ? Math.max(height, 0.5) : 0.4}
              rx={0.35}
              className={day.tokens === 0 ? 'fill-line' : 'fill-brand'}
            >
              <title>{`${day.day} · ${formatTokens(day.tokens)} tokens · ${formatCost(day.costMicros)}`}</title>
            </rect>
          );
        })}
        <line x1="0" y1="29.5" x2="100" y2="29.5" className="stroke-line-strong" strokeWidth={0.4} />
      </svg>

      <div className="tabular mt-2 flex justify-between font-mono text-[11.5px] text-ink-3">
        <span>{days[0]?.day}</span>
        <span className="text-ink-2">peak {maxTokens.toLocaleString()} tokens in a day</span>
        <span>{days[days.length - 1]?.day}</span>
      </div>
    </div>
  );
}
