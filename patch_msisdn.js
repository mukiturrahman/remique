const fs = require('fs');
let code = fs.readFileSync('src/lib/bdapps/subscription-service.ts', 'utf8');

code = code.replace(
  `  const msisdn = user.whatsappId.startsWith('8801') ? user.whatsappId.slice(2) : user.whatsappId;`,
  `  let msisdn = user.whatsappId.startsWith('8801') ? user.whatsappId.slice(2) : user.whatsappId;
  if (bkashNormalized) {
    msisdn = bkashNormalized.startsWith('8801') ? bkashNormalized.slice(2) : bkashNormalized;
  }`
);

fs.writeFileSync('src/lib/bdapps/subscription-service.ts', code);
console.log('Patched msisdn');
