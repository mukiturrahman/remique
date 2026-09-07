import Link from "next/link";
import { MarkRemique, MarkWhatsApp } from "./icons";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ink">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <MarkRemique className="h-[28px] w-[28px] text-brand" />
              <span className="font-display text-[17px] font-semibold tracking-tight text-white">
                Remique
              </span>
            </Link>
            <p className="mt-4 max-w-[32ch] text-[14px] leading-relaxed text-white/50">
              WhatsApp reminder assistant. Built in Bangladesh.
            </p>
          </div>

          {/* product */}
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
              Product
            </p>
            <ul className="mt-4 space-y-2.5">
              {[
                { href: "/how-it-works", label: "How it works" },
                { href: "/use-cases", label: "Use cases" },
                { href: "/pricing", label: "Pricing" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[14px] text-white/60 transition-colors hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* support */}
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
              Support
            </p>
            <ul className="mt-4 space-y-2.5">
              {[
                { href: "/faq", label: "FAQ" },
                { href: "/testimonials", label: "Testimonials" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[14px] text-white/60 transition-colors hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* connect */}
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
              Connect
            </p>
            <div className="mt-4 flex items-center gap-2.5 text-[14px] text-white/60">
              <MarkWhatsApp className="h-4 w-4" />
              <span>Chat on WhatsApp</span>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <p className="text-[13px] text-white/35">
            &copy; {new Date().getFullYear()} Remique. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
