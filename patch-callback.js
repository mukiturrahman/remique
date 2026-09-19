const fs = require('fs');
const file = 'src/app/api/billing/bdapps/callback/route.ts';
let content = fs.readFileSync(file, 'utf8');

const regex = /    const searchParams = new URLSearchParams\(\);\n    \n    if \(formData\) \{\n      formData.forEach\(\(value, key\) => \{\n        if \(typeof value === 'string'\) \{\n          searchParams.append\(key, value\);\n        \}\n      \}\);\n    \}/g;

const matches = content.match(regex);
if (matches && matches.length > 1) {
    // Only replace the second occurrence. Or rather, let's just do a string replace of the duplicated block.
    // The easiest way is to find the exact duplicated block and remove it.
}
