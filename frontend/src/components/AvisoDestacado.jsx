import { useNavigate } from 'react-router-dom';
import useMisAvisos from '../hooks/useMisAvisos';
import { I } from './Icons';

// Tarjeta que destaca el aviso NO LEÍDO más reciente, hasta arriba del panel del
// voluntario y del líder. Reutiliza el hook useMisAvisos (la lista ya cacheada,
// mismo GET /api/mis-avisos): de ahí saca el no leído más nuevo, sin pedir nada
// extra al backend. Si no hay ninguno, no renderiza nada (ni hueco ni margen).
//
// No lleva botón de cerrar: desaparece sola cuando el aviso se marca como leído
// (al abrir /avisos/:id, el hook baja `visto` en la caché y este componente deja
// de encontrar candidato). Colores exactos por campus. El botón va con estilo
// INLINE porque la regla global `.app button { color: inherit }` pisaría clases.

const FONT = '"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif';

// Paletas exactas por campus (mismo criterio que avisosTema.temaCampus).
function colores() {
  const campus = (typeof localStorage !== 'undefined' && localStorage.getItem('campus_activo')) || 'ags';
  const isGdl = campus === 'gdl';
  return isGdl
    ? { card: '#0A0A0A', accent: '#2DD4BF', titulo: '#FFFFFF', texto: '#B9C4C2', meta: '#7E8B89', btnText: '#0A0A0A' }
    : { card: '#112540', accent: '#FF6B2B', titulo: '#FFFFFF', texto: '#C2CEDC', meta: '#8A9BB0', btnText: '#FFFFFF' };
}

// Fecha relativa corta: "Hoy 7:40 p.m." · "Ayer" · "23 jul".
function fechaRelativa(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hoy = new Date();
  const soloDia = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const dias = Math.round((soloDia(hoy) - soloDia(d)) / 86400000);
  if (dias === 0) {
    const hora = d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
    return `Hoy ${hora}`;
  }
  if (dias === 1) return 'Ayer';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export default function AvisoDestacado() {
  const navigate = useNavigate();
  const { avisos } = useMisAvisos(true);

  const noLeidos = avisos.filter((a) => !a.visto);
  if (noLeidos.length === 0) return null;

  // El más reciente entre los no leídos.
  const aviso = noLeidos
    .slice()
    .sort((x, y) => new Date(y.created_at) - new Date(x.created_at))[0];
  if (!aviso) return null;

  const c = colores();
  const restantes = noLeidos.length - 1; // otros pendientes además del mostrado
  const ir = () => navigate(`/avisos/${aviso.id}`);

  return (
    <div
      onClick={ir}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ir(); } }}
      style={{
        fontFamily: FONT, boxSizing: 'border-box', width: '100%',
        background: c.card, borderRadius: 12, padding: '14px 16px',
        marginBottom: 14, cursor: 'pointer',
      }}
    >
      {/* Fila superior: campana + "NUEVO AVISO" · fecha relativa */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: c.accent }}>
          <I.bell size={14} />
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em' }}>NUEVO AVISO</span>
        </span>
        <span style={{ flexShrink: 0, fontSize: 12, color: c.meta, whiteSpace: 'nowrap' }}>
          {fechaRelativa(aviso.created_at)}
        </span>
      </div>

      {/* Título */}
      <div style={{ marginTop: 8, fontSize: 17, fontWeight: 500, color: c.titulo, lineHeight: 1.3 }}>
        {aviso.titulo}
      </div>

      {/* Adelanto del texto, máximo dos líneas */}
      <div style={{
        marginTop: 5, fontSize: 14, color: c.texto, lineHeight: 1.45,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {aviso.texto}
      </div>

      {/* Fila inferior: "Leer completo" + "N sin leer" (si hay más pendientes) */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); ir(); }}
          style={{
            fontFamily: FONT, background: c.accent, color: c.btnText, border: 'none',
            borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}
        >
          Leer completo
        </button>
        {restantes > 0 && (
          <span style={{ fontSize: 13, color: c.meta }}>
            {restantes} sin leer
          </span>
        )}
      </div>
    </div>
  );
}
