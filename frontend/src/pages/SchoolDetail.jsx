import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSchool, fetchFavorites } from '../api';
import { useAuth } from '../components/AuthContext';
import { recordRecentSchool } from '../lib/searchPrefs';
import { groupProgramsByObor } from '../lib/schoolPrograms';
import { oborWord } from '../lib/pluralCz';
import SectionNav from '../components/schoolDetail/SectionNav';
import SchoolHero from '../components/schoolDetail/SchoolHero';
import SchoolActions from '../components/schoolDetail/SchoolActions';
import CutoffExplainer from '../components/schoolDetail/CutoffExplainer';
import ProgramList from '../components/schoolDetail/ProgramList';
import SchoolLocation from '../components/schoolDetail/SchoolLocation';
import SchoolReviews from '../components/schoolDetail/SchoolReviews';
import MissingDataGrid from '../components/schoolDetail/MissingDataGrid';
import ReportDataDialog from '../components/schoolDetail/ReportDataDialog';
import SimilarSchools from '../components/schoolDetail/SimilarSchools';
import './schoolDetail.css';

function SchoolDetail() {
  const { id } = useParams();
  const { isSignedIn, hasAccess } = useAuth();
  const [school, setSchool] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchSchool(id)
      .then((s) => {
        setSchool(s);
        recordRecentSchool(s.id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Favourites need a signed-in account with access; anonymous visitors simply
  // do not see the star.
  useEffect(() => {
    if (!isSignedIn || !hasAccess) return;
    fetchFavorites()
      .then((rows) => setIsFavorite(rows.some((row) => String(row.id) === String(id))))
      .catch(() => setIsFavorite(false));
  }, [id, isSignedIn, hasAccess]);

  if (loading) return <div className="page"><p>Načítám…</p></div>;
  if (error) return <div className="page"><p className="error">Školu se nepodařilo načíst: {error}</p></div>;
  if (!school) return <div className="page"><p>Škola nenalezena.</p></div>;

  const programEntries = groupProgramsByObor(school);
  const currentEntries = programEntries.filter((e) => !e.isDiscontinued);
  const discontinuedEntries = programEntries.filter((e) => e.isDiscontinued);
  // Current obory first (already sorted by 2026 zájem), discontinued ones
  // trail at the end rather than interleaved — they're a footnote, not part
  // of "what this school offers now".
  const orderedEntries = [...currentEntries, ...discontinuedEntries];
  const zrizovatel = programEntries.find((e) => e.zrizovatel)?.zrizovatel ?? null;

  return (
    <div className="school-detail page">
      <Link to="/skoly" className="sd-back">&larr; Zpět na výpis</Link>

      <div className="sd-hero">
        <SchoolHero school={school} programEntries={programEntries} />
        <SchoolActions school={school} isFavorite={isFavorite} onFavoriteChange={setIsFavorite} />
      </div>

      <SectionNav />

      <CutoffExplainer />

      <div id="obory">
        <div className="sd-section-head">
          <h2 className="sd-section-title">Obory a přijímačky</h2>
          <span className="sd-section-meta">
            {currentEntries.length} {oborWord(currentEntries.length)} · seřazeno podle zájmu
          </span>
        </div>
        <p className="sd-section-intro">
          Každý obor má vlastní přijímačky a vlastní hranici — průměr školy
          nahoře je jen orientační.
        </p>
        <ProgramList entries={orderedEntries} />
      </div>

      <SchoolLocation school={school} />

      <SchoolReviews schoolId={school.id} />

      <div>
        <div className="sd-section-head">
          <h2 className="sd-section-title">Co zatím doplňujeme</h2>
        </div>
        <p className="sd-section-intro">
          Tyhle údaje ještě nemáme ověřené. Radši tu nic nevymýšlíme — až je
          budeme mít z důvěryhodného zdroje, objeví se tady.
        </p>
        <MissingDataGrid zrizovatel={zrizovatel} />
      </div>

      <ReportDataDialog schoolId={school.id} />

      <SimilarSchools school={school} />
    </div>
  );
}

export default SchoolDetail;
