// Rough guide, not a gate. The only hard rule is the 8-character minimum that
// Supabase itself enforces — this is here to nudge people away from "fotbal123"
// before they pick it, because the cheapest attack on any login form is simply
// guessing the passwords people actually choose.

// Substrings that show up constantly in leaked password dumps, plus the Czech
// ones an English list would miss.
const COMMON_FRAGMENTS = [
  'password', 'heslo', 'qwerty', 'qwertz', 'asdf', '123456', '12345',
  'abc123', 'iloveyou', 'admin', 'letmein', 'welcome', 'monkey', 'dragon',
  'football', 'fotbal', 'slunicko', 'miluji', 'ahoj', 'praha', 'skola',
  'nazdar', 'pepik', 'honzik', 'lucie', 'tereza',
];

const LEVELS = [
  { label: 'Příliš krátké', className: 'is-empty' },
  { label: 'Slabé', className: 'is-weak' },
  { label: 'Ucházející', className: 'is-fair' },
  { label: 'Dobré', className: 'is-good' },
  { label: 'Silné', className: 'is-strong' },
];

export function scorePassword(password) {
  if (!password) return { score: 0, hint: '' };

  if (password.length < 8) {
    return { score: 0, hint: 'Chybí ještě pár znaků.' };
  }

  const lower = password.toLowerCase();

  // A long password made of one common word is still a bad password, so this
  // check comes before anything is awarded for length or variety.
  const match = COMMON_FRAGMENTS.find((fragment) => lower.includes(fragment));
  if (match) {
    return {
      score: 1,
      hint: `Obsahuje běžné slovo („${match}“). Zkus něco méně obvyklého.`,
    };
  }

  // Repetition and straight runs off the keyboard read as long but are trivial
  // to guess, so they cancel out the length bonus below.
  const repeated = /(.)\1{2,}/.test(password);
  const sequential = /(abc|bcd|cde|def|012|123|234|345|456|567|678|789)/.test(lower);

  let score = 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^\w\s]/.test(password)) score += 1;
  if (repeated || sequential) score -= 1;

  score = Math.min(4, Math.max(1, score - 1));

  const hints = {
    1: 'Přidej délku a míchej velká písmena, číslice a symboly.',
    2: 'Skoro dobré. Delší heslo pomůže víc než složitější.',
    3: 'Dobré heslo.',
    4: 'Výborné heslo.',
  };

  return { score, hint: hints[score] };
}

function PasswordStrength({ password }) {
  if (!password) return null;

  const { score, hint } = scorePassword(password);
  const level = LEVELS[score];

  return (
    <div className={`pw-meter ${level.className}`}>
      <div className="pw-meter-track" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={step <= score ? 'pw-meter-step is-filled' : 'pw-meter-step'}
          />
        ))}
      </div>
      {/* polite, so it does not interrupt a screen reader mid-typing */}
      <p className="pw-meter-label" aria-live="polite">
        <strong>{level.label}</strong>
        {hint && <span> — {hint}</span>}
      </p>
    </div>
  );
}

export default PasswordStrength;
