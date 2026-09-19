const fs = require('fs');
let code = fs.readFileSync('src/lib/i18n/copy.ts', 'utf8');

code = code.replace(
  `phonePlaceholder: "01712345678",`,
  `phonePlaceholder: "018XXXXXXXX",`
);

code = code.replace(
  `phonePlaceholder: "01712345678",`, // Replace the second occurrence (Bangla)
  `phonePlaceholder: "018XXXXXXXX",`
);

fs.writeFileSync('src/lib/i18n/copy.ts', code);
console.log('Patched copy.ts placeholders');
