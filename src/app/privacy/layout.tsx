import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "প্রাইভেসি পলিসি | Remique",
  description: "Remique-এর প্রাইভেসি পলিসি।",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "প্রাইভেসি পলিসি | Remique",
    description: "Remique-এর প্রাইভেসি পলিসি।",
    url: "/privacy",
  },
  twitter: {
    title: "প্রাইভেসি পলিসি | Remique",
    description: "Remique-এর প্রাইভেসি পলিসি।",
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
