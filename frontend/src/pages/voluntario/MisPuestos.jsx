import { useEffect, useState } from 'react';
import { voluntarioPuestosApi } from '../../services/api';
import { useTiposEvento } from '../../context/TiposEventoContext';
import { marcarPuestosVistos, invalidarPuestosNuevos } from '../../hooks/usePuestosNuevos';
import { I } from '../../components/Icons';

// "Mis puestos" del voluntario: SOLO LECTURA de las posiciones asignadas por su
// líder, de la fecha más próxima a la más lejana, agrupadas por mes. Cada tarjeta
// muestra fecha + tipo de servicio, el nombre del puesto en grande, el ministerio
// y el estado (confirmar / no puedo). El estado nunca se comunica solo con color:
// va con icono y palabra.
//
// Diseñada para leerse desde el teléfono por personas mayores: nada por debajo de
// 15px, cada zona tocable de al menos 48px y separada 10px. Los colores/fuente de
// los botones van INLINE porque la regla global `.app button { color: inherit }`
// pisa los colores de clase.

const NAVY_900   = '#112540';
const VERDE      = '#15915A';
const VERDE_50   = '#E3F3EA';
const ROJO       = '#D23B36';
const GRAY_SEC   = '#5B6675';   // gris secundario (buena lectura)
const GRAY_300   = '#CBD2DC';
const GRAY_200   = '#E2E6EC';
const GRAY_50    = '#F6F7F9';

// Pila de fuente que se aplica INLINE en los botones de respuesta.
const FONT = '"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif';

// Acento naranja/menta del campus para el botón "Sí colaboro".
function accentCampus() {
  const campus = (typeof localStorage !== 'undefined' && localStorage.getItem('campus_activo')) || 'ags';
  return campus === 'gdl' ? '#2DD4BF' : '#FF6B2B';
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const CSS = `
.mp-root{font-family:${FONT};letter-spacing:-.006em;width:100%;max-width:720px;}

.mp-error{margin:0 0 12px;padding:12px 14px;border-radius:12px;background:#FCEBEA;border:1px solid #F3CBC9;color:${ROJO};font-size:15px;font-weight:600;line-height:1.4;}
.mp-loading{padding:26px;text-align:center;font-size:15px;color:${GRAY_SEC};}
.mp-empty{padding:34px 20px;text-align:center;border:1px dashed ${GRAY_200};border-radius:14px;background:${GRAY_50};}
.mp-empty-t{font-size:17px;font-weight:700;color:${NAVY_900};}
.mp-empty-s{font-size:15px;color:${GRAY_SEC};margin-top:6px;}

.mp-mes{font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${GRAY_SEC};margin:20px 0 10px;}
.mp-mes:first-of-type{margin-top:0;}

.mp-list{display:flex;flex-direction:column;gap:12px;}
.mp-card{border:1px solid ${GRAY_200};border-left-width:4px;border-radius:14px;background:#fff;padding:14px 16px;display:flex;flex-direction:column;gap:8px;}
.mp-row1{display:flex;align-items:baseline;justify-content:space-between;gap:12px;}
.mp-fecha{font-size:15px;font-weight:500;color:${NAVY_900};white-space:nowrap;}
.mp-tipo{font-size:15px;font-weight:500;color:${GRAY_SEC};min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;}
.mp-puesto{font-size:24px;font-weight:500;color:${NAVY_900};line-height:1.2;letter-spacing:-.01em;overflow-wrap:anywhere;}
.mp-desc{font-size:15px;color:${GRAY_SEC};line-height:1.4;overflow-wrap:anywhere;}
.mp-min{font-size:15px;color:${GRAY_SEC};}
.mp-sep{border:none;border-top:.5px solid ${GRAY_200};margin:4px 0 2px;}

.mp-state-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.mp-state{display:inline-flex;align-items:center;gap:9px;font-size:17px;font-weight:700;}
.mp-state-ic{width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;}
.mp-lock{display:inline-flex;align-items:center;gap:7px;font-size:15px;font-weight:700;color:${GRAY_SEC};}

.mp-btns{display:flex;gap:10px;}
.mp-btn{flex:1;min-width:0;min-height:48px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;-webkit-appearance:none;appearance:none;}
.mp-btn:disabled{opacity:.55;cursor:default;}
.mp-cambiar{min-height:48px;border-radius:12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;-webkit-appearance:none;appearance:none;}
.mp-err{font-size:15px;font-weight:600;color:${ROJO};line-height:1.4;}
`;

const diaDeISO = (iso) => Number(iso.slice(8, 10));
const dowDeISO = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
};

// Estado de confirmación → cómo se ve la respuesta ya dada. Sin dato = pendiente.
const CONF = {
  confirmado: { c: VERDE, t: 'Confirmado' },
  rechazado:  { c: ROJO,  t: 'No puedo' },
};
const respondio = (estado) => estado === 'confirmado' || estado === 'rechazado';

// Agrupa los puestos (ya ordenados) por año-mes conservando el orden.
function agruparPorMes(puestos) {
  const grupos = [];
  puestos.forEach((p) => {
    const key = p.fecha.slice(0, 7); // YYYY-MM
    let g = grupos.find((x) => x.key === key);
    if (!g) { g = { key, items: [] }; grupos.push(g); }
    g.items.push(p);
  });
  const anioActual = new Date().getFullYear();
  return grupos.map((g) => {
    const [anio, mes] = g.key.split('-').map(Number);
    const label = MESES[mes - 1] + (anio !== anioActual ? ` ${anio}` : '');
    return { ...g, label };
  });
}

export default function MisPuestos() {
  const { tipoColor = {} } = useTiposEvento() || {};
  const accent = accentCampus();
  const [puestos, setPuestos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  // UI de confirmación, por asignación:
  const [guardando, setGuardando]   = useState(null);       // asignacion_id en curso
  const [editando, setEditando]     = useState(() => new Set()); // ids donde pulsó "Cambiar"
  const [erroresConf, setErroresConf] = useState({});       // id → mensaje del backend

  // Enviar respuesta (confirmado/rechazado). Actualiza la tarjeta en sitio y
  // muestra el error del backend (p. ej. 403 por cierre) sin tumbar la pantalla.
  const responder = async (p, estado) => {
    const id = p.asignacion_id;
    if (!id || guardando) return;
    setGuardando(id);
    setErroresConf((e) => ({ ...e, [id]: '' }));
    try {
      const { data } = await voluntarioPuestosApi.confirmar(id, estado);
      const a = data?.asignacion || {};
      setPuestos((prev) => prev.map((x) => (x.asignacion_id === id
        ? { ...x, estado_confirmacion: a.estado_confirmacion ?? estado, bloqueado: a.bloqueado ?? x.bloqueado }
        : x)));
      setEditando((prev) => { const n = new Set(prev); n.delete(id); return n; });
      // Por si la respuesta cambió lo que cuenta como "nuevo", refresca el badge.
      invalidarPuestosNuevos();
    } catch (err) {
      const msg = err.response?.data?.error || 'No se pudo guardar tu respuesta';
      setErroresConf((e) => ({ ...e, [id]: msg }));
      // Si el backend dice que ya cerró, refleja el bloqueo en la tarjeta.
      if (err.response?.status === 403) {
        setPuestos((prev) => prev.map((x) => (x.asignacion_id === id ? { ...x, bloqueado: true } : x)));
      }
    } finally {
      setGuardando(null);
    }
  };

  const abrirCambio = (id) => setEditando((prev) => { const n = new Set(prev); n.add(id); return n; });

  // Carga de puestos.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data } = await voluntarioPuestosApi.getAll();
        if (vivo) { setPuestos(Array.isArray(data.puestos) ? data.puestos : []); setError(''); }
      } catch (err) {
        if (vivo) { setError(err.response?.data?.error || 'No se pudieron cargar tus puestos'); setPuestos([]); }
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  // Al abrir, marca todo como visto (limpia el badge del sidebar y la campanita).
  useEffect(() => {
    let vivo = true;
    voluntarioPuestosApi.marcarVistos()
      .then(() => { if (vivo) marcarPuestosVistos(); })
      .catch(() => { /* si falla, el badge se limpia en el próximo intento */ });
    return () => { vivo = false; };
  }, []);

  // Botón "Cambiar" (con borde), reutilizado por los estados ya respondidos.
  const botonCambiar = (id) => (
    <button
      type="button"
      className="mp-cambiar"
      onClick={() => abrirCambio(id)}
      style={{ fontFamily: FONT, fontSize: 16, fontWeight: 600, padding: '12px 18px', background: '#fff', color: NAVY_900, border: `1px solid ${GRAY_300}` }}
    >
      Cambiar
    </button>
  );

  const grupos = agruparPorMes(puestos);

  return (
    <div className="mp-root">
      <style>{CSS}</style>

      {error && <div className="mp-error">{error}</div>}

      {cargando ? (
        <div className="mp-loading">Cargando tus puestos…</div>
      ) : puestos.length === 0 ? (
        <div className="mp-empty">
          <div className="mp-empty-t">Aún no tienes puestos</div>
          <div className="mp-empty-s">Cuando tu líder te asigne uno, aparecerá aquí.</div>
        </div>
      ) : (
        grupos.map((g) => (
          <div key={g.key}>
            <div className="mp-mes">{g.label}</div>
            <div className="mp-list">
              {g.items.map((p) => {
                const borde = tipoColor[p.tipo_evento] || p.tipo_color || GRAY_300;
                const estado = p.estado_confirmacion || 'pendiente';
                const bloqueado = !!p.bloqueado;
                const id = p.asignacion_id;
                const yaRespondio = respondio(estado);
                const info = CONF[estado];                       // undefined si pendiente
                const mostrarBotones = !!id && !bloqueado && (!yaRespondio || editando.has(id));
                const guardandoEste = guardando === id;
                const errConf = erroresConf[id];

                // Indicador de estado (icono + palabra), sin depender solo del color.
                let indicador = null;
                if (info && estado === 'confirmado') {
                  indicador = (
                    <span className="mp-state" style={{ color: VERDE }}>
                      <span className="mp-state-ic" style={{ background: VERDE_50, color: VERDE }}><I.check size={16} /></span>
                      {info.t}
                    </span>
                  );
                } else if (info && estado === 'rechazado') {
                  indicador = (
                    <span className="mp-state" style={{ color: ROJO }}>
                      <span style={{ display: 'inline-flex', color: ROJO }}><I.x size={22} /></span>
                      {info.t}
                    </span>
                  );
                } else {
                  indicador = <span className="mp-state" style={{ color: GRAY_SEC }}>Sin responder</span>;
                }

                return (
                  <div key={`${p.fecha}|${p.evento_id ?? 'dom'}`} className="mp-card" style={{ borderLeftColor: borde }}>
                    {/* fila 1: fecha + tipo de servicio */}
                    <div className="mp-row1">
                      <span className="mp-fecha">{DIAS_CORTO[dowDeISO(p.fecha)]} {diaDeISO(p.fecha)}</span>
                      {p.nombre && <span className="mp-tipo">{p.nombre}</span>}
                    </div>

                    {/* fila 2: nombre del puesto (+ descripción si la hay) */}
                    <div className="mp-puesto">{p.posicion || 'Sin posición'}</div>
                    {p.descripcion && <div className="mp-desc">{p.descripcion}</div>}

                    {/* fila 3: ministerio */}
                    {p.ministerio && <div className="mp-min">{p.ministerio}</div>}

                    {/* separador */}
                    <hr className="mp-sep" />

                    {/* fila 4: estado */}
                    {mostrarBotones ? (
                      <div className="mp-btns">
                        <button
                          type="button"
                          className="mp-btn"
                          disabled={guardandoEste}
                          onClick={() => responder(p, 'confirmado')}
                          style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, background: accent, color: '#FFFFFF', border: `2px solid ${accent}` }}
                        >
                          <I.check size={18} /> {guardandoEste ? 'Guardando…' : 'Sí colaboro'}
                        </button>
                        <button
                          type="button"
                          className="mp-btn"
                          disabled={guardandoEste}
                          onClick={() => responder(p, 'rechazado')}
                          style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, background: '#FFFFFF', color: NAVY_900, border: `2px solid ${GRAY_300}` }}
                        >
                          <I.x size={18} /> No puedo
                        </button>
                      </div>
                    ) : bloqueado ? (
                      <div className="mp-state-row">
                        {indicador}
                        <span className="mp-lock"><I.clock size={16} /> Ya cerró</span>
                      </div>
                    ) : (
                      <div className="mp-state-row">
                        {indicador}
                        {botonCambiar(id)}
                      </div>
                    )}
                    {errConf && <div className="mp-err">{errConf}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
