"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useCopy } from "./lang-provider";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const c = useCopy();

  const navLinks = [
    { href: "/how-it-works", label: c.nav.howItWorks },
    { href: "/use-cases", label: c.nav.useCases },
    { href: "/pricing", label: c.nav.pricing },
    { href: "/faq", label: c.nav.faq },
  ];

  return (
    <header className="fixed inset-x-0 top-4 z-40 mx-auto w-full max-w-5xl px-4 sm:top-6 max-xl:pr-28 max-sm:pr-24">
      <nav className="mx-auto flex h-[64px] items-center gap-4 rounded-full border border-white/40 bg-ground/60 px-5 shadow-lg backdrop-blur-xl sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-md">
          <Image src="/logo.png" alt={c.nav.logoAlt} width={56} height={44} className="bob h-10 w-auto object-contain" />
          <span className="font-display text-[19px] font-semibold tracking-tight text-ink">
            Remique
          </span>
        </Link>

        {/* desktop links */}
        <div className="ml-auto hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
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
          className="ml-auto hidden items-center gap-2 rounded-full bg-brand px-4 py-2.5 font-display text-[14.5px] font-semibold tracking-tight text-white transition-colors duration-200 hover:bg-brand-deep lg:inline-flex lg:ml-4"
        >
          {c.nav.getStarted}
        </Link>

        {/* mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="relative ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-ink-2 lg:hidden"
          aria-label={open ? c.nav.closeMenu : c.nav.openMenu}
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
        <div className="absolute inset-x-4 top-[calc(100%+12px)] rounded-2xl border border-white/40 bg-ground/80 p-4 shadow-xl backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
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
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-brand px-4 py-2.5 font-display text-[15px] font-semibold tracking-tight text-white transition-colors duration-200 hover:bg-brand-deep"
            >
              {c.nav.getStarted}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
