import { useEffect, useMemo, useRef, useState } from 'react';
import { voluntarioDisponibilidadApi } from '../../services/api';
import AvisoDestacado from '../../components/AvisoDestacado';
import Modal from '../../components/Modal';
import { I } from '../../components/Icons';
import CalendarioMes from '../../components/CalendarioMes';
import { useTiposEvento } from '../../context/TiposEventoContext';

const FONT_STACK = '"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif';

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
  letter-spacing:-.006em;color:var(--ink);width:100%;max-width:820px;
  /* "Mi calendario" es solo contadores + cuadrícula (la lista "Donde colaboras"
     se moverá a otra pestaña). Una sola columna en todos los anchos: contadores
     arriba, cuadrícula debajo. Ancho cómodo, sin espacio muerto. */
  display:grid;grid-template-columns:1fr;grid-template-areas:"kpis" "cal";
  gap:16px;align-items:start;
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

/* ===== calendario =====
   La cuadrícula del mes (cabecera, días, celdas, palabra del evento, lista de
   especiales y el indicador de esquina .cm-corner) vive ahora en el componente
   compartido components/CalendarioMes.jsx (clases cm-*), reutilizado por este
   panel y por el del líder. Aquí solo quedan los estilos propios del voluntario
   (contadores, detalle/modal, mensajes). */

/* Detalle del día seleccionado (reemplaza la leyenda de colores). */
.mc-detail{margin-top:16px;padding-top:14px;border-top:1px solid var(--gray-100);}
.mc-detail-date{font-size:15px;font-weight:700;color:var(--navy-900);}
.mc-detail-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;}
.mc-detail-name{font-size:15px;color:var(--navy-900);font-weight:500;min-width:0;}
.mc-detail-state{font-size:15px;font-weight:700;white-space:nowrap;flex-shrink:0;}
.mc-detail-hint{font-size:15px;color:var(--gray-600);}
/* Cada evento del día seleccionado: nombre + su acción (marcar / cambiar). */
.mc-detail-item{margin-top:14px;}


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
.mc-cal-err{margin-top:12px;padding:12px 14px;border-radius:12px;background:var(--red-50);border:1px solid #F3CBC9;color:var(--red-600);font-size:15px;font-weight:600;}
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

// Color base de un item (domingo → celeste; evento → su color) y mezcla a un
// tinte pastel claro y OPACO. Se reutiliza para regresar el color por estado al
// fondo de cada celda de la cuadrícula.
const COLOR_EVENTO_DEFAULT = '#FF6B2B';
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
  const [enviando, setEnviando] = useState(null);   // clave del item que se envía
  const [editando, setEditando] = useState({});     // claveItem -> true (reabrir botones tras "Cambiar")
  const [recarga,  setRecarga]  = useState(0);

  const itemRefs = useRef({});

  // Colores de tipo de evento definidos en Stewardship (mismo origen que "Mis
  // puestos"): color de texto/borde, fondo de celda y tono oscuro, por tipo.
  const { tipoColor = {}, tipoCellBg = {}, tipoColorDark = {} } = useTiposEvento() || {};

  // Acento naranja/menta del campus (para hoy, selección y "Sí colaboro").
  const accent = ((typeof localStorage !== 'undefined' && localStorage.getItem('campus_activo')) || 'ags') === 'gdl'
    ? '#2DD4BF' : '#FF6B2B';

  // Nombre del TIPO del día para color/fondo/palabra: el evento manda; un domingo
  // genérico se trata como "Servicio dominical" (tipo que existe en tipos_evento).
  const tipoNombreDe = (items) => {
    const evento = items.find(m => m.tipo === 'evento');
    if (evento) return evento.tipo_evento || null;
    if (items.some(m => m.tipo === 'domingo')) return 'Servicio dominical';
    return null;
  };

  // Nombre del evento para la celda: quita un sufijo de hora al final
  // ("Santuario 6:00 am" → "Santuario", "Reunión 18:00" → "Reunión"). Si al
  // quitar la hora quedara vacío, conserva el nombre original.
  const sinHora = (s) => {
    const t = (s || '').replace(/\s+\d{1,2}:\d{2}\s*(?:[ap]\.?\s?m\.?|hrs?|h)?\.?$/i, '').trim();
    return t || (s || '');
  };

  // Color sólido del tipo del día (para el punto del índice y del modal).
  const colorTipoDia = (items) => {
    const nombre = tipoNombreDe(items);
    if (!nombre) return '#9CB0CC';
    const evento = items.find(m => m.tipo === 'evento');
    return tipoColor[nombre] || (evento && evento.tipo_color) || COLOR_EVENTO_DEFAULT;
  };

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

  // Índice de solo lectura: SOLO los eventos ESPECIALES del mes visible (de hoy
  // en adelante, igual que la cuadrícula), ordenados por fecha ascendente. Se
  // excluye el domingo genérico de servicio (tipo 'domingo'); un evento especial
  // que caiga en domingo SÍ aparece (es un item aparte de tipo 'evento').
  const indiceEventos = useMemo(() => {
    if (!data) return [];
    return dias
      .filter(d => d.fecha.slice(0, 7) === data.mes && (!hoyISO || d.fecha >= hoyISO) && d.tipo !== 'domingo')
      .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  }, [dias, data, hoyISO]);

  // Al tocar un día (celda o índice) se abre el modal con su detalle y, si se
  // puede responder, los botones para marcar. Sin evento, no abre nada.
  function tocarDia(fecha) {
    const items = itemsDe(fecha);
    if (items.length === 0) return;
    setSel(fecha);
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

  // Indicador de esquina de la celda = estado de TU respuesta (palomita · tacha ·
  // aro). Lo consume CalendarioMes vía renderCorner; el resaltado por ministerio
  // no aplica al voluntario (eso es del panel del líder).
  const renderCornerEstado = (items) => {
    const marcables = items.filter(m => m.puede_marcar);
    const servicio = marcables.find(m => m.tipo === 'domingo') ?? marcables[0] ?? null;
    let estadoMark = null;
    if (servicio) {
      if (servicio.estado === 'disponible') estadoMark = 'si';
      else if (servicio.estado === 'no_disponible') estadoMark = 'no';
      else if (!servicio.bloqueado) estadoMark = 'pend';
    }
    if (estadoMark === 'si') return <span className="cm-corner" style={{ background: '#15915A', color: '#fff' }}><I.check size={9} /></span>;
    if (estadoMark === 'no') return <span className="cm-corner" style={{ background: '#D23B36', color: '#fff' }}><I.x size={9} /></span>;
    if (estadoMark === 'pend') return <span className="cm-corner" style={{ background: '#fff', border: `2px solid ${accent}` }} />;
    return null;
  };

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

      {/* ── Calendario del mes (cuadrícula compartida CalendarioMes) ────────── */}
      <div style={{ gridArea: 'cal', minWidth: 0 }}>
        <CalendarioMes
          mes={mes}
          hoyISO={hoyISO}
          onPrev={() => irAMes(-1)}
          onNext={() => irAMes(1)}
          onHoy={irHoy}
          cargando={cargando || !data}
          loadingText="Cargando tu calendario…"
          itemsDe={itemsDe}
          indice={indiceEventos}
          sel={sel}
          onTocarDia={tocarDia}
          accent={accent}
          renderCorner={renderCornerEstado}
        />
        {error && <div className="mc-cal-err" style={{ marginTop: 12 }}>{error}</div>}
      </div>

      {/* ── Modal del día seleccionado: detalle + marcar (Sí colaboro / No puedo).
          Sale al tocar una celda o un renglón del índice. Reusa la MISMA función
          de guardado `marcar`; estilos inline para que el color sea confiable. ── */}
      {sel && (
        <Modal title={fechaLarga(sel)} onClose={() => setSel(null)}>
          <div style={{ fontFamily: FONT_STACK, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {itemsDe(sel).length === 0 ? (
              <div style={{ fontSize: 15, color: '#5A6472' }}>Sin eventos este día.</div>
            ) : itemsDe(sel).map(it => {
              const clave = claveItem(it);
              const ocupado = enviando === clave;
              const reabierto = editando[clave];
              const pendienteAbierto = it.puede_marcar && !it.bloqueado && (it.estado == null || reabierto);
              const respondido = it.puede_marcar && it.estado != null && !reabierto;
              const cerradoSinResp = it.puede_marcar && it.bloqueado && it.estado == null;
              return (
                <div key={clave}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: colorTipoDia(itemsDe(sel)) }} />
                    <span style={{ fontSize: 17, fontWeight: 600, color: '#112540' }}>{it.tipo === 'domingo' ? 'Servicio dominical' : it.nombre}</span>
                  </div>
                  {it.tipo !== 'domingo' && it.tipo_evento && (
                    <div style={{ marginLeft: 20, marginTop: 2, fontSize: 15, color: '#5A6472' }}>{it.tipo_evento}</div>
                  )}

                  {pendienteAbierto ? (
                    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                      <button
                        type="button" disabled={ocupado} onClick={() => marcar(it, 'disponible')}
                        style={{ flex: 1, minHeight: 48, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT_STACK, fontSize: 17, fontWeight: 700, background: accent, color: '#FFFFFF', border: `2px solid ${accent}`, opacity: ocupado ? 0.6 : 1 }}
                      >
                        <I.check size={18} /> {ocupado ? '…' : 'Sí colaboro'}
                      </button>
                      <button
                        type="button" disabled={ocupado} onClick={() => marcar(it, 'no_disponible')}
                        style={{ flex: 1, minHeight: 48, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT_STACK, fontSize: 17, fontWeight: 700, background: '#FFFFFF', color: '#112540', border: '2px solid #CBD2DC', opacity: ocupado ? 0.6 : 1 }}
                      >
                        <I.x size={18} /> {ocupado ? '…' : 'No puedo'}
                      </button>
                    </div>
                  ) : respondido ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                      {it.estado === 'disponible' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 17, fontWeight: 700, color: '#15915A' }}>
                          <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#E6F5EC', color: '#15915A' }}><I.check size={16} /></span>
                          Sí colaboro
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 17, fontWeight: 700, color: '#5A6472' }}>
                          <span style={{ display: 'inline-flex', color: '#5A6472' }}><I.x size={22} /></span>
                          No puedo
                        </span>
                      )}
                      {!it.bloqueado && (
                        <button
                          type="button" onClick={() => setEditando(e => ({ ...e, [clave]: true }))}
                          style={{ minHeight: 48, borderRadius: 12, padding: '12px 18px', cursor: 'pointer', fontFamily: FONT_STACK, fontSize: 16, fontWeight: 600, background: '#fff', color: '#112540', border: '1px solid #CBD2DC' }}
                        >
                          Cambiar
                        </button>
                      )}
                    </div>
                  ) : cerradoSinResp ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12 }}>
                      <span style={{ fontSize: 17, fontWeight: 700, color: '#5A6472' }}>Sin responder</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 15, fontWeight: 700, color: '#5A6472' }}><I.clock size={16} /> Ya cerró</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {error && <div style={{ fontSize: 15, fontWeight: 600, color: '#D23B36' }}>{error}</div>}
          </div>
        </Modal>
      )}

      {/* ── "Donde colaboras": OCULTA en "Mi calendario". El código y sus estilos
          NO se borran: se reutilizan en la pestaña de Invitaciones (paso posterior).
          Por ahora solo NO se renderiza; marcar disponibilidad vive en el detalle
          del día, arriba. ── */}
      {false && (
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
      )}
      </div>
    </>
  );
}
