export const BETA_ROLES = [
  { id: '8', label: '8. třída' }, { id: '9', label: '9. třída' },
  { id: 'rodic', label: 'Rodič' }, { id: 'ucitel', label: 'Učitel' }, { id: 'jine', label: 'Jiné' },
];
// Mirrors the check constraint on beta_profile.role_note in supabase-setup.sql.
export const BETA_ROLE_NOTE_MAX = 80;
export function readBetaEnrollment(code) {
  try {
    const value = JSON.parse(sessionStorage.getItem('snm.beta.enrollment'));
    if (value?.code === code && value.expires > Date.now() && BETA_ROLES.some((r) => r.id === value.role)) return { roleNote: '', ...value };
  } catch { /* storage unavailable */ }
  return { role: '', roleNote: '', accepted: false };
}
export function saveBetaEnrollment(code, { role, roleNote = '', accepted }) {
  try { sessionStorage.setItem('snm.beta.enrollment', JSON.stringify({ code, role, roleNote, accepted, expires: Date.now() + 86400000 })); } catch { /* navigation still works */ }
}
export function betaEnrollmentComplete({ role, roleNote = '', accepted }) {
  return Boolean(role && accepted && (role !== 'jine' || roleNote.trim()));
}
