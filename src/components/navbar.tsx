"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MarkRemique } from "./icons";

const NAV_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-ground supports-[backdrop-filter]:bg-ground/95 backdrop-blur-xl">
      <nav className="mx-auto flex h-[68px] max-w-6xl items-center gap-4 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-md">
          <MarkRemique className="h-[30px] w-[30px] text-brand" />
          <span className="font-display text-[19px] font-semibold tracking-tight text-ink">
            Remique
          </span>
        </Link>

        {/* desktop links */}
        <div className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-2 text-[14.5px] font-medium transition-colors ${
                pathname === link.href
                  ? "text-brand"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <Link
          href="/pricing"
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 font-display text-[14.5px] font-semibold tracking-tight text-white transition-colors duration-200 hover:bg-brand-deep lg:ml-4"
        >
          Get started
        </Link>

        {/* mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="relative grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-2 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="h-5 w-5">
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* mobile menu */}
      {open && (
        <div className="border-t border-line bg-ground px-5 pb-6 pt-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-brand-tint text-brand"
                    : "text-ink-2 hover:bg-ground-2 hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
