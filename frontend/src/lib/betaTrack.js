// No cookies, fingerprint, account e-mail, or answer values. Only this beta
// context can enable the queue; ordinary accounts explicitly disable it.
export function createBetaTracker({ local, session, uuid, send, beacon }) {
  const read = (store, key) => { try { return JSON.parse(store.getItem(key)); } catch { return null; } };
  const write = (store, key, value) => { try { store.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ } };
  let visit = read(local, 'snm.beta.visit');
  let account = { resolved: false, userId: null, tester: false, token: null };
  let queue = [];
  let sessionId = null;
  const getSessionId = () => {
    if (!sessionId) { sessionId = read(session, 'snm.beta.session') || uuid(); write(session, 'snm.beta.session', sessionId); }
    return sessionId;
  };
  const active = () => account.resolved && (account.userId ? account.tester && account.noticeAccepted : Boolean(visit?.noticeAccepted && visit?.ticket && visit.expires > Date.now()));
  const anon = () => visit?.anonId || read(local, 'snm.beta.anon') || (() => {
    const id = uuid(); write(local, 'snm.beta.anon', id); return id;
  })();
  return {
    startVisit(code,noticeAccepted=false) { if (!noticeAccepted) {queue=[];return null;} visit = { code, anonId: anon(), noticeAccepted:true, expires: Date.now() + 86400000 }; return visit.anonId; },
    acceptTicket(ticket) { if (visit && ticket) { visit.ticket = ticket; write(local, 'snm.beta.visit', visit); globalThis.dispatchEvent?.(new Event('snm:beta-enabled')); } },
    setAccount(next) {
      if (account.userId !== next.userId || !next.tester && next.userId) queue = [];
      account = next;
      // A same-account profile refresh pauses collection, but must not discard
      // already accepted beta events. A resolved non-beta account still clears.
      if (next.resolved && !active()) queue=[];
      globalThis.dispatchEvent?.(new Event('snm:beta-account'));
      if (next.resolved && next.userId && !next.tester) {
        visit = null; try { local.removeItem('snm.beta.visit'); } catch { /* storage unavailable */ }
      }
    },
    active,
    context:()=>({userId:account.userId,anon_id:visit?.anonId,ticket:visit?.ticket}),
    track(name, props = {}, path = globalThis.location?.pathname || '/') {
      if (!active()) return;
      queue.push({ name, path, props });
      if (queue.length > 40) queue.shift();
      globalThis.dispatchEvent?.(new CustomEvent('snm:beta-event', { detail: { name, props } }));
    },
    async flush(hidden = false) {
      if (!active() || !queue.length) return;
      const events = queue.splice(0, 40), userId=account.userId;
      const payload = { anon_id: anon(), session_id: getSessionId(), ticket: visit?.ticket, token: account.token, events };
      if (hidden && beacon?.(payload)) return;
      try { await send(payload); } catch { if (active() && account.userId===userId) queue = [...events, ...queue].slice(-40); }
    },
    getSessionId,
    clear() { queue = []; visit = null; account = { ...account, tester: false }; try { local.removeItem('snm.beta.visit'); } catch { /* storage unavailable */ } },
  };
}
const memory = { getItem: () => null, setItem() {}, removeItem() {} };
const storage = (name) => { try { return globalThis[name] || memory; } catch { return memory; } };
const base = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000';
export const betaTracker = createBetaTracker({
  local: storage('localStorage'), session: storage('sessionStorage'), uuid: () => globalThis.crypto.randomUUID(),
  send: async (payload) => {
    const response = await fetch(base + '/api/beta/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true });
    if (!response.ok) throw new Error('Tracking unavailable');
  },
  beacon: (payload) => globalThis.navigator?.sendBeacon?.(base + '/api/beta/events', new Blob([JSON.stringify(payload)], { type: 'application/json' })),
});
export const track = (name, props, path) => betaTracker.track(name, props, path);
