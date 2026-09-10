import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSchools } from '../../api';
import { deriveFeatures, districtOf, districtHops } from '../../lib/schoolFeatures';

const hasMaturita = (school) => (school.school_programs ?? []).some((p) => p.maturitni === true);
const hasVyucni = (school) => (school.school_programs ?? []).some((p) => p.maturitni === false);

/**
 * Real signals only — shared focus category (from real name/programs text),
 * district proximity (real coordinates via districtHops), same maturita
 * status (real Cermat data). No invented "similarity score", no percentage —
 * just a ranked list, and a school scoring 0 on every signal is dropped
 * rather than padded in to hit some count.
 *
 * Extracted unchanged from the previous SchoolDetail.jsx.
 */
function similarSchools(current, all) {
  const currentFocus = new Set(deriveFeatures(current).focus);
  const currentDistrict = districtOf(current);
  const currentMaturita = hasMaturita(current);
  const currentVyucni = hasVyucni(current);

  return all
    .filter((s) => s.id !== current.id)
    .map((s) => {
      const sharedFocus = deriveFeatures(s).focus.filter((f) => currentFocus.has(f)).length;
      const hops = districtHops(currentDistrict, districtOf(s));
      const districtScore = hops == null ? 0 : Math.max(0, 3 - hops);
      const sameUkonceni = (hasMaturita(s) === currentMaturita && currentMaturita) ||
        (hasVyucni(s) === currentVyucni && currentVyucni) ? 1 : 0;
      return { school: s, score: sharedFocus * 3 + districtScore + sameUkonceni };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.school);
}

function SimilarSchools({ school }) {
  const [allSchools, setAllSchools] = useState([]);

  // Fetched once per page load; simple enough at 60 schools not to need
  // caching beyond component state.
  useEffect(() => {
    fetchSchools().then(setAllSchools).catch(() => setAllSchools([]));
  }, []);

  const similar = allSchools.length ? similarSchools(school, allSchools) : [];
  if (!similar.length) return null;

  return (
    <div>
      <h2 className="sd-section-title" style={{ marginBottom: 'var(--space-lg)' }}>
        Podobné školy
      </h2>
      <div className="sd-similar-grid">
        {similar.map((s) => (
          <Link key={s.id} to={`/skoly/${s.id}`} className="sd-similar-card">
            <div className="sd-similar-name">{s.name}</div>
            <div className="sd-similar-meta">
              {s.location}
              {s.admission_cutoff != null ? ` · hranice ${s.admission_cutoff} b.` : ''}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default SimilarSchools;
