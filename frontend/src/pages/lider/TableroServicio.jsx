import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { liderProgramarApi, liderPosicionesApi } from '../../services/api';

// "Quién va dónde" (PASO 5, parte 3): vista de TABLERO, SOLO LECTURA. Para una
// fecha, muestra una COLUMNA por cada posición del catálogo del ministerio y,
// debajo, los colaboradores asignados a esa posición. Aparte lista a los que sí
// pueden pero aún no tienen posición. NO asigna ni quita nada (eso vive en
// "Programar servicio"): aquí solo se ve cómo quedó armado el equipo.
// La fecha se elige con un filtro simple (un <select>), no con el calendario de
// tarjetas: esta pantalla es de consulta y debe verse ligera. Reusa los mismos
// endpoints que Programar servicio; no toca el backend.

const NAVY_900   = '#112540';
const ORANGE_500 = '#FF6B2B';
const ORANGE_600 = '#E0561B';
const ORANGE_50  = '#FFF4EE';
const VERDE      = '#15915A';
const VERDE_50   = '#E8F5EF';
const VERDE_700  = '#0F7A49';
const ROJO       = '#D23B36';
const AMBAR_50   = '#FFF7E6';
const AMBAR_600  = '#B7791F';
const GRAY_700   = '#3D4654';
const GRAY_600   = '#5B6675';
const GRAY_500   = '#7A8699';
const GRAY_200   = '#E2E6EC';
const GRAY_100   = '#EEF1F5';
const GRAY_50    = '#F6F7F9';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const CSS = `
.qvd-head{margin-bottom:14px;}
.qvd-h2{font-size:16px;font-weight:800;letter-spacing:-.02em;color:${NAVY_900};margin:0;}
.qvd-h2-note{font-size:12.5px;color:${GRAY_500};margin-top:3px;}

/* Filtro compacto en una sola línea: etiqueta + desplegable de fechas. */
.qvd-filtro{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:14px 0 4px;}
.qvd-filtro-lbl{font-size:12px;font-weight:700;color:${NAVY_900};flex-shrink:0;}
.qvd-filtro-hint{font-size:12.5px;color:${GRAY_500};}
.qvd-select{flex:1;min-width:240px;max-width:440px;padding:9px 12px;border-radius:10px;border:1.5px solid ${GRAY_200};font-size:13.5px;font-weight:600;outline:none;box-sizing:border-box;color:${NAVY_900};font-family:inherit;background:#fff;cursor:pointer;}
.qvd-select:focus{border-color:${NAVY_900};}

.qvd-warn{margin:12px 0;padding:12px 14px;border-radius:12px;background:${ORANGE_50};border:1px solid ${ORANGE_500};color:${GRAY_700};font-size:13px;line-height:1.5;}
.qvd-warn a{color:${ORANGE_600};font-weight:700;text-decoration:none;}
.qvd-error{margin:12px 0;padding:12px 14px;border-radius:12px;background:#FCEBEA;border:1px solid #F3CBC9;color:${ROJO};font-size:13px;font-weight:600;}
.qvd-empty{padding:22px 16px;text-align:center;border:1px dashed ${GRAY_200};border-radius:12px;background:${GRAY_50};}
.qvd-empty-t{font-size:13px;font-weight:700;color:${NAVY_900};}
.qvd-empty-s{font-size:12px;color:${GRAY_500};margin-top:4px;}
.qvd-loading{padding:20px;text-align:center;font-size:13px;color:${GRAY_500};}

.qvd-detalle{margin-top:14px;}
.qvd-detalle-t{font-size:14px;font-weight:800;color:${NAVY_900};margin-bottom:12px;}

/* Tablero: una columna por posición; envuelven a varias filas sin scroll. */
.qvd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;align-items:start;}
.qvd-col{border:1px solid ${GRAY_200};border-radius:14px;background:#fff;padding:12px;display:flex;flex-direction:column;gap:9px;min-width:0;}
.qvd-col-h{display:flex;align-items:flex-start;gap:8px;}
.qvd-col-bar{width:4px;align-self:stretch;border-radius:3px;background:${ORANGE_500};flex-shrink:0;}
.qvd-col-tt{min-width:0;flex:1;}
.qvd-col-nombre{font-size:13px;font-weight:800;color:${NAVY_900};letter-spacing:-.01em;overflow-wrap:anywhere;}
.qvd-col-desc{font-size:11px;color:${GRAY_500};margin-top:2px;line-height:1.35;overflow-wrap:anywhere;}
.qvd-col-count{font-size:10.5px;font-weight:800;color:${GRAY_500};font-variant-numeric:tabular-nums;flex-shrink:0;}

.qvd-cards{display:flex;flex-direction:column;gap:7px;}
.qvd-card{padding:9px 10px;border:1px solid ${GRAY_200};border-radius:10px;background:${GRAY_50};display:flex;align-items:center;gap:9px;min-width:0;}
.qvd-av{width:28px;height:28px;border-radius:8px;background:${GRAY_100};color:${GRAY_600};display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:800;flex-shrink:0;}
.qvd-card-b{min-width:0;flex:1;}
.qvd-card-nombre{font-size:12.5px;font-weight:700;color:${NAVY_900};letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.qvd-conf{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;margin-top:2px;}
.qvd-conf-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
.qvd-sinasig{font-size:11.5px;color:${GRAY_500};font-style:italic;padding:8px 2px;border:1px dashed ${GRAY_200};border-radius:9px;text-align:center;background:${GRAY_50};}

/* Sección aparte: colaboradores disponibles todavía sin posición. */
.qvd-pend{margin-top:16px;border:1px solid #FCE7C3;border-radius:14px;background:${AMBAR_50};padding:13px 14px;}
.qvd-pend-h{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:${AMBAR_600};display:flex;align-items:center;gap:7px;margin-bottom:10px;}
.qvd-pend-dot{width:8px;height:8px;border-radius:50%;background:${AMBAR_600};flex-shrink:0;}
.qvd-pend-wrap{display:flex;flex-wrap:wrap;gap:8px;}
.qvd-pill{display:inline-flex;align-items:center;gap:8px;padding:7px 11px;border:1px solid #FCE7C3;border-radius:999px;background:#fff;min-width:0;}
.qvd-pill-av{width:24px;height:24px;border-radius:7px;background:${AMBAR_50};color:${AMBAR_600};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;}
.qvd-pill-n{font-size:12.5px;font-weight:700;color:${NAVY_900};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.qvd-ok{display:inline-flex;align-items:center;gap:8px;padding:11px 14px;border-radius:12px;background:${VERDE_50};border:1px solid #BFE6D3;color:${VERDE_700};font-size:12.5px;font-weight:700;margin-top:16px;}
`;

// ── Helpers de fecha (aritmética UTC para no correr de día por zona) ──────────
const mesDeHoy = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
};
const sumaMes = (mes, n) => {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const diaDeISO = (iso) => Number(iso.slice(8, 10));
const dowDeISO = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
};
const inicial = (n) => (n || '?').trim().charAt(0).toUpperCase();
// Clave estable de una fecha (fecha + evento, o 'dom' para domingos sin evento).
const claveFecha = (f) => `${f.fecha}|${f.evento_id ?? 'dom'}`;
// Etiqueta legible para el desplegable: "Domingo 26 de julio — Servicio dominical".
const etiquetaFecha = (f) => {
  const base = `${DIAS_LARGO[dowDeISO(f.fecha)]} ${diaDeISO(f.fecha)} de ${MESES[Number(f.fecha.slice(5, 7)) - 1]}`;
  return f.nombre ? `${base} — ${f.nombre}` : base;
};

// Estado de confirmación → color + etiqueta discreta. Sin dato = pendiente.
const CONF = {
  confirmado: { c: VERDE,     t: 'Confirmado' },
  rechazado:  { c: ROJO,      t: 'Rechazado' },
  pendiente:  { c: GRAY_500,  t: 'Pendiente' },
};
const confDe = (estado) => CONF[estado] || CONF.pendiente;

export default function TableroServicio() {
  const [fechas, setFechas] = useState([]);        // varias-meses, ya ordenadas
  const [cargandoFechas, setCargandoFechas] = useState(true);
  const [selKey, setSelKey] = useState(null);      // clave de la fecha elegida
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [posiciones, setPosiciones] = useState([]);
  const [error, setError] = useState('');

  // Catálogo de posiciones del ministerio (una vez), ordenado por orden→nombre.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data } = await liderPosicionesApi.getPosiciones();
        if (vivo) setPosiciones(Array.isArray(data) ? data : []);
      } catch { /* el aviso de "sin posiciones" cubre el caso vacío */ }
    })();
    return () => { vivo = false; };
  }, []);

  // Fechas del mes actual + los 2 siguientes (3 llamadas), juntas y ordenadas.
  // Así el líder consulta cualquier domingo próximo desde el desplegable sin
  // navegar mes por mes. La primera (la más cercana) queda seleccionada.
  useEffect(() => {
    let vivo = true;
    setCargandoFechas(true);
    (async () => {
      const base = mesDeHoy();
      const meses = [base, sumaMes(base, 1), sumaMes(base, 2)];
      const res = await Promise.allSettled(meses.map(m => liderProgramarApi.getFechas(m)));
      if (!vivo) return;
      const juntas = [];
      let algunOk = false;
      for (const r of res) {
        if (r.status === 'fulfilled') {
          algunOk = true;
          const arr = Array.isArray(r.value?.data?.fechas) ? r.value.data.fechas : [];
          juntas.push(...arr);
        }
      }
      if (!algunOk) {
        setError('No se pudieron cargar las fechas');
        setFechas([]);
        setCargandoFechas(false);
        return;
      }
      // Ordena por fecha y de-duplica por clave (por si algún mes se solapa).
      juntas.sort((a, b) => a.fecha.localeCompare(b.fecha) || claveFecha(a).localeCompare(claveFecha(b)));
      const vistos = new Set();
      const unicas = juntas.filter(f => {
        const k = claveFecha(f);
        if (vistos.has(k)) return false;
        vistos.add(k);
        return true;
      });
      setFechas(unicas);
      setSelKey(prev => prev ?? (unicas.length ? claveFecha(unicas[0]) : null));
      setError('');
      setCargandoFechas(false);
    })();
    return () => { vivo = false; };
  }, []);

  const fechaSel = useMemo(
    () => fechas.find(f => claveFecha(f) === selKey) || null,
    [fechas, selKey],
  );

  // Detalle (roster) de la fecha elegida.
  useEffect(() => {
    if (!fechaSel) { setDetalle(null); return; }
    let vivo = true;
    setCargandoDetalle(true);
    (async () => {
      try {
        const { data } = await liderProgramarApi.getDetalle(fechaSel.fecha, fechaSel.evento_id);
        if (!vivo) return;
        setDetalle(data);
        setError('');
      } catch (err) {
        if (vivo) { setError(err.response?.data?.error || 'No se pudo cargar el equipo de esta fecha'); setDetalle(null); }
      } finally {
        if (vivo) setCargandoDetalle(false);
      }
    })();
    return () => { vivo = false; };
  }, [fechaSel]);

  const posOrdenadas = useMemo(
    () => [...posiciones].sort((a, b) => (a.orden - b.orden) || a.nombre.localeCompare(b.nombre)),
    [posiciones],
  );

  // Colaboradores por posición + los disponibles todavía sin posición.
  const { porPosicion, pendientes } = useMemo(() => {
    const vs = detalle?.voluntarios ?? [];
    const porPos = new Map();
    for (const p of posOrdenadas) porPos.set(p.id, []);
    for (const v of vs) {
      if (v.posicion_id != null && porPos.has(v.posicion_id)) porPos.get(v.posicion_id).push(v);
    }
    const pend = vs.filter(v => v.disponibilidad === 'disponible' && v.posicion_id == null);
    return { porPosicion: porPos, pendientes: pend };
  }, [detalle, posOrdenadas]);

  const sinPosiciones = posiciones.length === 0;
  const hayRoster = Boolean(detalle && detalle.voluntarios.length > 0);

  return (
    <div>
      <style>{CSS}</style>

      <div className="qvd-head">
        <h2 className="qvd-h2">Quién va dónde</h2>
        <div className="qvd-h2-note">
          Vista del equipo por posición para una fecha. Solo lectura: para asignar usa “Programar servicio”.
        </div>
      </div>

      {sinPosiciones && (
        <div className="qvd-warn">
          Primero crea las posiciones de tu ministerio en la pestaña{' '}
          <Link to="/lider_ministerio/posiciones">Posiciones</Link>.
        </div>
      )}

      {/* Filtro simple: desplegable con las fechas próximas (varios meses). */}
      <div className="qvd-filtro">
        <label className="qvd-filtro-lbl" htmlFor="qvd-fecha">Fecha</label>
        {cargandoFechas ? (
          <span className="qvd-filtro-hint">Cargando fechas…</span>
        ) : fechas.length === 0 ? (
          <span className="qvd-filtro-hint">No hay fechas próximas donde sirva tu ministerio.</span>
        ) : (
          <select
            id="qvd-fecha"
            className="qvd-select"
            value={selKey ?? ''}
            onChange={(e) => setSelKey(e.target.value)}
          >
            {fechas.map(f => (
              <option key={claveFecha(f)} value={claveFecha(f)}>{etiquetaFecha(f)}</option>
            ))}
          </select>
        )}
      </div>

      {error && <div className="qvd-error">{error}</div>}

      {fechaSel && (
        <div className="qvd-detalle">
          <div className="qvd-detalle-t">
            {fechaSel.nombre} · {diaDeISO(fechaSel.fecha)} {MESES[Number(fechaSel.fecha.slice(5, 7)) - 1]}
          </div>

          {cargandoDetalle ? (
            <div className="qvd-loading">Cargando equipo…</div>
          ) : sinPosiciones ? (
            <div className="qvd-empty">
              <div className="qvd-empty-t">Aún no hay posiciones en tu ministerio</div>
              <div className="qvd-empty-s">Créalas en “Posiciones” para armar el tablero.</div>
            </div>
          ) : !hayRoster ? (
            <div className="qvd-empty">
              <div className="qvd-empty-t">Todavía no tienes voluntarios en este ministerio</div>
              <div className="qvd-empty-s">Da de alta a tu equipo en “Mis voluntarios”.</div>
            </div>
          ) : (
            <>
              {/* Tablero: una columna por posición del catálogo. */}
              <div className="qvd-grid">
                {posOrdenadas.map((p) => {
                  const asignados = porPosicion.get(p.id) || [];
                  return (
                    <div key={p.id} className="qvd-col">
                      <div className="qvd-col-h">
                        <span className="qvd-col-bar" />
                        <div className="qvd-col-tt">
                          <div className="qvd-col-nombre">{p.nombre}</div>
                          {p.descripcion && <div className="qvd-col-desc">{p.descripcion}</div>}
                        </div>
                        <span className="qvd-col-count">{asignados.length}</span>
                      </div>
                      {asignados.length === 0 ? (
                        <div className="qvd-sinasig">Sin asignar</div>
                      ) : (
                        <div className="qvd-cards">
                          {asignados.map((v) => {
                            const conf = confDe(v.estado_confirmacion);
                            return (
                              <div key={v.voluntario_id} className="qvd-card">
                                <div className="qvd-av">{inicial(v.apodo || v.nombre)}</div>
                                <div className="qvd-card-b">
                                  <div className="qvd-card-nombre" title={v.nombre}>{v.apodo || v.nombre}</div>
                                  <span className="qvd-conf" style={{ color: conf.c }}>
                                    <span className="qvd-conf-dot" style={{ background: conf.c }} />{conf.t}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Sección aparte: disponibles todavía sin posición asignada. */}
              {pendientes.length > 0 ? (
                <div className="qvd-pend">
                  <div className="qvd-pend-h">
                    <span className="qvd-pend-dot" />
                    Sin posición asignada ({pendientes.length})
                  </div>
                  <div className="qvd-pend-wrap">
                    {pendientes.map((v) => (
                      <span key={v.voluntario_id} className="qvd-pill" title={v.nombre}>
                        <span className="qvd-pill-av">{inicial(v.apodo || v.nombre)}</span>
                        <span className="qvd-pill-n">{v.apodo || v.nombre}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="qvd-ok">
                  ✓ Todos los colaboradores disponibles ya tienen posición.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
