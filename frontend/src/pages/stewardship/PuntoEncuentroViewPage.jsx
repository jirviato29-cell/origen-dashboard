import { useState } from 'react';
import { mockEventos } from '../../data/mockData';
import { I } from '../../components/Icons';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).replace(/^\w/, c => c.toUpperCase());
}

function fmtDateShort(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PuntoEncuentroViewPage() {
  const [filter, setFilter] = useState('todos');

  const hoyStr = new Date().toISOString().slice(0, 10);

  const sorted = [...mockEventos].sort((a, b) => b.fecha.localeCompare(a.fecha));

  const filtered = sorted.filter(e => {
    if (filter === 'proximos')  return e.fecha >= hoyStr;
    if (filter === 'pasados')   return e.fecha < hoyStr;
    if (filter === 'especial')  return e.tipo === 'especial';
    if (filter === 'servicio')  return e.tipo === 'servicio';
    return true;
  });

  const proximos  = sorted.filter(e => e.fecha >= hoyStr).length;
  const especiales = sorted.filter(e => e.tipo === 'especial').length;
  const proximo   = sorted.filter(e => e.fecha >= hoyStr).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total de eventos', value: mockEventos.length, sub: 'Histórico', color: 'var(--ink)' },
          { label: 'Próximos eventos', value: proximos,           sub: 'Próximamente', color: 'var(--chart-primary)' },
          { label: 'Eventos especiales', value: especiales,       sub: 'En el historial', color: 'var(--warn)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 6, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Próximo evento highlight */}
      {proximo && (
        <div style={{
          padding: '16px 20px', borderRadius: 14,
          background: 'var(--surface-2)', border: '1.5px solid var(--border-strong)',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ color: 'var(--ink)', flexShrink: 0 }}><I.calendar size={28} /></div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Próximo evento</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginTop: 2 }}>{proximo.nombre}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{fmtDate(proximo.fecha)}</div>
          </div>
          {proximo.tipo === 'especial' && (
            <span style={{
              marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 99, flexShrink: 0,
              background: 'var(--surface-3)', color: 'var(--ink-2)',
            }}>Especial</span>
          )}
        </div>
      )}

      {/* Events list */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Eventos registrados</h3>
            <div className="card-sub">{filtered.length} eventos · solo lectura</div>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { key: 'todos',    label: 'Todos' },
            { key: 'proximos', label: 'Próximos' },
            { key: 'pasados',  label: 'Pasados' },
            { key: 'especial', label: 'Especiales' },
            { key: 'servicio', label: 'Servicios' },
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

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
            Sin eventos en esta categoría.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(e => {
              const isPast   = e.fecha < hoyStr;
              const isToday  = e.fecha === hoyStr;
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
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{fmtDateShort(e.fecha)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {isToday && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--black)', color: 'white' }}>
                        Hoy
                      </span>
                    )}
                    {e.tipo === 'especial' && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(200,148,58,0.15)', color: 'var(--warn)' }}>
                        Especial
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
