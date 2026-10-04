// Keep prompts, credentials and upstream response bodies out of the cost ledger.
async function logAiUsage(db, { source, model, userId = null, runId = null, usage, ok, error = null }) {
  const integer = (value) => Number.isInteger(value) && value >= 0 ? value : null;
  const cost = typeof usage?.cost === 'number' && Number.isFinite(usage.cost) && usage.cost >= 0 ? usage.cost : null;
  try {
    const result = await db.from('ai_usage_log').insert({
      source, model, user_id: userId, run_id: runId,
      prompt_tokens: integer(usage?.prompt_tokens),
      completion_tokens: integer(usage?.completion_tokens),
      cost_usd: cost, ok, error: error ? String(error).slice(0, 160) : null,
    }).select('id').single();
    if (result.error) console.error('AI usage could not be saved:', result.error.code || 'database error');
    return result.data?.id ?? null;
  } catch {
    console.error('AI usage could not be saved: database unavailable');
    return null;
  }
}

async function fetchWithAiUsage(url, options, onUsage) {
  let response;
  try {
    response = await fetch(url, options);
    const payload = await response.clone().json().catch(() => null);
    await onUsage?.({ usage: payload?.usage ?? null, ok: response.ok && Boolean(payload),
      error: response.ok ? (payload ? null : 'Invalid JSON response') : `OpenRouter HTTP ${response.status}` });
  } catch (error) {
    await onUsage?.({ usage: null, ok: false, error: error.name === 'TimeoutError' ? 'OpenRouter timeout' : 'OpenRouter network failure' });
    throw error;
  }
  return response;
}

module.exports = { logAiUsage, fetchWithAiUsage };
