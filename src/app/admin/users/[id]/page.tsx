import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BlockToggle } from '@/components/admin/block-toggle';
import { QuotaForm } from '@/components/admin/quota-form';
import { UsageChart } from '@/components/admin/usage-chart';
import {
  formatCost,
  formatDate,
  formatDateTime,
  formatTokens,
  getUserDetail,
} from '@/lib/admin-queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-6">
      <h2 className="mb-4 font-display text-lg tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ink-3">{label}</div>
      <div className="mt-0.5 font-mono text-lg">{value}</div>
    </div>
  );
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getUserDetail(id);
  if (!detail) notFound();

  const {
    user,
    messageCount,
    usageByDay,
    usageWindow,
  } = detail;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="text-sm text-ink-3 hover:text-ink">
          ← All users
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl tracking-display">{user.name ?? 'Unnamed'}</h1>
            <p className="mt-1 font-mono text-sm text-ink-3">
              {user.phoneNumber} · {user.timezone} · joined {formatDate(user.createdAt)}
            </p>
            {user.blockedAt ? (
              <p className="mt-2 text-sm text-signal-ink">
                Blocked {formatDate(user.blockedAt)}
                {user.blockedReason ? ` — ${user.blockedReason}` : ''}
              </p>
            ) : null}
          </div>
          <BlockToggle userId={user.id} blocked={user.blockedAt !== null} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Stat label="Lifetime cost" value={formatCost(user.totalCostMicros)} />
        <Stat
          label="Lifetime tokens"
          value={formatTokens(user.totalInputTokens + user.totalOutputTokens)}
        />
        <Stat label="Model calls" value={String(user.totalLlmCalls)} />
        <Stat label="Messages" value={messageCount.toLocaleString()} />
      </div>

      <Section title="Current windows">
        <div className="grid grid-cols-2 gap-6">
          <Stat
            label="Last 24 hours"
            value={`${formatTokens(usageWindow.dailyTokens)} / ${formatTokens(usageWindow.dailyCap)}`}
          />
          <Stat
            label="Last 7 days"
            value={`${formatTokens(usageWindow.weeklyTokens)} / ${formatTokens(usageWindow.weeklyCap)}`}
          />
        </div>
        <div className="mt-6">
          <UsageChart days={usageByDay} />
        </div>
      </Section>

      <Section title="Quota">
        <QuotaForm
          userId={user.id}
          dailyTokenCap={user.dailyTokenCap}
          weeklyTokenCap={user.weeklyTokenCap}
          defaultDaily={usageWindow.globalDailyCap}
          defaultWeekly={usageWindow.globalWeeklyCap}
          isUnlimited={user.planTier === 'permanent' || user.planTier === 'pro'}
        />
      </Section>

    </div>
  );
}
