/**
 * One control vocabulary for the whole admin surface.
 *
 * Every button on these pages is a pill at one of three weights, and every
 * field is the same height, radius and focus behaviour. Kept as strings rather
 * than components so both server and client components can use them without a
 * wrapper, and so a control that needs one extra class does not have to become
 * a new variant.
 */

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-full text-[14px] font-medium ' +
  'transition-[background-color,border-color,box-shadow,transform,color] duration-200 ease-out ' +
  'disabled:cursor-not-allowed disabled:shadow-none disabled:active:translate-y-0';

/**
 * Disabled drops the colour rather than fading it.
 *
 * A half-opacity jade button still reads as a live mint button; a neutral one
 * reads as unavailable at a glance, which is the whole job of the state.
 */
const off =
  'disabled:bg-ground-2 disabled:text-ink-3 disabled:border-line ' +
  'disabled:hover:bg-ground-2 disabled:hover:text-ink-3 disabled:hover:border-line';

export const button = {
  /** The one action a screen wants you to take. */
  primary: `${buttonBase} ${off} bg-brand px-5 py-2.5 text-white shadow-lift hover:bg-brand-deep hover:shadow-panel active:translate-y-px active:shadow-press`,

  /** Everything else: save, cancel, page back and forward. */
  quiet: `${buttonBase} ${off} border border-line bg-ground px-4 py-2 text-ink hover:border-line-strong hover:bg-ground-2 active:translate-y-px`,

  /** Cutting someone off. Coral, because it is the breach on this surface. */
  danger: `${buttonBase} ${off} bg-signal-ink px-4 py-2 text-white shadow-lift hover:bg-signal-deep hover:shadow-panel active:translate-y-px active:shadow-press`,
} as const;

/** Text inputs, number inputs and selects all share this. */
export const field =
  'h-10 w-full rounded-[10px] border border-line bg-ground-2 px-3 text-[14px] text-ink outline-none ' +
  'transition-colors placeholder:text-ink-3 hover:border-line-strong ' +
  'focus:border-brand focus:bg-ground ' +
  // Same rule as the buttons: unavailable is a colour, not a fade.
  'disabled:cursor-not-allowed disabled:border-line disabled:bg-ground-2 disabled:text-ink-3 ' +
  'disabled:hover:border-line';

/** The small mono legend that names a field or a data cell. */
export const legend = 'font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3';
