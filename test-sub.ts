import { initiateBdappsSubscription } from './src/lib/bdapps/subscription-service';
async function run() {
    const result = await initiateBdappsSubscription({
        phoneNumber: '01711223344',
        planPeriod: 'monthly'
    });
    console.log(result);
    process.exit(0);
}
run();
