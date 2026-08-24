import { ObButton, ObScreen } from '../../../components/onboarding/ObKit';
import { useOnboarding } from '../useOnboarding';

/**
 * Screen 3 — Problem framing, branched by role.
 *
 * Sell the transformation, not the spec sheet. The student frame is identity
 * and self-discovery; the parent frame is certainty and risk reduction.
 */
function ProblemFraming() {
  const { role, goNext, goBack, progress } = useOnboarding();
  const parent = role === 'parent';

  return (
    <ObScreen
      onBack={goBack}
      progress={progress}
      actions={<ObButton onClick={goNext}>{parent ? 'Pokračovat' : 'Dává smysl'}</ObButton>}
    >
      <h1 className="ob-title">
        {parent ? 'V Praze je přes 60 středních škol.' : 'V Praze je přes 60 středních škol.'}
      </h1>
      <p className="ob-lead">
        {parent
          ? 'Neexistuje ale místo, kde byste je viděli srovnané podle toho, jestli sedí právě vašemu dítěti. Weby škol se navzájem neporovnávají a katalogy jen vypisují adresy.'
          : 'A není nikde místo, kde bys je viděl srovnané podle toho, jestli sedí zrovna tobě. Weby škol o sobě navzájem mlčí a katalogy jsou jen seznam adres.'}
      </p>
      <p className="ob-lead">
        {parent
          ? 'Většina rodin si projde tři až čtyři školy a mezi nimi se rozhodne. Zbylých padesát nikdy neviděla.'
          : 'Většina deváťáků si projde tři čtyři školy a z nich vybírá. Těch zbylých padesát nikdy neviděli.'}
      </p>
    </ObScreen>
  );
}

export default ProblemFraming;
