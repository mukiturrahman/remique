import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../src/lib/db';
import { getQStashClient } from '../src/lib/qstash';

async function testConnections() {
  console.log('Testing Neon PostgreSQL Connection & QStash Client...\n');

  // 1. Test Neon Database
  try {
    console.log('1. Connecting to Neon PostgreSQL...');
    const userCount = await prisma.user.count();
    const reminderCount = await prisma.reminder.count();
    console.log(`✔ Neon PostgreSQL Connected Successfully!`);
    console.log(`   - Existing Users: ${userCount}`);
    console.log(`   - Existing Reminders: ${reminderCount}`);
  } catch (err: any) {
    console.error('✖ Neon PostgreSQL Connection Error:', err.message);
  }

  // 2. Test QStash Client
  try {
    console.log('\n2. Testing Upstash QStash Token & Client...');
    const qstash = getQStashClient();
    console.log('✔ Upstash QStash Client initialized with provided credentials.');
  } catch (err: any) {
    console.error('✖ QStash Error:', err.message);
  }
}

testConnections().finally(() => prisma.$disconnect());
