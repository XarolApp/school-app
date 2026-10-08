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
      .then((loaded) => {
        if (!cancelled) setPicks(loaded);
      })
      .catch(() => {
        // Signed out or expired — pick buttons remain available to explain the limit/login state.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
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

    if (pickIds.has(school.id)) {
      const nextPicks = picks.filter((pick) => pick.school.id !== school.id);
      setSaving(true);
      try {
        await savePicks(nextPicks.map(serializePick));
        setPicks(nextPicks);
      } catch (err) {
        toast(err.message || 'Nepodařilo se upravit přihlášku.', { type: 'error' });
      } finally {
        setSaving(false);
      }
      return;
    }

    if (pickIds.size >= 3) {
      toast('Do přihlášky patří nejvýš 3 školy — nejdřív jednu odeber na záložce Moje přihláška.', { type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const nextPicks = [...picks, { school }];
      await savePicks(nextPicks.map(serializePick));
      setPicks(nextPicks);
      toast(`${school.name} přidána do přihlášky.`);
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
  }, [g, loaded, pickIds, picks, saving, toast]);

  return { pickIds, toggle, saving: saving || !loaded };
}
