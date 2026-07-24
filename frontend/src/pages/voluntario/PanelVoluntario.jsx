import { useEffect, useMemo, useRef, useState } from 'react';
import { voluntarioDisponibilidadApi } from '../../services/api';
import AvisoDestacado from '../../components/AvisoDestacado';
import { I } from '../../components/Icons';

// "Mi calendario" del voluntario, implementado según el handoff de diseño
// (referencia-Mi-Calendario.html / SPEC-Mi-Calendario.md): sistema azul marino +
// naranja, panel "Te toca servir" a la izquierda (410px, la acción va primero) y
// el calendario del mes a la derecha con las 3 mini-KPI arriba.
//
// El sidebar y la topbar los pone el Layout de la app; aquí solo va el cuerpo.
// El bloqueo (cierra 1 día antes), el campus y el ministerio los decide el
// backend; aquí solo se pinta y se revalida en el POST.

const DOW_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DOW_1 = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const DIAS_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Los estilos van todos scoped bajo `.mc-shell`; los tokens de color se
// declaran ahí mismo. Los colores/fuente de los botones van INLINE (no por
// clase) porque la regla global `.app button{font/color:inherit}` los pisaría.
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
  /* Panel izquierdo más angosto (pero ≥320px para que quepan sus 2 botones) y
     el calendario con ~2.4× su ancho. La lista "Donde colaboras" ocupa la
     columna izquierda (2 filas); a la derecha van los contadores y, debajo, la
     cuadrícula. En teléfono se apila: contadores → lista → cuadrícula. */
  display:grid;grid-template-columns:minmax(320px,1fr) 2.4fr;
  grid-template-areas:"list kpis" "list cal";gap:16px;align-items:start;
}
.mc-shell *{box-sizing:border-box;}
.mc-shell>*{min-width:0;}

.mc-card{background:#fff;border:1px solid var(--gray-200);border-radius:var(--r-xl);box-shadow:var(--shadow-sm);}

/* ===== mini-KPIs ===== */
.mc-sumrow{grid-area:kpis;display:flex;gap:10px;}
.mc-sum{flex:1;background:#fff;border:1px solid var(--gray-200);border-radius:var(--r-lg);padding:13px 15px;box-shadow:var(--shadow-sm);display:flex;align-items:center;gap:12px;}
.mc-sum-dot{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.mc-sum-dot svg{width:17px;height:17px;}
.mc-sum-n{font-size:22px;font-weight:800;letter-spacing:-.03em;line-height:1;color:var(--navy-900);font-variant-numeric:tabular-nums;}
.mc-sum-l{font-size:15px;color:var(--gray-600);font-weight:600;margin-top:3px;line-height:1.2;}

/* ===== calendario ===== */
.mc-cal-wrap{grid-area:cal;padding:20px 22px 22px;}
.mc-cal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}
.mc-cal-title{display:flex;align-items:baseline;gap:10px;}
.mc-cal-title .mc-m{font-size:19px;font-weight:800;letter-spacing:-.02em;color:var(--navy-900);}
.mc-cal-title .mc-y{font-size:14px;font-weight:600;color:var(--gray-400);}
.mc-cal-nav{display:flex;align-items:center;gap:8px;}
.mc-shell .mc-cal-today{font-size:12px;font-weight:600;color:var(--navy-700);background:#fff;border:1px solid var(--gray-200);border-radius:8px;padding:7px 12px;cursor:pointer;}
.mc-shell .mc-cal-today:hover{background:var(--gray-50);}
.mc-shell .mc-cal-arrow{width:34px;height:34px;border-radius:9px;border:1px solid var(--gray-200);background:#fff;display:flex;align-items:center;justify-content:center;color:var(--navy-700);cursor:pointer;}
.mc-shell .mc-cal-arrow:hover{background:var(--gray-50);}

.mc-dow{display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:6px;}
.mc-dow div{font-size:13px;font-weight:700;letter-spacing:.02em;color:var(--gray-600);text-align:center;padding:4px 0;}
/* Celda cuadrada: número del día centrado + marcador(es) debajo. */
.mc-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;}
.mc-shell .mc-cell{aspect-ratio:1;border:1px solid var(--gray-100);border-radius:9px;padding:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;position:relative;background:#fff;transition:.12s;cursor:pointer;overflow:hidden;text-align:center;width:100%;font-family:inherit;}
.mc-shell .mc-cell:hover{border-color:var(--gray-300);box-shadow:var(--shadow-sm);}
.mc-shell .mc-cell.mc-out{background:var(--gray-50);border-color:transparent;cursor:default;}
.mc-shell .mc-cell.mc-out:hover{box-shadow:none;}
/* Día pasado: invisible (sin caja/fondo/sombra/color) pero conserva su lugar
   en la cuadrícula. Solo el número, en gris muy tenue. No interactivo. */
.mc-shell .mc-cell.mc-gone{background:transparent;border-color:transparent;box-shadow:none;cursor:default;}
.mc-shell .mc-cell.mc-gone:hover{box-shadow:none;border-color:transparent;}
.mc-num{font-size:15px;font-weight:600;color:var(--navy-800);line-height:1;display:flex;align-items:center;justify-content:center;font-variant-numeric:tabular-nums;}
.mc-shell .mc-cell.mc-out .mc-num{color:var(--gray-300);}
.mc-shell .mc-cell.mc-sun .mc-num{color:var(--navy-900);}

/* Marcador(es) del día: distinguen por FORMA además de color, para quien no
   distingue bien los colores. Círculo relleno = sí · círculo con equis = no ·
   círculo hueco con borde grueso = por responder. */
.mc-marks{display:flex;align-items:center;justify-content:center;gap:3px;min-height:8px;}
.mc-mk{width:8px;height:8px;border-radius:50%;box-sizing:border-box;flex-shrink:0;}
.mc-mk-si{background:var(--green-600);}
.mc-mk-no{background:#3D4654;color:#fff;display:inline-flex;align-items:center;justify-content:center;width:9px;height:9px;}
.mc-mk-no svg{width:6px;height:6px;}
.mc-mk-pend{width:9px;height:9px;background:#fff;border:2px solid currentColor;}
.mc-mk-mas{font-size:11px;font-weight:700;color:var(--gray-600);line-height:1;}

/* Detalle del día seleccionado (reemplaza la leyenda de colores). */
.mc-detail{margin-top:16px;padding-top:14px;border-top:1px solid var(--gray-100);}
.mc-detail-date{font-size:15px;font-weight:700;color:var(--navy-900);}
.mc-detail-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;}
.mc-detail-name{font-size:15px;color:var(--navy-900);font-weight:500;min-width:0;}
.mc-detail-state{font-size:15px;font-weight:700;white-space:nowrap;flex-shrink:0;}
.mc-detail-hint{font-size:15px;color:var(--gray-600);}

/* ===== "Donde colaboras" (lista de fechas por responder) ===== */
/* Mismo patrón visual que MisPuestos para que el voluntario reconozca la forma. */
.mc-rail{grid-area:list;display:flex;flex-direction:column;position:sticky;top:0;}
.mc-rail-head{padding:20px 22px 0;}
.mc-rail-head h3{font-size:17px;font-weight:800;letter-spacing:-.02em;color:var(--navy-900);margin:0;}
.mc-rail-list{padding:16px 18px 20px;display:flex;flex-direction:column;gap:12px;}

.dc-card{border:1px solid var(--gray-200);border-radius:var(--r-lg);background:#fff;padding:14px 16px;display:flex;flex-direction:column;gap:8px;scroll-margin-top:12px;}
.dc-row1{display:flex;align-items:baseline;justify-content:space-between;gap:12px;}
.dc-fecha{font-size:15px;font-weight:500;color:var(--navy-900);white-space:nowrap;}
.dc-tipo{font-size:15px;font-weight:500;color:var(--gray-600);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;}
.dc-nombre{font-size:20px;font-weight:500;color:var(--navy-900);line-height:1.25;overflow-wrap:anywhere;}
.dc-sep{border:none;border-top:.5px solid var(--gray-200);margin:4px 0 2px;}
.dc-state-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.dc-state{display:inline-flex;align-items:center;gap:9px;font-size:17px;font-weight:700;}
.dc-state-ic{width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;}
.dc-lock{display:inline-flex;align-items:center;gap:7px;font-size:15px;font-weight:700;color:var(--gray-600);}
.dc-btns{display:flex;gap:10px;}
.mc-shell .dc-btn{flex:1;min-width:0;min-height:48px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-family:inherit;}
.mc-shell .dc-btn:disabled{opacity:.55;cursor:default;}
.mc-shell .dc-cambiar{min-height:48px;border-radius:12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-family:inherit;}
.mc-foot-note{padding:0 20px 18px;font-size:15px;color:var(--gray-600);text-align:center;}

.mc-msg{padding:22px 10px;text-align:center;font-size:15px;color:var(--gray-600);}
.mc-err{margin:0 18px 16px;padding:12px 14px;border-radius:12px;background:var(--red-50);border:1px solid #F3CBC9;color:var(--red-600);font-size:15px;font-weight:600;}
.mc-cal-err{margin-top:12px;padding:12px 14px;border-radius:12px;background:var(--red-50);border:1px solid #F3CBC9;color:var(--red-600);font-size:13px;font-weight:600;}

@media(max-width:1120px){
  .mc-shell{grid-template-columns:1fr;grid-template-areas:"kpis" "list" "cal";}
  .mc-rail{position:static;}
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
// Fecha escrita completa: "Domingo 26 de julio de 2026".
const fechaLarga = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return `${DIAS_LARGO[dowDeISO(iso)]} ${d} de ${MESES[m - 1].toLowerCase()} de ${a}`;
};
const claveItem = (item) => `${item.fecha}-${item.evento_id ?? 'dom'}`;

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

  // Acento naranja/menta del campus (para hoy, selección y "Sí colaboro").
  const accent = ((typeof localStorage !== 'undefined' && localStorage.getItem('campus_activo')) || 'ags') === 'gdl'
    ? '#2DD4BF' : '#FF6B2B';

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

  return (
    <>
      <AvisoDestacado />
      <div className="mc-shell">
      <style>{CSS}</style>

      {/* ── Contadores del mes (arriba en teléfono) ────────────────────────── */}
      <div className="mc-sumrow">
        <div className="mc-sum">
          <span className="mc-sum-dot" style={{ background: 'var(--green-50)', color: 'var(--green-600)' }}><IcCheck /></span>
          <div><div className="mc-sum-n">{kpis.si}</div><div className="mc-sum-l">Sí colaboro</div></div>
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

      {/* ── Calendario del mes ─────────────────────────────────────────────── */}
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
          <div className="mc-dow">{DOW_1.map((d, i) => <div key={i}>{d}</div>)}</div>

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
                // Día pasado: celda vacía que solo ocupa su lugar en la cuadrícula.
                if (hoyISO && c.fecha < hoyISO) {
                  return <div key={c.fecha} className="mc-cell mc-gone" aria-hidden="true" />;
                }
                const items = itemsDe(c.fecha);
                const esHoy = c.fecha === hoyISO;
                const esDomingo = dowDeISO(c.fecha) === 0;
                const esSel = sel === c.fecha;

                // Marcadores por FORMA: un círculo por cada servicio que le toca
                // marcar (relleno = sí · con equis = no · hueco = por responder).
                // Los eventos informativos (sin servicio) no llevan marcador.
                const marks = items
                  .filter(m => m.puede_marcar)
                  .map(m => (m.estado === 'disponible' ? 'si'
                    : m.estado === 'no_disponible' ? 'no'
                    : !m.bloqueado ? 'pend' : null))
                  .filter(Boolean);
                const visM = marks.length > 3 ? marks.slice(0, 2) : marks;
                const restoM = marks.length - visM.length;

                const clases = ['mc-cell'];
                if (esDomingo) clases.push('mc-sun');
                if (esHoy) clases.push('mc-today');

                return (
                  <button
                    key={c.fecha}
                    className={clases.join(' ')}
                    style={{
                      ...(esHoy ? { borderColor: accent, boxShadow: `inset 0 0 0 1px ${accent}` } : {}),
                      ...(esSel ? { boxShadow: `0 0 0 2px ${accent}` } : {}),
                    }}
                    onClick={() => tocarDia(c.fecha)}
                    title={items.map(m => m.nombre).join(' · ')}
                  >
                    <span className="mc-num" style={esHoy ? { color: accent } : undefined}>{c.num}</span>
                    <span className="mc-marks">
                      {visM.map((mk, j) => (
                        mk === 'si' ? <span key={j} className="mc-mk mc-mk-si" />
                          : mk === 'no' ? <span key={j} className="mc-mk mc-mk-no"><IcCross w={6} /></span>
                            : <span key={j} className="mc-mk mc-mk-pend" style={{ color: accent }} />
                      ))}
                      {restoM > 0 && <span className="mc-mk-mas">+{restoM}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Detalle del día seleccionado, con el estado EN PALABRAS (reemplaza la leyenda). */}
          <div className="mc-detail">
            {sel ? (
              <>
                <div className="mc-detail-date">{fechaLarga(sel)}</div>
                {itemsDe(sel).length === 0 ? (
                  <div className="mc-detail-row"><span className="mc-detail-hint">Sin eventos este día.</span></div>
                ) : itemsDe(sel).map(it => {
                  let palabra, color;
                  if (it.puede_marcar) {
                    if (it.estado === 'disponible') { palabra = 'Sí colaboro'; color = 'var(--green-600)'; }
                    else if (it.estado === 'no_disponible') { palabra = 'No puedo'; color = 'var(--gray-600)'; }
                    else if (!it.bloqueado) { palabra = 'Sin responder'; color = accent; }
                    else { palabra = 'Ya cerró'; color = 'var(--gray-600)'; }
                  } else {
                    palabra = it.tipo === 'domingo' ? 'Domingo' : (it.tipo_evento || 'Informativo');
                    color = 'var(--gray-600)';
                  }
                  return (
                    <div key={claveItem(it)} className="mc-detail-row">
                      <span className="mc-detail-name">{it.nombre}</span>
                      <span className="mc-detail-state" style={{ color }}>{palabra}</span>
                    </div>
                  );
                })}
              </>
            ) : (
              <span className="mc-detail-hint">Toca un día para ver su detalle.</span>
            )}
          </div>

          {error && <div className="mc-cal-err">{error}</div>}
        </div>

      {/* ── "Donde colaboras": fechas por responder (sube antes de la cuadrícula) ── */}
      <div className="mc-card mc-rail">
        <div className="mc-rail-head">
          <h3>Donde colaboras</h3>
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
              const reabierto = editando[clave];
              // Estados del slot (misma lógica de guardado que antes).
              const pendienteAbierto = item.puede_marcar && !item.bloqueado && (item.estado == null || reabierto);
              const respondido = item.puede_marcar && item.estado != null && !reabierto;
              const cerradoSinResp = item.puede_marcar && item.bloqueado && item.estado == null;
              const tipo = item.tipo === 'domingo' ? 'Domingo' : (item.tipo_evento || 'Evento');

              return (
                <div
                  key={clave}
                  ref={el => { if (el) itemRefs.current[clave] = el; }}
                  className="dc-card"
                  style={sel === item.fecha ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}
                >
                  {/* fila 1: fecha + tipo de evento */}
                  <div className="dc-row1">
                    <span className="dc-fecha">{DOW_CORTO[dow]} {diaDeISO(item.fecha)}</span>
                    <span className="dc-tipo">{tipo}</span>
                  </div>

                  {/* fila 2: nombre del evento */}
                  <div className="dc-nombre">{item.nombre}</div>

                  <hr className="dc-sep" />

                  {/* fila 3: estado */}
                  {pendienteAbierto ? (
                    <div className="dc-btns">
                      <button
                        type="button" className="dc-btn" disabled={ocupado}
                        onClick={() => marcar(item, 'disponible')}
                        style={{ fontFamily: 'inherit', fontSize: 17, fontWeight: 700, background: accent, color: '#FFFFFF', border: `2px solid ${accent}` }}
                      >
                        <I.check size={18} /> {ocupado ? '…' : 'Sí colaboro'}
                      </button>
                      <button
                        type="button" className="dc-btn" disabled={ocupado}
                        onClick={() => marcar(item, 'no_disponible')}
                        style={{ fontFamily: 'inherit', fontSize: 17, fontWeight: 700, background: '#FFFFFF', color: 'var(--navy-900)', border: '2px solid var(--gray-300)' }}
                      >
                        <I.x size={18} /> {ocupado ? '…' : 'No puedo'}
                      </button>
                    </div>
                  ) : respondido ? (
                    <div className="dc-state-row">
                      {item.estado === 'disponible' ? (
                        <span className="dc-state" style={{ color: 'var(--green-600)' }}>
                          <span className="dc-state-ic" style={{ background: 'var(--green-50)', color: 'var(--green-600)' }}><I.check size={16} /></span>
                          Sí colaboro
                        </span>
                      ) : (
                        <span className="dc-state" style={{ color: 'var(--gray-600)' }}>
                          <span style={{ display: 'inline-flex', color: 'var(--gray-600)' }}><I.x size={22} /></span>
                          No puedo
                        </span>
                      )}
                      {!item.bloqueado && (
                        <button
                          type="button" className="dc-cambiar"
                          onClick={() => setEditando(e => ({ ...e, [clave]: true }))}
                          style={{ fontFamily: 'inherit', fontSize: 16, fontWeight: 600, padding: '12px 18px', background: '#fff', color: 'var(--navy-900)', border: '1px solid var(--gray-300)' }}
                        >
                          Cambiar
                        </button>
                      )}
                    </div>
                  ) : cerradoSinResp ? (
                    <div className="dc-state-row">
                      <span className="dc-state" style={{ color: 'var(--gray-600)' }}>Sin responder</span>
                      <span className="dc-lock"><I.clock size={16} /> Ya cerró</span>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
          {error && <div className="mc-err" style={{ margin: '4px 0 0' }}>{error}</div>}
        </div>
        <div className="mc-foot-note">Los cambios cierran 1 día antes de cada fecha.</div>
      </div>
      </div>
    </>
  );
}
