import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Remique — AI-Powered WhatsApp Reminder Assistant",
  description: "Set reminders, follow-ups, and calendar alerts as easily as texting a friend on WhatsApp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#0B141A] text-[#E9EDEF]">
        {children}
      </body>
    </html>
  );
}
