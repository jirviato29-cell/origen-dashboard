import { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, Label, ResponsiveContainer } from 'recharts';
import { asistenciaApi } from '../../services/api';
import { useAsistenciaStewModal } from '../../context/AsistenciaStewModalContext';
import { fmtFecha, mesNombre } from '../../utils/fecha';

// ── Helpers ───────────────────────────────────────────────────────────────────


function rowTotal(r) {
  return (r.adultos || 0) + (r.voluntarios || 0) + (r.ninos || 0) + (r.bebes || 0);
}

// ── Chart constants ───────────────────────────────────────────────────────────

const CAT_LABEL = '#1e40af';
const CAT_VALUE = '#1e3a8a';

const DONUT_COLORS = {
  adultos:     '#fb923c',
  voluntarios: '#93c5fd',
  ninos:       '#fde047',
  bebes:       '#f9a8d4',
};

function DesgloseCat({ adultos = 0, voluntarios = 0, ninos = 0, bebes = 0, nuevos = 0 }) {
  const num = { fontFamily: 'var(--font-mono)', color: CAT_VALUE, fontWeight: 700 };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 8px', marginTop: 9, fontSize: 11.5, lineHeight: 1.6 }}>
      <span style={{ color: CAT_LABEL }}>Adultos <span style={num}>{adultos}</span></span>
      <span style={{ color: CAT_LABEL }}>Voluntarios <span style={num}>{voluntarios}</span></span>
      <span style={{ color: CAT_LABEL }}>Niños <span style={num}>{ninos}</span></span>
      <span style={{ color: CAT_LABEL }}>Bebés <span style={num}>{bebes}</span></span>
      {nuevos > 0 && <span style={{ color: CAT_LABEL }}>Nuevos <span style={num}>{nuevos}</span></span>}
    </div>
  );
}

// ── Attendance Donut Chart ────────────────────────────────────────────────────

function renderDonutLabel({ cx, cy, midAngle, outerRadius, name, percent }) {
  const RADIAN = Math.PI / 180;
  const r = outerRadius + 32;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  const pct = Math.round(percent * 100);
  return (
    <text
      x={x} y={y}
      fill="#374151"
      fontSize={11}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
    >
      {pct >= 8 ? `${name} ${pct}%` : `${pct}%`}
    </text>
  );
}

function AttendanceDonutChart({ slices, total }) {
  if (!slices || total === 0) {
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Sin registros para mostrar
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={slices}
          cx="50%"
          cy="50%"
          innerRadius={68}
          outerRadius={90}
          dataKey="value"
          paddingAngle={2}
          strokeWidth={0}
          label={renderDonutLabel}
          labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
        >
          <Label
            content={({ viewBox: { cx, cy } }) => (
              <text x={cx} y={cy} textAnchor="middle">
                <tspan x={cx} dy="-6" fontSize="26" fontWeight="800" fill="var(--ink)" fontFamily="var(--font-mono)">{total}</tspan>
                <tspan x={cx} dy="20" fontSize="11" fill="#b0a090">asistentes</tspan>
              </text>
            )}
            position="center"
          />
          {slices.map((s, i) => <Cell key={i} fill={s.color} />)}
        </Pie>
        <Tooltip
          formatter={(value, name) => {
            const pct = total > 0 ? Math.round(value / total * 100) : 0;
            return [`${value} · ${pct}%`, name];
          }}
          contentStyle={{ fontSize: 12.5, borderRadius: 8, border: '1px solid var(--border)' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AsistenciaViewPage() {
  const { refreshKey } = useAsistenciaStewModal();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesSeleccionado, setMesSelec] = useState(null);

  const year = new Date().getFullYear();

  const load = useCallback(async () => {
    try {
      const { data } = await asistenciaApi.getAll({ year, limit: 200 });
      setRecords([...data].sort((a, b) => b.fecha.localeCompare(a.fecha)));
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load, refreshKey]);

  useEffect(() => {
    const h = () => load();
    window.addEventListener('asistencia-saved', h);
    return () => window.removeEventListener('asistencia-saved', h);
  }, [load]);

  const toggleMes = m => setMesSelec(prev => prev === m ? null : m);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const ultimo      = records[0];
  const totalUltimo = ultimo ? rowTotal(ultimo) : 0;
  const n           = records.length;
  const promedio    = n > 0 ? Math.round(records.reduce((s, r) => s + rowTotal(r), 0) / n) : 0;
  const maximo      = n > 0 ? Math.max(...records.map(rowTotal)) : 0;

  const promAdultos     = n > 0 ? Math.round(records.reduce((s, r) => s + (r.adultos     || 0), 0) / n) : 0;
  const promVoluntarios = n > 0 ? Math.round(records.reduce((s, r) => s + (r.voluntarios || 0), 0) / n) : 0;
  const promNinos       = n > 0 ? Math.round(records.reduce((s, r) => s + (r.ninos       || 0), 0) / n) : 0;
  const promBebes       = n > 0 ? Math.round(records.reduce((s, r) => s + (r.bebes       || 0), 0) / n) : 0;
  const promNuevos      = n > 0 ? Math.round(records.reduce((s, r) => s + (r.nuevos      || 0), 0) / n) : 0;

  const hoy           = new Date();
  const mesActual     = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const mesActualLabel = mesNombre(mesActual);

  // ── Resumen por mes (SUMA + desglose) ────────────────────────────────────
  const mesesDisponibles = [...new Set(records.map(r => r.fecha.slice(0, 7)))].sort();
  const resumenMeses = mesesDisponibles.map(m => {
    const rows = records.filter(r => r.fecha.startsWith(m));
    const adultos     = rows.reduce((s, r) => s + (r.adultos     || 0), 0);
    const voluntarios = rows.reduce((s, r) => s + (r.voluntarios || 0), 0);
    const ninos       = rows.reduce((s, r) => s + (r.ninos       || 0), 0);
    const bebes       = rows.reduce((s, r) => s + (r.bebes       || 0), 0);
    const nuevos      = rows.reduce((s, r) => s + (r.nuevos      || 0), 0);
    const total       = adultos + voluntarios + ninos + bebes;
    return { mes: m, label: mesNombre(m), total, adultos, voluntarios, ninos, bebes, nuevos, count: rows.length };
  });

  const mesActualData = resumenMeses.find(m => m.mes === mesActual) || null;

  // ── Tabla totals (must be before donutSource) ─────────────────────────────
  const totAdultos     = records.reduce((s, r) => s + (r.adultos     || 0), 0);
  const totVoluntarios = records.reduce((s, r) => s + (r.voluntarios || 0), 0);
  const totNinos       = records.reduce((s, r) => s + (r.ninos       || 0), 0);
  const totBebes       = records.reduce((s, r) => s + (r.bebes       || 0), 0);
  const totNuevos      = records.reduce((s, r) => s + (r.nuevos      || 0), 0);
  const totTotal       = records.reduce((s, r) => s + rowTotal(r), 0);

  // ── Donut data ─────────────────────────────────────────────────────────────
  const donutSource = mesSeleccionado
    ? (resumenMeses.find(r => r.mes === mesSeleccionado) || null)
    : { adultos: totAdultos, voluntarios: totVoluntarios, ninos: totNinos, bebes: totBebes };

  const donutSlices = donutSource
    ? [
        { name: 'Adultos',     value: donutSource.adultos     || 0, color: DONUT_COLORS.adultos },
        { name: 'Voluntarios', value: donutSource.voluntarios || 0, color: DONUT_COLORS.voluntarios },
        { name: 'Niños',       value: donutSource.ninos       || 0, color: DONUT_COLORS.ninos },
        { name: 'Bebés',       value: donutSource.bebes       || 0, color: DONUT_COLORS.bebes },
      ]
    : [];

  const donutTotal = donutSlices.reduce((s, x) => s + x.value, 0);

  const chartTitle = mesSeleccionado
    ? `Asistencia ${mesNombre(mesSeleccionado)} ${year}`
    : `Asistencia ${year}`;
  const chartSub = mesSeleccionado
    ? `${resumenMeses.find(r => r.mes === mesSeleccionado)?.count || 0} domingos · distribución por categoría`
    : `${resumenMeses.length} meses · distribución por categoría · clic en un mes para filtrar`;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
        Cargando…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── A: tarjetas ── */}
      {records.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>

          {/* Último domingo */}
          <div className="card" style={{ padding: '16px 18px', background: '#f0fdfa', border: '2px solid #2dd4bf', boxShadow: '0 2px 10px rgba(45,212,191,0.18)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Último domingo</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#5eead4', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              {totalUltimo}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {ultimo ? fmtFecha(ultimo.fecha) : '—'}
            </div>
            {ultimo && (
              <DesgloseCat
                adultos={ultimo.adultos || 0} voluntarios={ultimo.voluntarios || 0}
                ninos={ultimo.ninos || 0} bebes={ultimo.bebes || 0}
              />
            )}
          </div>

          {/* Mes actual */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{mesActualLabel}</div>
            {mesActualData ? (
              <>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#2dd4bf', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                  {mesActualData.total}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {mesActualData.count} {mesActualData.count === 1 ? 'domingo' : 'domingos'}
                </div>
                <DesgloseCat
                  adultos={mesActualData.adultos} voluntarios={mesActualData.voluntarios}
                  ninos={mesActualData.ninos} bebes={mesActualData.bebes}
                />
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>Sin registros aún</div>
            )}
          </div>

          {/* Promedio */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Promedio</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#14b8a6', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              {promedio}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{n} domingos</div>
            <DesgloseCat
              adultos={promAdultos} voluntarios={promVoluntarios}
              ninos={promNinos} bebes={promBebes}
            />
          </div>

          {/* Máximo histórico */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Máximo histórico</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0d9488', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              {maximo}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Total asistentes</div>
          </div>

          {/* Total del año */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Total del año</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0f766e', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              {totTotal}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{n} domingos · {year}</div>
            <DesgloseCat
              adultos={totAdultos} voluntarios={totVoluntarios}
              ninos={totNinos} bebes={totBebes}
            />
          </div>

        </div>
      )}

      {/* ── B: 2 columnas ── */}
      {records.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 }}>

          {/* Izquierda: Resumen por mes (suma) */}
          <div className="card" style={{ padding: '20px 20px 16px' }}>
            <div className="card-head" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="card-title">Resumen por mes</h3>
                <div className="card-sub">{year} · total de asistencia · clic para filtrar la gráfica</div>
              </div>
            </div>

            {resumenMeses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)', fontSize: 13 }}>
                Sin registros en {year}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {resumenMeses.map(r => {
                  const activo = mesSeleccionado === r.mes;
                  return (
                    <button
                      key={r.mes}
                      onClick={() => toggleMes(r.mes)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px 10px 10px', borderRadius: 8, cursor: 'pointer',
                        background: activo ? 'rgba(0,180,216,0.07)' : 'transparent',
                        color: 'var(--ink)', border: 'none',
                        borderLeft: activo ? '3px solid var(--chart-primary)' : '3px solid transparent',
                        width: '100%', textAlign: 'left',
                        transition: 'background 0.15s, border-left-color 0.15s',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 15, fontWeight: 600 }}>{r.label}</span>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{r.count} dom.</span>
                          <span style={{
                            marginLeft: 'auto', fontSize: 17, fontWeight: 800,
                            fontFamily: 'var(--font-mono)',
                            color: activo ? 'var(--chart-primary)' : 'var(--ink)',
                          }}>
                            {r.total}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px', fontSize: 11.5 }}>
                          {[
                            { label: 'Adultos',     v: r.adultos },
                            { label: 'Vol.',        v: r.voluntarios },
                            { label: 'Niños',       v: r.ninos },
                            { label: 'Bebés',       v: r.bebes },
                            ...(r.nuevos > 0 ? [{ label: 'Nuevos', v: r.nuevos }] : []),
                          ].map(({ label, v }) => (
                            <span key={label} style={{ color: CAT_LABEL }}>
                              {label} <span style={{ fontFamily: 'var(--font-mono)', color: CAT_VALUE, fontWeight: 700 }}>{v}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Derecha: Gráfica de dona */}
          <div className="card" style={{ padding: '20px 20px 16px' }}>
            <div className="card-head chart-head" style={{ marginBottom: 14 }}>
              <div>
                <h3 className="card-title">{chartTitle}</h3>
                <div className="card-sub">{chartSub}</div>
              </div>
              {mesSeleccionado && (
                <button
                  onClick={() => setMesSelec(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'none', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '4px 10px',
                    fontSize: 12, color: 'var(--muted)', cursor: 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  ← Ver todo el año
                </button>
              )}
            </div>
            <AttendanceDonutChart slices={donutSlices} total={donutTotal} />
          </div>
        </div>
      )}

      {/* ── C: Historial ── */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Historial de asistencia</h3>
            {!loading && (
              <div className="card-sub">{records.length} domingos registrados · solo lectura</div>
            )}
          </div>
        </div>

        {records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: 14 }}>
            Sin registros disponibles.
          </div>
        ) : (
          <div className="tbl-wrap" style={{ borderRadius: 10, border: '1px solid var(--border)' }}>
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
                {records.map((r, i) => {
                  const total = rowTotal(r);
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>
                        {fmtFecha(r.fecha)}
                        {i === 0 && (
                          <span className="cat-pill" style={{ marginLeft: 8 }}>Más reciente</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>{r.adultos   ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>{r.voluntarios ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>{r.ninos     ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>{r.bebes     ?? '—'}</td>
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
              <tbody>
                <tr className="anf-totals-row">
                  <td style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11.5, letterSpacing: '0.08em' }}>
                    Totales
                  </td>
                  <td style={{ textAlign: 'right' }}>{totAdultos}</td>
                  <td style={{ textAlign: 'right' }}>{totVoluntarios}</td>
                  <td style={{ textAlign: 'right' }}>{totNinos}</td>
                  <td style={{ textAlign: 'right' }}>{totBebes}</td>
                  <td style={{ textAlign: 'right', color: 'var(--warn)' }}>{totNuevos || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--ink)', fontSize: 14 }}>
                    {totTotal}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
