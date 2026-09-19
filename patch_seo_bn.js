const fs = require('fs');
const path = require('path');

// 1. Fix global layout.tsx
let layout = fs.readFileSync('src/app/layout.tsx', 'utf8');

// Update lang="en" to lang="bn"
layout = layout.replace('lang="en"', 'lang="bn"');

// Update global metadata
const oldMetadata = `  title: "Remique | Your WhatsApp AI Assistant",
  description:
    "Set reminders by texting Remique on WhatsApp the way you actually type — English, Banglish or Bengali. No app to install, no account to make.",
  keywords: ["WhatsApp AI", "WhatsApp reminders", "Banglish reminders", "Bengali AI assistant", "Remique", "AI reminder bot"],
  openGraph: {
    title: "Remique | Your WhatsApp AI Assistant",
    description: "Set reminders by texting Remique on WhatsApp the way you actually type — English, Banglish or Bengali.",`;
const newMetadata = `  title: "Remique | আপনার WhatsApp AI অ্যাসিস্ট্যান্ট",
  description:
    "Remique একটা WhatsApp AI অ্যাসিস্ট্যান্ট, যে আপনার হয়ে সব মনে রাখে। যেভাবে মাথায় আসে সেভাবেই লিখুন — ইংরেজিতে, বাংলিশে, বা বাংলায়। কোনো অ্যাপ লাগবে না।",
  keywords: ["WhatsApp AI", "WhatsApp reminders", "Banglish reminders", "Bengali AI assistant", "Remique", "AI reminder bot", "বাংলা এআই"],
  openGraph: {
    title: "Remique | আপনার WhatsApp AI অ্যাসিস্ট্যান্ট",
    description: "Remique একটা WhatsApp AI অ্যাসিস্ট্যান্ট, যে আপনার হয়ে সব মনে রাখে। যেভাবে মাথায় আসে সেভাবেই লিখুন — ইংরেজিতে, বাংলিশে, বা বাংলায়।",`;
layout = layout.replace(oldMetadata, newMetadata);

const oldTwitter = `  twitter: {
    card: "summary_large_image",
    title: "Remique | Your WhatsApp AI Assistant",
    description: "Set reminders by texting Remique on WhatsApp the way you actually type — English, Banglish or Bengali.",`;
const newTwitter = `  twitter: {
    card: "summary_large_image",
    title: "Remique | আপনার WhatsApp AI অ্যাসিস্ট্যান্ট",
    description: "Remique একটা WhatsApp AI অ্যাসিস্ট্যান্ট, যে আপনার হয়ে সব মনে রাখে। যেভাবে মাথায় আসে সেভাবেই লিখুন — ইংরেজিতে, বাংলিশে, বা বাংলায়।",`;
layout = layout.replace(oldTwitter, newTwitter);

fs.writeFileSync('src/app/layout.tsx', layout);

// 2. Update nested layouts
const routes = [
  { path: 'pricing', title: 'প্রাইসিং | Remique', desc: 'আপনার WhatsApp AI অ্যাসিস্ট্যান্টের প্রাইসিং।' },
  { path: 'faq', title: 'সাধারণ প্রশ্ন | Remique', desc: 'Remique নিয়ে সাধারণ প্রশ্ন ও উত্তর।' },
  { path: 'privacy', title: 'প্রাইভেসি পলিসি | Remique', desc: 'Remique-এর প্রাইভেসি পলিসি।' },
  { path: 'terms', title: 'টার্মস অফ সার্ভিস | Remique', desc: 'Remique ব্যবহারের শর্তাবলী।' },
  { path: 'how-it-works', title: 'কীভাবে কাজ করে | Remique', desc: 'কীভাবে Remique কাজ করে তা জেনে নিন।' },
  { path: 'use-cases', title: 'কী কাজে লাগে | Remique', desc: 'কী কী কাজে Remique ব্যবহার করতে পারেন।' },
];

for (const route of routes) {
  const layoutPath = path.join('src/app', route.path, 'layout.tsx');
  if (fs.existsSync(layoutPath)) {
    let layoutContent = fs.readFileSync(layoutPath, 'utf8');
    
    // Replace title
    layoutContent = layoutContent.replace(/title: ".*?"/g, \`title: "\${route.title}"\`);
    // Replace description
    layoutContent = layoutContent.replace(/description: ".*?"/g, \`description: "\${route.desc}"\`);

    fs.writeFileSync(layoutPath, layoutContent);
  }
}

console.log('Patched SEO to Bengali');
