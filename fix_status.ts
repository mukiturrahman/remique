import { db } from './src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
    await db.execute(sql.raw(`UPDATE subscriptions SET status = 'ACTIVE' WHERE plan_tier = 'free';`));
    console.log("Updated free subscriptions to ACTIVE");
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
