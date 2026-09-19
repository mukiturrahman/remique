const fs = require('fs');
let code = fs.readFileSync('src/lib/bdapps/subscription-service.ts', 'utf8');

const insertionPoint1 = `  const requestId = generateRequestId();`;
const bkashLogic = `  let bkashNormalized = null;
  if (params.bkashNumber) {
    const { raw } = normalizeBdPhoneNumber(params.bkashNumber);
    bkashNormalized = raw;
  }`;

code = code.replace(insertionPoint1, bkashLogic + '\n\n' + insertionPoint1);

code = code.replace(
  `    requestId,\n    currentPeriodStart: now,`,
  `    requestId,\n    subscriberId: bkashNormalized,\n    currentPeriodStart: now,`
);

code = code.replace(
  `      requestId,\n      currentPeriodStart: now,`,
  `      requestId,\n      subscriberId: bkashNormalized,\n      currentPeriodStart: now,`
);

const urlGenPoint = `  const { url: authorizationUrl } = buildBdappsAuthorizationUrl({
    redirectUrl,
    requestId,
  });`;

const urlGenReplacement = `  const { url: authorizationUrl } = buildBdappsAuthorizationUrl({
    redirectUrl,
    requestId,
    msisdn: bkashNormalized ? \`0\${bkashNormalized.substring(3)}\` : undefined,
  });`;

code = code.replace(urlGenPoint, urlGenReplacement);

fs.writeFileSync('src/lib/bdapps/subscription-service.ts', code);
console.log('Patched subscription-service.ts');
