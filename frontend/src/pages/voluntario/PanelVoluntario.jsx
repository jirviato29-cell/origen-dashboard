import { useEffect, useMemo, useRef, useState } from 'react';
import { voluntarioDisponibilidadApi } from '../../services/api';

// Calendario de disponibilidad del voluntario en vista dividida:
//   izquierda: grid del mes (con puntos de color por evento)
//   derecha:   lista vertical del mes (domingos + eventos, ordenados)
// El bloqueo (1 dia antes) y la resolucion de campus/ministerio los decide el
// backend; aqui solo se pinta. Nunca se confia en `bloqueado` ni `puede_marcar`
// para autorizar: el POST se revalida en el servidor.

const NAVY_900   = '#112540';
const NAVY_300   = '#9CB0CC';
const ORANGE_500 = '#FF6B2B';
const VERDE      = '#15915A';
const VERDE_50   = '#E8F5EF';
const ROJO       = '#D23B36';
const ROJO_50    = '#FCEBEA';
const GRAY_600   = '#5B6675';
const GRAY_500   = '#7A8699';
const GRAY_200   = '#E2E6EC';
const GRAY_100   = '#EEF1F5';
const GRAY_50    = '#F6F7F9';

const DIAS_SEM       = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_SEM_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const CSS = `
.pv-shell{max-width:1200px;margin:0 auto;padding:8px 20px 40px;font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;
  display:grid;grid-template-columns:1.5fr 1fr;gap:20px;align-items:start;}
@media (max-width: 900px){.pv-shell{grid-template-columns:1fr;padding:6px 14px 32px;gap:16px;}}

.pv-card{background:#fff;border-radius:18px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.06);border:1px solid ${GRAY_200};}
.pv-lista-card{min-width:0;}

.pv-nav{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;}
.pv-mes{font-size:18px;font-weight:800;color:${NAVY_900};letter-spacing:-.02em;text-transform:capitalize;}
.pv-mes-sub{font-size:12px;color:${GRAY_500};margin-top:2px;}
.pv-flecha{width:36px;height:36px;border-radius:10px;border:1px solid ${GRAY_200};background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;}

.pv-sem{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-bottom:5px;}
.pv-sem-d{text-align:center;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${GRAY_500};padding:3px 0;}
.pv-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;grid-auto-rows:minmax(64px,auto);}
.pv-celda{border-radius:10px;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;position:relative;font-size:13px;padding:5px 5px 6px;overflow:hidden;gap:3px;text-align:left;}
.pv-vacia{background:transparent;border:none;min-height:0;padding:0;}
.pv-apagado{color:${NAVY_300};background:${GRAY_50};}
.pv-celda-head{display:flex;align-items:center;justify-content:space-between;gap:4px;width:100%;line-height:1;}
.pv-num-badge{display:inline-flex;align-items:center;justify-content:center;min-width:21px;height:21px;padding:0 5px;border-radius:6px;font-size:12.5px;font-weight:800;line-height:1;flex-shrink:0;font-variant-numeric:tabular-nums;}
.pv-num-badge-hoy{background:${ORANGE_500};color:#fff;}
.pv-candado{font-size:11.5px;opacity:.85;line-height:1;}
.pv-pills{display:flex;flex-direction:column;gap:3px;width:100%;}
.pv-pill{font-size:12px;font-weight:700;line-height:1.2;padding:3px 6px 3px 7px;border-radius:5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.005em;text-align:left;border-left:3px solid transparent;word-break:break-word;overflow-wrap:anywhere;}
@media (max-width: 640px){
  .pv-card{padding:12px;}
  .pv-sem{gap:4px;}
  .pv-grid{gap:4px;grid-auto-rows:minmax(58px,auto);}
  .pv-celda{padding:4px 4px 5px;border-radius:9px;gap:2px;}
  .pv-num-badge{min-width:19px;height:19px;padding:0 4px;font-size:11.5px;border-radius:5px;}
  .pv-pill{font-size:10.5px;padding:2px 4px 2px 5px;line-height:1.18;}
  .pv-pills{gap:2px;}
  .pv-mes{font-size:16px;}
}

.pv-leyenda{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:14px;padding-top:12px;border-top:1px solid ${GRAY_100};}
.pv-leyenda-i{display:flex;align-items:center;gap:6px;font-size:11.5px;color:${GRAY_500};font-weight:600;}
.pv-leyenda-c{width:10px;height:10px;border-radius:3px;flex-shrink:0;}

.pv-right-title{font-size:15px;font-weight:800;color:${NAVY_900};letter-spacing:-.02em;margin:0 0 4px;}
.pv-right-sub{font-size:12.5px;color:${GRAY_500};margin-bottom:10px;}

.pv-item{display:flex;gap:14px;padding:14px 12px;border-radius:14px;border:1.5px solid ${GRAY_200};margin-top:10px;background:#fff;align-items:center;transition:box-shadow .15s,border-color .15s;}
.pv-item:first-of-type{margin-top:0;}
.pv-item-sel{border-color:${ORANGE_500};box-shadow:0 0 0 2px rgba(255,107,43,.15);}
.pv-item-bloq{background:${GRAY_50};opacity:.85;}

.pv-fecha-box{display:flex;flex-direction:column;align-items:center;justify-content:center;width:56px;height:60px;background:${GRAY_50};border-radius:11px;border:1px solid ${GRAY_200};flex-shrink:0;}
.pv-fecha-num{font-size:22px;font-weight:800;color:${NAVY_900};line-height:1;font-variant-numeric:tabular-nums;}
.pv-fecha-dow{font-size:10px;font-weight:700;text-transform:uppercase;color:${GRAY_500};letter-spacing:.05em;margin-top:3px;}

.pv-body{flex:1;min-width:0;}
.pv-body-title{font-size:15.5px;font-weight:700;color:${NAVY_900};line-height:1.25;}
.pv-body-meta{display:flex;align-items:center;gap:7px;margin-top:5px;flex-wrap:wrap;}
.pv-tipo-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;border:1px solid rgba(0,0,0,.08);}
.pv-tipo-txt{font-size:12.5px;color:${GRAY_600};font-weight:600;}
.pv-chip-info{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:5px;background:${GRAY_100};color:${GRAY_600};}
.pv-chip-lock{font-size:12px;color:${GRAY_500};font-weight:600;}

.pv-acciones{display:flex;gap:8px;flex-shrink:0;}
@media (max-width:520px){
  .pv-item{flex-wrap:wrap;}
  .pv-acciones{width:100%;margin-top:4px;}
}

.pv-error{margin-top:12px;padding:12px 14px;border-radius:12px;background:${ROJO_50};border:1px solid #F3CBC9;color:${ROJO};font-size:13px;font-weight:600;}
.pv-cargando{padding:26px 10px;text-align:center;font-size:13px;color:${GRAY_500};}
.pv-vacio{padding:22px 10px;text-align:center;font-size:13px;color:${GRAY_500};}
.pv-nota{margin-top:12px;text-align:center;font-size:12.5px;color:${GRAY_500};}
`;

// index.css:106 tiene `.app button { font: inherit; color: inherit; }`. Los
// colores/tipografia de los botones van inline para que una regla global no los pise.
const FUENTE_BTN = {
  fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  fontWeight: 700,
};

const estiloAccion = (activo, color, colorSuave, habilitado) => ({
  ...FUENTE_BTN,
  fontSize: 15,
  padding: '11px 16px',
  minWidth: 96,
  borderRadius: 12,
  border: '1.5px solid',
  cursor: habilitado ? 'pointer' : 'not-allowed',
  backgroundColor: activo ? color : (habilitado ? '#fff' : GRAY_100),
  borderColor:     activo ? color : (habilitado ? colorSuave : GRAY_200),
  color:           activo ? '#fff' : (habilitado ? color : GRAY_500),
  transition: 'background .12s,color .12s,border-color .12s',
});

const estiloFlecha = (habilitada) => ({
  ...FUENTE_BTN,
  fontSize: 17,
  color: habilitada ? NAVY_900 : GRAY_200,
  cursor: habilitada ? 'pointer' : 'not-allowed',
});

// ── Helpers de mes ───────────────────────────────────────────────────────────
// Aritmetica sobre 'YYYY-MM' en UTC: nunca construimos fechas locales que se
// correrian de dia segun la zona del navegador.
const mesDeHoy = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
};
const sumaMes = (mes, n) => {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const tituloMes = (mes) => {
  const [a, m] = mes.split('-').map(Number);
  return `${MESES[m - 1]} ${a}`;
};
const diaDeISO = (iso) => Number(iso.slice(8, 10));
const diaSemanaISO = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
};

// Color por defecto para eventos sin tipo_color (tipo no registrado en tipos_evento).
const COLOR_EVENTO_DEFAULT = ORANGE_500;

// El backend manda tipo_color como un hex saturado por evento. Para el
// fondo del pill necesitamos una version pastel OPACA (no rgba con alpha):
// si fuese translucida se veria mezclada con el fondo verde/rojo del
// domingo con estado. Precalculamos la mezcla lineal con blanco y
// devolvemos rgb solido. Acepta '#RGB' y '#RRGGBB'.
function tintePastel(hex, peso) {
  if (typeof hex !== 'string') return '#EEEEEE';
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return '#EEEEEE';
  const n = parseInt(h, 16);
  const R = (n >> 16) & 255, G = (n >> 8) & 255, B = n & 255;
  const mix = (v) => Math.round(255 - (255 - v) * peso);
  return `rgb(${mix(R)},${mix(G)},${mix(B)})`;
}

export default function PanelVoluntario() {
  const [mes,      setMes]      = useState(mesDeHoy);
  const [data,     setData]     = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState('');
  const [sel,      setSel]      = useState(null);   // fecha 'YYYY-MM-DD' seleccionada en el grid
  const [enviando, setEnviando] = useState(null);   // clave del item que se envia
  const [recarga,  setRecarga]  = useState(0);      // fuerza refetch del mes actual

  // Refs de items del listado para hacer scrollIntoView al tocar un dia del grid.
  const itemRefs = useRef({});

  // La carga vive dentro del efecto y los setState ocurren despues del await:
  // llamarlos de forma sincrona desde un efecto encadena renders. El
  // "cargando" lo enciende quien dispara la accion (ver irAMes).
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data: d } = await voluntarioDisponibilidadApi.getMes(mes);
        if (vivo) { setData(d); setError(''); }
      } catch (err) {
        if (vivo) {
          setError(err.response?.data?.error || 'No se pudo cargar tu calendario');
          setData(null);
        }
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, [mes, recarga]);

  const irAMes = (n) => {
    setCargando(true);
    setMes(m => sumaMes(m, n));
    setSel(null);
  };

  const dias = data?.dias ?? [];

  // Los items del listado, en orden cronologico y SOLO fechas de hoy en
  // adelante. El backend manda `data.hoy` como 'YYYY-MM-DD' en zona Mexico;
  // la comparacion de strings ISO es cronologicamente correcta y evita
  // corrimientos de zona. El calendario de la izquierda NO usa este filtro:
  // sigue mostrando el mes completo.
  const hoyISO = data?.hoy ?? '';
  const listado = useMemo(() =>
    [...dias]
      .filter(d => !hoyISO || d.fecha >= hoyISO)
      .sort((a, b) =>
        a.fecha === b.fecha
          ? (a.tipo === 'domingo' ? -1 : 1)
          : (a.fecha < b.fecha ? -1 : 1)
      ),
    [dias, hoyISO]
  );

  // Los items marcables/informativos de una fecha (un domingo con evento tiene dos).
  const itemsDe = (fecha) => dias.filter(d => d.fecha === fecha);

  // Toca un dia del grid: lo marca como seleccionado y scrollea el primer item
  // de esa fecha en la lista para que quede visible sin buscar.
  function tocarDia(fecha) {
    const items = itemsDe(fecha);
    if (items.length === 0) return;
    setSel(fecha);
    const key = claveItem(items[0]);
    const el = itemRefs.current[key];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function marcar(item, estado) {
    const clave = claveItem(item);
    setEnviando(clave);
    setError('');
    try {
      await voluntarioDisponibilidadApi.marcar({
        fecha: item.fecha,
        evento_id: item.evento_id,
        estado,
      });
      // Refleja el cambio local sin recargar todo el mes.
      setData(d => ({
        ...d,
        dias: d.dias.map(x =>
          x.fecha === item.fecha && x.evento_id === item.evento_id ? { ...x, estado } : x
        ),
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar tu respuesta');
      // Si el servidor dice que ya cerro, el mes local esta viejo: recarga.
      if (err.response?.status === 403) { setCargando(true); setRecarga(n => n + 1); }
    } finally {
      setEnviando(null);
    }
  }

  // ── Celdas del grid ────────────────────────────────────────────────────────
  const celdas = [];
  if (data) {
    for (let i = 0; i < data.diaSemanaPrimero; i++) celdas.push(null);
    for (let d = 1; d <= data.diasEnMes; d++) {
      celdas.push(`${data.mes}-${String(d).padStart(2, '0')}`);
    }
  }

  const estiloCelda = (items) => {
    // El color de la celda lo manda el domingo si lo hay; si no, el evento.
    const principal = items.find(m => m.tipo === 'domingo') ?? items[0];
    const bloqueado = items.every(m => m.bloqueado);
    const base = { cursor: 'pointer', border: '1.5px solid' };
    if (principal.estado === 'disponible') {
      return { ...base, backgroundColor: bloqueado ? VERDE_50 : VERDE, borderColor: VERDE,
               color: bloqueado ? VERDE : '#fff', opacity: bloqueado ? .7 : 1 };
    }
    if (principal.estado === 'no_disponible') {
      return { ...base, backgroundColor: bloqueado ? ROJO_50 : ROJO, borderColor: ROJO,
               color: bloqueado ? ROJO : '#fff', opacity: bloqueado ? .7 : 1 };
    }
    return { ...base, backgroundColor: '#fff', borderColor: bloqueado ? GRAY_200 : NAVY_900,
             color: NAVY_900, opacity: bloqueado ? .55 : 1 };
  };

  return (
    <>
      <style>{CSS}</style>

      <div className="pv-shell">

        {/* ── Columna izquierda: calendario (flexible, ancho) ──────────── */}
        <div>
          <div className="pv-card">
            <div className="pv-nav">
              <button className="pv-flecha" style={estiloFlecha(true)}
                onClick={() => irAMes(-1)} aria-label="Mes anterior">‹</button>
              <div style={{ textAlign: 'center' }}>
                <div className="pv-mes">{tituloMes(mes)}</div>
                <div className="pv-mes-sub">Toca un día para verlo en la lista</div>
              </div>
              <button className="pv-flecha" style={estiloFlecha(true)}
                onClick={() => irAMes(1)} aria-label="Mes siguiente">›</button>
            </div>

            <div className="pv-sem">
              {DIAS_SEM.map(d => <div key={d} className="pv-sem-d">{d}</div>)}
            </div>

            {cargando ? (
              <div className="pv-cargando">Cargando tu calendario…</div>
            ) : !data ? (
              <div className="pv-vacio">Sin datos de este mes.</div>
            ) : (
              <div className="pv-grid">
                {celdas.map((fecha, i) => {
                  if (!fecha) return <div key={`v${i}`} className="pv-celda pv-vacia" />;
                  const items = itemsDe(fecha);
                  const num = diaDeISO(fecha);
                  const esHoy = fecha === hoyISO;

                  if (items.length === 0) {
                    return (
                      <div key={fecha} className="pv-celda pv-apagado">
                        <div className="pv-celda-head">
                          <span className={`pv-num-badge ${esHoy ? 'pv-num-badge-hoy' : ''}`}>{num}</span>
                        </div>
                      </div>
                    );
                  }

                  const bloqueado = items.every(m => m.bloqueado);
                  const eventos = items.filter(m => m.tipo === 'evento');
                  const esSel = sel === fecha;
                  const st = estiloCelda(items);

                  return (
                    <button
                      key={fecha}
                      className="pv-celda"
                      style={{
                        ...FUENTE_BTN,
                        ...st,
                        boxShadow: esSel ? `0 0 0 2px ${ORANGE_500}` : 'none',
                      }}
                      onClick={() => tocarDia(fecha)}
                      title={items.map(m => m.nombre).join(' · ')}
                    >
                      <div className="pv-celda-head">
                        <span
                          className={`pv-num-badge ${esHoy ? 'pv-num-badge-hoy' : ''}`}
                          style={esHoy ? undefined : { color: 'inherit' }}
                        >{num}</span>
                        {bloqueado && <span className="pv-candado" aria-label="Ya cerró">🔒</span>}
                      </div>
                      {eventos.length > 0 && (
                        <div className="pv-pills">
                          {eventos.map(ev => {
                            const c = ev.tipo_color || COLOR_EVENTO_DEFAULT;
                            return (
                              <span
                                key={ev.evento_id}
                                className="pv-pill"
                                style={{
                                  background:      bloqueado ? GRAY_100 : tintePastel(c, 0.20),
                                  color:           bloqueado ? GRAY_500 : NAVY_900,
                                  borderLeftColor: bloqueado ? GRAY_200 : c,
                                }}
                              >
                                {ev.nombre}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="pv-leyenda">
              <span className="pv-leyenda-i">
                <span className="pv-leyenda-c" style={{ background: VERDE }} />Sí sirvo</span>
              <span className="pv-leyenda-i">
                <span className="pv-leyenda-c" style={{ background: ROJO }} />No puedo</span>
              <span className="pv-leyenda-i">
                <span className="pv-leyenda-c" style={{ background: '#fff', border: `1.5px solid ${NAVY_900}` }} />Sin responder</span>
              <span className="pv-leyenda-i">
                <span className="pv-leyenda-c" style={{ background: ORANGE_500, borderRadius: '50%' }} />Evento</span>
              <span className="pv-leyenda-i">🔒 Ya cerró</span>
            </div>
          </div>

          {error && <div className="pv-error">{error}</div>}
          {!cargando && data && (
            <div className="pv-nota">Los cambios cierran 1 día antes de cada fecha.</div>
          )}
        </div>

        {/* ── Columna derecha: lista del mes (fija 380px, apila <900px) ─ */}
        <div className="pv-card pv-lista-card">
          <h2 className="pv-right-title">Domingos y eventos del mes</h2>
          <div className="pv-right-sub">
            Marca “Sí sirvo” o “No puedo” en los que te toca servir.
          </div>

          {cargando ? (
            <div className="pv-cargando">Cargando…</div>
          ) : listado.length === 0 ? (
            <div className="pv-vacio">
              {dias.length > 0
                ? 'No hay fechas próximas en este mes.'
                : 'Este mes no tiene domingos ni eventos.'}
            </div>
          ) : (
            listado.map(item => {
              const clave = claveItem(item);
              const ocupado = enviando === clave;
              const habilitado = item.puede_marcar && !item.bloqueado && !ocupado;
              const esSel = sel === item.fecha;
              const dow = diaSemanaISO(item.fecha);
              const punto = item.tipo === 'domingo' ? NAVY_900 : (item.tipo_color || COLOR_EVENTO_DEFAULT);
              const esInformativo = !item.puede_marcar;
              return (
                <div
                  key={clave}
                  ref={el => { if (el) itemRefs.current[clave] = el; }}
                  className={`pv-item ${esSel ? 'pv-item-sel' : ''} ${item.bloqueado ? 'pv-item-bloq' : ''}`}
                >
                  <div className="pv-fecha-box">
                    <div className="pv-fecha-num">{diaDeISO(item.fecha)}</div>
                    <div className="pv-fecha-dow">{DIAS_SEM[dow]}</div>
                  </div>

                  <div className="pv-body">
                    <div className="pv-body-title">{item.nombre}</div>
                    <div className="pv-body-meta">
                      <span className="pv-tipo-dot" style={{ background: punto }} />
                      <span className="pv-tipo-txt">
                        {item.tipo === 'domingo'
                          ? DIAS_SEM_LARGO[dow]
                          : (item.tipo_evento || 'Evento')}
                      </span>
                      {esInformativo && (
                        <span className="pv-chip-info">Solo informativo</span>
                      )}
                      {item.bloqueado && (
                        <span className="pv-chip-lock">· 🔒 ya cerró</span>
                      )}
                    </div>
                  </div>

                  {item.puede_marcar && (
                    <div className="pv-acciones">
                      <button
                        style={estiloAccion(item.estado === 'disponible', VERDE, '#A7D9C2', habilitado)}
                        onClick={() => marcar(item, 'disponible')}
                        disabled={!habilitado}
                        aria-label="Sí sirvo"
                      >
                        {ocupado ? '…' : 'Sí sirvo'}
                      </button>
                      <button
                        style={estiloAccion(item.estado === 'no_disponible', ROJO, '#F3CBC9', habilitado)}
                        onClick={() => marcar(item, 'no_disponible')}
                        disabled={!habilitado}
                        aria-label="No puedo"
                      >
                        {ocupado ? '…' : 'No puedo'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

function claveItem(item) {
  return `${item.fecha}-${item.evento_id ?? 'dom'}`;
}
