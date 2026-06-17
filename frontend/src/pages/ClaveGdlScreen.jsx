const MINT = '#2DD4BF';
const INK_300 = '#9A9A9A';

const ROLE_ICON = {
  pastor: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 21.5 7.1 18.2l.9-5.5-4-3.9L9.5 8z" strokeLinejoin="round" /></svg>,
  stewardship: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 7a2 2 0 0 1 2-2h13l3 4v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 9h18" /></svg>,
  anfitriones: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="9" r="3.2" /><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" strokeLinecap="round" /><circle cx="17" cy="10" r="2.5" /></svg>,
  punto_encuentro: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>,
};
const ROLE_NAME = { pastor:'Pastor', stewardship:'Stewardship', anfitriones:'Anfitriones', punto_encuentro:'Punto de Encuentro' };
const BackIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>;

const CSS = `
.ocl-root{background:#0A0A0A;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px 20px;position:relative;overflow:hidden;color:#fff;font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;}
.ocl-glow-tr{position:absolute;top:-180px;right:-140px;width:540px;height:540px;border-radius:50%;background:radial-gradient(circle,rgba(45,212,191,.12),transparent 68%);pointer-events:none;}
.ocl-glow-bl{position:absolute;bottom:-220px;left:-160px;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.05),transparent 70%);pointer-events:none;}
.ocl-wrap{width:100%;max-width:460px;position:relative;z-index:1;}
.ocl-brand{text-align:center;margin-bottom:30px;}
.ocl-brand img{width:172px;height:auto;display:block;margin:0 auto;}
.ocl-tag{margin-top:14px;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${INK_300};}
.ocl-panel{background:#16161A;border:1px solid rgba(255,255,255,.07);border-radius:22px;padding:26px 28px 28px;box-shadow:0 30px 80px rgba(0,0,0,.6);}
.ocl-back{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:${INK_300};background:none;border:0;cursor:pointer;padding:0;margin-bottom:18px;font-family:inherit;}
.ocl-back:hover{color:#fff;}
.ocl-back svg{width:15px;height:15px;}
.ocl-role-row{display:flex;align-items:center;gap:13px;margin-bottom:22px;}
.ocl-role-ic{width:46px;height:46px;min-width:46px;max-width:46px;min-height:46px;max-height:46px;border-radius:13px;background:rgba(255,255,255,.1);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.ocl-role-ic svg{width:23px;height:23px;}
.ocl-role-name{font-size:17px;font-weight:800;letter-spacing:-.02em;color:#fff;}
.ocl-role-sel{font-size:12px;color:${MINT};font-weight:600;margin-top:2px;}
.ocl-label{font-size:12px;font-weight:700;color:#fff;margin-bottom:8px;}
.ocl-input{width:100%;padding:13px 15px;border-radius:11px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#fff;font:inherit;font-size:15px;letter-spacing:.18em;margin-bottom:18px;}
.ocl-input:focus{outline:2px solid ${MINT};outline-offset:-1px;border-color:transparent;}
.ocl-input::placeholder{color:#7C7C7C;letter-spacing:normal;}
.ocl-btn{width:100%;padding:14px;border-radius:11px;border:0;background:${MINT};color:#06231F;font:inherit;font-size:14.5px;font-weight:800;letter-spacing:-.01em;cursor:pointer;transition:.13s;}
.ocl-btn:hover{background:#22B8A4;}
.ocl-btn:disabled{opacity:.6;cursor:default;}
.ocl-error{color:#FF6B6B;font-size:12.5px;margin:-8px 0 14px;}
.ocl-copyright{text-align:center;margin-top:24px;font-size:11.5px;color:${INK_300};opacity:.7;}
`;

export default function ClaveGdlScreen({ roleId, clave, setClave, onSubmit, onBack, error, loading }) {
  return (
    <div className="ocl-root">
      <style>{CSS}</style>
      <div className="ocl-glow-tr" />
      <div className="ocl-glow-bl" />
      <div className="ocl-wrap">
        <div className="ocl-brand">
          <img src="/assets/origen-mark-blanco.png" alt="Origen" />
          <div className="ocl-tag">Dashboard interno · Campus Guadalajara</div>
        </div>
        <div className="ocl-panel">
          <button className="ocl-back" onClick={onBack} type="button">{BackIcon}Volver</button>
          <div className="ocl-role-row">
            <div className="ocl-role-ic">{ROLE_ICON[roleId] || null}</div>
            <div>
              <div className="ocl-role-name">{ROLE_NAME[roleId] || roleId}</div>
              <div className="ocl-role-sel">Acceso seleccionado</div>
            </div>
          </div>
          <div className="ocl-label">Clave de acceso</div>
          <input
            className="ocl-input"
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
            autoFocus
          />
          {error ? <div className="ocl-error">{error}</div> : null}
          <button className="ocl-btn" onClick={onSubmit} disabled={loading} type="button">
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
        <div className="ocl-copyright">Dashboard interno · Origen Campus Guadalajara</div>
      </div>
    </div>
  );
}
