const fs = require('fs');
let code = fs.readFileSync('src/app/billing/success/page.tsx', 'utf8');

code = code.replace(
  `import { useCopy } from "@/components/lang-provider";`,
  `import { useCopy, useLang } from "@/components/lang-provider";`
);

code = code.replace(
  `  const c = useCopy();`,
  `  const c = useCopy();\n  const { lang } = useLang();`
);

code = code.replace(
  `Redirecting in {countdown}...`,
  `{countdown > 0 ? (lang === 'bn' ? \`\${countdown} সেকেন্ডের মধ্যে রিডাইরেক্ট হচ্ছে...\` : \`Redirecting in \${countdown}...\`) : copy.ctaWhatsApp}`
);

fs.writeFileSync('src/app/billing/success/page.tsx', code);
console.log('Patched countdown i18n');
