import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSchool, fetchFavorites } from '../api';
import { useAuth } from '../components/AuthContext';
import FavoriteButton from '../components/FavoriteButton';

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
      .then(setSchool)
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

  return (
    <div className="page page-school-detail">
      <Link to="/skoly">&larr; Zpět na výpis</Link>

      <div className="detail-head">
        <h1>{school.name}</h1>
        {isSignedIn && hasAccess && (
          <FavoriteButton
            schoolId={school.id}
            isFavorite={isFavorite}
            onChange={setIsFavorite}
          />
        )}
      </div>

      <p><strong>Adresa:</strong> {school.location}</p>
      <p><strong>Obory:</strong> {school.programs}</p>
      <p><strong>Kontakt:</strong> {school.contact}</p>
      {school.website && (
        <p>
          <strong>Web školy:</strong>{' '}
          <a href={school.website} target="_blank" rel="noopener noreferrer">
            {school.website}
          </a>
        </p>
      )}
    </div>
  );
}

export default SchoolDetail;
