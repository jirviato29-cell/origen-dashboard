import { useState, useEffect } from 'react';
import { gastosApi } from '../../services/api';
import { useGastosModal } from '../../context/GastosModalContext';
import { fmtFechaShort } from '../../utils/fecha';
import { CATEGORIAS, CAT_COLORS, CAT_BG } from '../../utils/categorias';

function fmt(n) {
  return '$' + Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
}

function catLabel(g) {
  return g.categoria_nombre ?? g.categoria ?? '—';
}

export default function GastosPorPagarPage() {
  const year = new Date().getFullYear();
  const { refreshKey } = useGastosModal();

  const [gastos,   setGastos]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [pagando,  setPagando]  = useState(null);
  const [localKey, setLocalKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    gastosApi.getAll({ year, pagado: 'false' })
      .then(res => { if (!cancelled) setGastos(res.data || []); })
      .catch(() => { if (!cancelled) setGastos([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year, refreshKey, localKey]);

  const handlePagar = async (id) => {
    setPagando(id);
    try {
      await gastosApi.pagar(id);
      setLocalKey(k => k + 1);
    } catch (err) {
      console.error('Error al marcar como pagado:', err);
    } finally {
      setPagando(null);
    }
  };

  const total  = gastos.reduce((s, g) => s + Number(g.monto), 0);
  const sorted = [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha));

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
        Cargando gastos por pagar…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Tarjeta resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Total por pagar
          </div>
          <div style={{ fontSize: 27, fontWeight: 800, color: 'var(--danger)', marginTop: 10, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {fmt(total)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            {gastos.length} {gastos.length === 1 ? 'gasto pendiente' : 'gastos pendientes'} · {year}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-head" style={{ marginBottom: sorted.length > 0 ? 0 : 16 }}>
          <div>
            <h3 className="card-title">Gastos pendientes de pago</h3>
            <div className="card-sub">
              {sorted.length} {sorted.length === 1 ? 'gasto' : 'gastos'} · {fmt(total)}
            </div>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: 14 }}>
            Sin gastos por pagar registrados.
          </div>
        ) : (
          <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', marginTop: 16 }}>
            <table className="table anf-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Categoría</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map(g => {
                  const cat       = catLabel(g);
                  const isPagando = pagando === g.id;
                  return (
                    <tr key={g.id}>
                      <td style={{ color: 'var(--muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {fmtFechaShort(g.fecha)}
                      </td>
                      <td style={{ fontWeight: 500 }}>{g.concepto}</td>
                      <td>
                        <span style={{
                          fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                          background: CAT_BG[cat] || 'rgba(0,0,0,0.08)',
                          color:      CAT_COLORS[cat] || 'var(--muted)',
                          whiteSpace: 'nowrap',
                        }}>
                          {cat}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--danger)' }}>
                        {fmt(Number(g.monto))}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handlePagar(g.id)}
                          disabled={isPagando}
                          style={{
                            fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6,
                            border: '1.5px solid var(--good)', background: 'rgba(79,138,91,0.08)',
                            color: 'var(--good)', cursor: isPagando ? 'not-allowed' : 'pointer',
                            opacity: isPagando ? 0.5 : 1, whiteSpace: 'nowrap',
                          }}
                        >
                          {isPagando ? 'Guardando…' : 'Marcar pagado'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tbody>
                <tr className="anf-totals-row">
                  <td colSpan={3} style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11.5, letterSpacing: '0.08em' }}>
                    Total por pagar
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--danger)', fontSize: 14 }}>
                    {fmt(total)}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
