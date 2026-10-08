import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { readGenderPreference } from './onboardingStorage';
import { genderForm } from './genderCopy';

export { genderForm, genderedCopy } from './genderCopy';

/** Returns the profile preference or the pre-account choice. */
export function useGender() {
  const { user, profile } = useAuth();
  const [localGender, setLocalGender] = useState(readGenderPreference);

  useEffect(() => {
    const sync = () => setLocalGender(readGenderPreference());
    window.addEventListener('snm:gender-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('snm:gender-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const gender = user ? profile?.gender : localGender;
  return gender;
}

/** Returns a selector backed by the signed-in profile or the pre-account choice. */
export function useG() {
  const gender = useGender();
  return useCallback((masculine, feminine) => genderForm(gender, masculine, feminine), [gender]);
}
