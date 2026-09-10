import { NavLink } from 'react-router-dom';

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
      <NavLink to="/porovnani/matice" className={({ isActive }) => `dp-tab${isActive ? ' is-active' : ''}`}>
        Rozhodovací matice
      </NavLink>
      <NavLink to="/prihlaska" className={({ isActive }) => `dp-tab${isActive ? ' is-active' : ''}`}>
        Moje přihláška
        <span className="dp-tab-badge">{pickCount}/3</span>
      </NavLink>
    </nav>
  );
}

export default DecisionTabs;
