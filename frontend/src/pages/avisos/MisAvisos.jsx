import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useMisAvisos, { recargarMisAvisos } from '../../hooks/useMisAvisos';
import { I } from '../../components/Icons';
import { FONT, temaCampus, fmtFecha } from './avisosTema';

// Lista de "mis avisos" para voluntario y líder. Cada renglón muestra título,
// fecha y las primeras líneas del texto; los no leídos se distinguen con un punto
// de acento y borde. Al tocar un renglón se abre el aviso completo (/avisos/:id).
//
// El topbar ya muestra "Avisos", así que aquí NO se repite el título. Ancho
// completo, compacto, sin espacio muerto. Botones con estilo inline (la regla
// global `.app button { color: inherit }` pisaría los colores de clase).

export default function MisAvisos() {
  const tema = temaCampus();
  const navigate = useNavigate();
  const { estado, avisos } = useMisAvisos(true);

  // Al entrar, refresca desde el backend (por si el badge tenía datos viejos).
  useEffect(() => { recargarMisAvisos(); }, []);

  const cargando = estado === 'cargando' && avisos.length === 0;

  return (
    <div style={{ fontFamily: FONT, width: '100%', maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {cargando ? (
        <div style={{ color: '#A3ABB6', fontSize: 14, padding: '18px 4px' }}>Cargando…</div>
      ) : avisos.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          color: '#8A93A0', textAlign: 'center', padding: '48px 20px',
          border: '1px dashed #D8DEE6', borderRadius: 14, background: '#FBFCFD',
        }}>
          <span style={{ color: tema.accent, display: 'inline-flex' }}><I.bell size={26} /></span>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#5A6472' }}>No tienes avisos todavía</div>
          <div style={{ fontSize: 13 }}>Cuando el equipo envíe un aviso, aparecerá aquí.</div>
        </div>
      ) : avisos.map((a) => {
        const noLeido = !a.visto;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => navigate(`/avisos/${a.id}`)}
            style={{
              fontFamily: FONT, textAlign: 'left', width: '100%', boxSizing: 'border-box',
              display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
              padding: '13px 15px', borderRadius: 12,
              border: `1px solid ${noLeido ? tema.accent : '#E4E8EE'}`,
              background: noLeido ? '#fff' : '#FBFCFD',
              boxShadow: noLeido ? `0 1px 0 ${tema.accent}22` : 'none',
            }}
          >
            {/* Punto de no leído (ocupa el mismo ancho aunque esté leído). */}
            <span style={{
              flexShrink: 0, width: 9, height: 9, marginTop: 6, borderRadius: '50%',
              background: noLeido ? tema.accent : 'transparent',
            }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                <span style={{
                  fontSize: 14.5, fontWeight: noLeido ? 800 : 600,
                  color: noLeido ? tema.primary : '#3A4453',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{a.titulo}</span>
                <span style={{ flexShrink: 0, fontSize: 11.5, color: '#98A1AD', whiteSpace: 'nowrap' }}>
                  {fmtFecha(a.created_at)}
                </span>
              </div>
              <div style={{
                marginTop: 3, fontSize: 13, color: '#6B7480', lineHeight: 1.45,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>{a.texto}</div>
            </div>
            <span style={{ flexShrink: 0, marginTop: 3, color: '#C2C9D2', display: 'inline-flex' }}>
              <I.chevR size={15} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
