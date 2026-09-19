const fs = require('fs');
const file = 'src/lib/message-pipeline.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace("import { eq, and, gte, gt, sql } from 'drizzle-orm';", "import { eq, and, gte, gt, sql, desc } from 'drizzle-orm';");
fs.writeFileSync(file, content);
console.log('Done');
