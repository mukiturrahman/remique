const fs = require('fs');
let code = fs.readFileSync('src/components/analytics.tsx', 'utf8');

const oldEffect = `  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'PageView');
    }
  }, [pathname, searchParams]);`;

const newEffect = `  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'PageView');
      
      if (pathname === '/billing/success') {
        // Track the purchase/subscription event for Meta Pixel
        // Assuming 190 BDT since we only offer monthly now.
        (window as any).fbq('track', 'Purchase', { currency: 'BDT', value: 190 });
        (window as any).fbq('track', 'Subscribe', { currency: 'BDT', value: 190 });
      }
    }
  }, [pathname, searchParams]);`;

code = code.replace(oldEffect, newEffect);

fs.writeFileSync('src/components/analytics.tsx', code);
console.log('Patched analytics.tsx');
