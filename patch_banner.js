const fs = require('fs');
let code = fs.readFileSync('src/lib/i18n/copy.ts', 'utf8');

code = code.replace(
    \`priceNote: "Starts at ৳49/week",\`,
    \`priceNote: "Only ৳190/month",\`
);

code = code.replace(
    \`priceNote: "শুরু ৳49/সপ্তাহ থেকে",\`,
    \`priceNote: "মাত্র ৳190/মাসে",\`
);

fs.writeFileSync('src/lib/i18n/copy.ts', code);
console.log('Patched banner copy');
