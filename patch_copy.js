const fs = require('fs');
let code = fs.readFileSync('src/lib/i18n/copy.ts', 'utf8');

code = code.replace(
  `            emailLabel: "Email Address",\n            emailPlaceholder: "you@example.com",`,
  `            bkashLabel: "bKash Number",\n            bkashPlaceholder: "018XXXXXXXX",\n            emailLabel: "Email Address",\n            emailPlaceholder: "you@example.com",`
);

code = code.replace(
  `            emailLabel: "ইমেইল ঠিকানা",\n            emailPlaceholder: "you@example.com",`,
  `            bkashLabel: "bKash নম্বর",\n            bkashPlaceholder: "018XXXXXXXX",\n            emailLabel: "ইমেইল ঠিকানা",\n            emailPlaceholder: "you@example.com",`
);

fs.writeFileSync('src/lib/i18n/copy.ts', code);
console.log('Patched copy.ts');
