// Public GET responses only; no cookies, tokens, user records or mutations.
const fs = require('node:fs');
const path = require('node:path');
const base = 'https://school-app-production-be43.up.railway.app';
const token = 'review-nonexistent-token';
const targets = ['/api/me', `/api/shared/${token}`, `/api/shared-results/${token}`, `/api/pay-links/${token}`, `/api/handoffs/${token}`];
(async () => {
  const checks = await Promise.all(targets.map(async endpoint => {
    const response = await fetch(base + endpoint, { signal: AbortSignal.timeout(20000) });
    const body = await response.json().catch(() => ({}));
    return { endpoint, status: response.status, error: typeof body.error === 'string' ? body.error : null,
      cacheControl: response.headers.get('cache-control'), serverDate: response.headers.get('date') };
  }));
  const report = { checkedAtUtc: new Date().toISOString(), checks,
    limitation: 'Synthetic nonexistent tokens only. The explicit disabled-sharing error can distinguish the flag from token-not-found; 404 alone cannot. No create/revoke/checkout/erase request, valid share link, authenticated route or user data was inspected.' };
  fs.writeFileSync(path.join(__dirname, 'deployed-sharing-2026-10-10.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error.name, error.message); process.exitCode = 1; });
