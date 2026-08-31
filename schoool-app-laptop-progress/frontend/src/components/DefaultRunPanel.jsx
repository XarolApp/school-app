import { useState } from 'react';
import { Star, Pencil } from 'lucide-react';
import { setDefaultRun, renameRun } from '../api';
import { useToast } from './ToastContext';
import { runTitle } from '../lib/answerSummary';

/**
 * The "what this set is, and whether it's the one being used" block, shown above
 * a set's results.
 *
 * Two jobs, both of which exist because the default-set mechanic is invisible
 * otherwise: it states plainly what a default set decides, and it is where the
 * set gets named. Neither is decoration — a student holding several sets has no
 * way to work out from the rest of the interface that one of them is driving
 * every percentage in the app.
 */
function DefaultRunPanel({ run, onChange }) {
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [label, setLabel] = useState(run.label ?? '');
  const [savingLabel, setSavingLabel] = useState(false);
  const { toast } = useToast();

  const makeDefault = async () => {
    setSaving(true);
    try {
      await setDefaultRun(run.id);
      onChange({ ...run, is_default: true });
      toast('Shody se teď počítají podle téhle sady');
    } catch (err) {
      toast(err.message || 'Sadu se nepodařilo nastavit jako výchozí', {
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveLabel = async () => {
    setSavingLabel(true);
    try {
      const saved = await renameRun(run.id, label);
      onChange({ ...run, label: saved.label });
      setRenaming(false);
      toast(saved.label ? 'Název uložen' : 'Název smazán');
    } catch (err) {
      toast(err.message || 'Název se nepodařilo uložit', { type: 'error' });
    } finally {
      setSavingLabel(false);
    }
  };

  return (
    <div className="panel run-panel">
      <div className="run-panel-head">
        <div className="run-panel-title-row">
          <h2 className="run-panel-title">{runTitle(run)}</h2>
          {run.is_default && (
            <span className="badge run-badge">
              <Star
                className="meta-icon"
                aria-hidden="true"
                strokeWidth={1.75}
                fill="currentColor"
              />
              Výchozí
            </span>
          )}
        </div>

        {!renaming && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setRenaming(true)}
          >
            <Pencil className="meta-icon" aria-hidden="true" strokeWidth={1.75} />
            {run.label ? 'Přejmenovat' : 'Pojmenovat'}
          </button>
        )}
      </div>

      {renaming && (
        <div className="run-rename">
          <label className="field-label" htmlFor={`run-label-${run.id}`}>
            Název sady
          </label>
          {/* The advice matters as much as the field. "Name this thing" with no
              reason attached gets skipped, and an unnamed set is exactly the one
              that becomes hard to place three sets later. */}
          <p className="field-hint">
            Pojmenuj si sadu, aby ses v ní později vyznal. Nejlíp fungují názvy,
            které říkají, čím se tahle sada liší od ostatních — ne kdy jsi ji
            vyplnil, to je vidět stejně.
          </p>
          <div className="run-rename-row">
            <input
              id={`run-label-${run.id}`}
              className="input"
              type="text"
              maxLength={60}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="např. „Chci gymnázium“ nebo „S radou od rodičů“"
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={saveLabel}
              disabled={savingLabel}
            >
              {savingLabel && <span className="btn-spinner" aria-hidden="true" />}
              {savingLabel ? 'Ukládám…' : 'Uložit'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setLabel(run.label ?? '');
                setRenaming(false);
              }}
              disabled={savingLabel}
            >
              Zrušit
            </button>
          </div>
        </div>
      )}

      {/* Said the same way in both states. Someone reading this for the first
          time needs to know what "výchozí" buys them whether or not this
          particular set happens to be it. */}
      <p className="run-panel-text">
        {run.is_default ? (
          <>
            <strong>Podle téhle sady se počítají procenta shody u všech škol</strong>{' '}
            — ve vyhledávání, u oblíbených i na detailu školy.
          </>
        ) : (
          <>
            <strong>Tahle sada se pro výpočet shody nepoužívá.</strong> Procenta u
            škol se počítají podle té, kterou máš nastavenou jako výchozí.
          </>
        )}{' '}
        Výchozí může být vždy jen jedna sada. Ostatní si můžeš dál prohlížet, jen
        se podle nich procenta nepočítají.
      </p>

      {!run.is_default && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={makeDefault}
          disabled={saving}
        >
          {saving && <span className="btn-spinner" aria-hidden="true" />}
          {saving ? 'Nastavuji…' : 'Použít tuhle sadu pro shody'}
        </button>
      )}
    </div>
  );
}

export default DefaultRunPanel;
