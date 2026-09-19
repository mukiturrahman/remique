/**
 * The admin surface's icon set.
 *
 * One system, matching the landing page's rule: authored SVG on a 24 grid,
 * 1.5px stroke, round caps and joins, no fill, colour inherited from the
 * parent. No emoji and no third-party set at a different weight.
 */

type IconProps = {
  className?: string;
  /** Only set this when the icon is the element's whole label. */
  title?: string;
};

function Svg({ className, title, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? 'h-[18px] w-[18px]'}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.25" />
      <path d="M15.6 15.6 20 20" />
    </Svg>
  );
}

export function PeopleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9.5" cy="8" r="3.25" />
      <path d="M3.75 19.25c0-3.04 2.58-5.25 5.75-5.25s5.75 2.21 5.75 5.25" />
      <path d="M16.5 5.2a3.25 3.25 0 0 1 0 5.6" />
      <path d="M18 14.4c1.4.79 2.25 2.1 2.25 3.6" />
    </Svg>
  );
}

export function SpendIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 18.5V9.25" />
      <path d="M9.5 18.5V5.5" />
      <path d="M15 18.5v-6.75" />
      <path d="M20.5 18.5V8" />
    </Svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.25 21 19.75H3L12 4.25Z" />
      <path d="M12 10v3.75" />
      <path d="M12 16.75h.01" />
    </Svg>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.75 12h14.5" />
      <path d="M13.5 6.25 19.25 12l-5.75 5.75" />
    </Svg>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19.25 12H4.75" />
      <path d="M10.5 6.25 4.75 12l5.75 5.75" />
    </Svg>
  );
}

export function SignOutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14.75 4.75h3.5a1.5 1.5 0 0 1 1.5 1.5v11.5a1.5 1.5 0 0 1-1.5 1.5h-3.5" />
      <path d="M10 8.25 13.75 12 10 15.75" />
      <path d="M13.75 12H4.25" />
    </Svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.25 9.5 12 15.25l5.75-5.75" />
    </Svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.75" y="5.5" width="16.5" height="14.75" rx="1.5" />
      <path d="M3.75 10h16.5" />
      <path d="M8 3.75v3.5" />
      <path d="M16 3.75v3.5" />
    </Svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13.5 3.75H7a1.5 1.5 0 0 0-1.5 1.5v13.5a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V8.75L13.5 3.75Z" />
      <path d="M13.25 3.9v4.6h4.9" />
    </Svg>
  );
}

/**
 * The Remique mark, kept identical to the landing page: a filled brand square
 * with the bell knocked out in white. The one deliberate exception to the
 * stroke rule, because it is a logo rather than an icon.
 */
export function BellMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="7" fill="var(--brand)" />
      <path
        d="M16 7.4a5.6 5.6 0 0 0-5.6 5.6c0 3.4-.8 5.2-1.7 6.3a.9.9 0 0 0 .7 1.5h13.2a.9.9 0 0 0 .7-1.5c-.9-1.1-1.7-2.9-1.7-6.3A5.6 5.6 0 0 0 16 7.4Z"
        fill="#ffffff"
      />
      <path
        d="M13.9 22.4a2.2 2.2 0 0 0 4.2 0h-4.2Z"
        fill="#ffffff"
      />
    </svg>
  );
}
