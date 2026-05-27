import { useState, useEffect, useCallback } from 'react';
import { asistenciaApi } from '../../services/api';
import { I } from '../../components/Icons';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}

function rowTotal(r) {
  return (r.adultos || 0) + (r.voluntarios || 0) + (r.ninos || 0) + (r.bebes || 0);
}

export default function AsistenciaViewPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await asistenciaApi.getAll({ limit: 200 });
      setRecords([...data].sort((a, b) => b.fecha.localeCompare(a.fecha)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const handler = () => load();
    window.addEventListener('asistencia-saved', handler);
    return () => window.removeEventListener('asistencia-saved', handler);
  }, [load]);

  const filtered = search
    ? records.filter(r => fmtDate(r.fecha).toLowerCase().includes(search.toLowerCase()) || r.fecha.includes(search))
    : records;

  const ultimo      = records[0];
  const totalUltimo = ultimo ? rowTotal(ultimo) : 0;
  const promedio    = records.length > 0
    ? Math.round(records.reduce((s, r) => s + rowTotal(r), 0) / records.length)
    : 0;
  const maximo      = records.length > 0
    ? Math.max(...records.map(rowTotal))
    : 0;

  const totAdultos     = records.reduce((s, r) => s + (r.adultos     || 0), 0);
  const totVoluntarios = records.reduce((s, r) => s + (r.voluntarios || 0), 0);
  const totNinos       = records.reduce((s, r) => s + (r.ninos       || 0), 0);
  const totBebes       = records.reduce((s, r) => s + (r.bebes       || 0), 0);
  const totNuevos      = records.reduce((s, r) => s + (r.nuevos      || 0), 0);
  const totTotal       = records.reduce((s, r) => s + rowTotal(r), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stat cards */}
      {!loading && records.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 14 }}>
          {[
            { label: 'Último domingo',  value: totalUltimo, sub: ultimo ? fmtDate(ultimo.fecha) : '—', color: 'var(--chart-primary)' },
            { label: 'Promedio',        value: promedio,    sub: `${records.length} domingos`, color: 'var(--ink)' },
            { label: 'Máximo histórico',value: maximo,      sub: 'Total asistentes',           color: 'var(--warn)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 6, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Historial table */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Historial de asistencia</h3>
            {!loading && (
              <div className="card-sub">{records.length} domingos registrados · solo lectura</div>
            )}
          </div>
        </div>

        <div className="toolbar">
          <div className="search">
            <I.search size={16} />
            <input
              placeholder="Buscar por fecha…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className={`chip${!search ? ' active' : ''}`} onClick={() => setSearch('')}>
            Todos
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: 14 }}>Cargando…</div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: 14 }}>
            Sin registros disponibles.
          </div>
        ) : (
          <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table className="table anf-table">
              <thead>
                <tr>
                  <th>Domingo</th>
                  <th style={{ textAlign: 'right' }}>Adultos</th>
                  <th style={{ textAlign: 'right' }}>Voluntarios</th>
                  <th style={{ textAlign: 'right' }}>Niños</th>
                  <th style={{ textAlign: 'right' }}>Bebés</th>
                  <th style={{ textAlign: 'right', color: 'var(--warn)' }}>Nuevos</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const total = rowTotal(r);
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>
                        {fmtDate(r.fecha)}
                        {i === 0 && !search && (
                          <span className="cat-pill" style={{ marginLeft: 8 }}>
                            Más reciente
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>{r.adultos ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>{r.voluntarios ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>{r.ninos ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>{r.bebes ?? '—'}</td>
                      <td style={{ textAlign: 'right', color: 'var(--warn)', fontWeight: 600 }}>
                        {r.nuevos > 0 ? r.nuevos : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                        {total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {!search && (
                <tbody>
                  <tr className="anf-totals-row">
                    <td style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11.5, letterSpacing: '0.08em' }}>Totales</td>
                    <td style={{ textAlign: 'right' }}>{totAdultos}</td>
                    <td style={{ textAlign: 'right' }}>{totVoluntarios}</td>
                    <td style={{ textAlign: 'right' }}>{totNinos}</td>
                    <td style={{ textAlign: 'right' }}>{totBebes}</td>
                    <td style={{ textAlign: 'right', color: 'var(--warn)' }}>{totNuevos || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--ink)', fontSize: 14 }}>{totTotal}</td>
                  </tr>
                </tbody>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
