import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useMisAvisos, {
  recargarMisAvisos,
  marcarAvisoLeidoLocal,
  marcarTodosLeidosLocal,
  eliminarAvisoLocal,
} from '../../hooks/useMisAvisos';
import { misAvisosApi } from '../../services/api';
import { FONT, temaCampus, fmtFechaCorta } from './avisosTema';

// ─────────────────────────────────────────────────────────────────────────────
// Bandeja de avisos del destinatario (voluntario / líder), rediseñada como
// tablero de tarjetas. Pensada para adultos mayores y para leerse desde el
// teléfono: texto y toques grandes, y el estado NUNCA depende solo del color
// (punto naranja + etiqueta de texto para "sin leer", tacha verde para "leído").
//
// Banner con el conteo de no leídos · filtros (todos / sin leer / leídos y por
// categoría) · cuadrícula de 3 columnas que baja a 1 en el celular. Cada tarjeta
// lleva barra de color por categoría, etiqueta, fecha, título, adelanto (3
// líneas), remitente y las acciones "Marcar leído" y eliminar.
//
// De dónde salen los datos (GET /api/mis-avisos): { id, titulo, texto,
// ministerio_nombre, remitente, created_at, visto }. La CATEGORÍA se deriva del
// ministerio del aviso (o "General" si no tiene). El REMITENTE es quien lo envió
// (usuarios.nombre). "Eliminar" es un borrado suave por usuario (avisos_ocultos).
// ─────────────────────────────────────────────────────────────────────────────

// Colores de categoría (semánticos: NO cambian con el campus). bar = barra
// izquierda de la tarjeta; pill = etiqueta; dot = punto de la etiqueta / filtro.
const CATS = {
  alab: { bar: '#7C5CC4', pillBg: '#F1ECFB', pillInk: '#5B3F9E', dot: '#7C5CC4' },
  kids: { bar: '#D69B18', pillBg: '#FDF4E3', pillInk: '#B4820F', dot: '#D69B18' },
  orac: { bar: '#2E8C86', pillBg: '#E7F4F3', pillInk: '#1F6B66', dot: '#2E8C86' },
  serv: { bar: '#2C86C4', pillBg: '#E9F3FB', pillInk: '#1C6294', dot: '#2C86C4' },
  gral: { bar: '#244169', pillBg: '#F0F2F5', pillInk: '#5B6675', dot: '#8A94A3' },
};

// ministerio_nombre → clave de categoría (sin acentos, en minúsculas). Sin
// ministerio → "General"; un ministerio con nombre desconocido usa el color de
// "servicio" pero conserva SU nombre como etiqueta.
function claveCategoria(min) {
  if (!min) return 'gral';
  const s = min.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (s.includes('alaban')) return 'alab';
  if (s.includes('kid') || s.includes('nin') || s.includes('nino')) return 'kids';
  if (s.includes('oraci')) return 'orac';
  return 'serv';
}
function categoriaDe(min) {
  const key = claveCategoria(min);
  return { key, label: min || 'General', ...CATS[key] };
}

// Iniciales para el avatar del remitente ("Pastor Daniel" → "PD").
function iniciales(nombre) {
  const partes = (nombre || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '··';
  const a = partes[0][0] || '';
  const b = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (a + b).toUpperCase();
}

// hex → rgba con alfa (para tintes translúcidos del acento del campus).
function hexA(hex, a) {
  let h = (hex || '').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
// Mezcla un hex hacia el negro (para el fondo degradado del banner).
function oscurece(hex, peso) {
  let h = (hex || '').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  const m = (v) => Math.round(v * (1 - peso));
  return `rgb(${m((n >> 16) & 255)},${m((n >> 8) & 255)},${m(n & 255)})`;
}

// ── Íconos (en línea, como la referencia) ─────────────────────────────────────
const IcBell = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="26" height="26">
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.6 2.2H4.4z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" strokeLinecap="round" />
  </svg>
);
const IcChecks = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" width="17" height="17">
    <path d="M2 12.5l4 4 8-8M11 16.5l3.5 3.5 8-8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" width="16" height="16">
    <path d="M5 12.5l4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CSS = `
.ma-shell{font-family:var(--ma-font);width:100%;max-width:1080px;color:#0B1A2F}
.ma-shell *{box-sizing:border-box}

.ma-top{display:flex;justify-content:flex-end;margin-bottom:14px}
.ma-mark{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:800;
  padding:11px 16px;border-radius:11px;border:1.5px solid #D3DAE3;background:#fff;color:#2A3648}
.ma-mark:hover:not(:disabled){background:#F6F8FB;border-color:var(--ma-primary);color:var(--ma-primary)}
.ma-mark:disabled{opacity:.5;cursor:default}

.ma-hero{background:linear-gradient(105deg,var(--ma-hero-a),var(--ma-hero-b));border-radius:18px;
  padding:20px 24px;color:#fff;display:flex;align-items:center;gap:18px;position:relative;overflow:hidden}
.ma-hero::after{content:"";position:absolute;right:-38px;top:-38px;width:150px;height:150px;border-radius:50%;
  border:1px solid rgba(255,255,255,.10)}
.ma-hero-ic{flex-shrink:0;width:52px;height:52px;border-radius:15px;display:flex;align-items:center;
  justify-content:center;background:var(--ma-accent-soft);color:var(--ma-accent)}
.ma-hero-b{flex:1;min-width:0}
.ma-hero-eye{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ma-accent)}
.ma-hero-t{font-size:21px;font-weight:800;letter-spacing:-.01em;margin-top:3px;line-height:1.2}
.ma-hero-m{font-size:13.5px;color:#B7C4D6;margin-top:5px;line-height:1.4}
.ma-hero-n{flex-shrink:0;text-align:center;background:rgba(255,255,255,.08);border-radius:14px;
  padding:12px 18px;min-width:82px}
.ma-hero-n .n{font-size:30px;font-weight:800;line-height:1}
.ma-hero-n .l{font-size:11.5px;font-weight:600;color:#B7C4D6;margin-top:3px}

.ma-filters{display:flex;gap:9px;flex-wrap:wrap;margin:16px 0 15px}
.ma-chip{display:inline-flex;align-items:center;gap:7px;font-size:13.5px;font-weight:700;padding:10px 15px;
  border-radius:11px;border:1.5px solid #E1E6EC;background:#fff;color:#48525F}
.ma-chip:hover{border-color:#C7CFD9}
.ma-chip .cnt{font-size:11.5px;font-weight:800;padding:1px 7px;border-radius:8px;background:#EEF1F5;color:#5B6675}
.ma-chip.active{background:var(--ma-primary);color:#fff;border-color:var(--ma-primary)}
.ma-chip.active .cnt{background:rgba(255,255,255,.22);color:#fff}
.ma-chip.hot{border-color:var(--ma-accent-line);background:var(--ma-accent-bg);color:var(--ma-accent-ink)}
.ma-chip.hot .cnt{background:var(--ma-accent);color:var(--ma-accent-fg)}
.ma-cdot{width:8px;height:8px;border-radius:50%;flex-shrink:0}

.ma-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}
@media(max-width:1040px){.ma-grid{grid-template-columns:1fr 1fr}}
@media(max-width:760px){.ma-grid{grid-template-columns:1fr}}

.ma-note{background:#fff;border:1px solid #E1E6EC;border-radius:16px;padding:16px 17px 14px;
  box-shadow:0 1px 2px rgba(11,26,47,.06);display:flex;flex-direction:column;position:relative;overflow:hidden;
  transition:box-shadow .14s,transform .14s,border-color .14s}
.ma-note::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--bar)}
.ma-note.unread{border-color:#DCE4EF;box-shadow:0 2px 10px rgba(17,37,64,.08)}
.ma-note.read{background:#FAFBFC}
.ma-note.read::before{opacity:.45}
.ma-note:hover{box-shadow:0 8px 24px rgba(11,26,47,.10);transform:translateY(-2px);border-color:#CFD7E1}

.ma-ntop{display:flex;align-items:flex-start;gap:9px;margin-bottom:10px}
.ma-dotnew{width:9px;height:9px;border-radius:50%;flex-shrink:0;margin-top:6px;background:var(--ma-accent);
  box-shadow:0 0 0 3px var(--ma-accent-soft)}
.ma-cat{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;letter-spacing:.02em;
  text-transform:uppercase;padding:4px 9px;border-radius:7px}
.ma-cat .d{width:7px;height:7px;border-radius:50%}
.ma-date{margin-left:auto;font-size:11.5px;font-weight:700;color:#8A94A3;flex-shrink:0;padding-top:2px}

.ma-body{text-align:left;background:none;border:none;padding:0;width:100%;display:block;cursor:pointer}
.ma-title{font-size:17px;font-weight:800;letter-spacing:-.02em;color:var(--ma-primary);line-height:1.25}
.ma-note.read .ma-title{color:#5B6675}
.ma-text{font-size:14px;color:#5B6675;line-height:1.5;margin-top:7px;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.ma-note.read .ma-text{color:#8A94A3}

.ma-from{display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12.5px;font-weight:600;color:#6B7480}
.ma-av{width:24px;height:24px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;
  background:#244169;color:#fff;font-size:10.5px;font-weight:800}

.ma-acts{display:flex;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid #EEF1F5}
.ma-act{display:inline-flex;align-items:center;justify-content:center;gap:7px;flex:1;font-size:13px;font-weight:800;
  padding:11px 8px;border-radius:10px;border:1.5px solid #DDE3EA;background:#fff;color:#48525F}
.ma-act.read-btn:hover{background:#1BA968;border-color:#1BA968;color:#fff}
.ma-act.done{background:#E7F6EE;border-color:#C9EBD6;color:#1BA968;cursor:default}
.ma-act.del{flex:0 0 46px}
.ma-act.del:hover{background:#D23B36;border-color:#D23B36;color:#fff}

.ma-msg{color:#5B6675;font-size:15px;padding:18px 4px}
.ma-empty{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:48px 20px;
  border:1px dashed #D8DEE6;border-radius:16px;background:#FBFCFD;color:#5B6675}
`;

export default function MisAvisos() {
  const tema = temaCampus();
  const navigate = useNavigate();
  const { estado, avisos } = useMisAvisos(true);
  const [filtro, setFiltro] = useState('todos');
  const [ocupado, setOcupado] = useState(false);

  // Al entrar, refresca desde el backend (por si el badge tenía datos viejos).
  useEffect(() => { recargarMisAvisos(); }, []);

  const cargando = estado === 'cargando' && avisos.length === 0;
  const noLeidos = avisos.filter((a) => !a.visto).length;
  const leidos = avisos.length - noLeidos;

  // Categorías presentes (por etiqueta, en orden de aparición) para los filtros.
  const categorias = useMemo(() => {
    const vistas = new Map();
    for (const a of avisos) {
      const c = categoriaDe(a.ministerio_nombre);
      if (!vistas.has(c.label)) vistas.set(c.label, c);
    }
    return [...vistas.values()];
  }, [avisos]);

  const visibles = useMemo(() => {
    if (filtro === 'todos')  return avisos;
    if (filtro === 'sin')    return avisos.filter((a) => !a.visto);
    if (filtro === 'leidos') return avisos.filter((a) => a.visto);
    return avisos.filter((a) => categoriaDe(a.ministerio_nombre).label === filtro);
  }, [avisos, filtro]);

  function marcarLeido(a) {
    if (a.visto) return;
    marcarAvisoLeidoLocal(a.id);
    misAvisosApi.marcarVisto(a.id).catch(() => recargarMisAvisos());
  }

  function marcarTodos() {
    const pendientes = avisos.filter((a) => !a.visto);
    if (pendientes.length === 0 || ocupado) return;
    setOcupado(true);
    marcarTodosLeidosLocal();
    Promise.allSettled(pendientes.map((a) => misAvisosApi.marcarVisto(a.id)))
      .finally(() => { setOcupado(false); recargarMisAvisos(); });
  }

  function eliminar(a) {
    if (!window.confirm(`¿Quitar "${a.titulo}" de tu bandeja?`)) return;
    eliminarAvisoLocal(a.id);
    misAvisosApi.eliminar(a.id).catch(() => recargarMisAvisos());
  }

  const heroT = noLeidos === 0
    ? 'Estás al día'
    : `Tienes ${noLeidos} ${noLeidos === 1 ? 'aviso sin leer' : 'avisos sin leer'}`;
  const heroM = noLeidos === 0
    ? 'No tienes avisos sin leer en este momento.'
    : 'Los avisos nuevos están marcados con un punto de color.';

  const styleVars = {
    '--ma-font': FONT,
    '--ma-primary': tema.primary,
    '--ma-accent': tema.accent,
    '--ma-accent-fg': tema.accentInk,
    '--ma-accent-soft': hexA(tema.accent, 0.18),
    '--ma-accent-bg': hexA(tema.accent, 0.10),
    '--ma-accent-line': hexA(tema.accent, 0.45),
    '--ma-accent-ink': oscurece(tema.accent, 0.28),
    '--ma-hero-a': tema.primary,
    '--ma-hero-b': oscurece(tema.primary, 0.35),
  };

  return (
    <div className="ma-shell" style={styleVars}>
      <style>{CSS}</style>

      {/* Barra superior: marcar todos como leídos */}
      <div className="ma-top">
        <button
          type="button"
          className="ma-mark"
          onClick={marcarTodos}
          disabled={noLeidos === 0 || ocupado}
        >
          <IcChecks />Marcar todos como leídos
        </button>
      </div>

      {/* Banner con el conteo de no leídos */}
      <div className="ma-hero">
        <div className="ma-hero-ic"><IcBell /></div>
        <div className="ma-hero-b">
          <div className="ma-hero-eye">Bandeja de avisos</div>
          <div className="ma-hero-t">{heroT}</div>
          <div className="ma-hero-m">{heroM}</div>
        </div>
        <div className="ma-hero-n">
          <div className="n">{noLeidos}</div>
          <div className="l">sin leer</div>
        </div>
      </div>

      {/* Filtros */}
      {!cargando && avisos.length > 0 && (
        <div className="ma-filters">
          <button type="button" className={`ma-chip${filtro === 'todos' ? ' active' : ''}`} onClick={() => setFiltro('todos')}>
            Todos<span className="cnt">{avisos.length}</span>
          </button>
          <button type="button" className={`ma-chip${filtro === 'sin' ? ' active' : ' hot'}`} onClick={() => setFiltro('sin')}>
            Sin leer<span className="cnt">{noLeidos}</span>
          </button>
          <button type="button" className={`ma-chip${filtro === 'leidos' ? ' active' : ''}`} onClick={() => setFiltro('leidos')}>
            Leídos<span className="cnt">{leidos}</span>
          </button>
          {categorias.map((c) => (
            <button
              key={c.label}
              type="button"
              className={`ma-chip${filtro === c.label ? ' active' : ''}`}
              onClick={() => setFiltro(c.label)}
            >
              <span className="ma-cdot" style={{ background: c.dot }} />{c.label}
            </button>
          ))}
        </div>
      )}

      {/* Contenido */}
      {cargando ? (
        <div className="ma-msg">Cargando…</div>
      ) : avisos.length === 0 ? (
        <div className="ma-empty">
          <span style={{ color: tema.accent, display: 'inline-flex' }}><IcBell /></span>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#3A4453' }}>No tienes avisos todavía</div>
          <div style={{ fontSize: 15 }}>Cuando el equipo envíe un aviso, aparecerá aquí.</div>
        </div>
      ) : visibles.length === 0 ? (
        <div className="ma-msg">No hay avisos en este filtro.</div>
      ) : (
        <div className="ma-grid">
          {visibles.map((a) => {
            const cat = categoriaDe(a.ministerio_nombre);
            const noLeido = !a.visto;
            const de = a.remitente || cat.label;
            return (
              <div
                key={a.id}
                className={`ma-note ${noLeido ? 'unread' : 'read'}`}
                style={{ '--bar': cat.bar }}
              >
                <div className="ma-ntop">
                  {noLeido && <span className="ma-dotnew" />}
                  <span className="ma-cat" style={{ background: cat.pillBg, color: cat.pillInk }}>
                    <span className="d" style={{ background: cat.dot }} />{cat.label}
                  </span>
                  <span className="ma-date">{fmtFechaCorta(a.created_at)}</span>
                </div>

                <button type="button" className="ma-body" onClick={() => navigate(`/avisos/${a.id}`)}>
                  <div className="ma-title">{a.titulo}</div>
                  <div className="ma-text">{a.texto}</div>
                </button>

                <div className="ma-from">
                  <span className="ma-av">{iniciales(de)}</span>{de}
                </div>

                <div className="ma-acts">
                  {noLeido ? (
                    <button type="button" className="ma-act read-btn" onClick={() => marcarLeido(a)}>
                      <IcCheck />Marcar leído
                    </button>
                  ) : (
                    <span className="ma-act done"><IcCheck />Leído</span>
                  )}
                  <button type="button" className="ma-act del" title="Quitar de mi bandeja" onClick={() => eliminar(a)}>
                    <IcTrash />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
