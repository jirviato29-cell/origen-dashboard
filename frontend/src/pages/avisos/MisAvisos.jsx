import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useMisAvisos, { recargarMisAvisos } from '../../hooks/useMisAvisos';
import { I } from '../../components/Icons';
import { FONT, temaCampus, fmtFechaCorta } from './avisosTema';

// Lista de "mis avisos" para voluntario y líder. Renglones separados por una
// línea fina (no tarjetas sueltas) para que la pantalla no quede como una reja.
// El no leído se distingue con el punto de color a la izquierda MÁS el título en
// peso 500; el leído va en peso normal y el título en gris secundario. Al tocar
// cualquier parte del renglón se abre el aviso completo (/avisos/:id).
//
// El topbar ya muestra "Avisos", así que aquí NO se repite el título. Pensada
// para leerse desde el teléfono: título 17px, adelanto y fecha 15px, cada
// renglón de al menos 56px y tocable completo.

const GRIS_SEC = '#5B6675';   // gris secundario (buena lectura)
const GRIS_TXT = '#6B7480';   // adelanto
const LINEA    = '#E4E8EE';   // separador de 0.5px

export default function MisAvisos() {
  const tema = temaCampus();
  const navigate = useNavigate();
  const { estado, avisos } = useMisAvisos(true);

  // Al entrar, refresca desde el backend (por si el badge tenía datos viejos).
  useEffect(() => { recargarMisAvisos(); }, []);

  const cargando = estado === 'cargando' && avisos.length === 0;

  return (
    <div style={{ fontFamily: FONT, width: '100%', maxWidth: 760, display: 'flex', flexDirection: 'column' }}>
      {cargando ? (
        <div style={{ color: GRIS_SEC, fontSize: 15, padding: '18px 4px' }}>Cargando…</div>
      ) : avisos.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          color: GRIS_SEC, textAlign: 'center', padding: '48px 20px',
          border: '1px dashed #D8DEE6', borderRadius: 14, background: '#FBFCFD',
        }}>
          <span style={{ color: tema.accent, display: 'inline-flex' }}><I.bell size={26} /></span>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#3A4453' }}>No tienes avisos todavía</div>
          <div style={{ fontSize: 15 }}>Cuando el equipo envíe un aviso, aparecerá aquí.</div>
        </div>
      ) : avisos.map((a, idx) => {
        const noLeido = !a.visto;
        const ultimo = idx === avisos.length - 1;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => navigate(`/avisos/${a.id}`)}
            style={{
              fontFamily: FONT, textAlign: 'left', width: '100%', boxSizing: 'border-box',
              display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
              minHeight: 56, padding: '14px 6px',
              background: 'transparent', border: 'none',
              borderBottom: ultimo ? 'none' : `0.5px solid ${LINEA}`,
            }}
          >
            {/* Punto de no leído (ocupa el mismo ancho aunque esté leído). */}
            <span style={{
              flexShrink: 0, width: 10, height: 10, marginTop: 7, borderRadius: '50%',
              background: noLeido ? tema.accent : 'transparent',
            }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                <span style={{
                  fontSize: 17, fontWeight: noLeido ? 500 : 400,
                  color: noLeido ? tema.primary : GRIS_SEC,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{a.titulo}</span>
                <span style={{ flexShrink: 0, fontSize: 15, color: GRIS_SEC, whiteSpace: 'nowrap' }}>
                  {fmtFechaCorta(a.created_at)}
                </span>
              </div>
              <div style={{
                marginTop: 4, fontSize: 15, color: GRIS_TXT, lineHeight: 1.45,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>{a.texto}</div>
            </div>
            <span style={{ flexShrink: 0, marginTop: 3, color: '#C2C9D2', display: 'inline-flex' }}>
              <I.chevR size={16} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
