function rankingPayload(raw) {
  if (!Array.isArray(raw) || !raw.length || raw.length>1000 || raw.some(id=>!Number.isSafeInteger(id)||id<1) || new Set(raw).size!==raw.length) return null;
  return [...raw];
}
module.exports={rankingPayload};
