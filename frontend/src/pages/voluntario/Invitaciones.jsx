import AvisoDestacado from '../../components/AvisoDestacado';
import ListaInvitaciones from '../../components/ListaInvitaciones';
import useDisponibilidadMes from '../../hooks/useDisponibilidadMes';

// Pestaña "Invitaciones" del voluntario: responde "Sí colaboro" / "No podré" a
// cada fecha que le toca (domingos + eventos para_voluntarios de su ministerio +
// eventos abiertos), de hoy en adelante. Reutiliza el hook useDisponibilidadMes
// (mismo fetch + marcar que el calendario) y la lista ListaInvitaciones.

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const Chevron = ({ dir }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
    <path d={dir === 'l' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Invitaciones() {
  const {
    mes, cargando, error, listado,
    marcar, enviando, editando, setEditando,
    irAMes, irHoy,
  } = useDisponibilidadMes();

  const campus = (typeof localStorage !== 'undefined' && localStorage.getItem('campus_activo')) || 'ags';
  const accent = campus === 'gdl' ? '#2DD4BF' : '#FF6B2B';

  const arrowStyle = {
    fontFamily: 'inherit', width: 34, height: 34, borderRadius: 9,
    border: '1px solid #E2E6EC', background: '#fff', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', color: '#244169', cursor: 'pointer',
  };

  return (
    <div style={{ fontFamily: '"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif', letterSpacing: '-.006em', width: '100%' }}>
      <AvisoDestacado />

      {/* Selector de mes: para revisar también invitaciones de meses próximos. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.02em', color: '#112540' }}>{MESES[Number(mes.slice(5, 7)) - 1]}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#A7B0BD' }}>{mes.slice(0, 4)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button type="button" onClick={irHoy}
            style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#244169', background: '#fff', border: '1px solid #E2E6EC', borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }}>
            Hoy
          </button>
          <button type="button" onClick={() => irAMes(-1)} aria-label="Mes anterior" style={arrowStyle}><Chevron dir="l" /></button>
          <button type="button" onClick={() => irAMes(1)} aria-label="Mes siguiente" style={arrowStyle}><Chevron dir="r" /></button>
        </div>
      </div>

      <ListaInvitaciones
        listado={listado}
        marcar={marcar}
        enviando={enviando}
        editando={editando}
        setEditando={setEditando}
        accent={accent}
        cargando={cargando}
        error={error}
        emptyText="No tienes invitaciones por ahora."
      />
    </div>
  );
}
