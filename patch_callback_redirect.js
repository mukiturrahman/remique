const fs = require('fs');
let code = fs.readFileSync('src/lib/bdapps/subscription-service.ts', 'utf8');

code = code.replace(
  `    redirectUrl: \`https://wa.me/8801895638339?text=Hi\`,`,
  `    redirectUrl: \`\${appBaseUrl}/billing/success?requestId=\${requestId || ''}\`,`
);

fs.writeFileSync('src/lib/bdapps/subscription-service.ts', code);
console.log('Patched callback redirect');
