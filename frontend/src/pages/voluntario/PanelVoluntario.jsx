import { useEffect, useMemo, useRef, useState } from 'react';
import { voluntarioDisponibilidadApi } from '../../services/api';

// "Mi calendario" del voluntario, implementado según el handoff de diseño
// (referencia-Mi-Calendario.html / SPEC-Mi-Calendario.md): sistema azul marino +
// naranja, panel "Te toca servir" a la izquierda (410px, la acción va primero) y
// el calendario del mes a la derecha con las 3 mini-KPI arriba.
//
// El sidebar y la topbar los pone el Layout de la app; aquí solo va el cuerpo.
// El bloqueo (cierra 1 día antes), el campus y el ministerio los decide el
// backend; aquí solo se pinta y se revalida en el POST.

const DOW_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const COLOR_EVENTO_DEFAULT = '#FF6B2B';
const SKY = '#2C86C4';

// Los estilos van todos scoped bajo `.mc-shell`; los tokens de color se
// declaran ahí mismo para poder reusar las reglas de la referencia tal cual.
// Las reglas de botones/celdas llevan doble clase (`.mc-shell .mc-act`) para
// ganarle por especificidad a la regla global `.app button{font/color:inherit}`.
const CSS = `
.mc-shell{
  --navy-950:#0B1A2F;--navy-900:#112540;--navy-800:#1A3354;--navy-700:#244169;
  --navy-300:#9CB0CC;--navy-100:#DCE4EF;
  --orange-600:#E0561B;--orange-500:#FF6B2B;--orange-400:#FF8A52;--orange-100:#FFE5D6;--orange-50:#FFF4EE;
  --ink:#16233A;--gray-700:#3D4654;--gray-600:#5A6472;--gray-500:#7A8699;--gray-400:#A7B0BD;--gray-300:#CBD2DC;
  --gray-200:#E2E6EC;--gray-100:#EEF1F5;--gray-50:#F6F7F9;
  --green-600:#15915A;--green-500:#1BA968;--green-50:#E6F5EC;--green-100:#C9EBD6;
  --red-600:#D23B36;--red-50:#FBEAE9;--amber-600:#C98A14;--amber-50:#FBF2DC;
  --sky:#2C86C4;--sky-50:#E8F2FA;
  --r-sm:7px;--r-md:10px;--r-lg:14px;--r-xl:16px;
  --shadow-sm:0 1px 2px rgba(11,26,47,.06);
  font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
  letter-spacing:-.006em;color:var(--ink);width:100%;
  display:grid;grid-template-columns:410px 1fr;gap:16px;align-items:start;
}
.mc-shell *{box-sizing:border-box;}
.mc-shell>*{min-width:0;}

.mc-card{background:#fff;border:1px solid var(--gray-200);border-radius:var(--r-xl);box-shadow:var(--shadow-sm);}

/* ===== mini-KPIs ===== */
.mc-sumrow{display:flex;gap:10px;margin-bottom:16px;}
.mc-sum{flex:1;background:#fff;border:1px solid var(--gray-200);border-radius:var(--r-lg);padding:13px 15px;box-shadow:var(--shadow-sm);display:flex;align-items:center;gap:12px;}
.mc-sum-dot{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.mc-sum-dot svg{width:17px;height:17px;}
.mc-sum-n{font-size:22px;font-weight:800;letter-spacing:-.03em;line-height:1;color:var(--navy-900);font-variant-numeric:tabular-nums;}
.mc-sum-l{font-size:11.5px;color:var(--gray-500);font-weight:600;margin-top:3px;}

/* ===== calendario ===== */
.mc-cal-wrap{padding:20px 22px 22px;}
.mc-cal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}
.mc-cal-title{display:flex;align-items:baseline;gap:10px;}
.mc-cal-title .mc-m{font-size:19px;font-weight:800;letter-spacing:-.02em;color:var(--navy-900);}
.mc-cal-title .mc-y{font-size:14px;font-weight:600;color:var(--gray-400);}
.mc-cal-nav{display:flex;align-items:center;gap:8px;}
.mc-shell .mc-cal-today{font-size:12px;font-weight:600;color:var(--navy-700);background:#fff;border:1px solid var(--gray-200);border-radius:8px;padding:7px 12px;cursor:pointer;}
.mc-shell .mc-cal-today:hover{background:var(--gray-50);}
.mc-shell .mc-cal-arrow{width:34px;height:34px;border-radius:9px;border:1px solid var(--gray-200);background:#fff;display:flex;align-items:center;justify-content:center;color:var(--navy-700);cursor:pointer;}
.mc-shell .mc-cal-arrow:hover{background:var(--gray-50);}
.mc-cal-sub{font-size:12.5px;color:var(--gray-500);margin-bottom:16px;}

.mc-dow{display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:6px;}
.mc-dow div{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--gray-400);text-align:center;padding:4px 0;}
.mc-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;}
.mc-shell .mc-cell{min-height:46px;border:1px solid var(--gray-100);border-radius:9px;padding:5px 7px 5px 9px;display:flex;flex-direction:column;gap:3px;position:relative;background:#fff;transition:.12s;cursor:pointer;overflow:hidden;text-align:left;width:100%;font-family:inherit;}
.mc-shell .mc-cell:hover{border-color:var(--gray-300);box-shadow:var(--shadow-sm);}
.mc-shell .mc-cell.mc-out{background:var(--gray-50);border-color:transparent;cursor:default;}
.mc-shell .mc-cell.mc-out:hover{box-shadow:none;}
/* Día pasado: invisible (sin caja/fondo/sombra/color) pero conserva su lugar
   en la cuadrícula. Solo el número, en gris muy tenue. No interactivo. */
.mc-shell .mc-cell.mc-gone{background:transparent;border-color:transparent;box-shadow:none;cursor:default;}
.mc-shell .mc-cell.mc-gone:hover{box-shadow:none;border-color:transparent;}
.mc-num{font-size:12px;font-weight:700;color:var(--navy-800);height:18px;display:flex;align-items:center;}
.mc-shell .mc-cell.mc-out .mc-num{color:var(--gray-300);}
.mc-shell .mc-cell.mc-sun .mc-num{color:var(--navy-900);}
.mc-shell .mc-cell.mc-today .mc-num{color:var(--orange-600);}
.mc-shell .mc-cell.mc-today{border-color:var(--orange-400);box-shadow:inset 0 0 0 1px var(--orange-400);}
.mc-shell .mc-cell.mc-serve{border-color:var(--gray-200);}
.mc-shell .mc-cell.mc-status-si::after,.mc-shell .mc-cell.mc-status-no::after,.mc-shell .mc-cell.mc-status-pend::after{content:"";position:absolute;left:0;top:6px;bottom:6px;width:5px;border-radius:0 4px 4px 0;}
.mc-shell .mc-cell.mc-status-si::after{background:var(--green-500);}
.mc-shell .mc-cell.mc-status-no::after{background:var(--red-600);}
.mc-shell .mc-cell.mc-status-pend::after{background:var(--amber-600);}

.mc-ev{font-size:10px;font-weight:600;line-height:1.15;border-radius:5px;padding:2px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.mc-ev-mas{color:var(--gray-500);font-weight:600;padding:1px 7px;background:transparent;}
.mc-badge{position:absolute;top:5px;right:5px;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
.mc-badge svg{width:10px;height:10px;}
.mc-badge.mc-si{background:var(--green-500);color:#fff;}
.mc-badge.mc-no{background:var(--red-600);color:#fff;}
.mc-badge.mc-pend{background:#fff;border:1.5px dashed var(--amber-600);color:var(--amber-600);}

.mc-legend{display:flex;gap:16px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid var(--gray-100);}
.mc-lg{display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--gray-600);font-weight:500;}
.mc-lg .mc-sw{width:11px;height:11px;border-radius:4px;}
.mc-lg .mc-rr{width:11px;height:11px;border-radius:3px;border:1.5px solid var(--gray-300);background:#fff;}

/* ===== rail "Te toca servir" ===== */
.mc-rail{order:-1;display:flex;flex-direction:column;position:sticky;top:0;}
.mc-rail-head{padding:20px 22px 0;}
.mc-rail-head h3{font-size:17px;font-weight:800;letter-spacing:-.02em;color:var(--navy-900);margin:0;}
.mc-rail-head p{font-size:13px;color:var(--gray-500);margin:6px 0 0;}
.mc-rail-list{padding:16px 18px 20px;display:flex;flex-direction:column;gap:12px;}
.mc-slot{border:1px solid var(--gray-200);border-radius:var(--r-lg);padding:15px 16px;transition:.12s;scroll-margin-top:12px;}
.mc-slot.mc-pending{border-color:var(--amber-600);background:linear-gradient(180deg,var(--amber-50),#fff 60%);}
.mc-slot.mc-sel{box-shadow:0 0 0 2px rgba(255,107,43,.30);border-color:var(--orange-400);}
.mc-slot-top{display:flex;gap:12px;align-items:flex-start;}
.mc-date-chip{width:50px;flex-shrink:0;text-align:center;border-radius:11px;padding:7px 0 8px;background:var(--navy-900);color:#fff;}
.mc-date-chip .mc-cd{font-size:20px;font-weight:800;letter-spacing:-.03em;line-height:1;}
.mc-date-chip .mc-cw{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--navy-300);margin-top:3px;}
.mc-slot-body{flex:1;min-width:0;}
.mc-slot-name{font-size:15px;font-weight:700;color:var(--navy-900);line-height:1.25;}
.mc-slot-meta{display:flex;align-items:center;gap:8px;margin-top:5px;flex-wrap:wrap;}
.mc-chip-role{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--gray-600);}
.mc-chip-role .mc-rd{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.mc-tag{font-size:9.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:2px 7px;border-radius:5px;background:var(--gray-100);color:var(--gray-500);}
.mc-tag.mc-tag-warn{background:var(--amber-50);color:var(--amber-600);}
.mc-slot-actions{display:flex;gap:9px;margin-top:14px;}
.mc-shell .mc-act{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:700;padding:11px;border-radius:10px;border:1px solid var(--gray-200);background:#fff;color:var(--gray-700);cursor:pointer;transition:.12s;font-family:inherit;}
.mc-shell .mc-act svg{width:15px;height:15px;}
.mc-shell .mc-act.mc-si:hover,.mc-shell .mc-act.mc-si.mc-on{background:var(--green-500);border-color:var(--green-500);color:#fff;}
.mc-shell .mc-act.mc-no:hover,.mc-shell .mc-act.mc-no.mc-on{background:var(--red-600);border-color:var(--red-600);color:#fff;}
.mc-shell .mc-act:disabled{opacity:.6;cursor:not-allowed;}
.mc-state-line{display:flex;align-items:center;gap:7px;margin-top:11px;font-size:12px;font-weight:600;}
.mc-state-line.mc-si{color:var(--green-600);}
.mc-state-line.mc-no{color:var(--red-600);}
.mc-state-line.mc-closed{color:var(--gray-500);}
.mc-state-line .mc-ic{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;}
.mc-state-line.mc-si .mc-ic{background:var(--green-500);}
.mc-state-line.mc-no .mc-ic{background:var(--red-600);}
.mc-shell .mc-ch{margin-left:auto;font-size:11px;font-weight:600;color:var(--gray-400);cursor:pointer;background:transparent;border:0;padding:0;font-family:inherit;}
.mc-shell .mc-ch:hover{color:var(--navy-700);}
.mc-foot-note{padding:0 20px 18px;font-size:11.5px;color:var(--gray-400);text-align:center;}

.mc-msg{padding:22px 10px;text-align:center;font-size:13px;color:var(--gray-500);}
.mc-err{margin:0 18px 16px;padding:12px 14px;border-radius:12px;background:var(--red-50);border:1px solid #F3CBC9;color:var(--red-600);font-size:13px;font-weight:600;}
.mc-cal-err{margin-top:12px;padding:12px 14px;border-radius:12px;background:var(--red-50);border:1px solid #F3CBC9;color:var(--red-600);font-size:13px;font-weight:600;}

@media(max-width:1120px){
  .mc-shell{grid-template-columns:1fr;}
  .mc-rail{position:static;order:0;}
}
`;

// ── Iconos (inline, como la referencia) ───────────────────────────────────────
const IcCheck = ({ w = 24 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" width={w} height={w}>
    <path d="M5 12.5l4 4 10-10" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IcCross = ({ w = 24 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" width={w} height={w}>
    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
);
const IcClock = ({ w = 24 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={w} height={w}>
    <path d="M12 8v4l2.5 1.5" strokeLinecap="round" /></svg>
);
const IcClockCircle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="8.5" /><path d="M12 8v4l2.5 1.5" strokeLinecap="round" /></svg>
);
const IcChevron = ({ dir }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
    <path d={dir === 'l' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} strokeLinecap="round" strokeLinejoin="round" /></svg>
);

// ── Helpers de fecha (aritmética en UTC para no correr de día por zona) ───────
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
const aUTC = (iso) => { const [a, m, d] = iso.split('-').map(Number); return Date.UTC(a, m - 1, d); };
const diffDias = (isoA, isoB) => Math.round((aUTC(isoB) - aUTC(isoA)) / 86400000);
const claveItem = (item) => `${item.fecha}-${item.evento_id ?? 'dom'}`;

// Mezcla lineal con blanco → tinte pastel OPACO (no rgba con alpha, que se
// mezclaría con el fondo). Acepta '#RGB' y '#RRGGBB'.
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

// Color base de un item para chips/tintes: domingo → celeste; evento → su color.
const colorDe = (item) => (item.tipo === 'domingo' ? SKY : (item.tipo_color || COLOR_EVENTO_DEFAULT));

// Etiqueta de cierre para un slot pendiente. El backend bloquea cuando
// hoy >= fecha-1, así que un item abierto tiene fecha-1 > hoy.
function etiquetaCierre(fecha, hoy) {
  if (!hoy) return 'Por responder';
  const dias = diffDias(hoy, fecha) - 1; // días hasta el cierre (fecha-1)
  if (dias <= 0) return 'Cierra hoy';
  if (dias === 1) return 'Cierra mañana';
  return `Cierra en ${dias} días`;
}

export default function PanelVoluntario() {
  const [mes,      setMes]      = useState(mesDeHoy);
  const [data,     setData]     = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState('');
  const [sel,      setSel]      = useState(null);   // fecha 'YYYY-MM-DD' seleccionada en el grid
  const [enviando, setEnviando] = useState(null);   // clave del item que se envía
  const [editando, setEditando] = useState({});     // claveItem -> true (reabrir botones tras "Cambiar")
  const [recarga,  setRecarga]  = useState(0);

  const itemRefs = useRef({});

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
    setEditando({});
  };
  const irHoy = () => {
    setCargando(true);
    setMes(mesDeHoy());
    setSel(null);
    setEditando({});
  };

  const dias  = data?.dias ?? [];
  const hoyISO = data?.hoy ?? '';

  // Items por fecha (un domingo con evento tiene dos).
  const itemsPorFecha = useMemo(() => {
    const map = new Map();
    for (const d of dias) {
      if (!map.has(d.fecha)) map.set(d.fecha, []);
      map.get(d.fecha).push(d);
    }
    return map;
  }, [dias]);
  const itemsDe = (fecha) => itemsPorFecha.get(fecha) ?? [];

  // ── Mini-KPIs del mes (sobre lo que le toca marcar) ──────────────────────────
  const kpis = useMemo(() => {
    let si = 0, no = 0, pend = 0;
    for (const d of dias) {
      if (!d.puede_marcar) continue;
      if (d.estado === 'disponible') si++;
      else if (d.estado === 'no_disponible') no++;
      else if (!d.bloqueado) pend++;
    }
    return { si, no, pend };
  }, [dias]);

  // ── Lista del rail: SOLO lo que el voluntario tiene que responder ────────────
  // Filtro: domingos (siempre) + eventos donde puede_marcar (su ministerio sirve
  // en ese evento de servicio). Los informativos y los eventos de otros
  // ministerios NO entran a la lista (sí se ven en el calendario de la izquierda).
  // Se mantiene el filtro de solo mostrar de hoy en adelante.
  // Orden por prioridad de acción: 0 pendiente-abierto · 1 respondido · 2 cerrado.
  const listado = useMemo(() => {
    const prioridad = (d) => {
      if (d.estado) return 1;
      if (d.bloqueado) return 2;
      return 0;
    };
    return [...dias]
      .filter(d => (!hoyISO || d.fecha >= hoyISO) && (d.tipo === 'domingo' || d.puede_marcar))
      .sort((a, b) => {
        const pa = prioridad(a), pb = prioridad(b);
        if (pa !== pb) return pa - pb;
        if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
        return a.tipo === 'domingo' ? -1 : 1;
      });
  }, [dias, hoyISO]);

  function tocarDia(fecha) {
    const items = itemsDe(fecha);
    if (items.length === 0) return;
    setSel(fecha);
    // Busca el primer item de esa fecha que SÍ está en la lista (los
    // informativos/otros ministerios ya no se renderizan como slot, así que su
    // ref no existe): si ninguno está, solo resalta el día y no hace scroll.
    for (const it of items) {
      const el = itemRefs.current[claveItem(it)];
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); break; }
    }
  }

  async function marcar(item, estado) {
    const clave = claveItem(item);
    setEnviando(clave);
    setError('');
    try {
      await voluntarioDisponibilidadApi.marcar({
        fecha: item.fecha, evento_id: item.evento_id, estado,
      });
      setData(d => ({
        ...d,
        dias: d.dias.map(x =>
          x.fecha === item.fecha && x.evento_id === item.evento_id ? { ...x, estado } : x),
      }));
      setEditando(e => { const n = { ...e }; delete n[clave]; return n; });
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar tu respuesta');
      if (err.response?.status === 403) { setCargando(true); setRecarga(n => n + 1); }
    } finally {
      setEnviando(null);
    }
  }

  // ── Celdas del grid (con días de meses vecinos como en la referencia) ────────
  // Cada celda lleva su fecha ISO (incluidos los días 'out' de meses vecinos).
  // Se agrupan en semanas de 7 y se DESCARTAN por completo las semanas totalmente
  // pasadas (ninguna celda con fecha >= hoy): así no dejan franja vertical vacía.
  // Como cada semana visible aporta exactamente 7 celdas, el grid de 7 columnas
  // sigue alineado con el encabezado DOM..SÁB (solo desaparecen filas enteras).
  const celdas = useMemo(() => {
    if (!data) return [];
    const [anio, nMes] = data.mes.split('-').map(Number);
    const lead = data.diaSemanaPrimero;                     // 0 = domingo
    const prevDias = new Date(Date.UTC(anio, nMes - 1, 0)).getUTCDate();
    const pad = (n) => String(n).padStart(2, '0');
    // Mes anterior / siguiente para las fechas ISO de los días 'out'.
    const pm = nMes - 1 < 1 ? 12 : nMes - 1;
    const py = nMes - 1 < 1 ? anio - 1 : anio;
    const nm = nMes + 1 > 12 ? 1 : nMes + 1;
    const ny = nMes + 1 > 12 ? anio + 1 : anio;

    const cells = [];
    for (let i = lead - 1; i >= 0; i--) {
      const num = prevDias - i;
      cells.push({ tipo: 'out', num, fecha: `${py}-${pad(pm)}-${pad(num)}` });
    }
    for (let d = 1; d <= data.diasEnMes; d++) {
      cells.push({ tipo: 'dia', num: d, fecha: `${data.mes}-${pad(d)}` });
    }
    const trail = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= trail; d++) {
      cells.push({ tipo: 'out', num: d, fecha: `${ny}-${pad(nm)}-${pad(d)}` });
    }

    // Agrupar en semanas de 7 y quedarnos solo con las que tienen al menos un
    // día de hoy en adelante. Sin `hoy` (fallback) se muestran todas.
    const hoy = data.hoy || '';
    const semanas = [];
    for (let i = 0; i < cells.length; i += 7) semanas.push(cells.slice(i, i + 7));
    return semanas.filter(sem => !hoy || sem.some(c => c.fecha >= hoy)).flat();
  }, [data]);

  // Estado de servicio de una celda (marca el badge/barra): el domingo manda,
  // si no el primer item marcable.
  const servicioDe = (items) => {
    const marcables = items.filter(m => m.puede_marcar);
    if (marcables.length === 0) return null;
    return marcables.find(m => m.tipo === 'domingo') ?? marcables[0];
  };

  return (
    <div className="mc-shell">
      <style>{CSS}</style>

      {/* ── Columna derecha (1fr): KPIs + calendario ──────────────────────── */}
      <div>
        <div className="mc-sumrow">
          <div className="mc-sum">
            <span className="mc-sum-dot" style={{ background: 'var(--green-50)', color: 'var(--green-600)' }}><IcCheck /></span>
            <div><div className="mc-sum-n">{kpis.si}</div><div className="mc-sum-l">Sí sirvo</div></div>
          </div>
          <div className="mc-sum">
            <span className="mc-sum-dot" style={{ background: 'var(--red-50)', color: 'var(--red-600)' }}><IcCross /></span>
            <div><div className="mc-sum-n">{kpis.no}</div><div className="mc-sum-l">No puedo</div></div>
          </div>
          <div className="mc-sum">
            <span className="mc-sum-dot" style={{ background: 'var(--amber-50)', color: 'var(--amber-600)' }}><IcClockCircle /></span>
            <div><div className="mc-sum-n">{kpis.pend}</div><div className="mc-sum-l">Por responder</div></div>
          </div>
        </div>

        <div className="mc-card mc-cal-wrap">
          <div className="mc-cal-head">
            <div className="mc-cal-title">
              <span className="mc-m">{MESES[Number(mes.slice(5, 7)) - 1]}</span>
              <span className="mc-y">{mes.slice(0, 4)}</span>
            </div>
            <div className="mc-cal-nav">
              <button className="mc-cal-today" onClick={irHoy}>Hoy</button>
              <button className="mc-cal-arrow" onClick={() => irAMes(-1)} aria-label="Mes anterior"><IcChevron dir="l" /></button>
              <button className="mc-cal-arrow" onClick={() => irAMes(1)} aria-label="Mes siguiente"><IcChevron dir="r" /></button>
            </div>
          </div>
          <div className="mc-cal-sub">Toca un día para verlo en la lista. Los eventos donde te toca servir llevan una marca de estado.</div>

          <div className="mc-dow">{DOW_CORTO.map(d => <div key={d}>{d}</div>)}</div>

          {cargando ? (
            <div className="mc-msg">Cargando tu calendario…</div>
          ) : !data ? (
            <div className="mc-msg">Sin datos de este mes.</div>
          ) : (
            <div className="mc-grid">
              {celdas.map((c, i) => {
                if (c.tipo === 'out') {
                  return <div key={`o${i}`} className="mc-cell mc-out"><span className="mc-num">{c.num}</span></div>;
                }
                // Día pasado (fecha < hoy, zona México, comparando strings ISO):
                // celda COMPLETAMENTE VACÍA (sin número, sin caja, sin nada) que
                // solo ocupa su lugar en la cuadrícula para no descuadrar las
                // columnas. Las semanas 100% pasadas ya ni llegan aquí (se
                // colapsan en el useMemo de `celdas`). No es clickable.
                if (hoyISO && c.fecha < hoyISO) {
                  return <div key={c.fecha} className="mc-cell mc-gone" aria-hidden="true" />;
                }
                const items = itemsDe(c.fecha);
                const esHoy = c.fecha === hoyISO;
                const esDomingo = dowDeISO(c.fecha) === 0;
                const eventos = items.filter(m => m.tipo === 'evento');
                const domingo = items.find(m => m.tipo === 'domingo');
                const servicio = servicioDe(items);

                // Tinte de fondo por tipo (domingo → celeste; si no, color del 1er evento).
                let tint = null;
                if (domingo) tint = { background: 'var(--sky-50)', borderColor: '#CFE4F3' };
                else if (eventos[0]) tint = { background: tintePastel(colorDe(eventos[0]), 0.13), borderColor: tintePastel(colorDe(eventos[0]), 0.30) };

                // Clase de estado de servicio.
                let statusCls = '';
                if (servicio) {
                  if (servicio.estado === 'disponible') statusCls = 'mc-status-si';
                  else if (servicio.estado === 'no_disponible') statusCls = 'mc-status-no';
                  else if (!servicio.bloqueado) statusCls = 'mc-status-pend';
                }

                const clases = ['mc-cell'];
                if (esDomingo) clases.push('mc-sun');
                if (esHoy) clases.push('mc-today');
                if (servicio) clases.push('mc-serve');
                if (statusCls) clases.push(statusCls);
                const esSel = sel === c.fecha;

                // Pills: domingo primero, luego eventos. Máx 2, si hay más "+N".
                const pills = [];
                if (domingo) pills.push({ key: 'dom', nombre: domingo.nombre, color: SKY, sunday: true });
                for (const ev of eventos) pills.push({ key: ev.evento_id, nombre: ev.nombre, color: colorDe(ev), sunday: false });
                const visibles = pills.slice(0, pills.length > 2 ? 1 : 2);
                const resto = pills.length - visibles.length;

                return (
                  <button
                    key={c.fecha}
                    className={clases.join(' ')}
                    style={{
                      ...(tint || {}),
                      ...(esHoy ? { borderColor: 'var(--orange-400)' } : {}),
                      ...(esSel ? { boxShadow: '0 0 0 2px var(--orange-500)' } : {}),
                    }}
                    onClick={() => tocarDia(c.fecha)}
                    title={items.map(m => m.nombre).join(' · ')}
                  >
                    <span className="mc-num">{c.num}</span>
                    {servicio && statusCls === 'mc-status-si' && <span className="mc-badge mc-si"><IcCheck w={10} /></span>}
                    {servicio && statusCls === 'mc-status-no' && <span className="mc-badge mc-no"><IcCross w={10} /></span>}
                    {servicio && statusCls === 'mc-status-pend' && <span className="mc-badge mc-pend"><IcClock w={10} /></span>}
                    {visibles.map(p => (
                      <div key={p.key} className="mc-ev"
                        style={{
                          background: p.sunday ? 'var(--sky-50)' : tintePastel(p.color, 0.20),
                          color: p.sunday ? '#1c6294' : p.color,
                        }}>
                        {p.nombre}
                      </div>
                    ))}
                    {resto > 0 && <div className="mc-ev mc-ev-mas">+{resto} más</div>}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mc-legend">
            <div className="mc-lg"><span className="mc-sw" style={{ background: 'var(--green-500)' }} />Sí sirvo</div>
            <div className="mc-lg"><span className="mc-sw" style={{ background: 'var(--red-600)' }} />No puedo</div>
            <div className="mc-lg"><span className="mc-sw" style={{ background: 'var(--amber-600)' }} />Por responder</div>
            <div className="mc-lg"><span className="mc-rr" />Sin servicio</div>
            <div className="mc-lg"><span className="mc-sw" style={{ background: 'var(--sky)' }} />Domingo</div>
            <div className="mc-lg"><span className="mc-sw" style={{ background: 'var(--orange-500)' }} />Evento</div>
          </div>

          {error && <div className="mc-cal-err">{error}</div>}
        </div>
      </div>

      {/* ── Columna izquierda (410px, order:-1): Te toca servir ────────────── */}
      <div className="mc-card mc-rail">
        <div className="mc-rail-head">
          <h3>Te toca servir</h3>
          <p>Estas son las fechas en las que te toca servir. Marca si puedes o no.</p>
        </div>

        <div className="mc-rail-list">
          {cargando ? (
            <div className="mc-msg">Cargando…</div>
          ) : listado.length === 0 ? (
            <div className="mc-msg">No tienes fechas por responder este mes.</div>
          ) : (
            listado.map(item => {
              const clave   = claveItem(item);
              const ocupado = enviando === clave;
              const dow     = dowDeISO(item.fecha);
              const color   = colorDe(item);
              const esSel   = sel === item.fecha;
              const reabierto = editando[clave];
              // Estados del slot.
              const pendienteAbierto = item.puede_marcar && !item.bloqueado && (item.estado == null || reabierto);
              const respondido = item.puede_marcar && item.estado != null && !reabierto;
              const cerradoSinResp = item.puede_marcar && item.bloqueado && item.estado == null;

              return (
                <div
                  key={clave}
                  ref={el => { if (el) itemRefs.current[clave] = el; }}
                  className={`mc-slot ${pendienteAbierto ? 'mc-pending' : ''} ${esSel ? 'mc-sel' : ''}`}
                >
                  <div className="mc-slot-top">
                    <div className="mc-date-chip">
                      <div className="mc-cd">{diaDeISO(item.fecha)}</div>
                      <div className="mc-cw">{DOW_CORTO[dow]}</div>
                    </div>

                    <div className="mc-slot-body">
                      <div className="mc-slot-name">{item.nombre}</div>
                      <div className="mc-slot-meta">
                        <span className="mc-chip-role">
                          <span className="mc-rd" style={{ background: color }} />
                          {item.tipo === 'domingo' ? 'Domingo' : (item.tipo_evento || 'Evento')}
                        </span>
                        {pendienteAbierto && item.estado == null && (
                          <span className="mc-tag mc-tag-warn">{etiquetaCierre(item.fecha, hoyISO)}</span>
                        )}
                      </div>

                      {/* Respondido: línea de estado + Cambiar */}
                      {respondido && (
                        <div className={`mc-state-line ${item.estado === 'disponible' ? 'mc-si' : 'mc-no'}`}>
                          <span className="mc-ic">{item.estado === 'disponible' ? <IcCheck w={11} /> : <IcCross w={11} />}</span>
                          {item.estado === 'disponible' ? 'Confirmado · Sí sirvo' : 'No puedo servir'}
                          {!item.bloqueado && (
                            <button className="mc-ch" onClick={() => setEditando(e => ({ ...e, [clave]: true }))}>Cambiar</button>
                          )}
                        </div>
                      )}

                      {/* Cerrado sin respuesta */}
                      {cerradoSinResp && (
                        <div className="mc-state-line mc-closed">🔒 Ya cerró · sin respuesta</div>
                      )}
                    </div>
                  </div>

                  {/* Pendiente/abierto o reabierto con "Cambiar": botones */}
                  {pendienteAbierto && (
                    <div className="mc-slot-actions">
                      <button
                        className={`mc-act mc-si ${item.estado === 'disponible' ? 'mc-on' : ''}`}
                        onClick={() => marcar(item, 'disponible')} disabled={ocupado}>
                        <IcCheck w={15} />{ocupado ? '…' : 'Sí sirvo'}
                      </button>
                      <button
                        className={`mc-act mc-no ${item.estado === 'no_disponible' ? 'mc-on' : ''}`}
                        onClick={() => marcar(item, 'no_disponible')} disabled={ocupado}>
                        <IcCross w={15} />{ocupado ? '…' : 'No puedo'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="mc-foot-note">Los cambios cierran 1 día antes de cada fecha.</div>
      </div>
    </div>
  );
}
