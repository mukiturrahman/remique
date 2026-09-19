const fs = require('fs');
let code = fs.readFileSync('src/app/layout.tsx', 'utf8');

const newDesc = "Remique একটা WhatsApp AI অ্যাসিস্ট্যান্ট, যে আপনার হয়ে সব মনে রাখে। যেভাবে মাথায় আসে সেভাবেই লিখুন — ইংরেজিতে, বাংলিশে, বা বাংলায়। ও কনফার্ম করে, সময় ঠিক করে রাখে, আর সময়মতো মনে করিয়ে দেয়। মাথা হালকা, চিন্তা শূন্য…";

// We can replace the existing description strings using regex carefully, or replace the whole block.
// Let's replace the whole metadata block.
const oldMetadataStr = `  title: "Remique | আপনার WhatsApp AI অ্যাসিস্ট্যান্ট",
  description:
    "Remique একটা WhatsApp AI অ্যাসিস্ট্যান্ট, যে আপনার হয়ে সব মনে রাখে। যেভাবে মাথায় আসে সেভাবেই লিখুন — ইংরেজিতে, বাংলিশে, বা বাংলায়। কোনো অ্যাপ লাগবে না।",
  keywords: ["WhatsApp AI", "WhatsApp reminders", "Banglish reminders", "Bengali AI assistant", "Remique", "AI reminder bot", "বাংলা এআই"],
  openGraph: {
    title: "Remique | আপনার WhatsApp AI অ্যাসিস্ট্যান্ট",
    description: "Remique একটা WhatsApp AI অ্যাসিস্ট্যান্ট, যে আপনার হয়ে সব মনে রাখে। যেভাবে মাথায় আসে সেভাবেই লিখুন — ইংরেজিতে, বাংলিশে, বা বাংলায়।",`;

const newMetadataStr = `  title: "Remique | আপনার WhatsApp AI অ্যাসিস্ট্যান্ট",
  description:
    "Remique একটা WhatsApp AI অ্যাসিস্ট্যান্ট, যে আপনার হয়ে সব মনে রাখে। যেভাবে মাথায় আসে সেভাবেই লিখুন — ইংরেজিতে, বাংলিশে, বা বাংলায়। ও কনফার্ম করে, সময় ঠিক করে রাখে, আর সময়মতো মনে করিয়ে দেয়। মাথা হালকা, চিন্তা শূন্য…",
  keywords: ["WhatsApp AI", "WhatsApp reminders", "Banglish reminders", "Bengali AI assistant", "Remique", "AI reminder bot", "বাংলা এআই"],
  openGraph: {
    title: "Remique | আপনার WhatsApp AI অ্যাসিস্ট্যান্ট",
    description: "Remique একটা WhatsApp AI অ্যাসিস্ট্যান্ট, যে আপনার হয়ে সব মনে রাখে। যেভাবে মাথায় আসে সেভাবেই লিখুন — ইংরেজিতে, বাংলিশে, বা বাংলায়। ও কনফার্ম করে, সময় ঠিক করে রাখে, আর সময়মতো মনে করিয়ে দেয়। মাথা হালকা, চিন্তা শূন্য…",`;

code = code.replace(oldMetadataStr, newMetadataStr);

const oldTwitterStr = `  twitter: {
    card: "summary_large_image",
    title: "Remique | আপনার WhatsApp AI অ্যাসিস্ট্যান্ট",
    description: "Remique একটা WhatsApp AI অ্যাসিস্ট্যান্ট, যে আপনার হয়ে সব মনে রাখে। যেভাবে মাথায় আসে সেভাবেই লিখুন — ইংরেজিতে, বাংলিশে, বা বাংলায়।",`;

const newTwitterStr = `  twitter: {
    card: "summary_large_image",
    title: "Remique | আপনার WhatsApp AI অ্যাসিস্ট্যান্ট",
    description: "Remique একটা WhatsApp AI অ্যাসিস্ট্যান্ট, যে আপনার হয়ে সব মনে রাখে। যেভাবে মাথায় আসে সেভাবেই লিখুন — ইংরেজিতে, বাংলিশে, বা বাংলায়। ও কনফার্ম করে, সময় ঠিক করে রাখে, আর সময়মতো মনে করিয়ে দেয়। মাথা হালকা, চিন্তা শূন্য…",`;

code = code.replace(oldTwitterStr, newTwitterStr);

fs.writeFileSync('src/app/layout.tsx', code);
console.log('Patched layout.tsx description');
