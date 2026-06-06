import { useState, useEffect } from 'react';
import { calendarioApi } from '../../services/api';
import { fmtFecha, fmtFechaShort, toISODate } from '../../utils/fecha';
import { I } from '../../components/Icons';

const TIPO_COLOR = {
  'Servicio dominical': '#B5860D',
  'Especial':           '#F59E0B',
  'Reunión de hombres': '#1E3A8A',
  'Reunión de mujeres': '#7C3AED',
  'Alpha':              '#DC2626',
};
const TIPO_BG = {
  'Servicio dominical': 'rgba(181,134,13,0.12)',
  'Especial':           'rgba(245,158,11,0.12)',
  'Reunión de hombres': 'rgba(30,58,138,0.10)',
  'Reunión de mujeres': 'rgba(124,58,237,0.10)',
  'Alpha':              'rgba(220,38,38,0.10)',
};

export default function PuntoEncuentroViewPage() {
  const [filter,   setFilter]   = useState('todos');
  const [eventos,  setEventos]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    calendarioApi.getAll({ en_punto_encuentro: true })
      .then(r => setEventos(r.data))
      .catch(() => setEventos([]))
      .finally(() => setLoading(false));
  }, []);

  const hoyStr = new Date().toISOString().slice(0, 10);

  const sorted = [...eventos].sort((a, b) => {
    const ia = toISODate(a.fecha) || '';
    const ib = toISODate(b.fecha) || '';
    return ib.localeCompare(ia);
  });

  const filtered = sorted.filter(e => {
    const iso = toISODate(e.fecha) || '';
    if (filter === 'proximos') return iso >= hoyStr;
    if (filter === 'pasados')  return iso < hoyStr;
    if (filter === 'especial') return e.tipo === 'Especial';
    return true;
  });

  const proximos   = sorted.filter(e => (toISODate(e.fecha) || '') >= hoyStr).length;
  const especiales = sorted.filter(e => e.tipo === 'Especial').length;
  const proximo    = sorted
    .filter(e => (toISODate(e.fecha) || '') >= hoyStr)
    .sort((a, b) => (toISODate(a.fecha) || '').localeCompare(toISODate(b.fecha) || ''))[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total de eventos',    value: loading ? '…' : eventos.length, sub: 'En Punto de Encuentro',  color: 'var(--ink)' },
          { label: 'Próximos eventos',    value: loading ? '…' : proximos,       sub: 'Próximamente',            color: 'var(--chart-primary)' },
          { label: 'Eventos especiales',  value: loading ? '…' : especiales,     sub: 'En el historial',         color: 'var(--warn)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 6, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Próximo evento highlight */}
      {!loading && proximo && (
        <div style={{
          padding: '16px 20px', borderRadius: 14,
          background: 'var(--surface-2)', border: '1.5px solid var(--border-strong)',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ color: 'var(--ink)', flexShrink: 0 }}><I.calendar size={28} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Próximo evento
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginTop: 2 }}>{proximo.nombre}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{fmtFecha(proximo.fecha)}</div>
          </div>
          {proximo.tipo && (
            <span style={{
              fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 99, flexShrink: 0,
              background: TIPO_BG[proximo.tipo] || 'var(--surface-3)',
              color: TIPO_COLOR[proximo.tipo] || 'var(--ink-2)',
            }}>
              {proximo.tipo}
            </span>
          )}
        </div>
      )}

      {/* Events list */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Eventos en Punto de Encuentro</h3>
            <div className="card-sub">
              {loading ? 'Cargando…' : `${filtered.length} eventos · solo lectura`}
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { key: 'todos',    label: 'Todos' },
            { key: 'proximos', label: 'Próximos' },
            { key: 'pasados',  label: 'Pasados' },
            { key: 'especial', label: 'Especiales' },
          ].map(opt => (
            <button
              key={opt.key}
              className={`chip${filter === opt.key ? ' active' : ''}`}
              onClick={() => setFilter(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
            Cargando eventos…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
            Sin eventos en esta categoría.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(e => {
              const iso    = toISODate(e.fecha) || '';
              const isPast  = iso < hoyStr;
              const isToday = iso === hoyStr;
              return (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px', borderRadius: 10,
                  background: isToday ? 'var(--surface-2)' : 'var(--surface)',
                  border: `1px solid ${isToday ? 'var(--border-strong)' : 'var(--border)'}`,
                  opacity: isPast ? 0.65 : 1,
                }}>
                  <div style={{ color: 'var(--muted)', flexShrink: 0 }}>
                    <I.pin size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{e.nombre}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{fmtFechaShort(e.fecha)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {isToday && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--black)', color: 'white' }}>
                        Hoy
                      </span>
                    )}
                    {e.tipo && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                        background: TIPO_BG[e.tipo] || 'var(--surface-3)',
                        color: TIPO_COLOR[e.tipo] || 'var(--ink-2)',
                      }}>
                        {e.tipo}
                      </span>
                    )}
                    {isPast && !isToday && (
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>Pasado</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
