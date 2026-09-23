import { useEffect, useRef, useState } from 'react';
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
import AsyncState from '../components/AsyncState';
import useBottomBarSpace from '../lib/useBottomBarSpace';
import './schoolDetail.css';

function SchoolDetail() {
  const { id } = useParams();
  const { isSignedIn, hasAccess } = useAuth();
  const [school, setSchool] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadTick, setLoadTick] = useState(0);
  const pageRef = useRef(null);
  const barRef = useRef(null);
  useBottomBarSpace(barRef, pageRef, !!school);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSchool(null);
    fetchSchool(id)
      .then((s) => {
        if (cancelled) return;
        setSchool(s);
        recordRecentSchool(s.id);
      })
      .catch((err) => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, loadTick]);

  // Favourites need a signed-in account with access; anonymous visitors simply
  // do not see the star.
  useEffect(() => {
    let cancelled = false;
    setIsFavorite(false);
    if (!isSignedIn || !hasAccess) return;
    fetchFavorites()
      .then((rows) => {
        if (!cancelled) setIsFavorite(rows.some((row) => String(row.id) === String(id)));
      })
      .catch(() => { if (!cancelled) setIsFavorite(false); });
    return () => { cancelled = true; };
  }, [id, isSignedIn, hasAccess]);

  if (loading || error || !school) {
    const notFound = !loading && (error ? error.status === 404 : !school);
    return (
      <div className="school-detail page">
        <Link to="/skoly" className="sd-back">&larr; Zpět na výpis</Link>
        {loading ? (
          <AsyncState kind="loading" title="Načítám školu…" />
        ) : notFound ? (
          <AsyncState
            kind="empty"
            title="Tuhle školu jsme nenašli"
            action={<Link to="/skoly" className="ss-btn ss-btn-primary">Zpět na školy</Link>}
          >
            Odkaz může být starý nebo škola už v databázi není.
          </AsyncState>
        ) : (
          <AsyncState
            kind="error"
            title="Školu se nepodařilo načíst"
            onRetry={() => setLoadTick((t) => t + 1)}
            action={<Link to="/skoly" className="ss-btn ss-btn-secondary">Zpět na školy</Link>}
          >
            Zkontroluj připojení a zkus to znovu. ({error?.message})
          </AsyncState>
        )}
      </div>
    );
  }

  const programEntries = groupProgramsByObor(school);
  const currentEntries = programEntries.filter((e) => !e.isDiscontinued);
  const discontinuedEntries = programEntries.filter((e) => e.isDiscontinued);
  // Current obory first (already sorted by 2026 zájem), discontinued ones
  // trail at the end rather than interleaved — they're a footnote, not part
  // of "what this school offers now".
  const orderedEntries = [...currentEntries, ...discontinuedEntries];
  const zrizovatel = programEntries.find((e) => e.zrizovatel)?.zrizovatel ?? null;
  const extracted = Array.isArray(school.school_extracted_details)
    ? school.school_extracted_details[0]
    : school.school_extracted_details;
  const hasExtractedData = extracted && (
    [
      extracted.skolne_poplatky,
      extracted.obedy_ubytovani,
      extracted.krouzky_aktivity,
      extracted.maturita_uspesnost,
      extracted.vs_uplatneni,
      extracted.uplatneni_po_vyuceni,
      extracted.pripijimaci_pozadavky_detail,
      extracted.vyukovy_styl_detail,
    ].some(Boolean)
    // A confirmed false is real practical info too (MissingDataGrid's
    // pripijimaciBody/vyukovyStylBody render it as a fact, not a gap) —
    // .some(Boolean) alone would miss it since false is falsy.
    || extracted.ma_dodatecne_pozadavky === false
    || extracted.alternativni_pedagogika === false
  );

  return (
    <div className="school-detail page" ref={pageRef}>
      <Link to="/skoly" className="sd-back">&larr; Zpět na výpis</Link>

      <div className="sd-hero">
        <SchoolHero school={school} programEntries={programEntries} extracted={extracted} />
        <SchoolActions school={school} isFavorite={isFavorite} onFavoriteChange={setIsFavorite} barRef={barRef} />
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
          <h2 className="sd-section-title">
            {hasExtractedData ? 'Praktické informace' : 'Co zatím doplňujeme'}
          </h2>
        </div>
        <p className="sd-section-intro">
          {hasExtractedData
            ? 'Údaje níže jsou automaticky sesbírané z webu školy — ověřte si je prosím přímo u školy před podáním přihlášky.'
            : 'Tyhle údaje ještě nemáme ověřené. Radši tu nic nevymýšlíme — až je budeme mít z důvěryhodného zdroje, objeví se tady.'}
        </p>
        <MissingDataGrid zrizovatel={zrizovatel} extracted={extracted} />
      </div>

      <ReportDataDialog schoolId={school.id} />

      <SimilarSchools school={school} />
    </div>
  );
}

export default SchoolDetail;
