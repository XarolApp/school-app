import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPicks, savePicks } from '../api';
import { useToast } from '../components/ToastContext';
import { useG } from './gender';

/** Shared add/remove behavior for a student's three ordered application picks. */
export function usePicks() {
  const { toast } = useToast();
  const g = useG();
  const [picks, setPicks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const pickIds = useMemo(() => new Set(picks.map((pick) => pick.school.id)), [picks]);

  useEffect(() => {
    let cancelled = false;
    fetchPicks()
      .then((fresh) => {
        if (!cancelled) { setPicks(fresh); setLoaded(true); }
      })
      .catch(() => {
        // Stays "not loaded": the buttons remain disabled, so a failed load can
        // never be saved back as an empty list (the server replaces the whole set).
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(async (school) => {
    if (saving || !loaded) return;

    const serializePick = (pick) => ({
      schoolId: pick.school.id,
      oborKkov: pick.obor_kkov,
      oborNazev: pick.obor_nazev,
    });

    setSaving(true);
    try {
      // PUT replaces the whole set, so always edit the server's current list,
      // not this tab's possibly stale copy (reordered or changed elsewhere).
      const current = await fetchPicks();
      setPicks(current);
      const isPicked = current.some((pick) => pick.school.id === school.id);

      if (!isPicked && current.length >= 3) {
        toast('Do přihlášky patří nejvýš 3 školy — nejdřív jednu odeber na záložce Moje přihláška.', { type: 'error' });
        return;
      }

      const nextPicks = isPicked
        ? current.filter((pick) => pick.school.id !== school.id)
        : [...current, { school }];
      await savePicks(nextPicks.map(serializePick));
      setPicks(nextPicks);
      if (!isPicked) toast(`${school.name} přidána do přihlášky.`);
    } catch (err) {
      if (err.code === 'TOO_MANY_PICKS') {
        toast('Do přihlášky patří nejvýš 3 školy.', { type: 'error' });
      } else if (err.isUnauthorized) {
        toast(`Přihlas se, abys ${g('mohl', 'mohla')} sestavit přihlášku.`, { type: 'error' });
      } else {
        toast(err.message || 'Nepodařilo se upravit přihlášku.', { type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  }, [g, loaded, saving, toast]);

  return { pickIds, toggle, saving: saving || !loaded };
}
