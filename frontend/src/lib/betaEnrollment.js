export const BETA_ROLES = [
  { id: '8', label: '8. třída' }, { id: '9', label: '9. třída' },
  { id: 'rodic', label: 'Rodič' }, { id: 'ucitel', label: 'Učitel' }, { id: 'jine', label: 'Jiné' },
];
export function readBetaEnrollment(code) {
  try {
    const value = JSON.parse(sessionStorage.getItem('snm.beta.enrollment'));
    if (value?.code === code && value.expires > Date.now() && BETA_ROLES.some((r) => r.id === value.role)) return value;
  } catch { /* storage unavailable */ }
  return { role: '', accepted: false };
}
export function saveBetaEnrollment(code, role, accepted) {
  try { sessionStorage.setItem('snm.beta.enrollment', JSON.stringify({ code, role, accepted, expires: Date.now() + 86400000 })); } catch { /* navigation still works */ }
}
