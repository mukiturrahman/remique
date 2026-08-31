import dotenv from 'dotenv';
dotenv.config();

import { parseReminderWithGemini } from '../src/lib/gemini';

async function main() {
  console.log('Testing live Gemini 2.0 Flash Extraction for Remique...\n');

  const testCases = [
    {
      lang: 'English',
      input: 'Remind me to call Aovin tomorrow at 10 AM',
    },
    {
      lang: 'Banglish',
      input: 'Kalke shokal 10 tay Aovin k call dite mone koriye dio',
    },
    {
      lang: 'Bengali Script',
      input: 'আগামীকাল রাত ৯টায় মিটিংয়ের কথা মনে করিয়ে দাও',
    },
    {
      lang: 'Relative Time',
      input: 'Remind me in 30 minutes to check the campaign ads',
    },
    {
      lang: 'Clarification Case (Missing Time)',
      input: 'Remind me to call Mom',
    },
  ];

  for (const tc of testCases) {
    console.log(`----------------------------------------`);
    console.log(`[Test: ${tc.lang}] Input: "${tc.input}"`);
    const result = await parseReminderWithGemini(tc.input, 'Asia/Dhaka');
    console.log('Parsed Output:');
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch(console.error);
