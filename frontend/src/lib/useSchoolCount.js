import { useEffect, useState } from 'react';
import { fetchSchools } from '../api';
import { SCHOOL_COUNT } from '../config/facts';

// One request shared by every caller on the page; a failure just keeps the fallback.
let pending;

/** Live number of schools GET /api/schools returns; SCHOOL_COUNT until it loads. */
export function useSchoolCount() {
  const [count, setCount] = useState(SCHOOL_COUNT);
  useEffect(() => {
    let alive = true;
    pending ??= fetchSchools().then((rows) => (Array.isArray(rows) ? rows : rows?.schools ?? []).length);
    pending.then((n) => alive && n > 0 && setCount(n), () => { pending = undefined; });
    return () => { alive = false; };
  }, []);
  return count;
}
