import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSchool } from '../api';

function SchoolDetail() {
  const { id } = useParams();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchSchool(id)
      .then(setSchool)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page"><p>Loading...</p></div>;
  if (error) return <div className="page"><p className="error">Could not load school: {error}</p></div>;
  if (!school) return <div className="page"><p>School not found.</p></div>;

  return (
    <div className="page page-school-detail">
      <Link to="/search">&larr; Back to search</Link>
      <h1>{school.name}</h1>
      <p><strong>Location:</strong> {school.location}</p>
      <p><strong>Programs:</strong> {school.programs}</p>
      <p><strong>Contact:</strong> {school.contact}</p>
      {school.website && (
        <p>
          <strong>Website:</strong>{' '}
          <a href={school.website} target="_blank" rel="noopener noreferrer">{school.website}</a>
        </p>
      )}
    </div>
  );
}

export default SchoolDetail;
