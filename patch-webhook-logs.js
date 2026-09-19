const fs = require('fs');
const file = 'src/app/api/billing/bdapps/webhook/route.ts';
let content = fs.readFileSync(file, 'utf8');

const injectionPoint = `  try {

    const payload = await req.json().catch(() => null);

    if (!payload) {
      return NextResponse.json(
        { statusCode: 'E1009', statusDetail: 'Invalid JSON body' },
        { status: 400 }
      );
    }`;

const newCode = `  try {
    const rawBody = await req.clone().text().catch(() => 'Could not read raw body');
    const headers = Object.fromEntries(req.headers.entries());

    console.log('\\n=============================================');
    console.log('[bdApps Webhook] INCOMING POST REQUEST');
    console.log('Headers:', JSON.stringify(headers, null, 2));
    console.log('Raw Body:', rawBody);

    let payload = await req.clone().json().catch(() => null);
    
    // If it's not JSON, try to parse it as URL-encoded form data (just in case bdApps uses forms)
    if (!payload && headers['content-type']?.includes('application/x-www-form-urlencoded')) {
      const formData = await req.clone().formData().catch(() => null);
      if (formData) {
        payload = Object.fromEntries(formData.entries());
        console.log('Parsed Form Data:', JSON.stringify(payload, null, 2));
      }
    }

    console.log('=============================================\\n');

    if (!payload) {
      // If we completely failed to parse anything, fallback to wrapping the raw text so it doesn't crash
      payload = { raw: rawBody };
    }`;

content = content.replace(injectionPoint, newCode);
fs.writeFileSync(file, content);
console.log('Done');
