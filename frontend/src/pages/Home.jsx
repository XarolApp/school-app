import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="page page-home">
      <h1>Find your next school</h1>
      <p>Search Prague high schools by location and program, then let our AI questionnaire help you find the best fit.</p>
      <div className="home-actions">
        <Link to="/search" className="btn btn-primary">Browse Schools</Link>
        <Link to="/signup" className="btn btn-secondary">Sign Up</Link>
      </div>
    </div>
  );
}

export default Home;
