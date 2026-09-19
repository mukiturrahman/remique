const fs = require('fs');
const file = 'src/components/sticky-cta.tsx';
let content = fs.readFileSync(file, 'utf8');

const injectionPoint = `  const [isVisible, setIsVisible] = useState(false);`;
const newCode = `  const [isVisible, setIsVisible] = useState(false);
  const { lang } = useLang();`;

content = content.replace(injectionPoint, newCode);

const importPoint = `import Link from 'next/link';`;
const newImport = `import Link from 'next/link';
import { useLang } from '@/components/lang-provider';`;

content = content.replace(importPoint, newImport);

const textPoint = `>আনলক সেকেন্ড ব্রেইন 🧠</span>`;
const newText = `>{lang === 'en' ? 'Unlock Second Brain 🧠' : 'আনলক সেকেন্ড ব্রেইন 🧠'}</span>`;

content = content.replace(textPoint, newText);

fs.writeFileSync(file, content);
console.log('Done');
