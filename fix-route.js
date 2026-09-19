const fs = require('fs');
const content = fs.readFileSync('src/app/api/billing/bdapps/callback/route.ts', 'utf8');

const regex = /const formData = await req\.formData\(\)\.catch\(\(\) => null\);/m;

const replacement = `    console.log('[bdApps Callback API] Method POST called. Content-Type:', req.headers.get('content-type'));
    const contentType = req.headers.get('content-type') || '';
    
    let formData = null;
    let jsonBody = null;
    if (contentType.includes('application/json')) {
      jsonBody = await req.clone().json().catch(() => null);
    } else {
      formData = await req.clone().formData().catch(() => null);
    }
    
    const searchParams = new URLSearchParams();
    
    if (formData) {
      formData.forEach((value, key) => {
        if (typeof value === 'string') {
          searchParams.append(key, value);
        }
      });
    }

    if (jsonBody) {
      Object.entries(jsonBody).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          searchParams.append(key, String(value));
        }
      });
    }`;

const newContent = content.replace(regex, replacement);
fs.writeFileSync('src/app/api/billing/bdapps/callback/route.ts', newContent);
console.log('Done!');
