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

const tituloMes = (mes) => `${MESES[Number(mes.slice(5, 7)) - 1]} ${mes.slice(0, 4)}`;

const CSS = `
.invp{font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;width:100%;}
.invp-grid{display:grid;grid-template-columns:1fr;gap:22px;}
@media(min-width:640px){ .invp-grid{grid-template-columns:1fr 1fr;gap:28px;} }
.invp-mes-h{display:flex;align-items:baseline;gap:9px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #EEF1F5;}
.invp-mes-n{font-size:17px;font-weight:500;color:#112540;}
.invp-mes-y{font-size:14px;font-weight:500;color:#A7B0BD;}
`;

function MesInvitaciones({ mes, accent }) {
  const {
    cargando, error, listado,
    marcar, enviando, editando, setEditando,
  } = useDisponibilidadMes(mes);

  const [nombreMes, anio] = tituloMes(mes).split(' ');

  return (
    <section>
      <div className="invp-mes-h">
        <span className="invp-mes-n">{nombreMes}</span>
        <span className="invp-mes-y">{anio}</span>
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
        emptyText="Sin invitaciones"
      />
    </section>
  );
}

export default function Invitaciones() {
  const campus = (typeof localStorage !== 'undefined' && localStorage.getItem('campus_activo')) || 'ags';
  const accent = campus === 'gdl' ? '#2DD4BF' : '#FF6B2B';

  const mesActual = mesDeHoy();
  const mesSig = sumaMes(mesActual, 1);

  return (
    <div className="invp">
      <style>{CSS}</style>
      <AvisoDestacado />
      <div className="invp-grid">
        <MesInvitaciones mes={mesActual} accent={accent} />
        <MesInvitaciones mes={mesSig} accent={accent} />
      </div>
    </div>
  );
}
