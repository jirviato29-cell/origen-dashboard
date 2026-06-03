import { useState, useEffect, useCallback, useMemo } from 'react';
import { ofrendasApi, gastosApi } from '../../services/api';
import { I } from '../../components/Icons';

const CATEGORIAS_GASTO = ['Operación', 'Alimentos', 'Materiales', 'Eventos', 'Decoración'];

function fmt(n) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function mesLabel(mes) {
  if (!mes) return '—';
  return new Date(mes + '-01T00:00:00').toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
}

function mesLabelShort(mes) {
  if (!mes) return '—';
  return new Date(mes + '-01T00:00:00').toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());
}

const EMPTY_INGRESO = { concepto: '', monto: '', fecha: new Date().toISOString().slice(0, 10), notas: '' };
const EMPTY_GASTO   = { concepto: '', monto: '', fecha: new Date().toISOString().slice(0, 10), notas: '', categoria_nombre: 'Operación' };

const HOY_MES = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
})();

export default function FinanzasPage() {
  const [ingresos,  setIngresos]  = useState([]);
  const [gastos,    setGastos]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null); // 'ingreso' | 'gasto' | null
  const [form,      setForm]      = useState({});
  const [saving,    setSaving]    = useState(false);
  const [mesFilter, setMesFilter] = useState(HOY_MES);
  const [catFilter, setCatFilter] = useState('todos');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ri, rg] = await Promise.all([ofrendasApi.getAll(), gastosApi.getAll()]);
      setIngresos(ri.data);
      setGastos(rg.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derive available months from all data (most recent first)
  const mesesDisponibles = useMemo(() => {
    const set = new Set();
    [...ingresos, ...gastos].forEach(r => { if (r.fecha) set.add(r.fecha.slice(0, 7)); });
    const sorted = [...set].sort().reverse();
    if (!sorted.includes(HOY_MES)) sorted.unshift(HOY_MES);
    return sorted;
  }, [ingresos, gastos]);

  // Month-filtered data (used for stat cards and base for cat filter)
  const ingresosMes = ingresos.filter(i => i.fecha?.startsWith(mesFilter));
  const gastosMes   = gastos.filter(g => g.fecha?.startsWith(mesFilter));
  const totalIngMes = ingresosMes.reduce((s, i) => s + parseFloat(i.total_ofrenda || i.monto || 0), 0);
  const totalGasMes = gastosMes.reduce((s, g) => s + parseFloat(g.monto || 0), 0);
  const balance     = totalIngMes - totalGasMes;

  // Category breakdown for this month
  const catBreakdown = CATEGORIAS_GASTO
    .map(cat => ({
      cat,
      total: gastosMes
        .filter(g => (g.categoria_nombre ?? g.categoria) === cat)
        .reduce((s, g) => s + g.monto, 0),
    }))
    .filter(c => c.total > 0);

  // Combined movements, then category-filtered
  const movimientosMes = [
    ...ingresosMes.map(i => ({ ...i, tipo: 'ingreso' })),
    ...gastosMes.map(g => ({ ...g, tipo: 'gasto' })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));

  const movimientos = movimientosMes.filter(m => {
    if (catFilter === 'todos')    return true;
    if (catFilter === 'ingresos') return m.tipo === 'ingreso';
    return m.tipo === 'gasto' && ((m.categoria_nombre ?? m.categoria) === catFilter);
  });

  const openIngreso = () => { setForm({ ...EMPTY_INGRESO }); setModal('ingreso'); };
  const openGasto   = () => { setForm({ ...EMPTY_GASTO });   setModal('gasto'); };

  const handleSave = async () => {
    if (!form.concepto || !form.monto || !form.fecha) return;
    setSaving(true);
    try {
      if (modal === 'ingreso') {
        await ofrendasApi.create({ fecha: form.fecha, total_ofrenda: parseFloat(form.monto), efectivo: 0, terminal: 0 });
      } else {
        await gastosApi.create({ concepto: form.concepto, monto: parseFloat(form.monto), fecha: form.fecha, categoria: form.categoria_nombre || 'Operación' });
      }
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const catChips = [
    { key: 'todos',      label: 'Todos' },
    { key: 'ingresos',   label: 'Ingresos' },
    ...CATEGORIAS_GASTO.map(c => ({ key: c, label: c })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Month selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <I.calendar size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Mes:</span>
        <select
          value={mesFilter}
          onChange={e => { setMesFilter(e.target.value); setCatFilter('todos'); }}
          style={{
            padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)',
            fontSize: 13, fontWeight: 600, color: 'var(--ink)', background: 'white',
            outline: 'none', cursor: 'pointer',
          }}
        >
          {mesesDisponibles.map(m => (
            <option key={m} value={m}>{mesLabelShort(m)}</option>
          ))}
        </select>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500 }}>Ingresos del mes</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--good)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
            ${fmt(totalIngMes)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{mesLabel(mesFilter)}</div>
        </div>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500 }}>Egresos del mes</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--danger)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
            ${fmt(totalGasMes)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{mesLabel(mesFilter)}</div>
        </div>
        <div className="card" style={{ padding: '18px 20px', background: balance >= 0 ? 'rgba(79,138,91,0.08)' : 'rgba(180,74,58,0.08)' }}>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500 }}>Balance</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: balance >= 0 ? 'var(--good)' : 'var(--danger)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
            {balance >= 0 ? '+' : '-'}${fmt(Math.abs(balance))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{balance >= 0 ? 'Superávit' : 'Déficit'}</div>
        </div>
      </div>

      {/* Category breakdown */}
      {!loading && catBreakdown.length > 0 && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Egresos por categoría — {mesLabel(mesFilter)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {catBreakdown.map(({ cat, total }) => (
              <button
                key={cat}
                onClick={() => setCatFilter(catFilter === cat ? 'todos' : cat)}
                style={{
                  display: 'flex', flexDirection: 'column', gap: 2,
                  padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  border: `1.5px solid ${catFilter === cat ? 'var(--black)' : 'var(--border)'}`,
                  background: catFilter === cat ? 'var(--black)' : 'var(--surface)',
                  textAlign: 'left', minWidth: 110,
                }}
              >
                <span style={{ fontSize: 11.5, fontWeight: 700, color: catFilter === cat ? 'white' : 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>${fmt(total)}</span>
              </button>
            ))}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 2,
              padding: '10px 14px', borderRadius: 10,
              border: '1.5px solid var(--border)', background: 'rgba(180,74,58,0.05)',
              minWidth: 110,
            }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total egresos</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>${fmt(totalGasMes)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Movements table */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Movimientos del mes</h3>
            {!loading && (
              <div className="card-sub">{movimientos.length} registros · {mesLabel(mesFilter)}</div>
            )}
          </div>
          <div className="card-actions">
            <button className="btn btn-ghost" onClick={openIngreso}>
              <I.plus size={14} /> Ingreso
            </button>
            <button className="btn btn-primary" onClick={openGasto} style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}>
              <I.plus size={14} /> Egreso
            </button>
          </div>
        </div>

        {/* Category filter chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {catChips.map(c => (
            <button
              key={c.key}
              className={`chip${catFilter === c.key ? ' active' : ''}`}
              onClick={() => setCatFilter(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: 14 }}>Cargando…</div>
        ) : movimientos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: 14 }}>
            Sin movimientos en esta categoría.
          </div>
        ) : (
          <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table className="table anf-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Tipo</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m, idx) => (
                  <tr key={`${m.tipo}-${m.id ?? idx}`}>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{fmtDate(m.fecha)}</td>
                    <td style={{ fontWeight: 500 }}>
                      {m.concepto}
                      {(m.categoria_nombre ?? m.categoria) && (
                        <span className="cat-pill" style={{ marginLeft: 8 }}>{m.categoria_nombre ?? m.categoria}</span>
                      )}
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                        background: m.tipo === 'ingreso' ? 'rgba(79,138,91,0.15)' : 'rgba(180,74,58,0.12)',
                        color: m.tipo === 'ingreso' ? 'var(--good)' : 'var(--danger)',
                      }}>
                        {m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td style={{
                      textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)',
                      color: m.tipo === 'ingreso' ? 'var(--good)' : 'var(--danger)',
                    }}>
                      {m.tipo === 'ingreso' ? '+' : '-'}${fmt(m.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal agregar */}
      {modal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-grabber" />
            <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="anf-modal-eyebrow">{modal === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo egreso'}</div>
                <h3 className="anf-modal-date">{modal === 'ingreso' ? 'Registrar ingreso' : 'Registrar egreso'}</h3>
              </div>
              <button className="icon-btn" onClick={() => setModal(null)} style={{ width: 34, height: 34, flexShrink: 0 }}>
                <I.x size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'concepto', label: 'Concepto', type: 'text',   placeholder: modal === 'ingreso' ? 'Diezmos domingo…' : 'Renta local…' },
                { key: 'monto',    label: 'Monto ($)', type: 'number', placeholder: '0.00' },
                { key: 'fecha',    label: 'Fecha',     type: 'date',   placeholder: '' },
                { key: 'notas',    label: 'Notas',     type: 'text',   placeholder: 'Opcional…' },
              ].map(f => (
                <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={form[f.key] || ''}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      border: '1.5px solid var(--border)', fontSize: 14,
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}

              {modal === 'gasto' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Categoría
                  </label>
                  <select
                    value={form.categoria_nombre || 'Operación'}
                    onChange={e => setForm(p => ({ ...p, categoria_nombre: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      border: '1.5px solid var(--border)', fontSize: 14,
                      outline: 'none', boxSizing: 'border-box', background: 'white',
                    }}
                  >
                    {CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>

            <button
              className="btn btn-primary anf-save-btn"
              onClick={handleSave}
              disabled={saving || !form.concepto || !form.monto}
              style={{
                opacity: (saving || !form.concepto || !form.monto) ? 0.45 : 1, marginTop: 8,
                ...(modal === 'gasto' ? { background: 'var(--danger)', borderColor: 'var(--danger)' } : {}),
              }}
            >
              <I.check size={16} />
              {saving ? 'Guardando…' : `Guardar ${modal === 'ingreso' ? 'ingreso' : 'egreso'}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
