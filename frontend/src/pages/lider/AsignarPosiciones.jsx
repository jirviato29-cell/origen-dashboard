import { useEffect, useMemo, useState } from 'react';
import { liderAsignacionesApi } from '../../services/api';

// "Asignar posiciones" (PASO 5): el líder elige una fecha donde sirve su
// ministerio (domingo o evento de servicio) y, sobre su equipo, ve lo que cada
// quien marcó ("disponible" / "no puedo" / sin responder) y le pone una posición
// (ej. "puerta principal", "cámara 2"). Eso llena la tabla `asignaciones`.
//
// Toda la seguridad (ministerio, campus, a quién puede asignar) la resuelve el
// backend con el token; aquí solo se pinta y se manda lo mínimo.

const NAVY_900 = '#112540';
const ORANGE_500 = '#FF6B2B';
const ORANGE_600 = '#E0561B';
const ORANGE_50 = '#FFF4EE';
const VERDE = '#15915A';
const VERDE_50 = '#E8F5EF';
const ROJO = '#D23B36';
const ROJO_50 = '#FCEBEA';
const GRAY_600 = '#5B6675';
const GRAY_500 = '#7A8699';
const GRAY_200 = '#E2E6EC';
const GRAY_100 = '#EEF1F5';
const GRAY_50 = '#F6F7F9';

const DIAS_SEM = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const CSS = `
.ap-head{margin-bottom:14px;}
.ap-h2{font-size:16px;font-weight:800;letter-spacing:-.02em;color:${NAVY_900};margin:0;}
.ap-h2-note{font-size:12.5px;color:${GRAY_500};margin-top:3px;}

.ap-nav{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:16px 0 12px;}
.ap-mes{font-size:15px;font-weight:800;color:${NAVY_900};letter-spacing:-.02em;text-transform:capitalize;text-align:center;}
.ap-flecha{width:34px;height:34px;border-radius:10px;border:1px solid ${GRAY_200};background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;}

.ap-fechas{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 8px;-webkit-overflow-scrolling:touch;}
.ap-chip{flex:0 0 auto;min-width:118px;text-align:left;padding:10px 12px;border-radius:12px;border:1.5px solid ${GRAY_200};background:#fff;display:flex;flex-direction:column;gap:6px;}
.ap-chip-top{display:flex;align-items:baseline;gap:7px;}
.ap-chip-num{font-size:19px;font-weight:800;color:${NAVY_900};line-height:1;font-variant-numeric:tabular-nums;}
.ap-chip-dow{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${GRAY_500};}
.ap-chip-nombre{font-size:12px;font-weight:700;color:${NAVY_900};line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ap-chip-badges{display:flex;gap:6px;flex-wrap:wrap;}
.ap-mini{font-size:10px;font-weight:800;letter-spacing:.02em;padding:2px 6px;border-radius:5px;}
.ap-mini-dis{background:${VERDE_50};color:${VERDE};}
.ap-mini-asg{background:${ORANGE_50};color:${ORANGE_600};}

.ap-roster-head{margin:6px 0 4px;}
.ap-roster-t{font-size:14px;font-weight:800;color:${NAVY_900};letter-spacing:-.01em;}
.ap-roster-s{font-size:12px;color:${GRAY_500};margin-top:2px;}

.ap-list{display:flex;flex-direction:column;gap:8px;margin-top:12px;}
.ap-row{display:flex;align-items:center;gap:11px;padding:11px 12px;border:1px solid ${GRAY_200};border-radius:12px;background:#fff;flex-wrap:wrap;}
.ap-row-asg{border-color:#FFD9C7;background:${ORANGE_50};}
.ap-avatar{width:32px;height:32px;border-radius:9px;background:${GRAY_100};color:${GRAY_600};display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:800;flex-shrink:0;}
.ap-info{flex:1;min-width:120px;}
.ap-nombre{font-size:13.5px;font-weight:700;color:${NAVY_900};letter-spacing:-.01em;}
.ap-meta{display:flex;align-items:center;gap:7px;margin-top:3px;flex-wrap:wrap;}
.ap-badge{font-size:10.5px;font-weight:700;letter-spacing:.03em;padding:2px 8px;border-radius:20px;}
.ap-badge-dis{background:${VERDE_50};color:${VERDE};}
.ap-badge-no{background:${ROJO_50};color:${ROJO};}
.ap-badge-sin{background:${GRAY_100};color:${GRAY_500};}
.ap-conf{font-size:10.5px;font-weight:700;color:${GRAY_500};}
.ap-assign{display:flex;align-items:center;gap:7px;flex:1;min-width:220px;justify-content:flex-end;}
.ap-input{width:100%;max-width:180px;padding:8px 10px;border-radius:9px;border:1.5px solid ${GRAY_200};font-size:13px;outline:none;box-sizing:border-box;color:${NAVY_900};font-family:inherit;background:#fff;}
.ap-input:focus{border-color:${NAVY_900};}

.ap-error{padding:11px 13px;border-radius:10px;background:#FEF2F2;border:1px solid #FECACA;color:#EF4444;font-size:12.5px;font-weight:500;margin:12px 0;}
.ap-empty{padding:22px 16px;text-align:center;border:1px dashed ${GRAY_200};border-radius:12px;background:${GRAY_50};}
.ap-empty-t{font-size:13px;font-weight:700;color:${NAVY_900};}
.ap-empty-s{font-size:12px;color:${GRAY_500};margin-top:4px;}
.ap-loading{padding:20px;text-align:center;font-size:13px;color:${GRAY_500};}
`;

// index.css:106 tiene `.app button { font: inherit; color: inherit; }`, que por
// especificidad le gana a las clases y les roba color/peso/tamaño. Por eso los
// botones (y sus estados hover/activo) van con estilo inline.
const FUENTE_BTN = {
  fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  fontWeight: 700,
};

const estiloFlecha = () => ({ ...FUENTE_BTN, fontSize: 16, color: NAVY_900, cursor: 'pointer' });

const estiloChip = (activa) => ({
  ...FUENTE_BTN,
  cursor: 'pointer',
  borderColor: activa ? ORANGE_500 : GRAY_200,
  boxShadow: activa ? `0 0 0 2px rgba(255,107,43,.18)` : 'none',
  transition: 'border-color .12s, box-shadow .12s',
});

const estiloBtn = (activo, color, habilitado) => ({
  ...FUENTE_BTN,
  fontSize: 12.5,
  padding: '8px 13px',
  borderRadius: 9,
  border: '1.5px solid',
  flexShrink: 0,
  cursor: habilitado ? 'pointer' : 'not-allowed',
  backgroundColor: habilitado ? (activo ? color : '#fff') : GRAY_100,
  borderColor: habilitado ? color : GRAY_200,
  color: habilitado ? (activo ? '#fff' : color) : GRAY_500,
  transition: 'background .12s, color .12s, border-color .12s',
});

// ── Helpers de mes (aritmética en UTC para no correr de día por zona) ─────────
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
const dowDeISO = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
};
const inicial = (n) => (n || '?').trim().charAt(0).toUpperCase();
const claveFecha = (f) => `${f.fecha}|${f.evento_id ?? 'dom'}`;

export default function AsignarPosiciones() {
  const [mes, setMes] = useState(mesDeHoy);
  const [fechas, setFechas] = useState([]);
  const [cargandoFechas, setCargandoFechas] = useState(true);
  const [sel, setSel] = useState(null);           // clave de la fecha elegida
  const [roster, setRoster] = useState(null);
  const [cargandoRoster, setCargandoRoster] = useState(false);
  const [error, setError] = useState('');
  const [borradores, setBorradores] = useState({}); // voluntario_id -> texto del input
  const [guardando, setGuardando] = useState(null);  // voluntario_id en proceso
  const [recargaFechas, setRecargaFechas] = useState(0);

  // Fechas del mes donde sirve el ministerio.
  useEffect(() => {
    let vivo = true;
    setCargandoFechas(true);
    (async () => {
      try {
        const { data } = await liderAsignacionesApi.getFechas(mes);
        if (!vivo) return;
        setFechas(Array.isArray(data.fechas) ? data.fechas : []);
        setError('');
      } catch (err) {
        if (vivo) {
          setError(err.response?.data?.error || 'No se pudieron cargar las fechas');
          setFechas([]);
        }
      } finally {
        if (vivo) setCargandoFechas(false);
      }
    })();
    return () => { vivo = false; };
  }, [mes, recargaFechas]);

  const fechaSel = useMemo(
    () => fechas.find(f => claveFecha(f) === sel) || null,
    [fechas, sel]
  );

  // Al cambiar la fecha elegida, carga su roster.
  useEffect(() => {
    if (!fechaSel) { setRoster(null); return; }
    let vivo = true;
    setCargandoRoster(true);
    (async () => {
      try {
        const { data } = await liderAsignacionesApi.getRoster(fechaSel.fecha, fechaSel.evento_id);
        if (!vivo) return;
        setRoster(data);
        // Precarga los inputs con la posición ya asignada.
        const draft = {};
        for (const v of data.voluntarios || []) draft[v.voluntario_id] = v.posicion || '';
        setBorradores(draft);
        setError('');
      } catch (err) {
        if (vivo) {
          setError(err.response?.data?.error || 'No se pudo cargar el equipo de esta fecha');
          setRoster(null);
        }
      } finally {
        if (vivo) setCargandoRoster(false);
      }
    })();
    return () => { vivo = false; };
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const irAMes = (n) => {
    setMes(m => sumaMes(m, n));
    setSel(null);
    setRoster(null);
  };

  // Refresca los contadores del chip (disponibles/asignados) tras asignar/quitar.
  const refrescarContadores = () => setRecargaFechas(n => n + 1);

  async function asignar(v) {
    const posicion = (borradores[v.voluntario_id] || '').trim();
    if (!posicion || !fechaSel) return;
    setGuardando(v.voluntario_id);
    setError('');
    try {
      const { data } = await liderAsignacionesApi.asignar({
        voluntario_id: v.voluntario_id,
        fecha: fechaSel.fecha,
        evento_id: fechaSel.evento_id,
        posicion,
      });
      setRoster(r => ({
        ...r,
        voluntarios: r.voluntarios.map(x => x.voluntario_id === v.voluntario_id
          ? { ...x, asignacion_id: data.asignacion_id, posicion: data.posicion,
              estado_confirmacion: data.estado_confirmacion }
          : x),
      }));
      refrescarContadores();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo asignar la posición');
    } finally {
      setGuardando(null);
    }
  }

  async function quitar(v) {
    if (!v.asignacion_id) return;
    setGuardando(v.voluntario_id);
    setError('');
    try {
      await liderAsignacionesApi.quitar(v.asignacion_id);
      setRoster(r => ({
        ...r,
        voluntarios: r.voluntarios.map(x => x.voluntario_id === v.voluntario_id
          ? { ...x, asignacion_id: null, posicion: null, estado_confirmacion: null }
          : x),
      }));
      setBorradores(b => ({ ...b, [v.voluntario_id]: '' }));
      refrescarContadores();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo quitar la posición');
    } finally {
      setGuardando(null);
    }
  }

  const badgeDispo = (estado) => {
    if (estado === 'disponible') return <span className="ap-badge ap-badge-dis">Disponible</span>;
    if (estado === 'no_disponible') return <span className="ap-badge ap-badge-no">No puede</span>;
    return <span className="ap-badge ap-badge-sin">Sin responder</span>;
  };

  return (
    <div>
      <style>{CSS}</style>

      <div className="ap-head">
        <h2 className="ap-h2">Asignar posiciones</h2>
        <div className="ap-h2-note">
          Elige una fecha donde sirve tu ministerio y ponle su posición a cada quien.
        </div>
      </div>

      <div className="ap-nav">
        <button className="ap-flecha" style={estiloFlecha()}
          onClick={() => irAMes(-1)} aria-label="Mes anterior">‹</button>
        <div className="ap-mes">{tituloMes(mes)}</div>
        <button className="ap-flecha" style={estiloFlecha()}
          onClick={() => irAMes(1)} aria-label="Mes siguiente">›</button>
      </div>

      {cargandoFechas ? (
        <div className="ap-loading">Cargando fechas…</div>
      ) : fechas.length === 0 ? (
        <div className="ap-empty">
          <div className="ap-empty-t">Este mes tu ministerio no sirve en ninguna fecha</div>
          <div className="ap-empty-s">Aparecerán los domingos y los eventos de servicio donde te toca.</div>
        </div>
      ) : (
        <div className="ap-fechas">
          {fechas.map((f) => {
            const activa = claveFecha(f) === sel;
            return (
              <button
                key={claveFecha(f)}
                className="ap-chip"
                style={estiloChip(activa)}
                onClick={() => setSel(claveFecha(f))}
              >
                <div className="ap-chip-top">
                  <span className="ap-chip-num">{diaDeISO(f.fecha)}</span>
                  <span className="ap-chip-dow">{DIAS_SEM[dowDeISO(f.fecha)]}</span>
                </div>
                <div className="ap-chip-nombre">{f.nombre}</div>
                <div className="ap-chip-badges">
                  <span className="ap-mini ap-mini-dis">{f.disponibles} dispon.</span>
                  {f.asignados > 0 && <span className="ap-mini ap-mini-asg">{f.asignados} asig.</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {error && <div className="ap-error">{error}</div>}

      {fechaSel && (
        <div style={{ marginTop: 8 }}>
          <div className="ap-roster-head">
            <div className="ap-roster-t">
              {fechaSel.nombre} · {diaDeISO(fechaSel.fecha)} {MESES[Number(fechaSel.fecha.slice(5, 7)) - 1]}
            </div>
            <div className="ap-roster-s">
              Los que marcaron “Disponible” van arriba. Escribe la posición y guarda.
            </div>
          </div>

          {cargandoRoster ? (
            <div className="ap-loading">Cargando equipo…</div>
          ) : !roster || roster.voluntarios.length === 0 ? (
            <div className="ap-empty">
              <div className="ap-empty-t">Todavía no tienes voluntarios en este ministerio</div>
              <div className="ap-empty-s">Da de alta a tu equipo en “Mis voluntarios”.</div>
            </div>
          ) : (
            <div className="ap-list">
              {roster.voluntarios.map((v) => {
                const ocupado = guardando === v.voluntario_id;
                const texto = borradores[v.voluntario_id] ?? '';
                const asignado = Boolean(v.asignacion_id);
                const cambio = (texto.trim() !== (v.posicion || '').trim());
                const puedeGuardar = texto.trim().length > 0 && cambio && !ocupado;
                return (
                  <div key={v.voluntario_id} className={`ap-row ${asignado ? 'ap-row-asg' : ''}`}>
                    <div className="ap-avatar">{inicial(v.nombre)}</div>
                    <div className="ap-info">
                      <div className="ap-nombre">{v.nombre}</div>
                      <div className="ap-meta">
                        {badgeDispo(v.disponibilidad)}
                        {asignado && v.estado_confirmacion && (
                          <span className="ap-conf">· {v.estado_confirmacion}</span>
                        )}
                      </div>
                    </div>
                    <div className="ap-assign">
                      <input
                        className="ap-input"
                        type="text"
                        value={texto}
                        placeholder="Posición (ej. puerta)"
                        maxLength={120}
                        onChange={(e) => setBorradores(b => ({ ...b, [v.voluntario_id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter' && puedeGuardar) asignar(v); }}
                      />
                      <button
                        style={estiloBtn(true, ORANGE_500, puedeGuardar)}
                        onClick={() => asignar(v)}
                        disabled={!puedeGuardar}
                      >
                        {ocupado ? '…' : asignado ? 'Guardar' : 'Asignar'}
                      </button>
                      {asignado && (
                        <button
                          style={estiloBtn(false, ROJO, !ocupado)}
                          onClick={() => quitar(v)}
                          disabled={ocupado}
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
