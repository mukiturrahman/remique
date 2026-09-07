import type { UsageDay } from '@/lib/admin-queries';

export function UsageChart({ days }: { days: UsageDay[] }) {
  const peak = Math.max(1, ...days.map((d) => d.tokens));
  const barWidth = 100 / days.length;

  return (
    <div>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-24 w-full" role="img"
           aria-label={`Token use over the last ${days.length} days`}>
        {days.map((day, i) => {
          const height = (day.tokens / peak) * 28;
          return (
            <rect
              key={day.day}
              x={i * barWidth + barWidth * 0.15}
              y={29 - height}
              width={barWidth * 0.7}
              height={Math.max(height, day.tokens > 0 ? 0.4 : 0)}
              className="fill-brand"
            />
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-xs text-ink-3">
        <span>{days[0]?.day}</span>
        <span>peak {peak.toLocaleString()} tokens/day</span>
        <span>{days[days.length - 1]?.day}</span>
      </div>
    </div>
  );
}
