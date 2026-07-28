import { useMemo, useState } from 'react';
import AvisoDestacado from '../../components/AvisoDestacado';
import Modal from '../../components/Modal';
import { I } from '../../components/Icons';
import CalendarioMes from '../../components/CalendarioMes';
import { useTiposEvento } from '../../context/TiposEventoContext';
import useDisponibilidadMes from '../../hooks/useDisponibilidadMes';

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

/* ===== mini-KPIs ===== */
.mc-sumrow{grid-area:kpis;display:grid;grid-template-columns:repeat(3,1fr);gap:9px;}
.mc-sum{background:#fff;border:1px solid var(--gray-200);border-radius:var(--r-lg);padding:12px 13px;box-shadow:var(--shadow-sm);display:flex;flex-direction:column;align-items:flex-start;gap:9px;min-width:0;}
.mc-sum-dot{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.mc-sum-dot svg{width:17px;height:17px;}
.mc-sum-n{font-size:23px;font-weight:800;letter-spacing:-.03em;line-height:1;color:var(--navy-900);font-variant-numeric:tabular-nums;}
.mc-sum-l{font-size:13.5px;color:var(--gray-600);font-weight:600;margin-top:2px;line-height:1.2;}

/* ===== calendario =====
   La cuadrícula del mes (cabecera, días, celdas, palabra del evento, lista de
   especiales y el indicador de esquina .cm-corner) vive ahora en el componente
   compartido components/CalendarioMes.jsx (clases cm-*), reutilizado por este
   panel y por el del líder. Aquí solo quedan los estilos propios del voluntario
   (contadores, detalle/modal, mensajes). */

/* Error del calendario (bajo la cuadrícula). El detalle del día y la lista de
   invitaciones viven en el modal (inline) y en components/ListaInvitaciones.jsx. */
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

// ── Helpers de fecha (aritmética en UTC para no correr de día por zona). La
// navegación de mes (mesDeHoy/sumaMes) vive en el hook useDisponibilidadMes. ──
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
  // Datos + guardado de disponibilidad (compartidos con la página Invitaciones).
  const {
    mes, data, cargando, error, dias, hoyISO,
    enviando, editando, setEditando, marcar,
    irAMes: dispIrAMes, irHoy: dispIrHoy,
  } = useDisponibilidadMes();

  const [sel, setSel] = useState(null);   // fecha 'YYYY-MM-DD' seleccionada en el grid

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

  // Navegación de mes: la del hook + limpiar la selección del grid.
  const irAMes = (n) => { dispIrAMes(n); setSel(null); };
  const irHoy  = () => { dispIrHoy(); setSel(null); };

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

  // Barra lateral de la celda = mismo estado de TU respuesta que la esquina
  // (verde sí · rojo no · ámbar pendiente). Solo en días donde puedes marcar.
  const barColorEstado = (items) => {
    const marcables = items.filter(m => m.puede_marcar);
    const servicio = marcables.find(m => m.tipo === 'domingo') ?? marcables[0] ?? null;
    if (!servicio) return null;
    if (servicio.estado === 'disponible') return '#15915A';
    if (servicio.estado === 'no_disponible') return '#D23B36';
    if (!servicio.bloqueado) return '#E5A519';
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
          barColor={barColorEstado}
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

      </div>
    </>
  );
}
