import AvisoDestacado from '../../components/AvisoDestacado';
import ListaInvitaciones from '../../components/ListaInvitaciones';
import useDisponibilidadMes, { mesDeHoy, sumaMes } from '../../hooks/useDisponibilidadMes';

// Pestaña "Invitaciones" del voluntario: responde "Sí colaboro" / "No podré" a
// cada fecha que le toca (domingos + eventos para_voluntarios de su ministerio +
// eventos abiertos), de hoy en adelante. Muestra DOS meses (el actual y el
// siguiente): en escritorio lado a lado, en teléfono apilados. Cada mes usa una
// instancia del MISMO hook useDisponibilidadMes (mismo fetch + marcar), sin
// duplicar lógica.

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const nombreMesDe = (mes) => MESES[Number(mes.slice(5, 7)) - 1];

// Paleta por campus para el encabezado y la pastilla (navy/naranja o negro/menta).
const temaDe = (campus) => {
  const gdl = campus === 'gdl';
  return {
    ink:        gdl ? '#0A0A0A' : '#112540',
    accent:     gdl ? '#2DD4BF' : '#FF6B2B',
    accentTint: gdl ? '#E7FBF8' : '#FFF1EA',
  };
};

const CSS = `
.invp{font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;width:100%;}
.invp-grid{display:grid;grid-template-columns:1fr;gap:22px;}
@media(min-width:640px){ .invp-grid{grid-template-columns:1fr 1fr;gap:28px;} }
.invp-mes-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:14px;padding-bottom:9px;border-bottom:1px solid #EEF1F5;}
.invp-mes-t{display:flex;align-items:baseline;gap:9px;min-width:0;}
.invp-mes-n{font-size:19px;font-weight:600;line-height:1.1;}
.invp-mes-y{font-size:15px;font-weight:500;color:#A7B0BD;}
.invp-pill{font-size:13px;font-weight:500;border-radius:20px;padding:4px 12px;white-space:nowrap;flex-shrink:0;}
`;

function MesInvitaciones({ mes, campus }) {
  const {
    cargando, error, listado,
    marcar, enviando, editando, setEditando,
  } = useDisponibilidadMes(mes);

  const t = temaDe(campus);
  const pendientes = listado.filter(d => d.puede_marcar && !d.bloqueado && d.estado == null).length;

  return (
    <section>
      <div className="invp-mes-h">
        <div className="invp-mes-t">
          <span className="invp-mes-n" style={{ color: t.ink }}>{nombreMesDe(mes)}</span>
          <span className="invp-mes-y">{mes.slice(0, 4)}</span>
        </div>
        {pendientes > 0 && (
          <span className="invp-pill" style={{ color: t.accent, background: t.accentTint }}>
            {pendientes} por responder
          </span>
        )}
      </div>
      <ListaInvitaciones
        listado={listado}
        marcar={marcar}
        enviando={enviando}
        editando={editando}
        setEditando={setEditando}
        campus={campus}
        cargando={cargando}
        error={error}
        emptyText="Sin invitaciones"
      />
    </section>
  );
}

export default function Invitaciones() {
  const campus = (typeof localStorage !== 'undefined' && localStorage.getItem('campus_activo')) || 'ags';

  const mesActual = mesDeHoy();
  const mesSig = sumaMes(mesActual, 1);

  return (
    <div className="invp">
      <style>{CSS}</style>
      <AvisoDestacado />
      <div className="invp-grid">
        <MesInvitaciones mes={mesActual} campus={campus} />
        <MesInvitaciones mes={mesSig} campus={campus} />
      </div>
    </div>
  );
}
