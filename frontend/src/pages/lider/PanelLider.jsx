// Pantallas del líder de ministerio, separadas en tres rutas/pestañas.
// El título de página lo pone la topbar del Layout (ROUTE_INFO) y el nombre del
// ministerio va en la topbar; aquí NO se repiten. Cada pantalla solo muestra su
// descripción corta arriba del contenido, dentro del contenedor estándar.
import useLiderPerfil from '../../hooks/useLiderPerfil';
import MisVoluntarios from './MisVoluntarios';
import PosicionesMinisterio from './PosicionesMinisterio';
import ProgramarServicio from './ProgramarServicio';
import TableroServicio from './TableroServicio';

const GRAY_500 = '#7A8699';
const GRAY_200 = '#E2E6EC';

const CSS = `
/* Ancho completo del área de contenido (el padding lo pone .page del Layout);
   sin max-width para que no quede espacio muerto a la derecha. */
.pl-root{font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;width:100%;}
.pl-sub{font-size:13px;color:${GRAY_500};margin:0;}
.pl-warn{margin-top:12px;padding:11px 14px;border-radius:10px;background:#FEF2F2;border:1px solid #FECACA;color:#D23B36;font-size:12.5px;font-weight:600;}
.pl-card{margin-top:16px;background:#fff;border:1px solid ${GRAY_200};border-radius:16px;padding:24px;}
`;

// Contenedor compartido por las tres pantallas del líder: descripción + tarjeta.
function LiderShell({ sub, children }) {
  const { estado } = useLiderPerfil();
  return (
    <div className="pl-root">
      <style>{CSS}</style>
      <div className="pl-sub">{sub}</div>
      {estado === 'sin_ministerio' && (
        <div className="pl-warn">
          Sin ministerio asignado — pídele al administrador que te lo asigne.
        </div>
      )}
      <div className="pl-card">{children}</div>
    </div>
  );
}

export function LiderVoluntarios() {
  return (
    <LiderShell sub="Da de alta a tu equipo y pásales su clave de acceso.">
      <MisVoluntarios />
    </LiderShell>
  );
}

export function LiderPosiciones() {
  return (
    <LiderShell sub="Define las posiciones de tu ministerio para asignarlas a tu equipo.">
      <PosicionesMinisterio />
    </LiderShell>
  );
}

export function LiderProgramar() {
  return (
    <LiderShell sub="Mira quién puede servir y reparte posiciones por fecha.">
      <ProgramarServicio />
    </LiderShell>
  );
}

export function LiderTablero() {
  return (
    <LiderShell sub="Ve cómo quedó armado el equipo por posición en cada fecha.">
      <TableroServicio />
    </LiderShell>
  );
}
