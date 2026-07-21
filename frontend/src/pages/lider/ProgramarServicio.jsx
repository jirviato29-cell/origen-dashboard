import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { liderProgramarApi, liderPosicionesApi } from '../../services/api';
import SelectorFechasMinisterio from '../../components/SelectorFechasMinisterio';

// "Programar servicio" (PASO 5, parte 2): el líder elige una fecha donde sirve
// su ministerio y, a los voluntarios que dijeron "sí sirvo", les asigna una
// POSICIÓN del catálogo de su ministerio. Toda la seguridad (ministerio, campus,
// a quién puede asignar, que haya dicho que sí) la resuelve el backend.
// El selector de fechas de arriba es el componente compartido
// SelectorFechasMinisterio (mismo que usa "Quién va dónde").

const NAVY_900   = '#112540';
const ORANGE_50  = '#FFF4EE';
const ORANGE_600 = '#E0561B';
const ORANGE_500 = '#FF6B2B';
const VERDE      = '#15915A';
const ROJO       = '#D23B36';
const ROJO_50    = '#FCEBEA';
const GRAY_700   = '#3D4654';
const GRAY_600   = '#5B6675';
const GRAY_500   = '#7A8699';
const GRAY_200   = '#E2E6EC';
const GRAY_100   = '#EEF1F5';
const GRAY_50    = '#F6F7F9';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const CSS = `
.prg-head{margin-bottom:14px;}
.prg-h2{font-size:16px;font-weight:800;letter-spacing:-.02em;color:${NAVY_900};margin:0;}
.prg-h2-note{font-size:12.5px;color:${GRAY_500};margin-top:3px;}

.prg-warn{margin:12px 0;padding:12px 14px;border-radius:12px;background:${ORANGE_50};border:1px solid ${ORANGE_500};color:${GRAY_700};font-size:13px;line-height:1.5;}
.prg-warn a{color:${ORANGE_600};font-weight:700;text-decoration:none;}
.prg-error{margin:12px 0;padding:12px 14px;border-radius:12px;background:${ROJO_50};border:1px solid #F3CBC9;color:${ROJO};font-size:13px;font-weight:600;}
.prg-empty{padding:22px 16px;text-align:center;border:1px dashed ${GRAY_200};border-radius:12px;background:${GRAY_50};}
.prg-empty-t{font-size:13px;font-weight:700;color:${NAVY_900};}
.prg-empty-s{font-size:12px;color:${GRAY_500};margin-top:4px;}
.prg-loading{padding:20px;text-align:center;font-size:13px;color:${GRAY_500};}

.prg-detalle{margin-top:10px;}
.prg-detalle-t{font-size:14px;font-weight:800;color:${NAVY_900};}
.prg-group{margin-top:14px;}
.prg-group-h{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px;display:flex;align-items:center;gap:7px;}
.prg-group-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.prg-list{display:flex;flex-direction:column;gap:8px;}
.prg-row{display:flex;align-items:center;gap:11px;padding:11px 12px;border:1px solid ${GRAY_200};border-radius:11px;background:#fff;flex-wrap:wrap;}
.prg-row-asig{border-color:#FFD9C7;background:${ORANGE_50};}
.prg-avatar{width:32px;height:32px;border-radius:9px;background:${GRAY_100};color:${GRAY_600};display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:800;flex-shrink:0;}
.prg-info{flex:1;min-width:120px;}
.prg-nombre{font-size:13.5px;font-weight:700;color:${NAVY_900};letter-spacing:-.01em;}
.prg-meta{font-size:11.5px;color:${GRAY_500};margin-top:2px;}
.prg-assign{display:flex;align-items:center;gap:7px;flex:1;min-width:210px;justify-content:flex-end;flex-wrap:wrap;}
.prg-select{max-width:190px;padding:8px 10px;border-radius:9px;border:1.5px solid ${GRAY_200};font-size:13px;outline:none;box-sizing:border-box;color:${NAVY_900};font-family:inherit;background:#fff;cursor:pointer;}
.prg-select:focus{border-color:${NAVY_900};}
.prg-conf{font-size:10.5px;font-weight:700;color:${GRAY_500};}
`;

// index.css:106 tiene `.app button { font: inherit; color: inherit; }`, que por
// especificidad le gana a las clases: los botones van con estilo INLINE.
const FUENTE_BTN = {
  fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  fontWeight: 700,
};
const estiloQuitar = (habilitado, hover) => ({
  ...FUENTE_BTN,
  fontSize: 12,
  padding: '8px 12px',
  borderRadius: 9,
  border: '1.5px solid',
  flexShrink: 0,
  cursor: habilitado ? 'pointer' : 'not-allowed',
  backgroundColor: habilitado ? (hover ? ROJO : '#fff') : GRAY_100,
  borderColor: habilitado ? (hover ? ROJO : '#F3CBC9') : GRAY_200,
  color: habilitado ? (hover ? '#fff' : ROJO) : GRAY_500,
  transition: 'background .12s, color .12s, border-color .12s',
});

const diaDeISO = (iso) => Number(iso.slice(8, 10));
const inicial = (n) => (n || '?').trim().charAt(0).toUpperCase();

export default function ProgramarServicio() {
  const [fechaSel, setFechaSel] = useState(null);  // la elige el selector
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [posiciones, setPosiciones] = useState([]);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(null);  // voluntario_id en proceso
  const [hoverQuitar, setHoverQuitar] = useState(null);
  const [recargaFechas, setRecargaFechas] = useState(0);

  // Catálogo de posiciones del ministerio (una vez).
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

  const refrescarFechas = () => setRecargaFechas(n => n + 1);

  async function asignar(v, posicionId) {
    if (!posicionId || !fechaSel) return;
    setEnviando(v.voluntario_id);
    setError('');
    try {
      const { data } = await liderProgramarApi.asignar({
        voluntario_id: v.voluntario_id,
        fecha: fechaSel.fecha,
        evento_id: fechaSel.evento_id,
        posicion_id: Number(posicionId),
      });
      setDetalle(d => ({
        ...d,
        voluntarios: d.voluntarios.map(x => x.voluntario_id === v.voluntario_id
          ? { ...x, asignacion_id: data.asignacion_id, posicion_id: data.posicion_id,
              posicion: data.posicion, estado_confirmacion: data.estado_confirmacion }
          : x),
      }));
      refrescarFechas();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo asignar la posición');
    } finally {
      setEnviando(null);
    }
  }

  async function quitar(v) {
    if (!v.asignacion_id) return;
    setEnviando(v.voluntario_id);
    setError('');
    try {
      await liderProgramarApi.quitar(v.asignacion_id);
      setDetalle(d => ({
        ...d,
        voluntarios: d.voluntarios.map(x => x.voluntario_id === v.voluntario_id
          ? { ...x, asignacion_id: null, posicion_id: null, posicion: null, estado_confirmacion: null }
          : x),
      }));
      refrescarFechas();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo quitar la posición');
    } finally {
      setEnviando(null);
    }
  }

  // Agrupa el roster por estado de disponibilidad.
  const grupos = useMemo(() => {
    const vs = detalle?.voluntarios ?? [];
    return {
      disponibles: vs.filter(v => v.disponibilidad === 'disponible'),
      sinResponder: vs.filter(v => v.disponibilidad == null),
      noPueden: vs.filter(v => v.disponibilidad === 'no_disponible'),
    };
  }, [detalle]);

  const sinPosiciones = posiciones.length === 0;

  return (
    <div>
      <style>{CSS}</style>

      <div className="prg-head">
        <h2 className="prg-h2">Programar servicio</h2>
        <div className="prg-h2-note">
          Elige una fecha y asígnale a cada colaborador su posición.
        </div>
      </div>

      {sinPosiciones && (
        <div className="prg-warn">
          Primero crea las posiciones de tu ministerio en la pestaña{' '}
          <Link to="/lider_ministerio/posiciones">Posiciones</Link>.
        </div>
      )}

      <SelectorFechasMinisterio
        onSelect={setFechaSel}
        onError={setError}
        reloadSignal={recargaFechas}
      />

      {error && <div className="prg-error">{error}</div>}

      {fechaSel && (
        <div className="prg-detalle">
          <div className="prg-detalle-t">
            {fechaSel.nombre} · {diaDeISO(fechaSel.fecha)} {MESES[Number(fechaSel.fecha.slice(5, 7)) - 1]}
          </div>

          {cargandoDetalle ? (
            <div className="prg-loading">Cargando equipo…</div>
          ) : !detalle || detalle.voluntarios.length === 0 ? (
            <div className="prg-empty" style={{ marginTop: 12 }}>
              <div className="prg-empty-t">Todavía no tienes voluntarios en este ministerio</div>
              <div className="prg-empty-s">Da de alta a tu equipo en “Mis voluntarios”.</div>
            </div>
          ) : (
            <>
              {/* Colaboradores */}
              <div className="prg-group">
                <div className="prg-group-h" style={{ color: VERDE }}>
                  <span className="prg-group-dot" style={{ background: VERDE }} />
                  Colaboradores ({grupos.disponibles.length})
                </div>
                {grupos.disponibles.length === 0 ? (
                  <div className="prg-empty-s" style={{ paddingLeft: 2 }}>Nadie ha marcado “Sí colaboro” para esta fecha.</div>
                ) : (
                  <div className="prg-list">
                    {grupos.disponibles.map((v) => {
                      const ocupado = enviando === v.voluntario_id;
                      const asignado = Boolean(v.asignacion_id);
                      return (
                        <div key={v.voluntario_id} className={`prg-row ${asignado ? 'prg-row-asig' : ''}`}>
                          <div className="prg-avatar">{inicial(v.nombre)}</div>
                          <div className="prg-info">
                            <div className="prg-nombre">{v.nombre}</div>
                            {asignado && v.estado_confirmacion && (
                              <div className="prg-meta">
                                Posición asignada · <span className="prg-conf">{v.estado_confirmacion}</span>
                              </div>
                            )}
                          </div>
                          <div className="prg-assign">
                            <select
                              className="prg-select"
                              value={v.posicion_id ?? ''}
                              disabled={ocupado || sinPosiciones}
                              onChange={(e) => asignar(v, e.target.value)}
                            >
                              <option value="" disabled>{sinPosiciones ? 'Sin posiciones' : 'Elegir posición…'}</option>
                              {posiciones.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                              ))}
                            </select>
                            {asignado && (
                              <button
                                style={estiloQuitar(!ocupado, hoverQuitar === v.voluntario_id)}
                                onMouseEnter={() => setHoverQuitar(v.voluntario_id)}
                                onMouseLeave={() => setHoverQuitar(null)}
                                onClick={() => quitar(v)}
                                disabled={ocupado}
                              >
                                {ocupado ? '…' : 'Quitar'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sin responder */}
              {grupos.sinResponder.length > 0 && (
                <div className="prg-group">
                  <div className="prg-group-h" style={{ color: GRAY_500 }}>
                    <span className="prg-group-dot" style={{ background: GRAY_500 }} />
                    Sin responder ({grupos.sinResponder.length})
                  </div>
                  <div className="prg-list">
                    {grupos.sinResponder.map((v) => (
                      <div key={v.voluntario_id} className="prg-row">
                        <div className="prg-avatar">{inicial(v.nombre)}</div>
                        <div className="prg-info"><div className="prg-nombre">{v.nombre}</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No pueden esta fecha */}
              {grupos.noPueden.length > 0 && (
                <div className="prg-group">
                  <div className="prg-group-h" style={{ color: ROJO }}>
                    <span className="prg-group-dot" style={{ background: ROJO }} />
                    No pueden esta fecha ({grupos.noPueden.length})
                  </div>
                  <div className="prg-list">
                    {grupos.noPueden.map((v) => (
                      <div key={v.voluntario_id} className="prg-row" style={{ background: ROJO_50, borderColor: '#F3CBC9' }}>
                        <div className="prg-avatar">{inicial(v.nombre)}</div>
                        <div className="prg-info"><div className="prg-nombre">{v.nombre}</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
