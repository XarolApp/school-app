async function cleanupBetaScreenshots(db) {
  // Delete through Storage's API; deleting storage.objects alone leaves files.
  for (;;) {
    const batch=await db.rpc('beta_screenshot_orphans',{p_limit:100});
    if (batch.error) return {error:batch.error};
    const paths=(batch.data || []).map(row=>row.name);
    if (!paths.length) return {error:null};
    const removed=await db.storage.from('beta-screenshots').remove(paths);
    if (removed.error) return {error:removed.error};
    if (paths.length<100) return {error:null};
  }
}
module.exports={cleanupBetaScreenshots};
