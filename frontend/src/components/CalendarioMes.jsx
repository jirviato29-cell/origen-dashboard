import { useMemo } from 'react';
import { useTiposEvento } from '../context/TiposEventoContext';

// ─────────────────────────────────────────────────────────────────────────────
// Cuadrícula del mes COMPARTIDA por el calendario del voluntario y el del líder.
// Es puramente presentacional: recibe los datos ya normalizados y callbacks; no
// sabe de marcar ni de qué rol la usa. Cada página pone su propio modal al tocar
// un día (onTocarDia) y decide el indicador de esquina (renderCorner) y el
// resaltado (destacarItem, p. ej. "participa mi ministerio" en el panel líder).
//
// Shape de cada item (mismo que usa el backend del voluntario):
//   { fecha:'YYYY-MM-DD', tipo:'domingo'|'evento', tipo_evento?, nombre?, ... }
// Un domingo genérico es tipo 'domingo'; un evento especial es tipo 'evento'
// con tipo_evento = nombre del tipo y nombre = nombre del evento.
// ─────────────────────────────────────────────────────────────────────────────

const DOW_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const COLOR_EVENTO_DEFAULT = '#FF6B2B';

const diaDeISO = (iso) => Number(iso.slice(8, 10));
const dowDeISO = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
};
const claveItem = (item) => `${item.fecha}-${item.evento_id ?? item.id ?? 'dom'}`;

// Nombre del tipo del día (el evento manda; si no, un domingo genérico).
const tipoNombreDe = (items) => {
  const evento = items.find(m => m.tipo === 'evento');
  if (evento) return evento.tipo_evento || null;
  if (items.some(m => m.tipo === 'domingo')) return 'Servicio dominical';
  return null;
};

// Quita un sufijo de hora al final del nombre ("Santuario 6:00 am" → "Santuario").
const sinHora = (s) => {
  const t = (s || '').replace(/\s+\d{1,2}:\d{2}\s*(?:[ap]\.?\s?m\.?|hrs?|h)?\.?$/i, '').trim();
  return t || (s || '');
};

// Mezcla un hex hacia un pastel claro y opaco (para el fondo de la celda).
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

// Celdas del grid (con días de meses vecinos) calculadas SOLO desde el mes y hoy.
// Se descartan semanas completamente pasadas para no dejar franjas vacías.
function construirCeldas(mes) {
  const [anio, nMes] = mes.split('-').map(Number);
  const primero  = new Date(Date.UTC(anio, nMes - 1, 1)).getUTCDay();  // 0 = domingo
  const diasEnMes = new Date(Date.UTC(anio, nMes, 0)).getUTCDate();
  const prevDias  = new Date(Date.UTC(anio, nMes - 1, 0)).getUTCDate();
  const pad = (n) => String(n).padStart(2, '0');
  const pm = nMes - 1 < 1 ? 12 : nMes - 1;
  const py = nMes - 1 < 1 ? anio - 1 : anio;
  const nm = nMes + 1 > 12 ? 1 : nMes + 1;
  const ny = nMes + 1 > 12 ? anio + 1 : anio;

  const cells = [];
  for (let i = primero - 1; i >= 0; i--) {
    const num = prevDias - i;
    cells.push({ tipo: 'out', num, fecha: `${py}-${pad(pm)}-${pad(num)}` });
  }
  for (let d = 1; d <= diasEnMes; d++) {
    cells.push({ tipo: 'dia', num: d, fecha: `${mes}-${pad(d)}` });
  }
  const trail = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= trail; d++) {
    cells.push({ tipo: 'out', num: d, fecha: `${ny}-${pad(nm)}-${pad(d)}` });
  }
  // v3: se muestra el mes COMPLETO (los días pasados quedan callados, no se ocultan).
  return cells;
}

// Estilos scoped bajo `.cm-shell`; los tokens de color se declaran ahí. Los
// colores de botones van INLINE porque `.app button{color:inherit}` los pisaría.
const CSS = `
.cm-shell{
  --navy-900:#112540;--navy-800:#1A3354;--navy-700:#244169;--navy-300:#9CB0CC;
  --gray-700:#3D4654;--gray-600:#5A6472;--gray-500:#7A8699;--gray-400:#A7B0BD;--gray-300:#CBD2DC;
  --gray-200:#E6E9EF;--gray-100:#EFF2F6;--gray-50:#F7F8FA;
  --sky:#2C86C4;--sky-50:#E9F3FB;--sky-100:#CFE5F6;
  --shadow-sm:0 1px 2px rgba(11,26,47,.05);
  --shadow-md:0 4px 16px rgba(11,26,47,.06),0 1px 3px rgba(11,26,47,.04);
  font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
  letter-spacing:-.006em;color:#16233A;width:100%;
}
.cm-shell *{box-sizing:border-box;}
.cm-wrap{background:#fff;border:1px solid var(--gray-200);border-radius:18px;box-shadow:var(--shadow-md);padding:18px 18px 20px;}
.cm-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.cm-title{display:flex;align-items:baseline;gap:9px;}
.cm-title .cm-m{font-size:21px;font-weight:800;letter-spacing:-.03em;color:var(--navy-900);}
.cm-title .cm-y{font-size:14px;font-weight:700;color:var(--gray-400);}
.cm-nav{display:flex;align-items:center;gap:7px;}
.cm-shell .cm-today{font-size:12.5px;font-weight:700;color:var(--navy-700);background:#fff;border:1px solid var(--gray-200);border-radius:10px;padding:8px 13px;cursor:pointer;font-family:inherit;}
.cm-shell .cm-today:hover{background:var(--gray-50);}
.cm-shell .cm-arrow{width:38px;height:38px;border-radius:11px;border:1px solid var(--gray-200);background:#fff;display:flex;align-items:center;justify-content:center;color:var(--navy-700);cursor:pointer;}
.cm-shell .cm-arrow:hover{background:var(--gray-50);}

/* Cabecera de días: caja con fondo, 3 letras y la columna del domingo destacada. */
.cm-dow{display:grid;grid-template-columns:repeat(7,1fr);background:var(--gray-50);border:1px solid var(--gray-200);border-radius:11px;overflow:hidden;margin-bottom:8px;}
.cm-dow div{font-size:11.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--gray-600);text-align:center;padding:9px 0;}
.cm-dow div:first-child{background:var(--sky-50);color:#1c6294;}

/* Celda: número arriba-izquierda + nombre del evento debajo; barra lateral de
   estado (opcional, vía barColor) e indicador de esquina (vía renderCorner). La
   columna del domingo lleva un tinte de fondo muy suave detrás de las celdas. */
.cm-grid{display:grid;grid-template-columns:repeat(7,1fr);grid-auto-rows:minmax(72px,auto);align-items:stretch;gap:6px;position:relative;}
.cm-grid::before{content:"";position:absolute;left:0;top:-4px;bottom:-4px;width:calc((100% - 36px)/7 + 8px);background:rgba(44,134,196,.05);border-radius:12px;pointer-events:none;}
.cm-shell .cm-cell{min-height:72px;height:100%;border:1px solid var(--gray-100);border-radius:11px;padding:6px 4px 5px 6px;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start;gap:3px;position:relative;z-index:1;background:#fff;transition:.12s;cursor:pointer;overflow:hidden;text-align:left;width:100%;font-family:inherit;}
.cm-shell .cm-cell:hover{border-color:var(--gray-300);box-shadow:var(--shadow-sm);}
/* Días de otros meses: transparentes. Vacíos (sin evento) y pasados: callados. */
.cm-shell .cm-cell.cm-out{background:transparent;border-color:transparent;cursor:default;}
.cm-shell .cm-cell.cm-out:hover{box-shadow:none;border-color:transparent;}
.cm-shell .cm-cell.cm-empty{background:var(--gray-50);border-color:transparent;cursor:default;}
.cm-shell .cm-cell.cm-empty:hover{box-shadow:none;border-color:transparent;}
.cm-shell .cm-cell.cm-past{background:var(--gray-50);border-color:transparent;cursor:default;}
.cm-shell .cm-cell.cm-past:hover{box-shadow:none;border-color:transparent;}
.cm-num{font-size:14px;font-weight:700;color:var(--navy-800);line-height:1;height:16px;display:flex;align-items:center;padding-right:4px;font-variant-numeric:tabular-nums;flex:none;}
.cm-shell .cm-cell.cm-hasbadge .cm-num{padding-right:20px;}
.cm-shell .cm-cell.cm-out .cm-num{color:var(--gray-300);font-weight:500;}
.cm-shell .cm-cell.cm-empty .cm-num{color:var(--gray-400);font-weight:600;}
.cm-shell .cm-cell.cm-past .cm-num{color:var(--gray-300);font-weight:600;}

/* Barra lateral de estado (la aporta cada página vía barColor). */
.cm-bar{position:absolute;left:0;top:0;bottom:0;width:5px;}

/* Nombre del evento en móvil: UNA sola línea; si no cabe, corta con "…" (nunca
   se parte en dos). En pantallas anchas se usa cm-kw-full a 2 líneas. */
.cm-kw{font-size:8px;font-weight:800;line-height:1.1;text-align:left;letter-spacing:-.04em;width:100%;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cm-kw-full{display:none;}
@media(min-width:640px){
  .cm-num{font-size:15px;}
  .cm-kw{display:none;}
  .cm-kw-full{display:-webkit-box;font-size:11px;font-weight:700;line-height:1.12;text-align:left;width:100%;overflow:hidden;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word;letter-spacing:-.02em;}
}

/* Indicador de esquina (lo provee cada página vía renderCorner). */
.cm-corner{position:absolute;top:6px;right:6px;width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;box-shadow:0 1px 3px rgba(0,0,0,.18);}
.cm-corner svg{width:11px;height:11px;}

/* Leyenda en pastillas (opcional, la aporta la página vía la prop legend). */
.cm-legend{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px;padding-top:15px;border-top:1px solid var(--gray-100);}
.cm-lg{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--gray-700);font-weight:700;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:9px;padding:6px 11px;}
.cm-lg .cm-sw{width:11px;height:11px;border-radius:3px;flex-shrink:0;}

/* "Otros eventos del mes": cuadrícula de 2 con chip de fecha + punto + nombre. */
.cm-others{margin-top:16px;padding-top:16px;border-top:1px solid var(--gray-100);}
.cm-others h4{font-size:12px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--gray-500);margin:0 0 11px;}
.cm-ogrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;}
.cm-shell .cm-oitem{display:flex;align-items:center;gap:10px;border:1px solid var(--gray-200);border-radius:11px;padding:11px 12px;background:#fff;cursor:pointer;text-align:left;font-family:inherit;width:100%;min-width:0;}
.cm-shell .cm-oitem:hover{background:var(--gray-50);}
.cm-oitem .cm-odate{font-size:12px;font-weight:800;color:var(--navy-900);background:var(--gray-100);border-radius:7px;padding:5px 9px;flex-shrink:0;}
.cm-oitem .cm-odot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}
.cm-oitem .cm-oname{font-size:13px;font-weight:700;color:var(--navy-900);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;}
.cm-oitem .cm-obadge{font-size:11px;font-weight:800;color:var(--cm-accent,#FF6B2B);background:var(--cm-accent-tint,#FFF4EE);border:1px solid var(--cm-accent,#FF6B2B);border-radius:999px;padding:2px 8px;flex-shrink:0;white-space:nowrap;margin-left:auto;}
.cm-oempty{font-size:14px;color:var(--gray-600);}
@media(max-width:479px){ .cm-ogrid{grid-template-columns:1fr;} }

.cm-msg{padding:22px 10px;text-align:center;font-size:15px;color:var(--gray-600);}
`;

const Chevron = ({ dir }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
    <path d={dir === 'l' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function CalendarioMes({
  mes,                       // 'YYYY-MM'
  hoyISO,                    // 'YYYY-MM-DD' (o '')
  onPrev, onNext, onHoy,     // navegación de mes
  itemsDe,                   // (fecha) => item[]
  indice = [],               // item[] para la lista de abajo
  sel, onTocarDia,           // día seleccionado + handler
  cargando = false,
  loadingText = 'Cargando…',
  renderCorner,              // (items) => ReactNode | null
  barColor,                  // (items) => color|null → barra lateral de estado
  destacarItem,              // (item) => bool  → resalta celda + fila
  destacadoBadge = null,     // texto de la etiqueta (p. ej. "Tu ministerio")
  indexEmptyText = 'No hay eventos especiales este mes.',
  legend = [],               // [{ color, label }] → pastillas de leyenda (opcional)
  accent = '#FF6B2B',        // color de acento por campus
}) {
  const { tipoColor = {}, tipoColorDark = {}, tipoCellBg = {} } = useTiposEvento() || {};
  const celdas = useMemo(() => (mes ? construirCeldas(mes) : []), [mes]);

  // Color del punto en la lista: por el tipo del item (evento o domingo).
  const colorDeItem = (item) => {
    const tn = item.tipo === 'domingo' ? 'Servicio dominical' : (item.tipo_evento || item.tipo);
    return tipoColor[tn] || item.tipo_color || '#9CB0CC';
  };

  return (
    <div className="cm-shell" style={{ '--cm-accent': accent, '--cm-accent-tint': tintePastel(accent, 0.12) }}>
      <style>{CSS}</style>
      <div className="cm-wrap">
        <div className="cm-head">
          <div className="cm-title">
            <span className="cm-m">{MESES[Number(mes.slice(5, 7)) - 1]}</span>
            <span className="cm-y">{mes.slice(0, 4)}</span>
          </div>
          <div className="cm-nav">
            <button className="cm-today" onClick={onHoy}>Hoy</button>
            <button className="cm-arrow" onClick={onPrev} aria-label="Mes anterior"><Chevron dir="l" /></button>
            <button className="cm-arrow" onClick={onNext} aria-label="Mes siguiente"><Chevron dir="r" /></button>
          </div>
        </div>
        <div className="cm-dow">{DOW_CORTO.map((d, i) => <div key={i}>{d}</div>)}</div>

        {cargando ? (
          <div className="cm-msg">{loadingText}</div>
        ) : (
          <div className="cm-grid">
            {celdas.map((c, i) => {
              if (c.tipo === 'out') {
                return <div key={`o${i}`} className="cm-cell cm-out"><span className="cm-num">{c.num}</span></div>;
              }
              const items = itemsDe(c.fecha) || [];
              const esHoy = c.fecha === hoyISO;
              const esPasado = hoyISO && c.fecha < hoyISO;
              const esSel = sel === c.fecha;

              const tipoNombre = tipoNombreDe(items);
              const evento = items.find(m => m.tipo === 'evento');
              const conEvento = !!tipoNombre;

              // Día sin evento: callado (pasado o vacío). Solo el número.
              if (!conEvento) {
                const cls = esHoy ? 'cm-cell cm-today' : (esPasado ? 'cm-cell cm-past' : 'cm-cell cm-empty');
                const inter = esHoy || !esPasado;   // hoy y futuros son tocables
                return (
                  <button
                    key={c.fecha}
                    className={cls}
                    style={esHoy ? { borderColor: accent, boxShadow: `inset 0 0 0 1px ${accent}`, cursor: 'default' } : undefined}
                    onClick={() => inter && onTocarDia && onTocarDia(c.fecha)}
                  >
                    <span className="cm-num" style={esHoy ? { color: '#E0561B' } : undefined}>{c.num}</span>
                  </button>
                );
              }

              const tColor = tipoColor[tipoNombre] || (evento && evento.tipo_color) || COLOR_EVENTO_DEFAULT;
              const tTexto = tipoColorDark[tipoNombre] || tColor;
              const tBg = tipoCellBg[tipoNombre] || tintePastel(tColor, 0.10);
              const nombreEvento = evento ? sinHora(evento.nombre) : 'Servicio';
              const hot = !!(destacarItem && items.some(destacarItem));
              const corner = renderCorner ? renderCorner(items) : null;
              const bar = barColor ? barColor(items) : null;

              const clases = ['cm-cell'];
              if (esHoy) clases.push('cm-today');
              if (hot) clases.push('cm-hot');
              if (corner) clases.push('cm-hasbadge');

              return (
                <button
                  key={c.fecha}
                  className={clases.join(' ')}
                  style={{
                    background: tBg, borderColor: tintePastel(tColor, 0.34),
                    ...(hot && !esHoy ? { borderColor: accent, boxShadow: `inset 0 0 0 1.5px ${accent}` } : {}),
                    ...(esHoy ? { borderColor: accent, boxShadow: `inset 0 0 0 1px ${accent}` } : {}),
                    ...(esSel ? { boxShadow: `0 0 0 2px ${accent}` } : {}),
                  }}
                  onClick={() => onTocarDia && onTocarDia(c.fecha)}
                  title={items.map(m => m.nombre).filter(Boolean).join(' · ')}
                >
                  {bar && <span className="cm-bar" style={{ background: bar }} />}
                  {corner}
                  <span className="cm-num" style={{ color: tColor }}>{c.num}</span>
                  <span className="cm-kw" style={{ color: tTexto }}>{nombreEvento}</span>
                  <span className="cm-kw-full" style={{ color: tTexto }}>{nombreEvento}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Leyenda en pastillas (opcional). */}
        {legend.length > 0 && (
          <div className="cm-legend">
            {legend.map((lg, i) => (
              <div className="cm-lg" key={i}><span className="cm-sw" style={{ background: lg.color }} />{lg.label}</div>
            ))}
          </div>
        )}

        {/* Otros eventos del mes (solo lectura), en cuadrícula de 2. */}
        <div className="cm-others">
          <h4>Otros eventos del mes</h4>
          {indice.length === 0 ? (
            <div className="cm-oempty">{indexEmptyText}</div>
          ) : (
            <div className="cm-ogrid">
              {indice.map(d => {
                const hot = !!(destacarItem && destacarItem(d));
                return (
                  <button
                    key={claveItem(d)}
                    type="button"
                    className="cm-oitem"
                    style={sel === d.fecha ? { borderColor: accent } : undefined}
                    onClick={() => onTocarDia && onTocarDia(d.fecha)}
                  >
                    <span className="cm-odate">{DOW_CORTO[dowDeISO(d.fecha)]} {diaDeISO(d.fecha)}</span>
                    <span className="cm-odot" style={{ background: colorDeItem(d) }} />
                    <span className="cm-oname">{d.tipo === 'domingo' ? 'Servicio dominical' : d.nombre}</span>
                    {hot && destacadoBadge && <span className="cm-obadge">{destacadoBadge}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
