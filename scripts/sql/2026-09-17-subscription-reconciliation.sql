-- 1. Relax the subscriptions columns
ALTER TABLE subscriptions ALTER COLUMN plan_period DROP NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN amount DROP NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN current_period_start DROP NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN current_period_end DROP NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN plan_tier SET DEFAULT 'free';

-- 2. Reconcile: where users.plan_tier = 'permanent' but subscriptions disagree
UPDATE subscriptions
SET plan_tier = 'permanent',
    status = 'ACTIVE',
    plan_period = NULL,
    amount = NULL,
    current_period_start = NULL,
    current_period_end = NULL,
    updated_at = NOW()
FROM users
WHERE subscriptions.user_id = users.id
  AND users.plan_tier = 'permanent'
  AND (subscriptions.plan_tier != 'permanent' OR subscriptions.status != 'ACTIVE');

-- 3. Reconcile: abandoned checkouts for free users
UPDATE subscriptions
SET status = 'CANCELLED',
    plan_tier = 'free',
    updated_at = NOW()
FROM users
WHERE subscriptions.user_id = users.id
  AND subscriptions.status = 'PENDING'
  AND users.plan_tier = 'free';

-- 4. Backfill a subscriptions row for every user who doesn't have one yet
INSERT INTO subscriptions (
  user_id,
  plan_tier,
  plan_period,
  amount,
  status,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
)
SELECT 
  u.id,
  u.plan_tier,
  u.plan_period,
  NULL, -- Since amount is nullable, we can safely leave it NULL for backfilled users without clear amount data
  'ACTIVE',
  u.plan_started_at,
  u.plan_expires_at,
  NOW(),
  NOW()
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE s.id IS NULL;

-- 5. Sanity check (should return zero rows)
-- SELECT u.id FROM users u LEFT JOIN subscriptions s ON s.user_id = u.id WHERE s.id IS NULL;

-- 6. Only after the code is deployed:
-- ALTER TABLE users DROP COLUMN IF EXISTS plan_tier;
-- ALTER TABLE users DROP COLUMN IF EXISTS plan_period;
-- ALTER TABLE users DROP COLUMN IF EXISTS plan_started_at;
-- ALTER TABLE users DROP COLUMN IF EXISTS plan_expires_at;
