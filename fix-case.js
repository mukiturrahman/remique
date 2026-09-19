const fs = require('fs');
const content = fs.readFileSync('src/lib/bdapps/subscription-service.ts', 'utf8');

const regex = /  const requestId = searchParams.get\('requestId'\) \|\| searchParams.get\('reference'\) \|\| undefined;\n  const subscriberId = searchParams.get\('subscriberId'\) \|\| undefined;\n  const status = searchParams.get\('status'\)\?\.toUpperCase\(\);\n  const statusCode = searchParams.get\('statusCode'\);\n  const statusDetail = searchParams.get\('statusDetail'\);\n  const errorCode = searchParams.get\('errorCode'\) \|\| searchParams.get\('error'\);/m;

const replacement = `  // Make key lookup case-insensitive just in case bdApps changed their casing
  const getParam = (key: string) => {
    for (const [k, v] of searchParams.entries()) {
      if (k.toLowerCase() === key.toLowerCase()) return v;
    }
    return null;
  };

  const requestId = getParam('requestId') || getParam('reference') || undefined;
  const subscriberId = getParam('subscriberId') || undefined;
  const status = getParam('status')?.toUpperCase();
  const statusCode = getParam('statusCode');
  const statusDetail = getParam('statusDetail');
  const errorCode = getParam('errorCode') || getParam('error');`;

const newContent = content.replace(regex, replacement);
fs.writeFileSync('src/lib/bdapps/subscription-service.ts', newContent);
console.log('Done!');
