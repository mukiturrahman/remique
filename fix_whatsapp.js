const fs = require('fs');
let code = fs.readFileSync('src/lib/bdapps/subscription-service.ts', 'utf8');

// 1. Remove WhatsApp sending from Callback
const callbackMessageMatch = code.match(/\/\/ Notify user via WhatsApp[\s\S]*?} catch \(notifyErr\) \{[\s\S]*?console\.warn\('\[bdApps\] Failed to send WhatsApp confirmation message:', notifyErr\);\n  \}/);
if (callbackMessageMatch) {
  code = code.replace(callbackMessageMatch[0], '// (WhatsApp notification is now handled by the webhook)');
}

// 2. Add WhatsApp sending to Webhook
const webhookSuccessMatch = code.match(/(\/\/ Record renewal or active payment[\s\S]*?subscriptionId: subscription\.id,\n      \}\);)/);
if (webhookSuccessMatch) {
  const replacement = webhookSuccessMatch[1] + `\n\n      // Notify user via WhatsApp if they were pending
      if (subscription.status !== 'ACTIVE') {
        try {
          const { sendWhatsAppMessage } = require('../whatsapp');
          await sendWhatsAppMessage(
            subscription.user?.phoneNumber || \`+\${subscriberDigits}\`,
            \`Your second brain has been activated 🧠✨.\\n\\n\` +
              \`You're now on Remique Pro \${plan.label}. You can start chatting right away!\`
          );
        } catch (notifyErr) {
          console.warn('[bdApps] Failed to send WhatsApp confirmation message in webhook:', notifyErr);
        }
      }`;
  code = code.replace(webhookSuccessMatch[1], replacement);
}

fs.writeFileSync('src/lib/bdapps/subscription-service.ts', code);
console.log('Fixed');
