import { useEffect, useState } from 'react';
import { voluntarioPuestosApi } from '../../services/api';
import { useTiposEvento } from '../../context/TiposEventoContext';
import { marcarPuestosVistos } from '../../hooks/usePuestosNuevos';

// "Mis puestos" del voluntario (PASO 5, parte 4): SOLO LECTURA. Lista las
// posiciones que su líder le asignó, de la fecha más próxima a la más lejana.
// De cada fecha se ve DESTACADA la posición que le toca, con su descripción. No
// se confirma nada aquí (eso va por WhatsApp). Al abrir la pantalla se marca todo
// como visto para limpiar el badge. Los colores de tipo salen de useTiposEvento
// (tipoCellBg/tipoColor por nombre), igual que en las demás pantallas.

const NAVY_900   = '#112540';
const NAVY_300   = '#9CB0CC';
const ORANGE_50  = '#FFF4EE';
const ORANGE_600 = '#E0561B';
const VERDE      = '#15915A';
const ROJO       = '#D23B36';
const GRAY_600   = '#5B6675';
const GRAY_500   = '#7A8699';
const GRAY_300   = '#CBD2DC';
const GRAY_200   = '#E2E6EC';
const GRAY_50    = '#F6F7F9';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const CSS = `
.mp-root{font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;width:100%;max-width:720px;}
.mp-head{margin-bottom:16px;}
.mp-h2{font-size:16px;font-weight:800;letter-spacing:-.02em;color:${NAVY_900};margin:0;}
.mp-h2-note{font-size:12.5px;color:${GRAY_500};margin-top:3px;line-height:1.5;}

.mp-error{margin:12px 0;padding:12px 14px;border-radius:12px;background:#FCEBEA;border:1px solid #F3CBC9;color:${ROJO};font-size:13px;font-weight:600;}
.mp-loading{padding:26px;text-align:center;font-size:13px;color:${GRAY_500};}
.mp-empty{padding:30px 20px;text-align:center;border:1px dashed ${GRAY_200};border-radius:14px;background:${GRAY_50};}
.mp-empty-t{font-size:14px;font-weight:800;color:${NAVY_900};}
.mp-empty-s{font-size:12.5px;color:${GRAY_500};margin-top:6px;line-height:1.5;}

.mp-list{display:flex;flex-direction:column;gap:12px;}
.mp-card{display:flex;gap:14px;align-items:stretch;border:1px solid ${GRAY_200};border-left-width:4px;border-radius:14px;background:#fff;padding:14px 16px;}
.mp-fecha{flex-shrink:0;width:62px;border-radius:12px;background:${NAVY_900};color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:9px 0;}
.mp-fecha-dia{font-size:24px;font-weight:800;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums;}
.mp-fecha-dow{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${NAVY_300};margin-top:4px;}
.mp-fecha-mes{font-size:10px;font-weight:600;color:${NAVY_300};margin-top:1px;text-transform:lowercase;}
.mp-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px;}
.mp-evento{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;color:${GRAY_600};min-width:0;}
.mp-evento-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}
.mp-evento-nombre{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.mp-pos-wrap{background:${ORANGE_50};border:1px solid #FFD9C7;border-radius:11px;padding:10px 12px;}
.mp-pos-lbl{font-size:9.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${ORANGE_600};}
.mp-pos{font-size:17px;font-weight:800;letter-spacing:-.02em;color:${NAVY_900};line-height:1.2;overflow-wrap:anywhere;margin-top:2px;}
.mp-pos-desc{font-size:12px;color:${GRAY_600};margin-top:4px;line-height:1.4;overflow-wrap:anywhere;}
.mp-foot{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.mp-min{font-size:11.5px;color:${GRAY_500};font-weight:600;}
.mp-conf{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;}
.mp-conf-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
`;

const diaDeISO = (iso) => Number(iso.slice(8, 10));
const dowDeISO = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
};

// Estado de confirmación → color + etiqueta discreta. Sin dato = pendiente.
const CONF = {
  confirmado: { c: VERDE,    t: 'Confirmado' },
  rechazado:  { c: ROJO,     t: 'Rechazado' },
  pendiente:  { c: GRAY_500, t: 'Pendiente' },
};
const confDe = (estado) => CONF[estado] || CONF.pendiente;

export default function MisPuestos() {
  const { tipoCellBg = {}, tipoColor = {} } = useTiposEvento() || {};
  const [puestos, setPuestos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="mp-root">
      <style>{CSS}</style>

      <div className="mp-head">
        <h2 className="mp-h2">Mis puestos</h2>
        <div className="mp-h2-note">
          Aquí ves dónde te toca colaborar en cada fecha. La confirmación la coordinas con tu líder por WhatsApp.
        </div>
      </div>

      {error && <div className="mp-error">{error}</div>}

      {cargando ? (
        <div className="mp-loading">Cargando tus puestos…</div>
      ) : puestos.length === 0 ? (
        <div className="mp-empty">
          <div className="mp-empty-t">Todavía no tienes puestos asignados</div>
          <div className="mp-empty-s">Cuando tu líder te asigne uno, aparecerá aquí.</div>
        </div>
      ) : (
        <div className="mp-list">
          {puestos.map((p) => {
            const accent = tipoColor[p.tipo_evento] || p.tipo_color || GRAY_300;
            const cellBg = tipoCellBg[p.tipo_evento] || null;
            const conf = confDe(p.estado_confirmacion);
            return (
              <div key={`${p.fecha}|${p.evento_id ?? 'dom'}`} className="mp-card" style={{ borderLeftColor: accent, background: cellBg || '#fff' }}>
                <div className="mp-fecha">
                  <span className="mp-fecha-dia">{diaDeISO(p.fecha)}</span>
                  <span className="mp-fecha-dow">{DIAS_LARGO[dowDeISO(p.fecha)].slice(0, 3)}</span>
                  <span className="mp-fecha-mes">{MESES[Number(p.fecha.slice(5, 7)) - 1]}</span>
                </div>

                <div className="mp-body">
                  <span className="mp-evento">
                    <span className="mp-evento-dot" style={{ background: accent }} />
                    <span className="mp-evento-nombre">{p.nombre}</span>
                  </span>

                  <div className="mp-pos-wrap">
                    <div className="mp-pos-lbl">Te toca en</div>
                    <div className="mp-pos">{p.posicion || 'Sin posición'}</div>
                    {p.descripcion && <div className="mp-pos-desc">{p.descripcion}</div>}
                  </div>

                  <div className="mp-foot">
                    {p.ministerio && <span className="mp-min">{p.ministerio}</span>}
                    <span className="mp-conf" style={{ color: conf.c }}>
                      <span className="mp-conf-dot" style={{ background: conf.c }} />{conf.t}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
