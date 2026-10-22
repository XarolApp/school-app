import { useEffect, useState } from 'react';
import {
  createAdminCreator,
  fetchAdminCreators,
  resetAdminCreatorDevices,
  restoreAdminCreator,
  revokeAdminCreator,
  rotateAdminCreatorLink,
} from '../api';

const formatDate = (value) => value ? new Date(value).toLocaleString('cs-CZ') : '—';

export default function CreatorManagement({ refresh, onForbidden }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: '', note: '' });
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    fetchAdminCreators()
      .then((data) => { if (live) setRows(data); })
      .catch((err) => {
        if (!live) return;
        setError(err.message);
        if (err.status === 403) onForbidden?.();
      })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [refresh, reload, onForbidden]);

  const runAction = async (key, action) => {
    setPending(key);
    setError('');
    setNotice('');
    try {
      const result = await action();
      if (result?.url) setUrl(result.url);
      setReload((value) => value + 1);
    } catch (err) {
      setError(err.message);
      if (err.status === 403) onForbidden?.();
    } finally {
      setPending('');
    }
  };

  const create = (event) => {
    event.preventDefault();
    void runAction('create', async () => {
      const result = await createAdminCreator(form);
      setForm({ name: '', note: '' });
      return result;
    });
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setNotice('Odkaz zkopírován.');
    } catch {
      setError('Odkaz se nepodařilo zkopírovat.');
    }
  };

  return (
    <section className="admin-panel admin-panel-table">
      <header><h2 className="ss-headline-md">Odkazy pro tvůrce</h2></header>
      <form className="creator-link-form" onSubmit={create}>
        <label className="ss-field-label">
          Jméno
          <input className="ss-input" value={form.name} maxLength={80} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </label>
        <label className="ss-field-label">
          Poznámka (např. @handle)
          <input className="ss-input" value={form.note} maxLength={200} onChange={(event) => setForm({ ...form, note: event.target.value })} />
        </label>
        <button type="submit" className="ss-btn ss-btn-primary" disabled={pending === 'create'}>
          {pending === 'create' ? 'Vytvářím…' : 'Vytvořit odkaz'}
        </button>
      </form>

      {url && (
        <div className="admin-note creator-link-result">
          <label className="ss-field-label" htmlFor="creator-new-url">Nový odkaz</label>
          <div>
            <input id="creator-new-url" className="ss-input" value={url} readOnly />
            <button type="button" className="ss-btn ss-btn-secondary" onClick={copyUrl}>Kopírovat</button>
          </div>
          <p>Odkaz se zobrazí jen teď. Když ho ztratíš, vytvoř nový.</p>
        </div>
      )}
      {notice && <p className="admin-note" role="status">{notice}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}
      {loading && <p className="admin-loading" role="status">Načítám tvůrce…</p>}

      {!loading && (
        <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Odkazy pro tvůrce">
          <table>
            <thead><tr>
              <th>Jméno</th><th>Poznámka</th><th>Vytvořeno</th><th>Naposledy otevřeno</th><th>Naposledy aktivní</th>
              <th>Otevření</th><th>Zařízení</th><th>Odmítnutá zařízení</th><th>Stav</th><th>Akce</th>
            </tr></thead>
            <tbody>{rows.map((row) => {
              const deviceTitle = row.devices.map((device) => device.user_agent || 'Neznámé zařízení').join('\n') || 'Zatím bez zařízení';
              const rowPending = pending.startsWith(`${row.id}:`);
              return (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.note || '—'}</td>
                  <td>{formatDate(row.created_at)}</td>
                  <td>{formatDate(row.last_opened_at)}</td>
                  <td>{formatDate(row.last_active_at)}</td>
                  <td>{row.open_count}</td>
                  <td title={deviceTitle}>{row.devices.length}/{row.max_devices}</td>
                  <td>{row.blocked_attempts}</td>
                  <td><span className={`admin-status ${row.revoked_at ? 'admin-status-neudelame' : 'admin-status-vyreseno'}`}>{row.revoked_at ? 'Zrušeno' : 'Aktivní'}</span></td>
                  <td className="creator-actions">
                    <button type="button" className="admin-link" disabled={rowPending} onClick={() => {
                      if (window.confirm('Starý odkaz přestane fungovat. Vytvořit nový?')) {
                        void runAction(`${row.id}:rotate`, () => rotateAdminCreatorLink(row.id));
                      }
                    }}>Nový odkaz</button>
                    <button type="button" className="admin-link" disabled={rowPending} onClick={() => {
                      if (window.confirm('Odebrat uložená zařízení? Další dvě zařízení pak mohou odkaz otevřít.')) {
                        void runAction(`${row.id}:reset`, () => resetAdminCreatorDevices(row.id));
                      }
                    }}>Resetovat zařízení</button>
                    <button type="button" className="admin-link" disabled={rowPending} onClick={() => {
                      void runAction(`${row.id}:state`, () => row.revoked_at ? restoreAdminCreator(row.id) : revokeAdminCreator(row.id));
                    }}>{row.revoked_at ? 'Obnovit' : 'Zrušit'}</button>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
          {!rows.length && <p className="admin-empty">Zatím nebyly vytvořeny žádné odkazy.</p>}
        </div>
      )}
    </section>
  );
}
