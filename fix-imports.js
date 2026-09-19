const fs = require('fs');
const file = 'src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /import \{ NavHeader \} from "@\/components\/nav-header";\nimport \{ CopyButton \} from "@\/components\/copy-button";/g;

content = content.replace(regex, '');
fs.writeFileSync(file, content);
console.log('Done');
