import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Login del voluntario: apodo + los últimos 4 dígitos de su WhatsApp.
// Pantalla aparte de la selección de rol del staff.

const NAVY_950 = '#0B1A2F';
const NAVY_900 = '#112540';
const NAVY_500 = '#3E6499';
const NAVY_300 = '#9CB0CC';
const ORANGE_500 = '#FF6B2B';
const GRAY_500 = '#7A8699';
const GRAY_200 = '#E2E6EC';
const GRAY_100 = '#EEF1F5';
const RED = '#EF4444';

const CSS = `
.lv-root{min-height:100vh;background:${NAVY_950};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;position:relative;overflow-x:hidden;font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;}
.lv-glow-tr{position:absolute;top:-180px;right:-140px;width:540px;height:540px;border-radius:50%;background:radial-gradient(circle,rgba(255,107,43,.16),transparent 68%);pointer-events:none;}
.lv-glow-bl{position:absolute;bottom:-220px;left:-160px;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(48,81,129,.4),transparent 70%);pointer-events:none;}
.lv-wrap{width:100%;max-width:440px;position:relative;z-index:1;}
.lv-brand{text-align:center;margin-bottom:34px;}
.lv-brand img{width:172px;height:auto;display:block;margin:0 auto;}
.lv-tag{margin-top:14px;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${NAVY_300};}
.lv-panel{background:#fff;border-radius:22px;padding:30px 28px 28px;box-shadow:0 30px 80px rgba(0,0,0,.45),0 2px 6px rgba(0,0,0,.2);}
.lv-eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ORANGE_500};margin-bottom:7px;}
.lv-title{font-size:25px;font-weight:800;letter-spacing:-.03em;color:${NAVY_900};margin:0;}
.lv-sub{font-size:13px;color:${GRAY_500};margin-top:5px;margin-bottom:22px;}
.lv-label{display:block;font-size:13px;font-weight:600;color:${NAVY_900};margin-bottom:8px;}
.lv-hint{font-weight:400;color:${GRAY_500};}
.lv-input{width:100%;padding:11px 14px;border-radius:10px;border:1.5px solid ${GRAY_200};font-size:15px;outline:none;box-sizing:border-box;color:${NAVY_900};font-family:inherit;background:#fff;transition:border-color .15s;}
.lv-input:focus{border-color:${NAVY_900};}
.lv-input.lv-err{border-color:${RED};}
.lv-field{margin-bottom:16px;}
.lv-clave{letter-spacing:.5em;font-weight:700;text-align:center;}
.lv-error{margin:0 0 16px;font-size:12.5px;color:${RED};font-weight:500;}
.lv-btn{width:100%;padding:12px 14px;border-radius:10px;border:none;font-size:15px;font-weight:700;font-family:inherit;background:${NAVY_900};color:#fff;cursor:pointer;transition:background .15s;}
.lv-btn:disabled{background:${GRAY_100};color:${GRAY_500};cursor:not-allowed;}
.lv-foot{margin-top:20px;text-align:center;}
.lv-back{font-size:12px;font-weight:600;color:${NAVY_300};text-decoration:none;}
.lv-back:hover{color:#fff;}
.lv-copyright{text-align:center;font-size:11px;color:${NAVY_500};margin-top:20px;}
`;

export default function LoginVoluntario() {
  const { loginVoluntario } = useAuth();
  const navigate = useNavigate();

  const [apodo,   setApodo]   = useState('');
  const [clave,   setClave]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const apodoRef = useRef(null);

  const listo = apodo.trim().length > 0 && clave.length === 4;

  const handleClave = (e) => {
    // Solo dígitos, máximo 4.
    setClave(e.target.value.replace(/\D/g, '').slice(0, 4));
    setError('');
  };

  const handleEnter = async () => {
    if (!listo || loading) return;
    setLoading(true);
    setError('');
    const result = await loginVoluntario(apodo.trim(), clave);
    setLoading(false);
    if (result.ok) navigate('/voluntario');
    else {
      setError(result.error);
      apodoRef.current?.focus();
    }
  };

  return (
    <div className="lv-root">
      <style>{CSS}</style>
      <div className="lv-glow-tr" />
      <div className="lv-glow-bl" />

      <div className="lv-wrap">
        <div className="lv-brand">
          <img src="/assets/origen-logo-white.png" alt="Origen" />
          <div className="lv-tag">Acceso de voluntarios</div>
        </div>

        <div className="lv-panel">
          <div className="lv-eyebrow">Voluntarios</div>
          <h1 className="lv-title">Entra a tu espacio</h1>
          <div className="lv-sub">Usa el apodo que te dio tu líder de ministerio.</div>

          <div className="lv-field">
            <label className="lv-label" htmlFor="lv-apodo">Tu apodo</label>
            <input
              id="lv-apodo"
              ref={apodoRef}
              className={`lv-input${error ? ' lv-err' : ''}`}
              type="text"
              autoComplete="username"
              placeholder="Como te registró tu líder"
              value={apodo}
              onChange={e => { setApodo(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleEnter()}
            />
          </div>

          <div className="lv-field">
            <label className="lv-label" htmlFor="lv-clave">
              Clave <span className="lv-hint">(los últimos 4 de tu WhatsApp)</span>
            </label>
            <input
              id="lv-clave"
              className={`lv-input lv-clave${error ? ' lv-err' : ''}`}
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={4}
              placeholder="••••"
              value={clave}
              onChange={handleClave}
              onKeyDown={e => e.key === 'Enter' && handleEnter()}
            />
          </div>

          {error && <p className="lv-error">{error}</p>}

          <button className="lv-btn" onClick={handleEnter} disabled={!listo || loading}>
            {loading ? 'Verificando…' : 'Entrar'}
          </button>
        </div>

        <div className="lv-foot">
          <Link to="/login" className="lv-back">← Soy parte del staff</Link>
        </div>
        <div className="lv-copyright">Dashboard interno · Origen</div>
      </div>
    </div>
  );
}
