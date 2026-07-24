import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { misAvisosApi } from '../../services/api';
import { marcarAvisoLeidoLocal } from '../../hooks/useMisAvisos';
import { I } from '../../components/Icons';
import { FONT, temaCampus, fmtFechaHora } from './avisosTema';

// Detalle de un aviso para voluntario/líder. Al abrirlo se marca como leído UNA
// sola vez. El texto respeta los saltos de línea (whiteSpace: pre-wrap). El botón
// lleva estilo inline (la regla global `.app button { color: inherit }` pisaría
// los colores de clase).

export default function AvisoDetalle() {
  const tema = temaCampus();
  const navigate = useNavigate();
  const { id } = useParams();

  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'ok' | 'no-encontrado' | 'error'
  const [aviso, setAviso]   = useState(null);
  const vistoEnviado = useRef(false); // marca-visto una sola vez por montaje

  useEffect(() => {
    let vivo = true;
    setEstado('cargando');
    setAviso(null);
    vistoEnviado.current = false;

    (async () => {
      try {
        const { data } = await misAvisosApi.getUno(id);
        if (!vivo) return;
        setAviso(data);
        setEstado('ok');

        // Marca como leído una sola vez (no bloquea la vista si falla).
        if (!vistoEnviado.current) {
          vistoEnviado.current = true;
          misAvisosApi.marcarVisto(id)
            .then(() => marcarAvisoLeidoLocal(Number(id)))
            .catch(() => { /* si falla, se reintenta en la próxima apertura */ });
        }
      } catch (err) {
        if (!vivo) return;
        setEstado(err?.response?.status === 404 ? 'no-encontrado' : 'error');
      }
    })();

    return () => { vivo = false; };
  }, [id]);

  const volver = () => navigate('/avisos');

  const btnVolver = (
    <button
      type="button"
      onClick={volver}
      style={{
        fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 12px', borderRadius: 10,
        background: '#fff', color: tema.primary, border: '1px solid #D8DEE6',
      }}
    >
      <I.back size={15} /> Volver a avisos
    </button>
  );

  return (
    <div style={{ fontFamily: FONT, width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {btnVolver}

      {estado === 'cargando' && (
        <div style={{ color: '#A3ABB6', fontSize: 14 }}>Cargando…</div>
      )}

      {estado === 'no-encontrado' && (
        <div style={{
          color: '#8A93A0', textAlign: 'center', padding: '40px 20px',
          border: '1px dashed #D8DEE6', borderRadius: 14, background: '#FBFCFD', fontSize: 14,
        }}>
          Este aviso no existe o no está disponible para ti.
        </div>
      )}

      {estado === 'error' && (
        <div style={{ color: '#D23B36', fontSize: 13.5, fontWeight: 600 }}>
          No se pudo cargar el aviso. Intenta de nuevo.
        </div>
      )}

      {estado === 'ok' && aviso && (
        <article style={{
          border: '1px solid #E4E8EE', borderRadius: 14, background: '#fff',
          padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            fontSize: 11.5, fontWeight: 700, color: tema.accent,
            textTransform: 'uppercase', letterSpacing: '.04em',
          }}>
            <I.bell size={14} /> Aviso
          </div>

          <h2 style={{
            margin: 0, fontSize: 20, fontWeight: 800, lineHeight: 1.25,
            color: tema.primary, letterSpacing: '-.01em',
          }}>{aviso.titulo}</h2>

          <div style={{ fontSize: 12.5, color: '#98A1AD' }}>
            {fmtFechaHora(aviso.created_at)}
            {aviso.ministerio_nombre ? ` · ${aviso.ministerio_nombre}` : ''}
          </div>

          <div style={{
            fontSize: 15, color: '#2B333F', lineHeight: 1.6, whiteSpace: 'pre-wrap',
            borderTop: '1px solid #EEF1F5', paddingTop: 12,
          }}>{aviso.texto}</div>
        </article>
      )}
    </div>
  );
}
