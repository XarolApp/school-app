export const ROLE_KEY = 'skolamatch.role';
export const GENDER_KEY = 'skolamatch.gender';
export const ANSWERS_KEY = 'skolamatch.onboarding.answers';

let memoryGender = null;

export function readGenderPreference() {
  try {
    const gender = localStorage.getItem(GENDER_KEY);
    if (gender === 'm' || gender === 'f' || gender === 'u') {
      memoryGender = gender;
      return gender;
    }
    memoryGender = null;
    return null;
  } catch {
    return memoryGender;
  }
}

export function writeGenderPreference(gender) {
  memoryGender = gender === 'm' || gender === 'f' || gender === 'u' ? gender : null;
  try {
    if (memoryGender) localStorage.setItem(GENDER_KEY, memoryGender);
    else localStorage.removeItem(GENDER_KEY);
  } catch {
    // The current flow state still works when browser storage is unavailable.
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('snm:gender-change'));
}
