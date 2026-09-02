import type { SVGProps } from "react";

/**
 * One drawn icon system: 24 grid, 1.5 stroke, round caps and joins, no fills
 * except the WhatsApp mark (a real brand glyph) and the Remique bell mark.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Stroke({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Two scripts sharing one speech shape. */
export function IconScripts(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M3 6.5h8M7 6.5v9M5 15.5h4" />
      <path d="M13.5 5.5c2.6 0 4 1.4 4 3.4 0 2.6-2.4 3.3-2.4 5.6" />
      <path d="M15.1 18.2h.01" />
      <path d="M2.75 20.25v-15A2.25 2.25 0 0 1 5 3h14a2.25 2.25 0 0 1 2.25 2.25v9A2.25 2.25 0 0 1 19 16.5H7.5l-4.75 3.75Z" />
    </Stroke>
  );
}

/** A reply arriving faster than the clock hand moves. */
export function IconInstant(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12.5 2.75 5.25 13h5.5l-1.25 8.25L16.75 11h-5.5l1.25-8.25Z" />
      <path d="M3.5 6.5h2.75M2.5 10.5h2M4.5 17.5h2.25" />
    </Stroke>
  );
}

/** A time landed on exactly. */
export function IconExactTime(props: IconProps) {
  return (
    <Stroke {...props}>
      <circle cx="12" cy="12.5" r="8.25" />
      <path d="M12 8v4.5l3 1.75" />
      <path d="M12 1.75v1.5M6.25 3.4l.9 1.4M17.75 3.4l-.9 1.4" />
    </Stroke>
  );
}

/** A list you can read back and strike through. */
export function IconLedger(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M4.75 3.75h11.5l3 3v13.5H4.75z" />
      <path d="M8 8.75h6M8 12.25h8M8 15.75h4.5" />
      <path d="m14.5 15.5 2 2 3.75-4" />
    </Stroke>
  );
}

/** The bell at the moment it rings. */
export function IconRing(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M6.5 10.25a5.5 5.5 0 0 1 11 0c0 3.6.9 5.1 1.75 6.1H4.75c.85-1 1.75-2.5 1.75-6.1Z" />
      <path d="M10 19.25a2.25 2.25 0 0 0 4 0" />
      <path d="M2.75 8.5c.35-1.6 1.2-3 2.4-4M21.25 8.5c-.35-1.6-1.2-3-2.4-4" />
    </Stroke>
  );
}

/** A signature checked before the message is let through. */
export function IconVerified(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12 2.75 4.75 5.5v6c0 4.6 3 8.2 7.25 9.75 4.25-1.55 7.25-5.15 7.25-9.75v-6L12 2.75Z" />
      <path d="m8.75 11.75 2.25 2.25 4.25-4.5" />
    </Stroke>
  );
}

export function IconArrow(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M4.75 12h14.5M13.5 6.25 19.25 12l-5.75 5.75" />
    </Stroke>
  );
}

/** The Remique mark: a bell struck, drawn as one continuous form. */
export function MarkRemique(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" {...props}>
      <rect width="24" height="24" rx="7" fill="currentColor" />
      <path
        d="M7.6 15.4c.8-.95 1.35-2.1 1.35-4.35a3.05 3.05 0 0 1 6.1 0c0 2.25.55 3.4 1.35 4.35H7.6Z"
        fill="#fff"
      />
      <path d="M10.6 17.05a1.5 1.5 0 0 0 2.8 0" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12" cy="6.35" r="1.15" fill="#fff" />
    </svg>
  );
}

/** WhatsApp's own glyph — a platform affordance, kept accurate. */
export function MarkWhatsApp(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}
