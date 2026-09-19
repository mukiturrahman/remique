const fs = require('fs');
const path = require('path');

// 1. Fix global layout.tsx
let layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
layout = layout.replace('https://remique.com', 'https://remique.app');

// We add alternates: { canonical: '/' } to the global metadata
const oldMetadataStart = `export const metadata: Metadata = {`;
const newMetadataStart = `export const metadata: Metadata = {
  alternates: { canonical: "/" },`;
layout = layout.replace(oldMetadataStart, newMetadataStart);

fs.writeFileSync('src/app/layout.tsx', layout);

// 2. Create layouts for each route
const routes = [
  { path: 'pricing', title: 'Pricing | Remique', desc: 'Simple pricing for your WhatsApp AI assistant.' },
  { path: 'faq', title: 'FAQ | Remique', desc: 'Frequently asked questions about Remique.' },
  { path: 'privacy', title: 'Privacy Policy | Remique', desc: 'Privacy policy and data handling for Remique.' },
  { path: 'terms', title: 'Terms of Service | Remique', desc: 'Terms of service and usage rules for Remique.' },
  { path: 'how-it-works', title: 'How it Works | Remique', desc: 'Learn exactly how to set reminders and text Remique on WhatsApp.' },
  { path: 'use-cases', title: 'Use Cases | Remique', desc: 'Discover how people use Remique to organize their life.' },
];

for (const route of routes) {
  const dirPath = path.join('src/app', route.path);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  const layoutContent = `import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "${route.title}",
  description: "${route.desc}",
  alternates: {
    canonical: "/${route.path}",
  },
  openGraph: {
    title: "${route.title}",
    description: "${route.desc}",
    url: "/${route.path}",
  },
  twitter: {
    title: "${route.title}",
    description: "${route.desc}",
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
`;
  fs.writeFileSync(path.join(dirPath, 'layout.tsx'), layoutContent);
}

console.log('Patched SEO layouts');
