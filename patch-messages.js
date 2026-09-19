const fs = require('fs');
const file = 'src/lib/message-pipeline.ts';
let content = fs.readFileSync(file, 'utf8');

const regexWelcome = /await replyToUser\(user, "Hello, Welcome to your second brain\."\);/;
const replacementWelcome = `const welcomeMsg = user.name
        ? \`Hey \${user.name}! 🧠 Your second brain is activated. I'm Remique, your WhatsApp AI assistant, here to keep your schedule on point. ✨\`
        : \`Hey! 🧠 Your second brain is activated. I'm Remique, your WhatsApp AI assistant, here to keep your schedule on point. What should I call you? ✨\`;
      await replyToUser(user, welcomeMsg);`;

const regexPaywall = /await replyToUser\(user, "you are not a pro user\. Please subscribe at https:\/\/www\.remique\.app\/pricing"\);/;
const replacementPaywall = `await replyToUser(user, "Ohho :( You are not subscribed. Please visit the website to subscribe and get your second brain activated! 🚀\\n\\n🔗 https://www.remique.app/pricing");`;

content = content.replace(regexWelcome, replacementWelcome);
content = content.replace(regexPaywall, replacementPaywall);

// We also need to update the substring check for sentWelcome and sentPaywall!
const regexCheckWelcome = /m\.messageText\.includes\('Welcome to your second brain'\)/;
const replacementCheckWelcome = `m.messageText.includes('Your second brain is activated')`;

const regexCheckPaywall = /m\.messageText\.includes\('you are not a pro user'\)/;
const replacementCheckPaywall = `m.messageText.includes('You are not subscribed')`;

content = content.replace(regexCheckWelcome, replacementCheckWelcome);
content = content.replace(regexCheckPaywall, replacementCheckPaywall);

fs.writeFileSync(file, content);
console.log("Done");
