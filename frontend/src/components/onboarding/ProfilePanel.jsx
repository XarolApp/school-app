import { useId, useState } from 'react';
import { QUESTIONS, answerTags } from '../../pages/onboarding/quizQuestions';

/**
 * The live "Tvůj profil" panel — the desktop-specific idea in onboarding-v2.
 *
 * Desktop onboarding has no published research behind it, but the pattern is
 * shipping in production across Perplexity, Rox, Gorgias, Turo, Kit and Mercury:
 * a narrow question column plus a panel that shows what is being built. That is
 * what this is. The empty right-hand half of a 1280px viewport is otherwise
 * either wasted or filled by stretching the question column past a readable
 * measure (~75 characters), which measurably hurts reading.
 *
 * On mobile the same state collapses to one tappable strip (`variant="strip"`)
 * that expands in place. IMPORTANT: this reads `answers` directly — the state
 * model does NOT fork between breakpoints, only its shape. The mobile app is
 * the eventual primary surface, so a divergence here would have to be paid for
 * twice.
 *
 * Answered rows carry a tag; unanswered ones are dashed placeholder slots, so
 * the panel shows what is still missing as honestly as what is filled in.
 */
function ProfilePanel({ answers, role, currentQuestionIndex, variant = 'panel' }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  const rows = QUESTIONS.map((q, i) => ({
    id: q.id,
    label: q.panelLabel || q.id,
    tags: answerTags(q, answers[q.key], role),
    isCurrent: i === currentQuestionIndex,
  }));

  const filled = rows.filter((r) => r.tags.length > 0);
  const remaining = QUESTIONS.length - 1 - (currentQuestionIndex ?? 0);
  const parent = role === 'parent';

  const privacyNote = parent
    ? 'Odpovědi zůstávají ve vašem prohlížeči. Nikam je neodesíláme a nic neukládáme, dokud si sami nevytvoříte účet.'
    : 'Odpovědi zůstávají v tvém prohlížeči. Nikam je neposíláme a nic o tobě neukládáme, dokud si sám nevytvoříš účet.';

  const list = (
    <>
      <ul className="ob-profile-rows">
        {rows.map((r) => (
          <li
            key={r.id}
            className={`ob-profile-row${r.tags.length ? '' : ' is-pending'}${
              r.isCurrent ? ' is-current' : ''
            }`}
          >
            <span className="ob-profile-key">{r.label}</span>
            {r.tags.length ? (
              <span className="ob-profile-values">
                {r.tags.map((t) => (
                  <span key={t} className="ob-profile-tag">
                    {t}
                  </span>
                ))}
              </span>
            ) : (
              <span className="ob-profile-slot" aria-hidden="true" />
            )}
          </li>
        ))}
      </ul>
      <div className="ob-profile-foot">
        {remaining > 0 && (
          <p className="ob-profile-left">
            {parent ? 'Zbývá' : 'Zbývá'} {remaining} {questionWord(remaining)}
          </p>
        )}
        <p className="ob-profile-privacy">{privacyNote}</p>
      </div>
    </>
  );

  if (variant === 'strip') {
    const preview = filled.flatMap((r) => r.tags);
    const shown = preview.slice(0, 3);
    const more = preview.length - shown.length;
    return (
      <div className={`ob-profile-strip${open ? ' is-open' : ''}`}>
        <button
          type="button"
          className="ob-profile-striphead"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="ob-visually-hidden">
            {parent ? 'Zobrazit profil dítěte' : 'Zobrazit tvůj profil'}
          </span>
          <span className="ob-profile-striptags">
            {shown.length ? (
              shown.map((t) => (
                <span key={t} className="ob-profile-tag">
                  {t}
                </span>
              ))
            ) : (
              <span className="ob-profile-empty">
                {parent ? 'Profil se plní podle odpovědí' : 'Profil se plní podle odpovědí'}
              </span>
            )}
          </span>
          {more > 0 && <span className="ob-profile-more">+{more}</span>}
          <span className="ob-profile-chev" aria-hidden="true">
            {open ? '⌃' : '⌄'}
          </span>
        </button>
        {open && (
          <div className="ob-profile-stripbody" id={bodyId}>
            {list}
          </div>
        )}
      </div>
    );
  }

  return (
    <aside className="ob-profile" aria-label={parent ? 'Profil dítěte' : 'Tvůj profil'}>
      <p className="ob-profile-title">{parent ? 'Profil dítěte' : 'Tvůj profil'}</p>
      {list}
    </aside>
  );
}

function questionWord(n) {
  if (n === 1) return 'otázka';
  if (n >= 2 && n <= 4) return 'otázky';
  return 'otázek';
}

export default ProfilePanel;
