const BETA_LIMITS = { feedback:20, screenshot:20, micro:20, gate:10, closing:10 };
function betaLimitOptions(kind) {
  if (!Object.hasOwn(BETA_LIMITS,kind)) throw new Error('Unknown beta limit');
  return {
    windowMs:3600000,limit:BETA_LIMITS[kind],standardHeaders:'draft-7',legacyHeaders:false,
    keyGenerator:(req)=>req.user.id,
    ...(kind==='micro'?{skip:(req)=>req.body?.action==='ask'}:{}),
    message:{error:'Příliš mnoho požadavků. Zkuste to prosím za chvíli.'},
  };
}
module.exports={betaLimitOptions};
