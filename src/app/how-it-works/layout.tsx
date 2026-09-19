import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "কীভাবে কাজ করে | Remique",
  description: "কীভাবে Remique কাজ করে তা জেনে নিন।",
  alternates: {
    canonical: "/how-it-works",
  },
  openGraph: {
    title: "কীভাবে কাজ করে | Remique",
    description: "কীভাবে Remique কাজ করে তা জেনে নিন।",
    url: "/how-it-works",
  },
  twitter: {
    title: "কীভাবে কাজ করে | Remique",
    description: "কীভাবে Remique কাজ করে তা জেনে নিন।",
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
