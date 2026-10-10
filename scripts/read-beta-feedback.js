// Read-only: prints beta feedback (newest first) without tester ids, e-mails or
// screenshots. Uses the local .env service key.  node --env-file=.env scripts/read-beta-feedback.js [limit]
const { createClient } = require('@supabase/supabase-js');
const { KINDS } = require('../lib/betaAdmin');
(async () => {
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await db.from('beta_feedback')
    .select('id,created_at,kind,source,page_url,message,status,admin_reply').order('created_at', { ascending: false }).limit(Number(process.argv[2]) || 50);
  if (error) { console.error('Read failed:', error.message); process.exit(1); }
  console.log(`${data.length} message(s)\n`);
  for (const f of data) console.log(`#${f.id} · ${f.created_at.slice(0, 16)} · ${KINDS[f.kind] || f.kind} · ${f.source} · ${f.page_url} · ${f.status}${f.admin_reply ? ' · (replied)' : ''}\n${f.message}\n`);
})();
