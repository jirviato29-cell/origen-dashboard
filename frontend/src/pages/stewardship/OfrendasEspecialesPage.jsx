import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ofrendasEspecialesApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { I } from '../../components/Icons';
import { useIsMobile } from '../../utils/useIsMobile';

const ACCENT   = '#FF6B2B';
const GREEN    = '#15915A';
const NAVY     = '#112540';
const MUTED    = '#6B6B6B';
const BORDER   = '#E5E5E5';
const SURFACE  = '#FFFFFF';
const SURFACE2 = '#FAFAFA';

function fmt(n) {
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: SURFACE, borderRadius: 16, padding: '28px 28px 24px',
        width: '100%', maxWidth: 440,
        boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
      }}>
        {children}
      </div>
    </div>
  );
}

export default function OfrendasEspecialesPage() {
  const { role } = useAuth();
  const navigate  = useNavigate();
  const isMobile  = useIsMobile();
  const base       = '/' + role;

  const [ofrendas, setOfrendas] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [nombre,    setNombre]    = useState('');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const cargar = async () => {
    try {
      const res = await ofrendasEspecialesApi.getAll();
      setOfrendas(res.data?.data || []);
    } catch {
      // sin datos
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirModal = () => { setNombre(''); setError(''); setModalOpen(true); };
  const cerrarModal = () => setModalOpen(false);

  const guardar = async () => {
    if (!nombre.trim()) { setError('El nombre no puede estar vacío.'); return; }
    setSaving(true);
    try {
      await ofrendasEspecialesApi.create({ nombre: nombre.trim() });
      setModalOpen(false);
      cargar();
    } catch (e) {
      setError(e?.response?.data?.error || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: NAVY, letterSpacing: '-0.03em' }}>
            Ofrendas especiales
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: MUTED }}>
            Colectas específicas independientes del balance de caja
          </p>
        </div>
        <button
          onClick={abrirModal}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: ACCENT, color: '#fff',
            border: 'none', borderRadius: 10,
            padding: isMobile ? '9px 14px' : '10px 18px',
            fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 700,
            cursor: 'pointer', whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(255,107,43,0.28)',
          }}
        >
          <I.plus size={15} />
          {!isMobile && 'Nueva ofrenda especial'}
        </button>
      </div>

      {/* List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: MUTED, fontSize: 14 }}>
            Cargando…
          </div>
        ) : ofrendas.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: MUTED }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: SURFACE2, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px', color: '#C5CBD4',
            }}>
              <I.coin size={24} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: NAVY, marginBottom: 6 }}>Sin ofrendas especiales</div>
            <div style={{ fontSize: 13 }}>Crea la primera con el botón de arriba.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: SURFACE2 }}>
                <th style={{ padding: '11px 20px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
                  Nombre
                </th>
                <th style={{ padding: '11px 20px', textAlign: 'right', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
                  Total
                </th>
                <th style={{ padding: '11px 16px', width: 40, borderBottom: `1px solid ${BORDER}` }} />
              </tr>
            </thead>
            <tbody>
              {ofrendas.map((oe, idx) => (
                <tr
                  key={oe.id}
                  onClick={() => navigate(`${base}/ofrendas-especiales/${oe.id}`)}
                  style={{
                    cursor: 'pointer',
                    borderBottom: idx < ofrendas.length - 1 ? `1px solid ${BORDER}` : 'none',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = SURFACE2}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 20px', fontSize: 14.5, fontWeight: 600, color: NAVY }}>
                    {oe.nombre}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right', fontSize: 18, fontWeight: 800, color: GREEN, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                    {fmt(oe.total)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: '#C5CBD4' }}>
                    <I.chevR size={16} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal nueva ofrenda */}
      <Modal open={modalOpen} onClose={cerrarModal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: NAVY }}>Nueva ofrenda especial</h3>
          <button onClick={cerrarModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}>
            <I.x size={20} />
          </button>
        </div>

        <label style={{ fontSize: 12.5, fontWeight: 700, color: MUTED, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Nombre de la ofrenda especial
        </label>
        <input
          autoFocus
          value={nombre}
          onChange={e => { setNombre(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && guardar()}
          placeholder="Ej. Fondo para misiones"
          style={{
            width: '100%', padding: '10px 14px',
            border: `1.5px solid ${error ? '#DC2626' : BORDER}`,
            borderRadius: 8, fontSize: 14, fontFamily: 'var(--font-ui)',
            outline: 'none', marginBottom: error ? 6 : 20,
            boxSizing: 'border-box',
          }}
        />
        {error && <div style={{ fontSize: 12.5, color: '#DC2626', marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={cerrarModal} style={{
            padding: '9px 18px', borderRadius: 8, border: `1px solid ${BORDER}`,
            background: 'none', fontSize: 13.5, fontWeight: 600, color: MUTED, cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={saving} style={{
            padding: '9px 20px', borderRadius: 8, border: 'none',
            background: ACCENT, color: '#fff',
            fontSize: 13.5, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1, fontFamily: 'var(--font-ui)',
          }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
