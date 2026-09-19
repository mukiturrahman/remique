const fs = require('fs');
const file = 'src/lib/message-pipeline.ts';
let content = fs.readFileSync(file, 'utf8');

const injectionPoint = `  const now = new Date();
  const plan = planStateOf(user);`;

const newCode = `  const now = new Date();
  const plan = planStateOf(user);

  // Free Tier Pause Logic
  if (plan.planTier === 'free') {
    const botMessages = await db.select({ messageText: messages.messageText })
      .from(messages)
      .where(and(eq(messages.userId, user.id), eq(messages.direction, 'OUTBOUND')))
      .orderBy(desc(messages.createdAt))
      .limit(50);
      
    const sentWelcome = botMessages.some(m => m.messageText.includes('Welcome to your second brain'));
    const sentPaywall = botMessages.some(m => m.messageText.includes('you are not a pro user'));

    if (!sentWelcome) {
      await replyToUser(user, "Hello, Welcome to your second brain.");
      await db.update(messages).set({ processedAt: new Date(), processingError: 'free_tier_welcome' }).where(eq(messages.id, message.id));
      return { status: 'processed', retryable: false };
    } else if (!sentPaywall) {
      await replyToUser(user, "you are not a pro user. Please subscribe at https://www.remique.app/pricing");
      await db.update(messages).set({ processedAt: new Date(), processingError: 'free_tier_paywall' }).where(eq(messages.id, message.id));
      return { status: 'processed', retryable: false };
    } else {
      console.warn(\`[Remique] Free user message dropped userId=\${user.id}\`);
      await db.update(messages).set({ processedAt: new Date(), processingError: 'free_tier_ignored' }).where(eq(messages.id, message.id));
      return { status: 'processed', retryable: false };
    }
  }`;

content = content.replace(injectionPoint, newCode);
fs.writeFileSync(file, content);
console.log("Done");
