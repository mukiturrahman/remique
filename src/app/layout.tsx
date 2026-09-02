import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono, Anek_Bangla } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  // opsz is what the display sizes are actually set in — the browser applies it
  // via font-optical-sizing, and dropping it silently widens every heading.
  // wdth stays out: nothing on the page varies it.
  axes: ["opsz"],
});

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const bangla = Anek_Bangla({
  subsets: ["bengali"],
  variable: "--font-bn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Remique — WhatsApp reminders in English, Banglish and বাংলা",
  description:
    "Set reminders by texting Remique on WhatsApp the way you actually type — English, Banglish or Bengali. No app to install, no account to make.",
};

export const viewport: Viewport = {
  themeColor: "#0f6b52",
};

const DIRECTION_CONTRACT = `<!--
impeccable direction contract · seed 14713d86 · kind canon

THESIS: Zero friction, proven rather than claimed — this page shows Remique
reading a Banglish sentence and handing back an exact time. It refuses the
category default it replaces: the dark WhatsApp-screenshot-in-a-phone-frame.

OWN-WORLD: Bright near-white ground; jade #0F6B52 the only structural colour and
it owns whole regions; coral #FF5A3C reserved for the fired moment itself — the
one hour a reminder lands on — and never for ordinary data. Bricolage Grotesque
display, Geist text, Geist Mono for parsed data, Anek Bangla for Bengali.
Hairline rules, no card grid, drawn 1.5px icons, no emoji as icons.

STORY: A Dhaka WhatsApp user sees their own mixed-language sentence understood,
believes it takes two seconds and no signup, and opens WhatsApp.

FIRST VIEWPORT: Headline left at display scale over white, primary action
directly beneath it; right, a live composer typing a real Banglish sentence that
resolves into a jade parse readout of task and hour.

FORM: The category standard, chosen by the user over four rolled worlds, at the
craft bar they named: Stripe / Notion / Framer. Seed key 14713d86.

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, and DESIGN.md
-->`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} ${bangla.variable}`}
    >
      <body className="antialiased min-h-screen bg-ground font-sans text-ink">
        <div hidden dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }} />
        {children}
      </body>
    </html>
  );
}
