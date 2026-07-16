// Placeholder del acceso de voluntario.
// Existe para que el guard de rutas tenga a donde mandar el rol `voluntario`
// (sin esta ruta, /voluntario cae en el catch-all y rebota contra `/`).
// El login del voluntario es un flujo aparte, todavia sin construir.

const NAVY_950 = '#0B1A2F';
const NAVY_300 = '#9CB0CC';
const ORANGE_500 = '#FF6B2B';

const CSS = `
.vl-root{min-height:100vh;background:${NAVY_950};display:flex;align-items:center;justify-content:center;padding:40px 20px;font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;text-align:center;}
.vl-eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ORANGE_500};margin-bottom:8px;}
.vl-title{font-size:22px;font-weight:800;letter-spacing:-.03em;color:#fff;margin:0;}
.vl-sub{font-size:13px;color:${NAVY_300};margin-top:8px;}
`;

export default function PanelVoluntario() {
  return (
    <div className="vl-root">
      <style>{CSS}</style>
      <div>
        <div className="vl-eyebrow">Origen</div>
        <h1 className="vl-title">Acceso de voluntario — en construcción</h1>
        <div className="vl-sub">Esta sección estará disponible pronto.</div>
      </div>
    </div>
  );
}
