import { Component } from 'react';

// ── Paleta AGS ──────────────────────────────────────────────────────────────
const NAVY_950  = '#0B1A2F';
const NAVY_900  = '#112540';
const NAVY_300  = '#9CB0CC';
const ORANGE_500 = '#FF6B2B';
const ORANGE_600 = '#E0561B';

// Error Boundary global: si cualquier página truena al renderizar, en vez de
// dejar la app en pantalla en blanco mostramos un fallback amable con botones
// para recargar o volver al inicio.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Deja rastro en consola para debug.
    console.error('ErrorBoundary capturó un error de render:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', background: NAVY_950,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px', fontFamily: 'var(--font-ui)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow de fondo (acento naranja AGS) */}
        <div style={{
          position: 'absolute', top: -180, right: -140, width: 540, height: 540,
          borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(255,107,43,.16), transparent 68%)',
        }} />
        <div style={{
          position: 'absolute', bottom: -220, left: -160, width: 600, height: 600,
          borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(48,81,129,.4), transparent 70%)',
        }} />

        <div style={{
          position: 'relative', zIndex: 1,
          background: '#fff', borderRadius: 22, padding: '36px 32px',
          maxWidth: 440, width: '100%', textAlign: 'center',
          boxShadow: '0 30px 80px rgba(0,0,0,.45), 0 2px 6px rgba(0,0,0,.2)',
        }}>
          {/* Ícono */}
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: '0 auto 22px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#FFF4EE', color: ORANGE_600,
          }}>
            <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 9v4" strokeLinecap="round" />
              <path d="M12 17h.01" strokeLinecap="round" />
              <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" strokeLinejoin="round" />
            </svg>
          </div>

          <h1 style={{
            fontSize: 22, fontWeight: 800, letterSpacing: '-.02em',
            color: NAVY_900, margin: '0 0 8px',
          }}>
            Algo salió mal en esta pantalla
          </h1>
          <p style={{ fontSize: 14, color: '#7A8699', margin: '0 0 26px', lineHeight: 1.5 }}>
            Ocurrió un error inesperado. Puedes recargar la pantalla o volver al inicio.
            Si el problema continúa, avísale al administrador.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={this.handleReload}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                background: ORANGE_500, color: '#fff',
                border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
              }}
            >
              Recargar
            </button>
            <button
              onClick={this.handleHome}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                background: '#fff', color: NAVY_900,
                border: '1.5px solid #E2E6EC', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
              }}
            >
              Ir al inicio
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, marginTop: 20, fontSize: 11, color: NAVY_300 }}>
          Dashboard interno · Origen Campus Aguascalientes
        </div>
      </div>
    );
  }
}
