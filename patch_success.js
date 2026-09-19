const fs = require('fs');
let code = fs.readFileSync('src/app/billing/success/page.tsx', 'utf8');

const importStatement = `import { Suspense } from "react";\nimport { useSearchParams } from "next/navigation";`;
const newImportStatement = `import { Suspense, useEffect } from "react";\nimport { useSearchParams } from "next/navigation";`;
code = code.replace(importStatement, newImportStatement);

const oldFunctionStart = `function BillingSuccessInner() {
  const searchParams = useSearchParams();`;

const newFunctionStart = `function BillingSuccessInner() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Auto-redirect to WhatsApp after 2.5 seconds to give the pixel time to fire
    const timer = setTimeout(() => {
      window.location.href = "https://wa.me/8801895638339?text=Hi";
    }, 2500);
    return () => clearTimeout(timer);
  }, []);
`;

code = code.replace(oldFunctionStart, newFunctionStart);

fs.writeFileSync('src/app/billing/success/page.tsx', code);
console.log('Patched success page');
