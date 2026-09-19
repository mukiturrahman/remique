import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "সাধারণ প্রশ্ন | Remique",
  description: "Remique নিয়ে সাধারণ প্রশ্ন ও উত্তর।",
  alternates: {
    canonical: "/faq",
  },
  openGraph: {
    title: "সাধারণ প্রশ্ন | Remique",
    description: "Remique নিয়ে সাধারণ প্রশ্ন ও উত্তর।",
    url: "/faq",
  },
  twitter: {
    title: "সাধারণ প্রশ্ন | Remique",
    description: "Remique নিয়ে সাধারণ প্রশ্ন ও উত্তর।",
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
