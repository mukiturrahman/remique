import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BlockToggle } from '@/components/admin/block-toggle';
import { QuotaForm } from '@/components/admin/quota-form';
import { UsageChart } from '@/components/admin/usage-chart';
import { formatCost, formatTokens, getUserDetail } from '@/lib/admin-queries';

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

  const { user, messages, documents, facts, activeReminders, pastReminders, usageByDay, usageWindow } =
    detail;

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
              {user.phoneNumber} · {user.timezone} · joined{' '}
              {user.createdAt.toISOString().slice(0, 10)}
            </p>
            {user.blockedAt ? (
              <p className="mt-2 text-sm text-signal-ink">
                Blocked {user.blockedAt.toISOString().slice(0, 10)}
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
        <Stat label="Messages" value={String(messages.length >= 100 ? '100+' : messages.length)} />
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
          defaultDaily={usageWindow.dailyCap}
          defaultWeekly={usageWindow.weeklyCap}
        />
      </Section>

      <Section title={`Active reminders (${activeReminders.length})`}>
        {activeReminders.length === 0 ? (
          <p className="text-sm text-ink-3">Nothing scheduled.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {activeReminders.map((r) => (
              <li key={r.id} className="flex justify-between border-b border-line pb-2">
                <span>
                  {r.title}
                  <span className="ml-2 text-xs text-ink-3">{r.category}</span>
                  {r.recurrenceRule ? (
                    <span className="ml-2 text-xs text-brand-deep">{r.recurrenceRule}</span>
                  ) : null}
                </span>
                <span className="font-mono text-xs text-ink-3">
                  {r.scheduledAt.toISOString().replace('T', ' ').slice(0, 16)} UTC
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Files (${documents.length})`}>
        {documents.length === 0 ? (
          <p className="text-sm text-ink-3">No files saved.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-strong text-left text-xs uppercase tracking-wide text-ink-3">
                <th className="py-2 pr-4 font-medium">Label</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 text-right font-medium">Size</th>
                <th className="py-2 font-medium">Saved</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-b border-line">
                  <td className="py-2 pr-4">
                    {d.label ?? <span className="text-ink-3">unlabelled — swept after 24h</span>}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-ink-3">{d.mimeType}</td>
                  <td className="py-2 pr-4 text-right font-mono text-xs">
                    {(d.sizeBytes / 1024).toFixed(0)} KB
                  </td>
                  <td className="py-2 font-mono text-xs text-ink-3">
                    {d.createdAt.toISOString().slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={`Known facts (${facts.length})`}>
        {facts.length === 0 ? (
          <p className="text-sm text-ink-3">Nothing learned yet.</p>
        ) : (
          <ul className="space-y-1 font-mono text-xs">
            {facts.map((f) => (
              <li key={f.id}>
                <span className="text-ink-3">{f.subject}.{f.predicate}</span> = {f.value}
                {f.recurring ? <span className="ml-2 text-brand-deep">recurring</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Recent messages (last 100)">
        <ul className="space-y-2 text-sm">
          {messages.map((m) => (
            <li key={m.id} className="border-b border-line pb-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className={m.direction === 'INBOUND' ? 'text-ink' : 'text-ink-3'}>
                  <span className="mr-2 font-mono text-xs">
                    {m.direction === 'INBOUND' ? '→' : '←'}
                  </span>
                  {m.messageText || <em className="text-ink-3">({m.mediaType ?? 'no text'})</em>}
                </span>
                <span className="shrink-0 font-mono text-xs text-ink-3">
                  {m.createdAt.toISOString().replace('T', ' ').slice(0, 16)}
                </span>
              </div>
              {m.processingError ? (
                <div className="mt-1 font-mono text-xs text-signal-ink">{m.processingError}</div>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`Past reminders (${pastReminders.length})`}>
        {pastReminders.length === 0 ? (
          <p className="text-sm text-ink-3">None yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {pastReminders.map((r) => (
              <li key={r.id} className="flex justify-between border-b border-line pb-1">
                <span>
                  {r.title} <span className="ml-2 text-xs text-ink-3">{r.status}</span>
                </span>
                <span className="font-mono text-xs text-ink-3">
                  {r.scheduledAt.toISOString().slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
