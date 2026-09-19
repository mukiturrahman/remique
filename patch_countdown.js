const fs = require('fs');
let code = fs.readFileSync('src/app/billing/success/page.tsx', 'utf8');

const importStatement = `import { Suspense, useEffect } from "react";`;
const newImportStatement = `import { Suspense, useEffect, useState } from "react";`;
code = code.replace(importStatement, newImportStatement);

const functionStart = `function BillingSuccessInner() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Auto-redirect to WhatsApp after 2.5 seconds to give the pixel time to fire
    const timer = setTimeout(() => {
      window.location.href = "https://wa.me/8801895638339?text=Hi";
    }, 2500);
    return () => clearTimeout(timer);
  }, []);`;

const newFunctionStart = `function BillingSuccessInner() {
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(3);
  
  useEffect(() => {
    // Auto-redirect to WhatsApp after 3 seconds to give the pixel time to fire
    const redirectTimer = setTimeout(() => {
      window.location.href = "https://wa.me/8801895638339?text=Hi";
    }, 3000);
    
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    
    return () => {
      clearTimeout(redirectTimer);
      clearInterval(interval);
    };
  }, []);`;

code = code.replace(functionStart, newFunctionStart);

const buttonOld = `          <a
            href="https://wa.me/8801895638339?text=Hi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 font-display text-[15px] font-semibold tracking-tight text-white shadow-lift transition-all duration-200 hover:bg-brand-deep hover:shadow-panel"
          >
            {copy.ctaWhatsApp}
            <IconArrow className="h-4 w-4" />
          </a>`;

const buttonNew = `          <a
            href="https://wa.me/8801895638339?text=Hi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 font-display text-[15px] font-semibold tracking-tight text-white shadow-lift transition-all duration-200 hover:bg-brand-deep hover:shadow-panel"
          >
            Redirecting in {countdown}...
            <IconArrow className="h-4 w-4" />
          </a>`;

code = code.replace(buttonOld, buttonNew);

fs.writeFileSync('src/app/billing/success/page.tsx', code);
console.log('Patched countdown');
