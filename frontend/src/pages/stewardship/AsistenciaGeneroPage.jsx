import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { asistenciaApi } from '../../services/api';
import { fmtFecha, fmtFechaShort, hoyMexico } from '../../utils/fecha';
import { temaCampus } from '../../theme/campusTema';
import { useIsMobile } from '../../utils/useIsMobile';
import { I } from '../../components/Icons';

// ─────────────────────────────────────────────────────────────────────────────
// Asistencia por género. Lee el desglose <categoria>_h / <categoria>_m que se
// captura en el modal de Registrar Asistencia. Solo cuenta los domingos que SÍ
// tienen desglose (adultos_h no nulo); los registros viejos lo tienen en NULL y
// quedan fuera de todos los cálculos.
//
// Los NUEVOS no suman: ya vienen contados dentro de adultos. Se muestran como
// dato informativo y nunca entran en totales ni porcentajes.
// ─────────────────────────────────────────────────────────────────────────────

// Fijos en los 3 campus para que las gráficas se lean igual en ags/gdl/mid.
const HOMBRES = '#2E6FB7';
const MUJERES = '#D96BA0';

// Categorías que suman al total (nuevos va aparte, ver arriba).
const CATEGORIAS = [
  { key: 'adultos',     label: 'Adultos'     },
  { key: 'voluntarios', label: 'Voluntarios' },
  { key: 'ninos',       label: 'Niños'       },
  { key: 'bebes',       label: 'Bebés'       },
];

const suma = (r, sufijo) => CATEGORIAS.reduce((acc, c) => acc + (r[`${c.key}_${sufijo}`] || 0), 0);
const pctDe = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0);

const campusActivo = () =>
  (typeof localStorage !== 'undefined' && localStorage.getItem('campus_activo')) || 'ags';

const CSS = `
.ag-shell{ display:flex; flex-direction:column; gap:14px; }
.ag-card{
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--r-lg); padding:16px 18px; box-shadow:var(--shadow-sm);
}
.ag-head{ display:flex; align-items:baseline; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:14px; }
.ag-title{ font-size:14px; font-weight:700; color:var(--ink); margin:0; }
.ag-sub{ font-size:12px; color:var(--muted); margin:2px 0 0; }

.ag-kpis{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
.ag-kpi{ border-radius:var(--r-lg); padding:16px 18px; border:1px solid var(--border); background:var(--surface); }
.ag-kpi-lbl{ font-size:10.5px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:var(--muted); }
.ag-kpi-val{ font-family:var(--font-display); font-size:30px; font-weight:700; letter-spacing:-.03em; line-height:1.05; margin-top:6px; font-variant-numeric:tabular-nums; }
.ag-kpi-pct{ font-size:12px; font-weight:600; color:var(--muted); margin-top:4px; }
.ag-kpi-fecha{ font-size:15px; font-weight:700; color:var(--ink); margin-top:8px; line-height:1.3; }

.ag-tabla{ width:100%; border-collapse:separate; border-spacing:0; font-size:13px; }
.ag-tabla th{
  text-align:right; font-size:10.5px; letter-spacing:.07em; text-transform:uppercase;
  color:var(--muted); font-weight:700; padding:10px 14px; border-bottom:1px solid var(--border);
}
.ag-tabla th:first-child, .ag-tabla td:first-child{ text-align:left; }
.ag-tabla td{ text-align:right; padding:11px 14px; border-bottom:1px solid var(--border); font-variant-numeric:tabular-nums; }
.ag-tabla tr:last-child td{ border-bottom:none; }
.ag-cat{ font-weight:600; color:var(--ink); }
.ag-tot td{ font-weight:700; color:var(--ink); background:var(--surface-2); }
.ag-info td{ color:var(--muted); }
.ag-nota{ font-size:11.5px; color:var(--muted); margin:10px 0 0; }

.ag-resumen{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.ag-barra{ display:flex; height:10px; border-radius:99px; overflow:hidden; margin-top:12px; background:var(--surface-3); }

/* Historial: la misma barra de proporción, pero dentro de una fila. */
.ag-barra-fila{ margin-top:0; height:8px; width:110px; flex:none; }
.ag-prop{ display:flex; align-items:center; gap:10px; justify-content:flex-end; }
.ag-prop-pct{ font-size:11.5px; font-weight:600; color:var(--muted); white-space:nowrap; }

/* Historial: encabezado de dos niveles (grupo arriba, H/M debajo). El
   text-align a la izquierda de .ag-tabla th:first-child solo debe aplicar a
   la primera columna real, no al "H" que abre el segundo renglón. */
.ag-tabla th.ag-grupo{ text-align:center; border-bottom:none; padding-bottom:2px; }
.ag-tabla th.ag-hm{ text-align:right; padding-top:2px; }
.ag-hist-h{ color:#2E6FB7; }
.ag-hist-m{ color:#D96BA0; }

/* Historial en móvil: una tarjeta por domingo, sin scroll horizontal. */
.ag-hist-cards{ display:flex; flex-direction:column; gap:10px; }
.ag-hist-card{ border:1px solid var(--border); border-radius:var(--r-md); padding:12px 14px; }
.ag-hist-fecha{ font-size:13px; font-weight:700; color:var(--ink); }
.ag-hist-nums{ display:flex; gap:14px; flex-wrap:wrap; font-size:12px; color:var(--muted); margin:8px 0 10px; font-variant-numeric:tabular-nums; }
.ag-hist-nums b{ font-weight:700; }
.ag-hist-grupos{ display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin:10px 0; }
.ag-hist-grupo{ background:var(--surface-2); border-radius:var(--r-sm,8px); padding:7px 8px; }
.ag-hist-grupo-lbl{ font-size:9.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
.ag-hist-grupo-val{ font-size:13px; font-weight:700; margin-top:3px; font-variant-numeric:tabular-nums; }
.ag-hist-grupo-val span{ font-size:9.5px; font-weight:600; }
.ag-hist-total{ font-size:12px; color:var(--muted); font-variant-numeric:tabular-nums; }
.ag-hist-total b{ color:var(--ink); font-weight:700; }
.ag-hist-card .ag-barra-fila{ width:auto; flex:1; }

.ag-vacio{ text-align:center; padding:40px 20px; }
.ag-vacio-icono{
  width:52px; height:52px; border-radius:50%; margin:0 auto 14px;
  display:flex; align-items:center; justify-content:center;
  background:var(--surface-3); color:var(--muted);
}
.ag-vacio h3{ font-size:15px; font-weight:700; color:var(--ink); margin:0 0 6px; }
.ag-vacio p{ font-size:13px; color:var(--muted); margin:0 auto; max-width:420px; line-height:1.5; }

@media(max-width:760px){
  .ag-kpis{ grid-template-columns:1fr 1fr; }
  .ag-resumen{ grid-template-columns:1fr; }
  /* Que las 4 columnas quepan sin cortar el total. */
  .ag-tabla{ font-size:12.5px; }
  .ag-tabla th, .ag-tabla td{ padding:10px 8px; }
  .ag-tabla th:first-child, .ag-tabla td:first-child{ padding-left:2px; }
  .ag-tabla th:last-child, .ag-tabla td:last-child{ padding-right:2px; }
}
`;

function Vacio({ registrados, year }) {
  return (
    <div className="ag-card ag-vacio">
      <div className="ag-vacio-icono"><I.users size={22} /></div>
      <h3>Aún no hay registros con desglose por género</h3>
      <p>
        Empieza a capturarlo en Registrar Asistencia: cada domingo que se registre con
        hombres y mujeres aparecerá aquí.
      </p>
      <p style={{ marginTop: 10 }}>
        Basado en 0 de {registrados} {registrados === 1 ? 'domingo registrado' : 'domingos registrados'} en {year}.
      </p>
    </div>
  );
}

export default function AsistenciaGeneroPage() {
  const isMobile = useIsMobile();
  const tema     = temaCampus(campusActivo());
  const year     = Number(hoyMexico().slice(0, 4));

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await asistenciaApi.getAll({ year, limit: 200 });
      // Fecha a string y orden descendente, igual que en Asistencia, para que
      // ningún .slice/.localeCompare truene con un timestamp o un nulo.
      const rows = (Array.isArray(data) ? data : [])
        .map(r => ({ ...r, fecha: (r?.fecha || '').slice(0, 10) }))
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
      setRecords(rows);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const h = () => load();
    window.addEventListener('asistencia-saved', h);
    return () => window.removeEventListener('asistencia-saved', h);
  }, [load]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
        Cargando…
      </div>
    );
  }

  // Solo domingos con desglose capturado.
  const conDesglose = records.filter(r => r.adultos_h != null);

  if (conDesglose.length === 0) {
    return (
      <div className="ag-shell">
        <style>{CSS}</style>
        <Vacio registrados={records.length} year={year} />
      </div>
    );
  }

  // ── Último domingo con desglose ─────────────────────────────────────────
  const ultimo   = conDesglose[0];
  const uHombres = suma(ultimo, 'h');
  const uMujeres = suma(ultimo, 'm');
  const uTotal   = uHombres + uMujeres;
  const uPctH    = pctDe(uHombres, uTotal);
  const uPctM    = uTotal > 0 ? 100 - uPctH : 0;

  // ── Acumulado del año (solo domingos con desglose) ──────────────────────
  const aHombres = conDesglose.reduce((s, r) => s + suma(r, 'h'), 0);
  const aMujeres = conDesglose.reduce((s, r) => s + suma(r, 'm'), 0);
  const aTotal   = aHombres + aMujeres;
  const aPctH    = pctDe(aHombres, aTotal);
  const aPctM    = aTotal > 0 ? 100 - aPctH : 0;

  // ── Historial: descendente por fecha (conDesglose ya viene así) ─────────
  // En esta tabla los voluntarios se funden dentro de adultos: no llevan
  // columna propia. El total es el mismo de siempre (sin nuevos).
  const historial = conDesglose.map(r => {
    const grupos = [
      { key: 'adultos', label: 'Adultos', h: (r.adultos_h || 0) + (r.voluntarios_h || 0),
                                          m: (r.adultos_m || 0) + (r.voluntarios_m || 0) },
      { key: 'ninos',   label: 'Niños',   h: r.ninos_h || 0, m: r.ninos_m || 0 },
      { key: 'bebes',   label: 'Bebés',   h: r.bebes_h || 0, m: r.bebes_m || 0 },
    ];
    const h = suma(r, 'h');
    const m = suma(r, 'm');
    const t = h + m;
    const pctH = pctDe(h, t);
    return { fecha: r.fecha, grupos, h, m, t, pctH, pctM: t > 0 ? 100 - pctH : 0 };
  });

  // ── Tendencia: ascendente por fecha ─────────────────────────────────────
  const datosGrafica = [...conDesglose].reverse().map(r => ({
    fecha:   fmtFechaShort(r.fecha),
    Hombres: suma(r, 'h'),
    Mujeres: suma(r, 'm'),
  }));

  const kpis = [
    { lbl: 'Hombres', val: uHombres, pct: `${uPctH}% del domingo`, color: HOMBRES },
    { lbl: 'Mujeres', val: uMujeres, pct: `${uPctM}% del domingo`, color: MUJERES },
    { lbl: 'Total del domingo', val: uTotal, pct: 'Sin contar nuevos', color: tema.primary },
  ];

  return (
    <div className="ag-shell">
      <style>{CSS}</style>

      {/* ── Último domingo con desglose ──────────────────────────────────── */}
      <div className="ag-kpis">
        {kpis.map(k => (
          <div className="ag-kpi" key={k.lbl}>
            <div className="ag-kpi-lbl">{k.lbl}</div>
            <div className="ag-kpi-val" style={{ color: k.color }}>{k.val}</div>
            <div className="ag-kpi-pct">{k.pct}</div>
          </div>
        ))}
        <div className="ag-kpi" style={{ borderColor: tema.accent }}>
          <div className="ag-kpi-lbl">Domingo</div>
          <div className="ag-kpi-fecha">{fmtFecha(ultimo.fecha)}</div>
          <div className="ag-kpi-pct" style={{ marginTop: 6 }}>Último con desglose</div>
        </div>
      </div>

      {/* ── Desglose por categoría ───────────────────────────────────────── */}
      <div className="ag-card">
        <div className="ag-head">
          <div>
            <h3 className="ag-title">Desglose por categoría</h3>
            <p className="ag-sub">{fmtFecha(ultimo.fecha)}</p>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="ag-tabla">
            <thead>
              <tr>
                <th>Categoría</th><th>Hombres</th><th>Mujeres</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIAS.map(c => {
                const h = ultimo[`${c.key}_h`] || 0;
                const m = ultimo[`${c.key}_m`] || 0;
                return (
                  <tr key={c.key}>
                    <td className="ag-cat">{c.label}</td>
                    <td>{h}</td>
                    <td>{m}</td>
                    <td>{h + m}</td>
                  </tr>
                );
              })}
              <tr className="ag-tot">
                <td>Total</td>
                <td>{uHombres}</td>
                <td>{uMujeres}</td>
                <td>{uTotal}</td>
              </tr>
              <tr className="ag-info">
                <td className="ag-cat" style={{ color: 'var(--muted)' }}>
                  Nuevos <span style={{ fontWeight: 500 }}>· informativo</span>
                </td>
                <td>{ultimo.nuevos_h || 0}</td>
                <td>{ultimo.nuevos_m || 0}</td>
                <td>{(ultimo.nuevos_h || 0) + (ultimo.nuevos_m || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="ag-nota">Los nuevos ya están incluidos en Adultos.</p>
      </div>

      {/* ── Tendencia por domingo ────────────────────────────────────────── */}
      <div className="ag-card">
        <div className="ag-head">
          <div>
            <h3 className="ag-title">Tendencia por domingo</h3>
            <p className="ag-sub">
              {conDesglose.length} {conDesglose.length === 1 ? 'domingo' : 'domingos'} con desglose en {year}
            </p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={isMobile ? 240 : 300}>
          <BarChart data={datosGrafica} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              contentStyle={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Hombres" stackId="g" fill={HOMBRES} maxBarSize={56} />
            <Bar dataKey="Mujeres" stackId="g" fill={MUJERES} maxBarSize={56} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Resumen del año ──────────────────────────────────────────────── */}
      <div className="ag-card">
        <div className="ag-head">
          <div>
            <h3 className="ag-title">Resumen del año {year}</h3>
            <p className="ag-sub">Acumulado de los domingos con desglose</p>
          </div>
        </div>
        <div className="ag-resumen">
          <div className="ag-kpi" style={{ borderColor: HOMBRES }}>
            <div className="ag-kpi-lbl">Hombres</div>
            <div className="ag-kpi-val" style={{ color: HOMBRES }}>{aHombres}</div>
            <div className="ag-kpi-pct">{aPctH}% del acumulado</div>
          </div>
          <div className="ag-kpi" style={{ borderColor: MUJERES }}>
            <div className="ag-kpi-lbl">Mujeres</div>
            <div className="ag-kpi-val" style={{ color: MUJERES }}>{aMujeres}</div>
            <div className="ag-kpi-pct">{aPctM}% del acumulado</div>
          </div>
        </div>
        <div className="ag-barra" role="presentation">
          <span style={{ width: `${aPctH}%`, background: HOMBRES }} />
          <span style={{ width: `${aPctM}%`, background: MUJERES }} />
        </div>
        <p className="ag-nota">
          Basado en {conDesglose.length} de {records.length} {records.length === 1 ? 'domingo registrado' : 'domingos registrados'}.
          Los nuevos no entran en el total ni en los porcentajes: ya están incluidos en Adultos.
        </p>
      </div>

      {/* ── Historial de domingos ────────────────────────────────────────── */}
      <div className="ag-card">
        <div className="ag-head">
          <div>
            <h3 className="ag-title">Historial de domingos con desglose</h3>
            <p className="ag-sub">Del más reciente al más antiguo</p>
          </div>
        </div>

        {/* En móvil la fila no cabe en cuatro columnas más la barra: se
            colapsa a una tarjeta por domingo en vez de scroll horizontal. */}
        {isMobile ? (
          <div className="ag-hist-cards">
            {historial.map(d => (
              <div className="ag-hist-card" key={d.fecha}>
                <div className="ag-hist-fecha">{fmtFecha(d.fecha)}</div>
                <div className="ag-hist-grupos">
                  {d.grupos.map(g => (
                    <div className="ag-hist-grupo" key={g.key}>
                      <div className="ag-hist-grupo-lbl">{g.label}</div>
                      <div className="ag-hist-grupo-val">
                        <span className="ag-hist-h">H</span>{' '}
                        <span className="ag-hist-h">{g.h}</span>
                        {'  '}
                        <span className="ag-hist-m">M</span>{' '}
                        <span className="ag-hist-m">{g.m}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="ag-hist-total" style={{ marginBottom: 10 }}>
                  Total <b>{d.t}</b>
                </div>
                <div className="ag-prop">
                  <div className="ag-barra ag-barra-fila" role="presentation">
                    <span style={{ width: `${d.pctH}%`, background: HOMBRES }} />
                    <span style={{ width: `${d.pctM}%`, background: MUJERES }} />
                  </div>
                  <span className="ag-prop-pct">{d.pctH}% / {d.pctM}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="ag-tabla">
            <thead>
              <tr>
                <th rowSpan={2}>Fecha</th>
                <th className="ag-grupo" colSpan={2}>Adultos</th>
                <th className="ag-grupo" colSpan={2}>Niños</th>
                <th className="ag-grupo" colSpan={2}>Bebés</th>
                <th rowSpan={2}>Total</th>
                <th rowSpan={2}>Proporción</th>
              </tr>
              <tr>
                <th className="ag-hm ag-hist-h">H</th><th className="ag-hm ag-hist-m">M</th>
                <th className="ag-hm ag-hist-h">H</th><th className="ag-hm ag-hist-m">M</th>
                <th className="ag-hm ag-hist-h">H</th><th className="ag-hm ag-hist-m">M</th>
              </tr>
            </thead>
            <tbody>
              {historial.map(d => (
                <tr key={d.fecha}>
                  <td className="ag-cat">{fmtFecha(d.fecha)}</td>
                  {d.grupos.map(g => [
                    <td className="ag-hist-h" key={`${g.key}-h`}>{g.h}</td>,
                    <td className="ag-hist-m" key={`${g.key}-m`}>{g.m}</td>,
                  ])}
                  <td style={{ fontWeight: 700 }}>{d.t}</td>
                  <td>
                    <div className="ag-prop">
                      <div className="ag-barra ag-barra-fila" role="presentation">
                        <span style={{ width: `${d.pctH}%`, background: HOMBRES }} />
                        <span style={{ width: `${d.pctM}%`, background: MUJERES }} />
                      </div>
                      <span className="ag-prop-pct">{d.pctH}% / {d.pctM}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
