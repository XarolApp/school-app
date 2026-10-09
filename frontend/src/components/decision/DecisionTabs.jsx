import { NavLink } from 'react-router-dom';
import './decisionTabs.css';

/**
 * The 3-tab bar shared by /porovnani, /porovnani/matice and /prihlaska.
 * `pickCount` renders the "2/3" badge on the Přihláška tab — the same
 * shortlist-limit signal feature-brainstorm.md §5 asks for ("you can only
 * apply to 3"), visible from wherever the student currently is.
 */
function DecisionTabs({ pickCount = 0 }) {
  return (
    <nav className="dp-tabs" aria-label="Nástroje pro rozhodování">
      <NavLink to="/porovnani" end className={({ isActive }) => `dp-tab${isActive ? ' is-active' : ''}`}>
        Porovnání
      </NavLink>
      <NavLink to="/porovnani/matice" aria-label="Rozhodovací matice" className={({ isActive }) => `dp-tab${isActive ? ' is-active' : ''}`}>
        <span className="dp-tab-long">Rozhodovací matice</span><span className="dp-tab-short">Matice</span>
      </NavLink>
      <NavLink to="/prihlaska" aria-label={`Moje přihláška, ${pickCount} ze 3`} className={({ isActive }) => `dp-tab${isActive ? ' is-active' : ''}`}>
        <span className="dp-tab-long">Moje přihláška</span><span className="dp-tab-short">Přihláška</span>
        <span className="dp-tab-badge">{pickCount}/3</span>
      </NavLink>
    </nav>
  );
}

export default DecisionTabs;
