// Test-only: puts an account back to a fresh 3-day trial with no Stripe state,
// so the paywall can be re-tested without signing up again (Supabase's built-in
// mailer allows 2 emails/hour). Refuses to run against a live Stripe key.
// Usage: node scripts/reset-test-account.js someone@example.com
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const email = process.argv[2];
if (!email) throw new Error('usage: node scripts/reset-test-account.js <email>');
if (!(process.env.STRIPE_SECRET_KEY || '').startsWith('sk_test_')) {
  throw new Error('Refusing to run: STRIPE_SECRET_KEY is not a test key.');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

supabase
  .from('users')
  .update({
    subscription_status: 'trialing',
    plan_id: null,
    trial_expires_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    access_expires_at: null,
    season_charge_due_at: null,
    cancel_at_period_end: false,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_payment_method_id: null,
    stripe_setup_intent_id: null,
  })
  .eq('email', email)
  .select('email, subscription_status, trial_expires_at')
  .then(({ data, error }) => {
    if (error) throw error;
    console.log(data.length ? data : `No account with email ${email}`);
  });
