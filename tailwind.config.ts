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
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          whatsapp: "#25D366",
          dark: "#0B141A",
          surface: "#111B21",
          bubble: "#005C4B",
          accent: "#00A884",
        }
      },
    },
  },
  plugins: [],
} satisfies Config;
