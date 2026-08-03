import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSchools } from '../api';

function Search() {
  const [schools, setSchools] = useState([]);
  const [location, setLocation] = useState('');
  const [program, setProgram] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchSchools()
      .then(setSchools)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = schools.filter((school) => {
    const matchesLocation = location
      ? (school.location || '').toLowerCase().includes(location.toLowerCase())
      : true;
    const matchesProgram = program
      ? (school.programs || '').toLowerCase().includes(program.toLowerCase())
      : true;
    return matchesLocation && matchesProgram;
  });

  return (
    <div className="page page-search">
      <h1>Search Schools</h1>
      <div className="search-filters">
        <input
          type="text"
          placeholder="Filter by location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filter by program"
          value={program}
          onChange={(e) => setProgram(e.target.value)}
        />
      </div>

      {loading && <p>Loading schools...</p>}
      {error && <p className="error">Could not load schools: {error}</p>}

      {!loading && !error && (
        <ul className="school-list">
          {filtered.map((school) => (
            <li key={school.id} className="school-card">
              <Link to={`/schools/${school.id}`}>
                <h3>{school.name}</h3>
                <p>{school.location}</p>
                <p>{school.programs}</p>
              </Link>
            </li>
          ))}
          {filtered.length === 0 && <p>No schools match your filters.</p>}
        </ul>
      )}
    </div>
  );
}

export default Search;
