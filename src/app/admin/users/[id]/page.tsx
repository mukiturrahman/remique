import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BlockToggle } from '@/components/admin/block-toggle';
import { legend } from '@/components/admin/controls';
import { BackIcon, ClockIcon, FileIcon } from '@/components/admin/icons';
import { planLabel } from '@/components/admin/plan-badge';
import { PlanForm } from '@/components/admin/plan-form';
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

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line pt-7">
      <h2 className="font-display text-[19px] font-semibold tracking-tight">{title}</h2>
      {note ? <p className="mt-1 text-[13px] text-ink-3">{note}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/**
 * Turns a stored fact triple into something a person reads.
 *
 * The store holds `subject / predicate / value` — "me · name · Aovin" — which
 * is the database's language, not the product's. The subject is dropped when
 * it is the user themselves, because every fact on their own page is about
 * them by definition.
 */
function factLine(subject: string, predicate: string): string {
  const label = predicate.replace(/[_-]+/g, ' ').trim();
  const own = ['me', 'i', 'user', 'self'].includes(subject.trim().toLowerCase());
  const phrase = own ? label : `${subject} — ${label}`;
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

/** A figure on the header row. Hairline-separated, never boxed. */
function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-l border-line pl-4 first:border-l-0 first:pl-0">
      <div className={legend}>{label}</div>
      <div className="tabular mt-1.5 font-mono text-[19px] text-ink">{value}</div>
      {note ? <div className="mt-0.5 text-[11.5px] text-ink-3">{note}</div> : null}
    </div>
  );
}

/**
 * One quota window, drawn against its cap.
 *
 * The bar is the content here, not decoration: "1.2M of 1.5M" is much harder
 * to feel than a bar that is four fifths full and turning coral.
 */
function Window({
  label,
  used,
  cap,
  cost,
}: {
  label: string;
  used: number;
  cap: number | null;
  cost: string;
}) {
  const ratio = cap === null || cap === 0 ? 0 : Math.min(1, used / cap);
  const breached = cap !== null && cap > 0 && used >= cap;

  return (
    <div>
      <div className={legend}>{label}</div>
      <div className="tabular mt-1.5 font-mono text-[19px] text-ink">
        {formatTokens(used)}
        <span className="text-ink-3"> / {formatTokens(cap)}</span>
      </div>
      {/* No track when there is no cap: an empty bar reads as "0% used",
          which is the opposite of what an uncapped plan means. */}
      {cap === null ? null : (
        <div className="mt-3 h-1 w-full rounded-full bg-ground-3">
          <div
            className={`h-1 rounded-full ${breached ? 'bg-signal-ink' : 'bg-brand'}`}
            style={{ width: `${Math.max(ratio * 100, used > 0 ? 2 : 0)}%` }}
          />
        </div>
      )}
      <div className="mt-2 text-[13px] text-ink-3">
        {cap === null ? 'No cap on this plan' : breached ? 'At the cap — replies refused' : `${cost} spent`}
      </div>
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

  const { user, messageCount, messages, documents, facts, reminders, usageByDay, usageWindow } =
    detail;

  const isUnlimited = user.planTier === 'permanent' || user.planTier === 'pro';
  const lapsed = user.planExpiresAt !== null && user.planExpiresAt.getTime() < Date.now();
  const plan = planLabel(user);
  const lifetimeTokens = user.totalInputTokens + user.totalOutputTokens;
  const displayName = user.name ?? 'Unnamed';

  return (
    <div className="space-y-12">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 rounded-[6px] text-[14px] text-ink-3 transition-colors hover:text-ink"
        >
          <BackIcon className="h-4 w-4" />
          Everyone
        </Link>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <h1 className="font-display text-[30px] font-semibold leading-tight tracking-display sm:text-[36px]">
              {displayName}
            </h1>
            <p className="tabular mt-2 font-mono text-[13px] text-ink-3">
              {user.phoneNumber}
              {user.email ? ` · ${user.email}` : ''} · {user.timezone} · joined{' '}
              {formatDate(user.createdAt)}
            </p>

            <p className="mt-4 max-w-measure text-[15.5px] leading-relaxed text-ink-2">
              {messageCount === 0 ? (
                <>No messages yet — the account exists but nothing has come through.</>
              ) : (
                <>
                  {messageCount.toLocaleString()} messages since {formatDate(user.createdAt)},{' '}
                  {formatTokens(lifetimeTokens)} tokens across {user.totalLlmCalls.toLocaleString()}{' '}
                  model calls, costing{' '}
                  <span className="tabular font-mono text-ink">
                    {formatCost(user.totalCostMicros)}
                  </span>
                  .
                </>
              )}
            </p>

            {user.blockedAt ? (
              <p className="mt-3 text-[14px] text-signal-ink">
                Blocked {formatDate(user.blockedAt)}
                {user.blockedReason ? ` — ${user.blockedReason}` : '. They are hearing nothing back.'}
              </p>
            ) : null}
          </div>

          <BlockToggle userId={user.id} blocked={user.blockedAt !== null} />
        </div>
      </div>

      {/* Cost, tokens and model calls are deliberately absent: the sentence
          above already states all three, and repeating them here would turn
          this strip into the metric-tile row the surface refuses. */}
      <div className="grid grid-cols-2 gap-y-6 border-y border-line py-6 sm:grid-cols-4 sm:gap-y-0">
        <Stat
          label="Plan"
          value={plan.label}
          note={
            user.planExpiresAt
              ? `${lapsed ? 'ended' : 'ends'} ${formatDate(user.planExpiresAt)}`
              : plan.look === 'free'
                ? 'never subscribed'
                : 'no end date'
          }
        />
        <Stat
          label="Last seen"
          value={formatDate(user.updatedAt)}
          note={user.timezone.replace('_', ' ')}
        />
        <Stat
          label="Reminders"
          value={reminders.length.toLocaleString()}
          note={reminders.length === 0 ? 'none set' : 'set all time'}
        />
        <Stat
          label="Files"
          value={documents.length.toLocaleString()}
          note={documents.length === 0 ? 'none saved' : 'saved all time'}
        />
      </div>

      <Section title="Right now" note="The two windows the quota check actually reads.">
        <div className="grid gap-8 sm:grid-cols-2">
          <Window
            label="Last 24 hours"
            used={usageWindow.dailyTokens}
            cap={usageWindow.dailyCap}
            cost={formatCost(usageWindow.dailyCostMicros)}
          />
          <Window
            label="Last 7 days"
            used={usageWindow.weeklyTokens}
            cap={usageWindow.weeklyCap}
            cost={formatCost(usageWindow.weeklyCostMicros)}
          />
        </div>
        <div className="mt-8">
          <UsageChart days={usageByDay} />
        </div>
      </Section>

      <Section title="Plan" note="Nothing here charges anyone — it only sets what the app believes.">
        <PlanForm
          userId={user.id}
          planTier={user.planTier}
          planPeriod={user.planPeriod}
          expiresOn={user.planExpiresAt ? formatDate(user.planExpiresAt) : ''}
        />
      </Section>

      <Section title="Quota">
        <QuotaForm
          userId={user.id}
          dailyTokenCap={user.dailyTokenCap}
          weeklyTokenCap={user.weeklyTokenCap}
          defaultDaily={usageWindow.globalDailyCap}
          defaultWeekly={usageWindow.globalWeeklyCap}
          isUnlimited={isUnlimited}
        />
      </Section>

      <Section
        title="Reminders"
        note={reminders.length > 0 ? `${reminders.length} in total, newest first.` : undefined}
      >
        {reminders.length === 0 ? (
          <p className="text-[14px] text-ink-3">
            They have not asked Remique to remember anything yet.
          </p>
        ) : (
          <ul className="border-t border-line">
            {reminders.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line py-3"
              >
                <div className="min-w-0">
                  <div className="text-[14px] font-medium text-ink">{r.title}</div>
                  <div className="tabular mt-0.5 flex items-center gap-1.5 font-mono text-[11.5px] text-ink-3">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {formatDateTime(r.scheduledAt)}
                  </div>
                </div>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.11em] text-ink-2">
                  {r.status.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Facts" note="What the assistant has picked up and kept about them.">
        {facts.length === 0 ? (
          <p className="text-[14px] text-ink-3">Nothing extracted yet.</p>
        ) : (
          <ul className="border-t border-line">
            {facts.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-3 text-[14px]"
              >
                <span className="text-ink-2">{factLine(f.subject, f.predicate)}</span>
                <span className="font-medium text-ink">{f.value}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Saved files">
        {documents.length === 0 ? (
          <p className="text-[14px] text-ink-3">No files uploaded.</p>
        ) : (
          <ul className="border-t border-line">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex items-start gap-3 border-b border-line py-3 text-[14px]"
              >
                <FileIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink-3" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-ink" title={d.fileName || d.label || 'Unnamed'}>
                    {d.fileName || d.label || 'Unnamed'}
                  </div>
                  <div className="tabular mt-0.5 truncate font-mono text-[11.5px] text-ink-3">
                    {d.mediaType} · {d.mimeType} · {Math.round(d.sizeBytes / 1024).toLocaleString()} KB
                  </div>
                </div>
                <span className="tabular shrink-0 font-mono text-[11.5px] text-ink-3">
                  {formatDateTime(d.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Chat history"
        note={
          messages.length > 0
            ? `The last ${messages.length.toLocaleString()} of ${messageCount.toLocaleString()} messages, oldest first.`
            : undefined
        }
      >
        {messages.length === 0 ? (
          <p className="text-[14px] text-ink-3">Nothing has been said yet.</p>
        ) : (
          // Bounded by hairlines on the page's own ground rather than sunk
          // into a filled panel: bubbles inside a card would be a container
          // inside a container, which this world does not do.
          <div className="max-h-[36rem] space-y-3 overflow-y-auto border-y border-line py-5">
            {messages.map((m) => {
              const isInbound = m.direction === 'INBOUND';
              return (
                <div key={m.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 text-[14px] leading-relaxed ${
                      isInbound
                        ? 'rounded-[16px] rounded-bl-[6px] bg-ground-3 text-ink-2'
                        : 'rounded-[16px] rounded-br-[6px] bg-brand text-white'
                    }`}
                  >
                    {m.mediaType ? (
                      <div
                        className={`mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.11em] ${
                          isInbound ? 'text-ink-3' : 'text-brand-tint'
                        }`}
                      >
                        {m.mediaType}
                        {m.mediaFilename ? ` · ${m.mediaFilename}` : ''}
                      </div>
                    ) : null}
                    <div className="whitespace-pre-wrap break-words">{m.messageText}</div>
                    <div
                      className={`tabular mt-1 text-right font-mono text-[10.5px] ${
                        isInbound ? 'text-ink-3' : 'text-brand-tint'
                      }`}
                    >
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
