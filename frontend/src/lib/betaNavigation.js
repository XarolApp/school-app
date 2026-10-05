// One instance per navigation. Auth/token refresh can enable this instance,
// but cannot replay the view. Reused across Strict Mode effect setup/cleanup.
export function createBetaNavigation({tracker,path,referrer='/',from='search',compareCount=0,clock=Date.now,hidden=()=>false}) {
  let viewed=false,started=null,visible=0;
  return {
    path,
    start() {
      if (viewed || !tracker.active()) return;
      viewed=true;started=hidden()?null:clock();
      tracker.track('page_view',{referrer},path);
      const school=path.match(/^\/skoly\/(\d+)$/);
      if (school) tracker.track('school_open',{id:Number(school[1]),from},path);
      if (path==='/porovnani') tracker.track('compare_open',{count:compareCount},path);
    },
    hide() {
      if (!viewed) return;
      if (started!==null) visible+=clock()-started;
      started=null;
      if (visible) tracker.track('page_leave',{ms:visible},path);
      visible=0;
    },
    show() {if (viewed && started===null) started=clock();},
    finish() {this.hide();},
  };
}
