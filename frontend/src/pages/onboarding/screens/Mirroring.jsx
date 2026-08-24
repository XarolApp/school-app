import { useMemo } from 'react';
import { ObButton, ObScreen } from '../../../components/onboarding/ObKit';
import { FOCUS_CATEGORIES } from '../../../lib/schoolFeatures';
import { useOnboarding } from '../useOnboarding';

/**
 * Screen 16 — Mirroring interstitial.
 *
 * Reflecting the user's own answers back at them creates the feeling of
 * hyper-personalisation and, more importantly, makes them feel heard. It is
 * also where the sunk cost of ten questions becomes visible to the user.
 *
 * Zero-shame: if someone answered almost nothing, this screen says so warmly
 * and moves on. It never scolds and never implies the result will be worse.
 */
function labelsFor(ids) {
  // Labels are kept verbatim: lower-casing them turns "IT a technika" into
  // "it a technika", and the label already contains "a", so joining several
  // with another "a" reads badly. Comma-joined verbatim labels it is.
  return (ids || [])
    .map((id) => FOCUS_CATEGORIES.find((c) => c.id === id)?.label)
    .filter(Boolean);
}

function joinCz(items) {
  return items.join(', ');
}

function Mirroring() {
  const { role, answers, cleanedAnswers, goNext, goBack, progress } = useOnboarding();
  const parent = role === 'parent';

  const lines = useMemo(() => {
    const out = [];
    const focus = labelsFor(cleanedAnswers.focus);
    if (focus.length) {
      out.push(
        parent
          ? `Dítě zajímá: ${joinCz(focus)}.`
          : `Baví tě: ${joinCz(focus)}.`
      );
    }
    if (answers.studyType && answers.studyType !== 'nevim') {
      const map = {
        gymnazium: parent ? 'Směřujete ke gymnáziu.' : 'Táhne tě gympl.',
        odborna: parent
          ? 'Směřujete k odborné škole s maturitou.'
          : 'Chceš odborku s maturitou.',
        ucebni: parent ? 'Uvažujete o učebním oboru.' : 'Chceš učební obor.',
      };
      if (map[answers.studyType]) out.push(map[answers.studyType]);
    }
    if (answers.district && answers.district !== 'mimo') {
      const commuteMap = {
        blizko: parent ? 'a chcete to mít co nejblíž' : 'a chceš to mít co nejblíž',
        stredni: parent ? 'a i o kus dál je v pořádku' : 'a i o kus dál je v pohodě',
        kdekoli: parent ? 'a vzdálenost neřešíte' : 'a vzdálenost neřešíš',
      };
      const tail = commuteMap[answers.commute] || '';
      out.push(
        parent
          ? `Dojíždí se z Prahy ${answers.district} ${tail}.`.replace('  ', ' ')
          : `Jezdíš z Prahy ${answers.district} ${tail}.`.replace('  ', ' ')
      );
    }
    if (answers.language === 'hodne') {
      out.push(parent ? 'Jazyky jsou pro vás důležité.' : 'Jazyky chceš naplno.');
    }
    if (answers.practice === 'praxe') {
      out.push(parent ? 'Praktická výuka má přednost před teorií.' : 'Praxe víc než teorie.');
    }
    if (answers.certainty === 'vubec') {
      out.push(
        parent
          ? 'Zaměření zatím není jasné — s tím počítáme a hledáme školy se širší nabídkou.'
          : 'Zaměření ještě nemáš jasné — počítáme s tím a koukáme po školách, kde si můžeš vybrat.'
      );
    }
    return out;
  }, [answers, cleanedAnswers, parent]);

  return (
    <ObScreen
      onBack={goBack}
      progress={progress}
      actions={<ObButton onClick={goNext}>{parent ? 'Souhlasí' : 'Sedí to'}</ObButton>}
    >
      <h1 className="ob-title">{parent ? 'Takhle vám rozumíme' : 'Takhle ti rozumíme'}</h1>
      {lines.length > 0 ? (
        <ul className="ob-mirror-list">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="ob-lead">
          {parent
            ? 'Většinu otázek jste zatím nechali otevřenou — to je v pořádku. Výsledky vám ukážeme šířeji a kdykoli je můžete zpřesnit.'
            : 'Většinu otázek jsi zatím nechal otevřených — a to je v klidu. Ukážeme ti výsledky zeširoka a kdykoli je můžeš zpřesnit.'}
        </p>
      )}
      <p className="ob-microcopy">
        {parent
          ? 'Cokoli tu nesedí, můžete opravit tlačítkem zpět.'
          : 'Když něco nesedí, klidně se vrať zpátky a přepiš to.'}
      </p>
    </ObScreen>
  );
}

export default Mirroring;
