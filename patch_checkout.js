const fs = require('fs');
let code = fs.readFileSync('src/app/pricing/page.tsx', 'utf8');

const oldRedirect = `      // Redirect to bdApps bKash hosted authorization page
      window.location.href = data.authorizationUrl;`;

const newRedirect = `      // Track InitiateCheckout just before leaving the site
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'InitiateCheckout', { currency: 'BDT', value: price });
      }

      // Redirect to bdApps bKash hosted authorization page
      window.location.href = data.authorizationUrl;`;

code = code.replace(oldRedirect, newRedirect);

fs.writeFileSync('src/app/pricing/page.tsx', code);
console.log('Patched InitiateCheckout event');
