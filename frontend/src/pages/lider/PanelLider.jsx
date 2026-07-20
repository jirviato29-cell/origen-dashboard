// Pantallas del líder de ministerio, ahora separadas en tres rutas/pestañas.
// Cada una envuelve su sección (que ya trae su propio título + descripción) en
// el contenedor estándar (ancho acotado + tarjeta blanca). El título de página
// lo pone la topbar del Layout vía ROUTE_INFO.
import MisVoluntarios from './MisVoluntarios';
import PosicionesMinisterio from './PosicionesMinisterio';
import ProgramarServicio from './ProgramarServicio';

const NAVY_900 = '#112540';
const ORANGE_500 = '#FF6B2B';
const GRAY_500 = '#7A8699';
const GRAY_200 = '#E2E6EC';

const CSS = `
.pl-root{font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;max-width:720px;}
.pl-eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ORANGE_500};margin-bottom:7px;}
.pl-title{font-size:22px;font-weight:800;letter-spacing:-.03em;color:${NAVY_900};margin:0;}
.pl-sub{font-size:13px;color:${GRAY_500};margin:6px 0 0;}
.pl-card{margin-top:18px;background:#fff;border:1px solid ${GRAY_200};border-radius:16px;padding:24px;}
`;

// Cabecera + tarjeta compartida por las tres pantallas del líder.
function LiderShell({ title, sub, children }) {
  return (
    <div className="pl-root">
      <style>{CSS}</style>
      <div className="pl-eyebrow">Ministerio</div>
      <h1 className="pl-title">{title}</h1>
      <div className="pl-sub">{sub}</div>
      <div className="pl-card">{children}</div>
    </div>
  );
}

export function LiderVoluntarios() {
  return (
    <LiderShell title="Mis voluntarios" sub="Da de alta a tu equipo y pásales su clave de acceso.">
      <MisVoluntarios />
    </LiderShell>
  );
}

export function LiderPosiciones() {
  return (
    <LiderShell title="Posiciones" sub="Define las posiciones de tu ministerio para asignarlas a tu equipo.">
      <PosicionesMinisterio />
    </LiderShell>
  );
}

export function LiderProgramar() {
  return (
    <LiderShell title="Programar servicio" sub="Mira quién puede servir y reparte posiciones por fecha.">
      <ProgramarServicio />
    </LiderShell>
  );
}
