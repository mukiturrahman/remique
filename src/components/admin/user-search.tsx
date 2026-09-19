import Link from 'next/link';

import { SearchIcon } from './icons';

/**
 * Find one person by name, number or email.
 *
 * A plain GET form on purpose: it works with the URL as the only state, so a
 * search is a link, the back button behaves, and the page stays a server
 * component. The hidden fields carry the rest of the view across the submit —
 * without them, searching would silently reset the period and sort.
 */
export function UserSearch({
  q,
  sort,
  period,
  clearHref,
}: {
  q: string;
  sort: string;
  period: string;
  clearHref: string;
}) {
  return (
    <form action="/admin" method="get" role="search" className="flex items-center gap-2">
      <input type="hidden" name="sort" value={sort} />
      {period !== 'all' ? <input type="hidden" name="period" value={period} /> : null}

      <div className="group relative flex h-9 items-center">
        <SearchIcon className="pointer-events-none absolute left-3 h-4 w-4 text-ink-3 transition-colors group-focus-within:text-brand" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Name, number or email"
          aria-label="Search users"
          className="h-9 w-full rounded-full border border-line bg-ground-2 pl-9 pr-3 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-3 hover:border-line-strong focus:border-brand focus:bg-ground sm:w-[15rem]"
        />
      </div>

      {q ? (
        <Link
          href={clearHref}
          className="rounded-[6px] text-[13px] text-ink-3 transition-colors hover:text-ink"
        >
          Clear
        </Link>
      ) : null}
    </form>
  );
}
