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
    messages,
    documents,
    facts,
    reminders,
    usageByDay,
    usageWindow,
  } = detail;

  return (
    <div className="space-y-8 pb-12">
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

      <Section title="Facts">
        {facts.length === 0 ? (
          <p className="text-sm text-ink-3">No facts extracted yet.</p>
        ) : (
          <ul className="space-y-2">
            {facts.map((f) => (
              <li key={f.id} className="text-sm rounded bg-surface-2 px-3 py-2">
                <span className="font-medium">{f.subject}</span> {f.predicate}{' '}
                <span className="font-mono text-xs ml-1">{f.value}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Reminders">
        {reminders.length === 0 ? (
          <p className="text-sm text-ink-3">No reminders.</p>
        ) : (
          <ul className="space-y-2">
            {reminders.map((r) => (
              <li key={r.id} className="flex justify-between text-sm rounded bg-surface-2 px-3 py-2">
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-ink-3">{formatDateTime(r.scheduledAt)}</div>
                </div>
                <div className="text-xs font-mono px-2 py-1 bg-surface rounded self-start">
                  {r.status}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Saved Files">
        {documents.length === 0 ? (
          <p className="text-sm text-ink-3">No files uploaded.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {documents.map((d) => (
              <div key={d.id} className="rounded bg-surface-2 p-3 text-sm">
                <div className="font-medium truncate" title={d.fileName || d.label || 'Unnamed'}>
                  {d.fileName || d.label || 'Unnamed'}
                </div>
                <div className="mt-1 text-xs text-ink-3 truncate">{d.mediaType} / {d.mimeType}</div>
                <div className="mt-1 text-xs text-ink-3">{Math.round(d.sizeBytes / 1024)} KB</div>
                <div className="mt-1 text-xs text-ink-3">{formatDateTime(d.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Chat History">
        {messages.length === 0 ? (
          <p className="text-sm text-ink-3">No messages yet.</p>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4">
            {messages.map((m) => {
              const isInbound = m.direction === 'INBOUND';
              return (
                <div
                  key={m.id}
                  className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                      isInbound
                        ? 'bg-surface-2 text-ink'
                        : 'bg-primary text-white'
                    }`}
                  >
                    {m.mediaType && (
                      <div className="mb-2 text-xs opacity-80 font-mono">
                        [{m.mediaType}] {m.mediaFilename || ''}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words">{m.messageText}</div>
                    <div className={`mt-1 text-[10px] ${isInbound ? 'text-ink-3' : 'text-primary-foreground/70'} text-right`}>
                      {formatDateTime(m.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

    </div>
  );
}
