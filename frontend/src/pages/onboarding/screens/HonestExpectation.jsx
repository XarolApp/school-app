import { ObButton, ObScreen } from '../../../components/onboarding/ObKit';
import { useOnboarding } from '../useOnboarding';

/**
 * Screen 17 — Honest expectation setting.
 *
 * Cal AI's highest-transfer tactic: telling the user up front what the product
 * will NOT do ("weight loss is slow for the first 7 days") measurably reduces
 * refunds and chargebacks and buys credibility that no testimonial can.
 *
 * Weighted heavier on the parent branch, where it is the credibility hinge: an
 * adult evaluating a paid tool trusts stated limits far more than claims.
 *
 * Everything on this screen is literally true of the current data model. The
 * database has name, location, programs, contact and website — no grades, no
 * capacity, no admission statistics. Saying so is not a weakness; it is the
 * difference between a product a parent trusts and one they close.
 */
function HonestExpectation() {
  const { role, goNext, goBack, progress } = useOnboarding();
  const parent = role === 'parent';

  return (
    <ObScreen
      onBack={goBack}
      progress={progress}
      actions={<ObButton onClick={goNext}>{parent ? 'Rozumím' : 'Jasně, chápu'}</ObButton>}
    >
      <h1 className="ob-title">
        {parent ? 'Než uvidíte výsledky — co shoda znamená' : 'Než ti to ukážeme — co shoda znamená'}
      </h1>

      <div className="ob-honest-block">
        <h2 className="ob-subtitle">{parent ? 'Co shoda je' : 'Co shoda je'}</h2>
        <p className="ob-lead">
          {parent
            ? 'Porovnání zaměření školy a její polohy s tím, co jste vyplnili. Počítá to obyčejná matematika, kterou vám na výsledku rozepíšeme — žádná černá skříňka.'
            : 'Porovnání toho, co škola učí a kde je, s tím, cos vyplnil. Počítá to obyčejná matika a u každé školy ti ukážeme, z čeho to vyšlo. Žádná černá skříňka.'}
        </p>
      </div>

      <div className="ob-honest-block ob-honest-block-warn">
        <h2 className="ob-subtitle">{parent ? 'Co shoda není' : 'Co shoda není'}</h2>
        <p className="ob-lead">
          {parent
            ? 'Není to odhad pravděpodobnosti přijetí. Nemáme data o známkách, kapacitách ani o výsledcích přijímacích zkoušek, takže je nepředstíráme. Vzdálenost počítáme podle městských částí, ne podle jízdních řádů.'
            : 'Není to odhad, jestli tě vezmou. Data o známkách, kapacitách ani o přijímačkách zatím nemáme, tak si je nevymýšlíme. Vzdálenost počítáme podle městských částí, ne podle spojů.'}
        </p>
      </div>

      <p className="ob-microcopy">
        {parent
          ? 'Jakmile tato data doplníme, uvidíte je zde jako samostatnou informaci — a dozvíte se, odkud pocházejí.'
          : 'Až tyhle data doplníme, uvidíš je tu zvlášť — i s tím, odkud jsou.'}
      </p>
    </ObScreen>
  );
}

export default HonestExpectation;
