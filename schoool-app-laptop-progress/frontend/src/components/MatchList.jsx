import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import FavoriteButton from './FavoriteButton';
import MatchScore from './MatchScore';

/**
 * The ranked result cards for one set of answers.
 *
 * Extracted from the questionnaire page so that page and the single-set page
 * render a result list identically. Two copies of this drift — one of them ends
 * up with a favourite star or a percentage the other does not have, for the same
 * stored data.
 *
 * `from` is what the school detail page's back link reads to decide where "back"
 * goes, so a card opened from a stored set returns to that set rather than to
 * the newest one.
 */
function MatchCard({ match, rank, isFavorite, onFavoriteChange, from, state }) {
  const { school, score, reason } = match;

  return (
    <li className="match-card" style={{ '--stagger': Math.min(rank, 7) }}>
      <FavoriteButton
        schoolId={school.id}
        isFavorite={isFavorite}
        onChange={onFavoriteChange}
      />

      {/* One Link for the whole card — clicking the rank, the reason, the
          score, anywhere, opens the school. `state` tells SchoolDetail's back
          link to return here instead of to the search page. */}
      <Link
        to={`/skoly/${school.id}`}
        state={{ from, ...state }}
        className="match-card-link"
      >
        <div className="match-card-rank" aria-hidden="true">
          {rank + 1}
        </div>

        <div className="match-card-body">
          <span className="match-card-name">{school.name}</span>
          {school.location && (
            <span className="match-card-meta">
              <MapPin className="meta-icon" aria-hidden="true" strokeWidth={1.75} />
              {school.location}
            </span>
          )}
          {reason && <p className="match-card-reason">{reason}</p>}
        </div>

        <MatchScore score={score} />
      </Link>
    </li>
  );
}

function MatchList({
  matches,
  favoriteIds,
  onFavoriteChange,
  from = 'questionnaire',
  state,
}) {
  return (
    <ol className="match-list">
      {matches.map((match, index) => (
        <MatchCard
          key={match.school_id}
          match={match}
          rank={index}
          isFavorite={favoriteIds.has(match.school_id)}
          onFavoriteChange={(next) => onFavoriteChange(match.school_id, next)}
          from={from}
          state={state}
        />
      ))}
    </ol>
  );
}

export default MatchList;
