import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockGastos, mockEventos } from '../../data/mockData';
import { asistenciaApi, ofrendasApi, gastosApi } from '../../services/api';
import { SALDO_INICIAL_CAJA } from '../../utils/config';
import { I } from '../../components/Icons';
import { useOfrendasModal } from '../../context/OfrendasModalContext';

function fmt(n) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Normaliza timestamps ISO completos ("2026-06-07T00:00:00.000Z") y strings "YYYY-MM-DD"
function toDateISO(d) { return d ? String(d).slice(0, 10) : null; }

function fmtDate(d) {
  const iso = toDateISO(d);
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatCard({ label, value, sub, extra, color, icon: Icon }) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500, lineHeight: 1.4, maxWidth: '80%' }}>{label}</div>
        <div style={{ color, opacity: 0.75, flexShrink: 0 }}><Icon size={20} /></div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', marginTop: 10, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5 }}>{sub}</div>
      {extra && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{extra}</div>}
    </div>
  );
}

function QuickBtn({ icon: Icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '18px 12px', borderRadius: 12, border: '1.5px solid var(--border)',
        background: 'var(--surface)', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
        width: '100%',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
    >
      <div style={{
        color, width: 40, height: 40, borderRadius: 10,
        background: color + '1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} />
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
    </button>
  );
}

const CATEGORIAS_GASTO = ['Operación', 'Alimentos', 'Materiales', 'Eventos', 'Decoración'];

export default function StewardshipDashboard() {
  const navigate = useNavigate();
  const { openModal: openOfrendas } = useOfrendasModal();

  const year     = new Date().getFullYear();
  const hoy      = new Date();
  const mes      = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const mesLabel = hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  const hoyStr   = hoy.toISOString().slice(0, 10);

  // ── API state ──────────────────────────────────────────────────────────────
  const [asistencia, setAsistencia] = useState([]);
  const [ofrendas,   setOfrendas]   = useState([]);
  const [gastos,     setGastos]     = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ra, ro, rg] = await Promise.all([
          asistenciaApi.getAll({ year, limit: 200 }),
          ofrendasApi.getAll({ year }),
          gastosApi.getAll({ year, pagado: 'true' }),
        ]);
        if (!cancelled) {
          setAsistencia(ra.data || []);
          setOfrendas(ro.data   || []);
          setGastos(rg.data     || []);
        }
      } catch { /* mantiene arrays vacíos; cards muestran — */ }
      finally   { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [year]);

  // ── Último servicio ────────────────────────────────────────────────────────
  const ultimoServicio = [...asistencia].sort((a, b) => b.fecha.localeCompare(a.fecha))[0] ?? null;
  const ultimaFecha    = ultimoServicio?.fecha ?? null;
  const totalAsist     = ultimoServicio
    ? (ultimoServicio.adultos || 0) + (ultimoServicio.voluntarios || 0)
      + (ultimoServicio.ninos || 0) + (ultimoServicio.bebes || 0)
    : null;

  // ── Ofrendas + participación del último servicio ───────────────────────────
  const ultimaFechaISO = toDateISO(ultimaFecha);
  const ultimaOfrenda  = ofrendas.find(o => toDateISO(o.fecha) === ultimaFechaISO) ?? null;
  const totalOfrenda  = ultimaOfrenda
    ? (Number(ultimaOfrenda.efectivo)        || 0)
      + (Number(ultimaOfrenda.terminal)      || 0)
      + (Number(ultimaOfrenda.transferencia) || 0)
    : null;
  const participacion = ultimaOfrenda?.participacion ?? null;
  const nuevos        = ultimoServicio?.nuevos        ?? null;

  // ── Saldo en caja (acumulado del año) ──────────────────────────────────────
  const totalEfectivoCaja = ofrendas.reduce((s, o) => s + (Number(o.efectivo) || 0), 0);
  const totalGastosCaja   = gastos.reduce((s, g)   => s + (Number(g.monto)    || 0), 0);
  const saldoCaja         = SALDO_INICIAL_CAJA + totalEfectivoCaja - totalGastosCaja;

  // ── Secciones no migradas (mock) ───────────────────────────────────────────
  const gastosMesArr = mockGastos.filter(g => g.fecha.startsWith(mes));
  const gastosMes    = gastosMesArr.reduce((s, g) => s + g.monto, 0);
  const catBreakdown = CATEGORIAS_GASTO
    .map(cat => ({
      cat,
      total: gastosMesArr
        .filter(g => (g.categoria_nombre ?? g.categoria) === cat)
        .reduce((s, g) => s + g.monto, 0),
    }))
    .filter(c => c.total > 0);
  const proximosEventos = mockEventos
    .filter(e => e.fecha >= hoyStr)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 4);

  // ── Valores para las tarjetas ──────────────────────────────────────────────
  const D = '—';
  const vAsistencia    = loading ? D : totalAsist    !== null ? String(totalAsist)          : D;
  const vOfrenda       = loading ? D : totalOfrenda  !== null ? `$${fmt(totalOfrenda)}`     : D;
  const vParticipacion = loading ? D : participacion !== null ? `${participacion}%`         : D;
  const vNuevos        = loading ? D : nuevos        !== null ? String(nuevos)               : D;
  const vSaldo         = loading ? D
    : `${saldoCaja >= 0 ? '' : '−'}$${fmt(Math.abs(saldoCaja))}`;

  const subAsist  = !loading && ultimaFecha ? fmtDate(ultimaFecha) : D;
  const extraAsist = !loading && ultimoServicio
    ? `Ad ${ultimoServicio.adultos ?? 0} · Vol ${ultimoServicio.voluntarios ?? 0} · Niños ${ultimoServicio.ninos ?? 0} · Bbs ${ultimoServicio.bebes ?? 0}`
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <StatCard
          label="Asistencia"
          value={vAsistencia}
          sub={subAsist}
          extra={extraAsist}
          color="#14b8a6"
          icon={I.users}
        />
        <StatCard
          label="Ofrendas"
          value={vOfrenda}
          sub={!loading && ultimaFecha ? fmtDate(ultimaFecha) : D}
          color="var(--chart-primary)"
          icon={I.coin}
        />
        <StatCard
          label="Participación"
          value={vParticipacion}
          sub="del último servicio"
          color="var(--chart-secondary)"
          icon={I.coin}
        />
        <StatCard
          label="Nuevos visitantes"
          value={vNuevos}
          sub="visitantes nuevos"
          color="var(--warn)"
          icon={I.users}
        />
        <StatCard
          label="Saldo en caja"
          value={vSaldo}
          sub={`efectivo disponible · acumulado ${year}`}
          color={!loading && saldoCaja < 0 ? 'var(--danger)' : 'var(--good)'}
          icon={I.cash}
        />
      </div>

      {/* Quick access */}
      <div className="card">
        <div className="card-head">
          <h3 className="card-title">Acceso rápido</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginTop: 8 }}>
          <QuickBtn icon={I.coin}     label="Ofrendas y Diezmos"  color="var(--ink)"          onClick={openOfrendas} />
          <QuickBtn icon={I.cash}     label="Finanzas"             color="var(--chart-primary)"   onClick={() => navigate('/stewardship/finanzas')} />
          <QuickBtn icon={I.users}    label="Asistencia"           color="var(--chart-secondary)" onClick={() => navigate('/stewardship/asistencia')} />
          <QuickBtn icon={I.pin}      label="Punto de Encuentro"   color="var(--muted)"      onClick={() => navigate('/stewardship/punto-encuentro')} />
          <QuickBtn icon={I.settings} label="Configuración"        color="var(--ink)"        onClick={() => navigate('/stewardship/configuracion')} />
        </div>
      </div>

      {/* Gastos por categoría */}
      {catBreakdown.length > 0 && (
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Egresos por categoría</h3>
              <div className="card-sub">{mesLabel} · ${fmt(gastosMes)} total</div>
            </div>
            <button className="btn btn-ghost" onClick={() => navigate('/stewardship/finanzas')}>
              Ver finanzas <I.chevR size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
            {catBreakdown.map(({ cat, total }) => {
              const pct = gastosMes > 0 ? Math.round((total / gastosMes) * 100) : 0;
              return (
                <div
                  key={cat}
                  style={{
                    flex: '1 1 130px', padding: '12px 14px', borderRadius: 10,
                    border: '1px solid var(--border)', background: 'var(--surface)',
                  }}
                >
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{cat}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>${fmt(total)}</div>
                  <div style={{ marginTop: 8, height: 4, borderRadius: 99, background: 'var(--border)' }}>
                    <div style={{ height: '100%', borderRadius: 99, background: 'var(--danger)', width: `${pct}%`, opacity: 0.7 }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{pct}% del total</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Próximos eventos */}
      {proximosEventos.length > 0 && (
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">Próximos eventos</h3>
            <button className="btn btn-ghost" onClick={() => navigate('/stewardship/punto-encuentro')}>
              Ver todos <I.chevR size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {proximosEventos.map(e => (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ color: 'var(--muted)', flexShrink: 0 }}>
                  <I.calendar size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{e.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtDate(e.fecha)}</div>
                </div>
                {e.tipo === 'especial' && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, flexShrink: 0,
                    background: 'var(--surface-3)', color: 'var(--ink-2)',
                  }}>Especial</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
