import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "কী কাজে লাগে | Remique",
  description: "কী কী কাজে Remique ব্যবহার করতে পারেন।",
  alternates: {
    canonical: "/use-cases",
  },
  openGraph: {
    title: "কী কাজে লাগে | Remique",
    description: "কী কী কাজে Remique ব্যবহার করতে পারেন।",
    url: "/use-cases",
  },
  twitter: {
    title: "কী কাজে লাগে | Remique",
    description: "কী কী কাজে Remique ব্যবহার করতে পারেন।",
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
