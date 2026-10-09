import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CircleCheck } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { normalizeBetaCode } from '../lib/pendingBetaCode';
import { useG } from '../lib/gender';
import { internalReturnPath } from '../lib/internalReturnPath';

// Landing page of the e-mail confirmation link. The link opens a new tab and
// signs in there; the tab that signed up hears about it and moves on by
// itself, so this tab only has to say "done, you can close me".
function readLinkError() {
  const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search);
  return params.get('error_code') || params.get('error') || null;
}

function EmailConfirmed() {
  const g = useG();
  const [searchParams] = useSearchParams();
  const betaCode = normalizeBetaCode(searchParams.get('beta'));
  // Read once on the first render: supabase-js clears the hash after it
  // processes the link.
  const [linkError] = useState(readLinkError);
  const { loading, isSignedIn, emailConfirmed } = useAuth();
  const requestedNext = searchParams.get('next');
  const next = internalReturnPath(requestedNext);
  const loginQuery = new URLSearchParams();
  if (betaCode) loginQuery.set('beta', betaCode);
  if (next) loginQuery.set('next', next);
  const betaQuery = loginQuery.size ? `?${loginQuery}` : '';
  const continuePath = next || (betaCode ? `/beta/${encodeURIComponent(betaCode)}` : '/skoly');

  let body;
  if (loading && !linkError) {
    body = <p role="status">Ověřuji odkaz…</p>;
  } else if (isSignedIn && emailConfirmed) {
    body = <>
      <CircleCheck className="email-confirmed-icon" size={48} aria-hidden="true" />
      <h1>E-mail je ověřený</h1>
      <p className="lede">Toto okno teď můžeš zavřít. Původní okno pokračuje samo.</p>
      <p className="field-hint">{`Původní okno už nemáš otevřené, nebo jsi odkaz ${g('otevřel', 'otevřela')} na jiném zařízení?`}</p>
      <Link className="btn btn-secondary btn-block" to={continuePath}>Pokračovat v tomto okně</Link>
    </>;
  } else if (linkError) {
    body = <>
      <h1>Odkaz už neplatí</h1>
      <p className="lede">Potvrzovací odkaz vypršel nebo už byl použitý. Přihlas se. Pokud e-mail ještě není ověřený, pošleme ti nový odkaz.</p>
      <Link className="btn btn-primary btn-block" to={`/prihlaseni${betaQuery}`}>Přihlásit se</Link>
    </>;
  } else {
    // No session and no error: opened directly, or the link landed in a
    // browser that could not finish sign-in. We cannot tell it worked.
    body = <>
      <h1>Potvrzení e-mailu</h1>
      <p className="lede">{`Pokud jsi právě ${g('klikl', 'klikla')} na odkaz v e-mailu, toto okno můžeš zavřít a pokračovat v původním. Jinak se přihlas tady.`}</p>
      <Link className="btn btn-secondary btn-block" to={`/prihlaseni${betaQuery}`}>Přihlásit se</Link>
    </>;
  }

  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <main className="page page-auth">
        <div className="auth-layout email-confirmed">{body}</div>
      </main>
    </>
  );
}

export default EmailConfirmed;
