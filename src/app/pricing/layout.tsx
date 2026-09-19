import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "প্রাইসিং | Remique",
  description: "আপনার WhatsApp AI অ্যাসিস্ট্যান্টের প্রাইসিং।",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "প্রাইসিং | Remique",
    description: "আপনার WhatsApp AI অ্যাসিস্ট্যান্টের প্রাইসিং।",
    url: "/pricing",
  },
  twitter: {
    title: "প্রাইসিং | Remique",
    description: "আপনার WhatsApp AI অ্যাসিস্ট্যান্টের প্রাইসিং।",
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
