import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ground: {
          DEFAULT: "var(--ground)",
          2: "var(--ground-2)",
          3: "var(--ground-3)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
        },
        line: {
          DEFAULT: "var(--line)",
          strong: "var(--line-strong)",
        },
        brand: {
          DEFAULT: "var(--brand)",
          deep: "var(--brand-deep)",
          tint: "var(--brand-tint)",
        },
        signal: {
          ink: "var(--signal-ink)",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        bn: ["var(--font-bn)", "var(--font-sans)", "sans-serif"],
      },
      letterSpacing: {
        display: "-0.035em",
        tight: "-0.02em",
      },
      maxWidth: {
        measure: "68ch",
      },
      boxShadow: {
        panel:
          "0 1px 2px rgba(11, 21, 18, 0.04), 0 12px 28px -12px rgba(11, 21, 18, 0.14), 0 34px 64px -32px rgba(11, 21, 18, 0.18)",
        lift:
          "0 2px 4px rgba(11, 21, 18, 0.05), 0 18px 36px -14px rgba(11, 21, 18, 0.2)",
        press: "0 1px 2px rgba(11, 21, 18, 0.12)",
      },
    },
  },
  plugins: [],
} satisfies Config;
