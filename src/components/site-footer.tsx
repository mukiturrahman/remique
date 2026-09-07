import Link from "next/link";
import Image from "next/image";
import { MarkWhatsApp } from "./icons";

export function SiteFooter() {
  return (
    <footer className="px-5 pb-10 sm:px-8">
      <div className="mx-auto max-w-6xl rounded-[32px] border border-white/20 bg-white/10 px-8 py-14 shadow-2xl backdrop-blur-xl sm:px-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-80">
              <Image src="/logo.png" alt="Remique Logo" width={48} height={38} className="h-8 w-auto object-contain" />
              <span className="font-display text-[19px] font-semibold tracking-tight text-white">
                Remique
              </span>
            </Link>
            <p className="mt-5 max-w-[28ch] text-[15px] leading-relaxed text-white/70">
              WhatsApp reminder assistant. Built with care in Bangladesh.
            </p>
          </div>

          {/* product */}
          <div>
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-white/50">
              Product
            </p>
            <ul className="mt-5 space-y-3">
              {[
                { href: "/how-it-works", label: "How it works" },
                { href: "/use-cases", label: "Use cases" },
                { href: "/pricing", label: "Pricing" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[15px] text-white/80 transition-colors hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* support */}
          <div>
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-white/50">
              Support
            </p>
            <ul className="mt-5 space-y-3">
              {[
                { href: "/faq", label: "FAQ" },
                { href: "mailto:support@remique.com", label: "Contact Us" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[15px] text-white/80 transition-colors hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* connect */}
          <div>
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-white/50">
              Connect
            </p>
            <div className="mt-5 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-white/20">
              <MarkWhatsApp className="h-4 w-4" />
              <span>Chat on WhatsApp</span>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-[14px] text-white/60">
            &copy; {new Date().getFullYear()} Remique. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-[14px] text-white/60">
            <Link href="/privacy" className="transition-colors hover:text-white">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-white">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
