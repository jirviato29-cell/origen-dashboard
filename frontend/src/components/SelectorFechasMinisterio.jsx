import { useEffect, useMemo, useState } from 'react';
import { liderProgramarApi } from '../services/api';
import { useTiposEvento } from '../context/TiposEventoContext';

// Selector de fechas del ministerio, compartido por las pantallas del líder que
// trabajan sobre una fecha (Programar servicio y Quién va dónde): navegación de
// mes + tarjetas de fecha (con el color de su tipo de evento) + leyenda de
// contadores. Es CONTROLADO por callbacks para no duplicar la lógica en cada
// pantalla:
//   onSelect(fechaObj|null)  -> avisa qué fecha quedó elegida (auto-elige la 1ª)
//   onError(msg)             -> reporta errores de carga al contenedor
//   reloadSignal             -> al cambiar, re-consulta el mes actual (p.ej. tras
//                               asignar/quitar en Programar servicio, para que los
//                               contadores de las tarjetas se refresquen).
// Reusa el mismo endpoint /lider/programar/fechas y los mapas de color de
// useTiposEvento (tipoCellBg/tipoColor), igual que el resto del calendario.

const NAVY_900   = '#112540';
const ORANGE_500 = '#FF6B2B';
const ORANGE_600 = '#E0561B';
const ORANGE_50  = '#FFF4EE';
const VERDE      = '#15915A';
const ROJO       = '#D23B36';
const GRAY_500   = '#7A8699';
const GRAY_300   = '#CBD2DC';
const GRAY_200   = '#E2E6EC';
const GRAY_50    = '#F6F7F9';

const DIAS_SEM = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const CSS = `
.sfm-nav{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0 12px;}
.sfm-mes{font-size:15px;font-weight:800;color:${NAVY_900};letter-spacing:-.02em;text-transform:capitalize;text-align:center;}

/* Grid que acomoda TODAS las fechas del mes en varias filas, sin scroll. */
.sfm-fechas{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;padding:2px 0 4px;}
@media(max-width:560px){.sfm-fechas{grid-template-columns:repeat(auto-fill,minmax(120px,1fr));}}
.sfm-chip{min-width:0;text-align:left;padding:10px 12px;border-radius:12px;border:1.5px solid ${GRAY_200};background:#fff;display:flex;flex-direction:column;gap:6px;}
.sfm-chip-top{display:flex;align-items:baseline;gap:6px;}
.sfm-chip-num{font-size:19px;font-weight:800;color:${NAVY_900};line-height:1;font-variant-numeric:tabular-nums;}
.sfm-chip-dow{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${GRAY_500};}
.sfm-chip-nombre{font-size:12px;font-weight:700;color:${NAVY_900};line-height:1.2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;}
/* Contadores compactos: tres números con color (verde/rojo/gris). */
.sfm-conts{display:flex;align-items:center;gap:11px;}
.sfm-c{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1;}
.sfm-c-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.sfm-chip-asig{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.02em;padding:2px 7px;border-radius:5px;background:${ORANGE_50};color:${ORANGE_600};align-self:flex-start;}
.sfm-leg{display:flex;flex-wrap:wrap;gap:5px 14px;margin:8px 2px 0;font-size:11px;color:${GRAY_500};font-weight:600;}
.sfm-leg-i{display:inline-flex;align-items:center;gap:6px;}
.sfm-leg-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}

.sfm-empty{padding:22px 16px;text-align:center;border:1px dashed ${GRAY_200};border-radius:12px;background:${GRAY_50};}
.sfm-empty-t{font-size:13px;font-weight:700;color:${NAVY_900};}
.sfm-empty-s{font-size:12px;color:${GRAY_500};margin-top:4px;}
.sfm-loading{padding:20px;text-align:center;font-size:13px;color:${GRAY_500};}
`;

// index.css:106 tiene `.app button { font: inherit; color: inherit; }`, que por
// especificidad le gana a las clases: los botones van con estilo INLINE.
const FUENTE_BTN = {
  fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  fontWeight: 700,
};
const estiloFlecha = () => ({ ...FUENTE_BTN, fontSize: 16, width: 34, height: 34, borderRadius: 10, border: `1px solid ${GRAY_200}`, background: '#fff', color: NAVY_900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' });
// Tarjeta de fecha pintada con el color de su tipo (fondo = tipoCellBg[tipo],
// barra lateral = tipoColor[tipo]). Sin tipo/mapa → neutro. La SELECCIONADA se
// distingue con un anillo naranja (boxShadow), sin perder el color del tipo.
const estiloChip = (activa, cellBg, accent) => ({
  ...FUENTE_BTN,
  cursor: 'pointer',
  background: cellBg || '#fff',
  borderStyle: 'solid',
  borderWidth: '1.5px',
  borderColor: GRAY_200,
  borderLeftWidth: '4px',
  borderLeftColor: accent || GRAY_300,
  boxShadow: activa ? `0 0 0 2px ${ORANGE_500}, 0 6px 16px rgba(255,107,43,.20)` : 'none',
  transition: 'box-shadow .12s, border-color .12s',
});

// ── Helpers de mes (aritmética UTC para no correr de día por zona) ────────────
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

// Clave estable de una fecha (fecha + evento, o 'dom' para domingos sin evento).
const claveFecha = (f) => `${f.fecha}|${f.evento_id ?? 'dom'}`;

export default function SelectorFechasMinisterio({ onSelect, onError, reloadSignal = 0 }) {
  // Mismos mapas de color que el calendario de stewardship (provider app-wide).
  const { tipoCellBg = {}, tipoColor = {} } = useTiposEvento() || {};
  const [mes, setMes] = useState(mesDeHoy);
  const [fechas, setFechas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sel, setSel] = useState(null); // clave de la fecha elegida

  // Fechas del mes. Se re-consulta al cambiar de mes o al pulsar reloadSignal.
  useEffect(() => {
    let vivo = true;
    setCargando(true);
    (async () => {
      try {
        const { data } = await liderProgramarApi.getFechas(mes);
        if (!vivo) return;
        const lista = Array.isArray(data.fechas) ? data.fechas : [];
        setFechas(lista);
        onError?.('');
        // Conserva la selección si sigue existiendo; si no, elige la primera.
        setSel(prev => {
          const sigue = prev && lista.some(f => claveFecha(f) === prev);
          return sigue ? prev : (lista.length ? claveFecha(lista[0]) : null);
        });
      } catch (err) {
        if (vivo) {
          onError?.(err.response?.data?.error || 'No se pudieron cargar las fechas');
          setFechas([]);
          setSel(null);
        }
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, [mes, reloadSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  const fechaSel = useMemo(
    () => fechas.find(f => claveFecha(f) === sel) || null,
    [fechas, sel],
  );

  // Avisa al contenedor SOLO cuando cambia la fecha elegida (no en cada recarga
  // de contadores): así el detalle no se vuelve a pedir de más.
  useEffect(() => { onSelect?.(fechaSel); }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const irAMes = (n) => { setSel(null); setFechas([]); setMes(m => sumaMes(m, n)); };

  return (
    <div>
      <style>{CSS}</style>

      <div className="sfm-nav">
        <button style={estiloFlecha()} onClick={() => irAMes(-1)} aria-label="Mes anterior">‹</button>
        <div className="sfm-mes">{tituloMes(mes)}</div>
        <button style={estiloFlecha()} onClick={() => irAMes(1)} aria-label="Mes siguiente">›</button>
      </div>

      {cargando ? (
        <div className="sfm-loading">Cargando fechas…</div>
      ) : fechas.length === 0 ? (
        <div className="sfm-empty">
          <div className="sfm-empty-t">No hay fechas próximas en este mes.</div>
          <div className="sfm-empty-s">Se muestran solo las fechas de hoy en adelante donde sirve tu ministerio.</div>
        </div>
      ) : (
        <>
          <div className="sfm-fechas">
            {fechas.map((f) => {
              const activa = claveFecha(f) === sel;
              // Color por NOMBRE de tipo, con los mismos mapas que stewardship.
              const cellBg = f.tipo_evento ? tipoCellBg[f.tipo_evento] : null;
              const accent = f.tipo_evento ? tipoColor[f.tipo_evento] : null;
              return (
                <button key={claveFecha(f)} className="sfm-chip" style={estiloChip(activa, cellBg, accent)}
                  onClick={() => setSel(claveFecha(f))} title={f.nombre}>
                  <div className="sfm-chip-top">
                    <span className="sfm-chip-num">{diaDeISO(f.fecha)}</span>
                    <span className="sfm-chip-dow">{DIAS_SEM[dowDeISO(f.fecha)]}</span>
                  </div>
                  <div className="sfm-chip-nombre">{f.nombre}</div>
                  <div className="sfm-conts">
                    <span className="sfm-c" style={{ color: VERDE }} title="Colaboradores">
                      <span className="sfm-c-dot" style={{ background: VERDE }} />{f.disponibles}</span>
                    <span className="sfm-c" style={{ color: ROJO }} title="No pueden esta fecha">
                      <span className="sfm-c-dot" style={{ background: ROJO }} />{f.no_disponibles}</span>
                    <span className="sfm-c" style={{ color: GRAY_500 }} title="Sin responder">
                      <span className="sfm-c-dot" style={{ background: GRAY_500 }} />{f.sin_responder}</span>
                  </div>
                  {f.asignados > 0 && <span className="sfm-chip-asig">{f.asignados} asignados</span>}
                </button>
              );
            })}
          </div>
          <div className="sfm-leg">
            <span className="sfm-leg-i"><span className="sfm-leg-dot" style={{ background: VERDE }} />colaboradores</span>
            <span className="sfm-leg-i"><span className="sfm-leg-dot" style={{ background: ROJO }} />no pueden esta fecha</span>
            <span className="sfm-leg-i"><span className="sfm-leg-dot" style={{ background: GRAY_500 }} />sin responder</span>
          </div>
        </>
      )}
    </div>
  );
}
