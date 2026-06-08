import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { asistenciaApi } from '../../services/api';
import { useAsistenciaStewModal } from '../../context/AsistenciaStewModalContext';
import { fmtFecha, fmtFechaShort, mesNombre } from '../../utils/fecha';

// ── Helpers ───────────────────────────────────────────────────────────────────


function rowTotal(r) {
  return (r.adultos || 0) + (r.voluntarios || 0) + (r.ninos || 0) + (r.bebes || 0);
}

// ── Chart constants ───────────────────────────────────────────────────────────

const SEG_COLORS = {
  adultos:     '#0f766e',
  voluntarios: '#2dd4bf',
  ninos:       '#f97316',
  bebes:       '#fbbf24',
};

const LEGEND = [
  { key: 'adultos',     label: 'Adultos',     color: SEG_COLORS.adultos },
  { key: 'voluntarios', label: 'Voluntarios', color: SEG_COLORS.voluntarios },
  { key: 'ninos',       label: 'Niños',       color: SEG_COLORS.ninos },
  { key: 'bebes',       label: 'Bebés',       color: SEG_COLORS.bebes },
];

function DesgloseCat({ adultos = 0, voluntarios = 0, ninos = 0, bebes = 0, nuevos = 0 }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 8px', marginTop: 9, fontSize: 11.5, lineHeight: 1.6 }}>
      <span style={{ color: SEG_COLORS.adultos, fontWeight: 600 }}>Adultos <span style={{ fontFamily: 'var(--font-mono)' }}>{adultos}</span></span>
      <span style={{ color: SEG_COLORS.voluntarios, fontWeight: 600 }}>Voluntarios <span style={{ fontFamily: 'var(--font-mono)' }}>{voluntarios}</span></span>
      <span style={{ color: SEG_COLORS.ninos, fontWeight: 600 }}>Niños <span style={{ fontFamily: 'var(--font-mono)' }}>{ninos}</span></span>
      <span style={{ color: SEG_COLORS.bebes, fontWeight: 600 }}>Bebés <span style={{ fontFamily: 'var(--font-mono)' }}>{bebes}</span></span>
      {nuevos > 0 && <span style={{ color: '#ca8a04', fontWeight: 600 }}>Nuevos <span style={{ fontFamily: 'var(--font-mono)' }}>{nuevos}</span></span>}
    </div>
  );
}

// ── Stacked Bar Chart (Recharts — barras horizontales) ───────────────────────

function StackedBarChart({ data, onBarClick }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Sin registros para mostrar
      </div>
    );
  }

  const handleClick = (chartState) => {
    if (!onBarClick || !chartState?.activeLabel) return;
    const d = data.find(x => x.xLabel === chartState.activeLabel);
    if (d) onBarClick(d.barKey);
  };

  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        onClick={onBarClick ? handleClick : undefined}
        style={{ cursor: onBarClick ? 'pointer' : 'default' }}
      >
        <XAxis type="number" />
        <YAxis type="category" dataKey="xLabel" width={70} />
        <Tooltip
          formatter={(value, name) => [value, name]}
          labelFormatter={(label) => {
            const d = data.find(x => x.xLabel === label);
            return d?.tooltipHeader || label;
          }}
        />
        <Bar dataKey="adultos"     name="Adultos"     fill={SEG_COLORS.adultos}     stackId="a" />
        <Bar dataKey="voluntarios" name="Voluntarios" fill={SEG_COLORS.voluntarios} stackId="a" />
        <Bar dataKey="ninos"       name="Niños"       fill={SEG_COLORS.ninos}       stackId="a" />
        <Bar dataKey="bebes"       name="Bebés"       fill={SEG_COLORS.bebes}       stackId="a" />
      </BarChart>
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

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = mesSeleccionado
    ? [...records]
        .filter(r => r.fecha.startsWith(mesSeleccionado))
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map(r => ({
          ...r,
          xLabel:       fmtFechaShort(r.fecha),
          tooltipHeader: fmtFecha(r.fecha),
          barKey:       r.fecha,
        }))
    : resumenMeses.map(r => ({
        adultos:      r.adultos,
        voluntarios:  r.voluntarios,
        ninos:        r.ninos,
        bebes:        r.bebes,
        nuevos:       r.nuevos,
        xLabel:       r.label,
        tooltipHeader: `${r.label} ${year}`,
        barKey:       r.mes,
      }));

  const chartTitle = mesSeleccionado
    ? `Asistencia ${mesNombre(mesSeleccionado)} ${year}`
    : `Asistencia ${year}`;
  const chartSub = mesSeleccionado
    ? `${chartData.length} domingo${chartData.length !== 1 ? 's' : ''} · pasa el mouse sobre cada barra`
    : `${chartData.length} ${chartData.length === 1 ? 'mes' : 'meses'} · por mes · clic en un mes para ver sus domingos`;

  // ── Tabla ──────────────────────────────────────────────────────────────────
  const totAdultos     = records.reduce((s, r) => s + (r.adultos     || 0), 0);
  const totVoluntarios = records.reduce((s, r) => s + (r.voluntarios || 0), 0);
  const totNinos       = records.reduce((s, r) => s + (r.ninos       || 0), 0);
  const totBebes       = records.reduce((s, r) => s + (r.bebes       || 0), 0);
  const totNuevos      = records.reduce((s, r) => s + (r.nuevos      || 0), 0);
  const totTotal       = records.reduce((s, r) => s + rowTotal(r), 0);

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
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Último domingo</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--chart-primary)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              {totalUltimo}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {ultimo ? fmtFecha(ultimo.fecha) : '—'}
            </div>
            {ultimo && (
              <DesgloseCat
                adultos={ultimo.adultos || 0} voluntarios={ultimo.voluntarios || 0}
                ninos={ultimo.ninos || 0} bebes={ultimo.bebes || 0} nuevos={ultimo.nuevos || 0}
              />
            )}
          </div>

          {/* Mes actual */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{mesActualLabel}</div>
            {mesActualData ? (
              <>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#5C7A6F', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                  {mesActualData.total}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {mesActualData.count} {mesActualData.count === 1 ? 'domingo' : 'domingos'}
                </div>
                <DesgloseCat
                  adultos={mesActualData.adultos} voluntarios={mesActualData.voluntarios}
                  ninos={mesActualData.ninos} bebes={mesActualData.bebes} nuevos={mesActualData.nuevos}
                />
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>Sin registros aún</div>
            )}
          </div>

          {/* Promedio */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Promedio</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              {promedio}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{n} domingos</div>
            <DesgloseCat
              adultos={promAdultos} voluntarios={promVoluntarios}
              ninos={promNinos} bebes={promBebes} nuevos={promNuevos}
            />
          </div>

          {/* Máximo histórico */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Máximo histórico</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--warn)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              {maximo}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Total asistentes</div>
          </div>

          {/* Total del año */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Total del año</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              {totTotal}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{n} domingos · {year}</div>
            <DesgloseCat
              adultos={totAdultos} voluntarios={totVoluntarios}
              ninos={totNinos} bebes={totBebes} nuevos={totNuevos}
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
                          <span style={{ color: SEG_COLORS.adultos, fontWeight: 600 }}>
                            Adultos <span style={{ fontFamily: 'var(--font-mono)' }}>{r.adultos}</span>
                          </span>
                          <span style={{ color: SEG_COLORS.voluntarios, fontWeight: 600 }}>
                            Vol. <span style={{ fontFamily: 'var(--font-mono)' }}>{r.voluntarios}</span>
                          </span>
                          <span style={{ color: SEG_COLORS.ninos, fontWeight: 600 }}>
                            Niños <span style={{ fontFamily: 'var(--font-mono)' }}>{r.ninos}</span>
                          </span>
                          <span style={{ color: SEG_COLORS.bebes, fontWeight: 600 }}>
                            Bebés <span style={{ fontFamily: 'var(--font-mono)' }}>{r.bebes}</span>
                          </span>
                          {r.nuevos > 0 && (
                            <span style={{ color: 'var(--warn)', fontWeight: 600 }}>
                              Nuevos <span style={{ fontFamily: 'var(--font-mono)' }}>{r.nuevos}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Derecha: Gráfica de barras apiladas */}
          <div className="card" style={{ padding: '20px 20px 16px' }}>
            <div className="card-head chart-head" style={{ marginBottom: 14 }}>
              <div>
                <h3 className="card-title">{chartTitle}</h3>
                <div className="card-sub">{chartSub}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {mesSeleccionado && (
                  <button
                    onClick={() => setMesSelec(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: 'none', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '4px 10px',
                      fontSize: 12, color: 'var(--muted)', cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ← Ver todo el año
                  </button>
                )}
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {LEGEND.map(({ key, label, color }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <StackedBarChart
              data={chartData.slice().reverse()}
              onBarClick={mesSeleccionado ? null : mes => setMesSelec(mes)}
            />
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
