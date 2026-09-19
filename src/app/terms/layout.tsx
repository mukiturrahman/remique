import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "টার্মস অফ সার্ভিস | Remique",
  description: "Remique ব্যবহারের শর্তাবলী।",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "টার্মস অফ সার্ভিস | Remique",
    description: "Remique ব্যবহারের শর্তাবলী।",
    url: "/terms",
  },
  twitter: {
    title: "টার্মস অফ সার্ভিস | Remique",
    description: "Remique ব্যবহারের শর্তাবলী।",
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
